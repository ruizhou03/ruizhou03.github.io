#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""锆铌·机票监控 —— 通知投递层。由 flight_watch.sh 调用。

读 claude 写好的裁决文件，按需三渠道投递：Bark iOS 推送 / Mac 本地通知 / SMTP 私密邮件。
裁决 should_notify=false 时安静退出。每个渠道独立容错，一个挂了不影响其它。

  flight_watch_notify.py send   读 /tmp/flight_watch_verdict.json + report.md，按裁决投递
  flight_watch_notify.py test   发一条测试通知，验证三渠道配置

凭证：
  Gmail SMTP —— 复用 ~/.config/zirconeey-email-summary/imap_credentials
                （IMAP_USER / IMAP_APP_PASSWORD；应用专用密码同样能用于 SMTP）
  Bark       —— ~/.config/zirconeey-flight-watch/credentials 里写：
                  BARK_KEY=xxxxxxxx              （官方服务器）
                  BARK_SERVER=https://api.day.app（可选，自建服务器才改）
                没配 Bark 就自动跳过该渠道。
代理：在国内时 smtp.gmail.com 走不通，环境变量 IMAP_PROXY_HOST/PORT 有值则经 Clash 隧道。
"""
import json
import os
import smtplib
import socket
import ssl
import subprocess
import sys
import urllib.request
from email.message import EmailMessage
from pathlib import Path

VERDICT_PATH = Path("/tmp/flight_watch_verdict.json")
REPORT_PATH = Path("/tmp/flight_watch_report.md")
GMAIL_CRED = Path.home() / ".config" / "zirconeey-email-summary" / "imap_credentials"
FW_CRED = Path.home() / ".config" / "zirconeey-flight-watch" / "credentials"

SMTP_HOST, SMTP_PORT = "smtp.gmail.com", 465


def log(msg):
    print(f"[notify] {msg}", file=sys.stderr, flush=True)


# ─────────────────────────── 凭证 ───────────────────────────

def _read_kv(path):
    d = {}
    if not path.exists():
        return d
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


# ─────────────────────────── 渠道 2：Bark iOS 推送 ───────────────────────────

def notify_bark(title, body, url=None):
    cred = _read_kv(FW_CRED)
    key = cred.get("BARK_KEY")
    if not key:
        log("未配置 BARK_KEY，跳过 Bark（在 "
            f"{FW_CRED} 写一行 BARK_KEY=... 即可启用）")
        return None
    server = cred.get("BARK_SERVER", "https://api.day.app").rstrip("/")
    payload = {"title": title, "body": body, "group": "机票监控",
               "sound": "alarm", "level": "timeSensitive"}
    if url:
        payload["url"] = url
    try:
        req = urllib.request.Request(
            f"{server}/{key}", method="POST",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json; charset=utf-8"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            ok = resp.status == 200
        log("Bark 推送 OK" if ok else f"Bark 推送返回 {resp.status}")
        return ok
    except Exception as e:
        log(f"Bark 推送失败：{e}")
        return False


# ─────────────────────────── 渠道 3：SMTP 私密邮件 ───────────────────────────

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


def notify_email(subject, text_body):
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
    msg.set_content(text_body)

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
    """据裁决拼出 (推送标题, 推送短正文, 邮件主题, 跳转URL)。"""
    reason = verdict.get("reason", "")
    summary = verdict.get("summary", "机票监控")
    deals = verdict.get("deals", []) or []

    if reason == "deal" and deals:
        top = deals[0]
        title = f"✈️ 捡漏！{top.get('route','')} ${top.get('price','')}"
        lines = []
        for d in deals[:3]:
            lines.append(f"{d.get('route','')} {d.get('date','')}：${d.get('price','')}"
                         f"（{d.get('price_note','')}）")
        body = "\n".join(lines) + "\n\n快去抢 ——详情见邮件"
        url = top.get("url")
    elif reason == "first_run":
        title = "✈️ 机票监控已启动"
        body = summary
        url = None
    elif reason == "scrape_problem":
        title = "⚠️ 机票监控抓取异常"
        body = summary + "\n可能需要修脚本，详情见邮件"
        url = None
    else:
        title = "✈️ 机票监控"
        body = summary
        url = None
    subject = f"{title}　{verdict.get('run_at','')[:16].replace('T',' ')}"
    return title, body, subject, url


def cmd_send():
    if not VERDICT_PATH.exists():
        log(f"裁决文件不存在：{VERDICT_PATH}，不投递")
        return 0
    verdict = json.loads(VERDICT_PATH.read_text(encoding="utf-8"))
    if not verdict.get("should_notify"):
        log(f"裁决 should_notify=false（reason={verdict.get('reason')}），安静退出")
        return 0

    title, push_body, subject, url = _build_messages(verdict)
    report = REPORT_PATH.read_text(encoding="utf-8") if REPORT_PATH.exists() else push_body

    log(f"投递中：{title}")
    notify_mac(title, push_body)
    notify_bark(title, push_body, url)
    notify_email(subject, report)
    return 0


def cmd_test():
    log("发送测试通知到三个渠道 ...")
    notify_mac("✈️ 机票监控·测试", "三渠道测试通知，看到即正常。")
    notify_bark("✈️ 机票监控·测试", "三渠道测试通知，看到即正常。",
                "https://us.trip.com/flights/")
    notify_email("✈️ 机票监控·测试",
                 "这是机票监控的测试邮件。\n"
                 "收到说明 SMTP 私密直投已就绪。")
    return 0


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "send"
    if mode == "send":
        sys.exit(cmd_send())
    elif mode == "test":
        sys.exit(cmd_test())
    else:
        sys.exit(f"用法：flight_watch_notify.py send | test")


if __name__ == "__main__":
    main()
