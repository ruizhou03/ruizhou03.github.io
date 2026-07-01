#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""机票监控 · 通知投递层。

读判断层写好的 verdict + report.md，按用户选的渠道投递：
桌面通知（platform 抽象）/ 邮件（用户自己的 SMTP，按邮箱域名推断 host）/ 本地面板 HTML。
should_notify=false 时只更新本地面板、不打扰。渠道各自容错。

与私人版的区别：不复用任何 zircon-* 凭证路径、不挂 Clash 代理（公开工具跑在用户自己
机器上、各管各的网络）；SMTP 凭证由安装器写进运行器自有目录（这里按参数传入）。
"""
import smtplib
import ssl
from email.message import EmailMessage

from . import platform as plat

# 邮箱域名 → (SMTP host, port)。够不着的走「其它」，安装器让用户手填 host/port。
SMTP_MAP = {
    "gmail.com": ("smtp.gmail.com", 465),
    "outlook.com": ("smtp.office365.com", 587),
    "hotmail.com": ("smtp.office365.com", 587),
    "qq.com": ("smtp.qq.com", 465),
    "foxmail.com": ("smtp.qq.com", 465),
    "163.com": ("smtp.163.com", 465),
    "126.com": ("smtp.126.com", 465),
    "icloud.com": ("smtp.mail.me.com", 587),
}

HTML_SHELL = """<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{{font-family:-apple-system,"PingFang SC","Microsoft YaHei",Helvetica,Arial,sans-serif;
color:#222;line-height:1.65;max-width:680px;margin:0 auto;padding:18px;font-size:15px}}
h1{{font-size:21px;margin:0 0 12px}}h2{{font-size:17px;border-bottom:1px solid #e5e5e7;padding-bottom:5px;margin:24px 0 10px}}
table{{border-collapse:collapse;width:100%;margin:10px 0;font-size:14px}}
th,td{{border:1px solid #dcdce0;padding:6px 10px;text-align:left}}th{{background:#f5f5f7}}
strong{{color:#111}}code{{background:#f4f4f6;padding:1px 5px;border-radius:3px}}
</style></head><body>{content}</body></html>"""


# ─────────────────────────── 渲染 ───────────────────────────

def render_html(md_text):
    """markdown 报告 → HTML 邮件/面板正文；无 markdown 库时退化为 <pre>。"""
    try:
        import markdown
        body = markdown.markdown(md_text or "", extensions=["tables", "sane_lists"])
    except Exception:
        safe = (md_text or "").replace("&", "&amp;").replace("<", "&lt;")
        body = "<pre>" + safe + "</pre>"
    return HTML_SHELL.format(content=body)


def smtp_for(email):
    dom = (email or "").rsplit("@", 1)[-1].lower()
    return SMTP_MAP.get(dom)


# ─────────────────────────── 消息组装 ───────────────────────────

def build_desktop(verdict):
    """据裁决拼 (通知标题, 短正文)。"""
    reason = verdict.get("reason")
    deals = verdict.get("deals") or []
    summary = verdict.get("summary", "机票监控")
    if reason == "deal" and deals:
        top = deals[0]
        title = f"✈️ 捡漏！{top.get('route', '')} ${top.get('price', '')}"
        lines = [f"{d.get('route', '')} {d.get('date', '')}：${d.get('price', '')}" for d in deals[:3]]
        if len(deals) > 3:
            lines.append(f"…等 {len(deals)} 张，详情见面板 / 邮件")
        return title, "\n".join(lines)
    if reason == "first_run":
        return "✈️ 机票监控已启动", summary
    if reason == "scrape_problem":
        return "⚠️ 机票监控抓取异常", summary + "\n可能需要看日志"
    return "✈️ 机票监控", summary


# ─────────────────────────── 渠道 ───────────────────────────

def send_email(subject, md_report, user, password, host=None, port=None):
    """用用户自己的邮箱发简报（HTML+纯文本）。凭证按参数传入，不读任何全局路径。"""
    hp = (host, port) if host else smtp_for(user)
    if not hp or not hp[0] or not user or not password:
        return False
    host, port = hp
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = user, user, subject
    msg.set_content(md_report or subject)
    msg.add_alternative(render_html(md_report), subtype="html")
    ctx = ssl.create_default_context()
    try:
        if int(port) == 465:
            srv = smtplib.SMTP_SSL(host, port, context=ctx, timeout=30)
        else:
            srv = smtplib.SMTP(host, port, timeout=30)
            srv.starttls(context=ctx)
        with srv:
            srv.login(user, password.replace(" ", ""))
            srv.send_message(msg)
        return True
    except Exception:
        return False


def write_panel(verdict, md_report, path):
    """写本地面板 HTML（简单模式的主要出口；完整模式也留一份）。"""
    from pathlib import Path
    head = (f"<h1>机票监控 · {verdict.get('summary', '')}</h1>"
            f"<p style='color:#888;font-size:13px'>更新于 {verdict.get('run_at', '')} · "
            f"{'有可抢' if verdict.get('should_notify') and verdict.get('reason') == 'deal' else '监控中'}</p>")
    body_md = md_report or verdict.get("summary", "")
    html = HTML_SHELL.format(content=head + render_html(body_md).split("<body>")[1].split("</body>")[0])
    Path(path).write_text(html, encoding="utf-8")
    return path


# ─────────────────────────── 编排 ───────────────────────────

def deliver(verdict, md_report, delivery, creds=None, panel_path=None):
    """按 delivery（{email,website,app,desktop} 布尔）+ verdict 投递。

    creds = {'user':邮箱, 'password':应用密码, 'host':?, 'port':?}（可空=不发邮件）。
    面板始终写一份（无论是否 should_notify）；其余仅在 should_notify 时触发。
    """
    delivery = delivery or {}
    results = {}
    if panel_path:
        results["panel"] = write_panel(verdict, md_report, panel_path)
    if not verdict.get("should_notify"):
        return results
    if delivery.get("desktop"):
        title, body = build_desktop(verdict)
        results["desktop"] = plat.notify_desktop(title, body)
    if delivery.get("email") and creds and creds.get("user"):
        subject = f"{build_desktop(verdict)[0]}　{verdict.get('run_at', '')[:16].replace('T', ' ')}"
        results["email"] = send_email(subject, md_report, creds.get("user"), creds.get("password"),
                                      creds.get("host"), creds.get("port"))
    return results
