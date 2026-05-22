#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""锆铌·机票监控 —— 通知投递层。由 flight_watch.sh 调用。

读 claude 写好的裁决文件，按需两渠道投递：Mac 本地通知 + SMTP 私密邮件。
邮件正文把 claude 写的 markdown 报告渲染成 HTML（表格/标题正常显示，不再是源码）。
裁决 should_notify=false 时安静退出。两渠道独立容错。

  flight_watch_notify.py send   读 /tmp/flight_watch_verdict.json + report.md，按裁决投递
  flight_watch_notify.py test   发一条测试通知，验证两渠道配置

凭证：Gmail SMTP 复用 ~/.config/zirconeey-email-summary/imap_credentials
      （IMAP_USER / IMAP_APP_PASSWORD；应用专用密码同样能用于 SMTP）。
代理：在国内时 smtp.gmail.com 走不通，环境变量 IMAP_PROXY_HOST/PORT 有值则经 Clash 隧道。
"""
import json
import os
import smtplib
import socket
import ssl
import subprocess
import sys
from email.message import EmailMessage
from pathlib import Path

VERDICT_PATH = Path("/tmp/flight_watch_verdict.json")
REPORT_PATH = Path("/tmp/flight_watch_report.md")
GMAIL_CRED = Path.home() / ".config" / "zirconeey-email-summary" / "imap_credentials"

SMTP_HOST, SMTP_PORT = "smtp.gmail.com", 465

# 邮件 HTML 外壳样式（Gmail 等客户端对 <style> 支持良好）
HTML_SHELL = """<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{{font-family:-apple-system,"PingFang SC","Microsoft YaHei",Helvetica,Arial,sans-serif;
color:#222;line-height:1.65;max-width:680px;margin:0 auto;padding:18px;font-size:15px}}
h1{{font-size:21px;margin:0 0 12px}}
h2{{font-size:17px;border-bottom:1px solid #e5e5e7;padding-bottom:5px;margin:26px 0 10px}}
h3{{font-size:15px;margin:18px 0 6px}}
table{{border-collapse:collapse;width:100%;margin:10px 0;font-size:14px}}
th,td{{border:1px solid #dcdce0;padding:6px 10px;text-align:left}}
th{{background:#f5f5f7}}
code{{background:#f4f4f6;padding:1px 5px;border-radius:3px;font-size:13px}}
hr{{border:none;border-top:1px solid #ebebed;margin:22px 0}}
a{{color:#0a66c2;text-decoration:none}}
strong{{color:#111}}
</style></head><body>
{content}
</body></html>"""


def log(msg):
    print(f"[notify] {msg}", file=sys.stderr, flush=True)


def _read_kv(path):
    d = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                d[k.strip()] = v.strip()
    return d


def _ssl_context():
    """带 CA 根证书的 SSL context（python.org 版 Python 默认不带）。"""
    ctx = ssl.create_default_context()
    if ctx.get_ca_certs():
        return ctx
    for ca in ("/etc/ssl/cert.pem",
               "/opt/homebrew/etc/ca-certificates/cert.pem",
               "/opt/homebrew/etc/openssl@3/cert.pem"):
        if os.path.exists(ca):
            ctx.load_verify_locations(ca)
            return ctx
    return ctx


# ─────────────────────────── 渠道 1：Mac 本地通知 ───────────────────────────

def notify_mac(title, body):
    try:
        safe_t = title.replace('"', "'")
        safe_b = body.replace('"', "'").replace("\n", " ")[:240]
        subprocess.run(
            ["/usr/bin/osascript", "-e",
             f'display notification "{safe_b}" with title "{safe_t}" sound name "Glass"'],
            check=True, capture_output=True, timeout=10)
        log("Mac 本地通知 OK")
        return True
    except Exception as e:
        log(f"Mac 本地通知失败：{e}")
        return False


# ─────────────────────────── 渠道 2：SMTP 私密邮件 ───────────────────────────

class _ProxySMTP_SSL(smtplib.SMTP_SSL):
    """经 HTTP CONNECT 代理连接的 SMTP_SSL（国内经 Clash 用）。"""

    def __init__(self, host, port, proxy_host, proxy_port, context):
        self._proxy = (proxy_host, int(proxy_port))
        super().__init__(host, port, context=context, timeout=30)

    def _get_socket(self, host, port, timeout):
        raw = socket.create_connection(self._proxy, timeout or 30)
        raw.sendall((f"CONNECT {host}:{port} HTTP/1.1\r\n"
                     f"Host: {host}:{port}\r\n\r\n").encode("ascii"))
        resp = b""
        while b"\r\n\r\n" not in resp:
            chunk = raw.recv(4096)
            if not chunk:
                break
            resp += chunk
        if b" 200 " not in resp.split(b"\r\n", 1)[0]:
            raw.close()
            raise OSError(f"代理 CONNECT 失败：{resp[:80]!r}")
        return self.context.wrap_socket(raw, server_hostname=host)


def _render_html(md_text):
    """把 markdown 报告渲染成 HTML 邮件正文；markdown 库缺失时退化为 <pre>。"""
    try:
        import markdown
        body = markdown.markdown(md_text, extensions=["tables", "sane_lists"])
    except Exception as e:
        log(f"markdown 渲染失败（退化为纯文本块）：{e}")
        body = "<pre>" + (md_text.replace("&", "&amp;").replace("<", "&lt;")) + "</pre>"
    return HTML_SHELL.format(content=body)


def notify_email(subject, md_report):
    cred = _read_kv(GMAIL_CRED)
    user = cred.get("IMAP_USER")
    passwd = (cred.get("IMAP_APP_PASSWORD") or "").replace(" ", "")
    if not user or not passwd:
        log(f"Gmail 凭证缺失（{GMAIL_CRED}），跳过邮件")
        return None

    msg = EmailMessage()
    msg["From"] = user
    msg["To"] = user                       # 私密直投：发给自己
    msg["Subject"] = subject
    msg.set_content(md_report)             # 纯文本兜底
    msg.add_alternative(_render_html(md_report), subtype="html")  # 渲染版

    ctx = _ssl_context()
    proxy_host = os.environ.get("IMAP_PROXY_HOST", "").strip()
    proxy_port = os.environ.get("IMAP_PROXY_PORT", "").strip()
    try:
        if proxy_host and proxy_port:
            srv = _ProxySMTP_SSL(SMTP_HOST, SMTP_PORT, proxy_host, proxy_port, ctx)
        else:
            srv = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=30)
        with srv:
            srv.login(user, passwd)
            srv.send_message(msg)
        log(f"SMTP 邮件已发往 {user}")
        return True
    except Exception as e:
        log(f"SMTP 发信失败：{e}")
        return False


# ─────────────────────────── 组装 ───────────────────────────

def _build_messages(verdict):
    """据裁决拼出 (推送标题, 推送短正文, 邮件主题)。"""
    reason = verdict.get("reason", "")
    summary = verdict.get("summary", "机票监控")
    deals = verdict.get("deals", []) or []

    if reason == "deal" and deals:
        top = deals[0]
        title = f"✈️ 捡漏！{top.get('route','')} ${top.get('price','')}"
        lines = [f"{d.get('route','')} {d.get('date','')}：${d.get('price','')}"
                 f"（{d.get('price_note','')}）" for d in deals[:3]]
        body = "\n".join(lines) + "\n\n快去抢 —— 详情见邮件"
    elif reason == "first_run":
        title = "✈️ 机票监控已启动"
        body = summary
    elif reason == "scrape_problem":
        title = "⚠️ 机票监控抓取异常"
        body = summary + "\n可能需要修脚本，详情见邮件"
    else:
        title = "✈️ 机票监控"
        body = summary
    subject = f"{title}　{verdict.get('run_at','')[:16].replace('T',' ')}"
    return title, body, subject


def cmd_send():
    if not VERDICT_PATH.exists():
        log(f"裁决文件不存在：{VERDICT_PATH}，不投递")
        return 0
    verdict = json.loads(VERDICT_PATH.read_text(encoding="utf-8"))
    if not verdict.get("should_notify"):
        log(f"裁决 should_notify=false（reason={verdict.get('reason')}），安静退出")
        return 0

    title, push_body, subject = _build_messages(verdict)
    report = REPORT_PATH.read_text(encoding="utf-8") if REPORT_PATH.exists() else push_body

    log(f"投递中：{title}")
    notify_mac(title, push_body)
    notify_email(subject, report)
    return 0


def cmd_test():
    log("发送测试通知到两个渠道 ...")
    notify_mac("✈️ 机票监控·测试", "两渠道测试通知，看到即正常。")
    notify_email("✈️ 机票监控·测试",
                 "# 机票监控·测试\n\n这是机票监控的测试邮件。\n\n"
                 "| 渠道 | 状态 |\n|---|---|\n| Mac 通知 | ✅ |\n| SMTP 邮件 | ✅ |\n\n"
                 "收到且这个表格能正常渲染，说明 HTML 邮件就绪。")
    return 0


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "send"
    if mode == "send":
        sys.exit(cmd_send())
    elif mode == "test":
        sys.exit(cmd_test())
    else:
        sys.exit("用法：flight_watch_notify.py send | test")


if __name__ == "__main__":
    main()
