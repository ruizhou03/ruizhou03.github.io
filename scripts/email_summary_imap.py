#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""邮件 summary 的 Gmail I/O。

三个模式：
  fetch <since_iso> <out_json>   拉 SINCE 之后的新邮件 + 收件箱所有未读邮件 → 写 JSON
  draft <drafts_json>            读 JSON、把回复草稿 APPEND 进 Gmail 草稿箱
  send <subject> <body_html>     把 HTML 正文片段套进邮件外壳，经 SMTP 私密直投到自己邮箱
                                 （summary 不再 commit 进公开仓库、不再走公开 GitHub Issue）

三个模式全部只用标准库 —— send 直接收 claude 生成好的 HTML 片段，不再依赖 markdown 库
（旧版靠 markdown 库渲染，LaunchAgent 环境下常因 python 不对而退化成纯文本，已弃用）。

凭证：~/.config/zirconeey-email-summary/imap_credentials（chmod 600），格式：
  IMAP_USER=ruizhou0312@gmail.com
  IMAP_APP_PASSWORD=xxxxxxxxxxxxxxxx     # Google「应用专用密码」，16 位、无空格

代理：在国内时 Gmail 走不通，需经 Clash。若环境变量 IMAP_PROXY_HOST / IMAP_PROXY_PORT
有值，则先对 Clash 端口做 HTTP CONNECT 隧道再上 TLS。美国直连时不设这两个变量即可。
"""
import email
import email.header
import html as _html
import email.message
import email.utils
import imaplib
import json
import os
import re
import smtplib
import socket
import ssl
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

IMAP_HOST = "imap.gmail.com"
IMAP_PORT = 993
CRED_PATH = Path.home() / ".config" / "zirconeey-email-summary" / "imap_credentials"
MAX_MESSAGES = 100           # 单次最多细读这么多封（新邮件 + 未读并集，超量取最新）


def log(msg):
    print(f"[imap] {msg}", file=sys.stderr, flush=True)


def _ssl_context():
    """带 CA 根证书的 SSL context。python.org 的 macOS Python 默认不带 CA bundle，
    会 CERTIFICATE_VERIFY_FAILED，需显式加载系统证书文件。"""
    ctx = ssl.create_default_context()
    if ctx.get_ca_certs():
        return ctx                          # 默认已带证书（如 homebrew python）
    for ca in ("/etc/ssl/cert.pem",
               "/opt/homebrew/etc/ca-certificates/cert.pem",
               "/opt/homebrew/etc/openssl@3/cert.pem"):
        if os.path.exists(ca):
            ctx.load_verify_locations(ca)
            log(f"加载 CA bundle：{ca}")
            return ctx
    try:
        import certifi
        ctx.load_verify_locations(certifi.where())
        log(f"加载 CA bundle：{certifi.where()}")
    except ImportError:
        log("警告：找不到任何 CA bundle，TLS 校验可能失败")
    return ctx


def load_credentials():
    if not CRED_PATH.exists():
        sys.exit(f"凭证文件不存在：{CRED_PATH}\n"
                 f"请新建它（chmod 600），写入 IMAP_USER 和 IMAP_APP_PASSWORD 两行。")
    user = passwd = None
    for line in CRED_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip()
        if k == "IMAP_USER":
            user = v
        elif k == "IMAP_APP_PASSWORD":
            passwd = v.replace(" ", "")     # 应用密码允许带空格，去掉
    if not user or not passwd:
        sys.exit(f"凭证文件缺 IMAP_USER 或 IMAP_APP_PASSWORD：{CRED_PATH}")
    return user, passwd


class ProxyIMAP4SSL(imaplib.IMAP4_SSL):
    """经 HTTP CONNECT 代理连接的 IMAP4_SSL（国内经 Clash 用）。"""

    def __init__(self, host, port, proxy_host, proxy_port, timeout=None):
        self._proxy = (proxy_host, int(proxy_port))
        super().__init__(host, port, ssl_context=_ssl_context(), timeout=timeout)

    def _create_socket(self, timeout=None):
        log(f"经代理 {self._proxy[0]}:{self._proxy[1]} CONNECT 到 {self.host}:{self.port}")
        raw = socket.create_connection(self._proxy, timeout or 30)
        req = (f"CONNECT {self.host}:{self.port} HTTP/1.1\r\n"
               f"Host: {self.host}:{self.port}\r\n\r\n")
        raw.sendall(req.encode("ascii"))
        resp = b""
        while b"\r\n\r\n" not in resp:
            chunk = raw.recv(4096)
            if not chunk:
                break
            resp += chunk
        status_line = resp.split(b"\r\n", 1)[0].decode("latin-1", "replace")
        if " 200 " not in status_line:
            raw.close()
            raise OSError(f"代理 CONNECT 失败：{status_line}")
        return self.ssl_context.wrap_socket(raw, server_hostname=self.host)


def connect():
    user, passwd = load_credentials()
    proxy_host = os.environ.get("IMAP_PROXY_HOST", "").strip()
    proxy_port = os.environ.get("IMAP_PROXY_PORT", "").strip()
    # 读超时 180s：跨墙隧道偶尔会让某条命令永久挂起；有超时就能快速失败、交给上层重试
    if proxy_host and proxy_port:
        imap = ProxyIMAP4SSL(IMAP_HOST, IMAP_PORT, proxy_host, proxy_port, timeout=180)
    else:
        log(f"直连 {IMAP_HOST}:{IMAP_PORT}")
        imap = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT,
                                 ssl_context=_ssl_context(), timeout=180)
    imap.login(user, passwd)
    log(f"登录成功：{user}")
    return imap, user


def _decode_header(raw):
    if not raw:
        return ""
    parts = []
    for txt, enc in email.header.decode_header(raw):
        if isinstance(txt, bytes):
            try:
                parts.append(txt.decode(enc or "utf-8", "replace"))
            except (LookupError, UnicodeDecodeError):
                parts.append(txt.decode("utf-8", "replace"))
        else:
            parts.append(txt)
    return "".join(parts).strip()


def _addr_list(raw):
    if not raw:
        return []
    return [email.utils.parseaddr(a)[1] for a in raw.split(",") if email.utils.parseaddr(a)[1]]


def _extract_snippet(msg, limit=600):
    """取邮件 text/plain 正文前 limit 字符；没有 plain 就退化用 html 去标签。"""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and not part.get_filename():
                try:
                    body = part.get_payload(decode=True).decode(
                        part.get_content_charset() or "utf-8", "replace")
                    break
                except (AttributeError, LookupError):
                    continue
        if not body:
            for part in msg.walk():
                if part.get_content_type() == "text/html" and not part.get_filename():
                    try:
                        html = part.get_payload(decode=True).decode(
                            part.get_content_charset() or "utf-8", "replace")
                        body = _strip_html(html)
                        break
                    except (AttributeError, LookupError):
                        continue
    else:
        try:
            raw = msg.get_payload(decode=True)
            text = raw.decode(msg.get_content_charset() or "utf-8", "replace")
            body = text if msg.get_content_type() == "text/plain" else _strip_html(text)
        except (AttributeError, LookupError):
            body = ""
    body = " ".join(body.split())
    return body[:limit]


def _strip_html(html):
    html = re.sub(r"(?is)<(script|style).*?</\1>", " ", html)
    html = re.sub(r"(?s)<[^>]+>", " ", html)
    return html


def cmd_fetch(since_iso, out_path):
    since_dt = datetime.fromisoformat(since_iso.replace("Z", "+00:00"))
    if since_dt.tzinfo is None:
        since_dt = since_dt.replace(tzinfo=timezone.utc)
    imap, user = connect()
    try:
        imap.select("INBOX", readonly=True)     # readonly：绝不动 \Seen 等标志
        # 两路搜索并集：
        #   ① SINCE   —— 上次 summary 以来新到的邮件（已读 + 未读都要）
        #   ② UNSEEN  —— 收件箱里所有未读邮件，不限时间（之前就一直没读的也翻出来）
        # IMAP SEARCH 只能精确到日期，SINCE 往前多搜一天再用时间戳精确过滤。
        search_date = (since_dt - timedelta(days=1)).strftime("%d-%b-%Y")
        typ, data = imap.search(None, "SINCE", search_date)
        since_nums = data[0].split() if data and data[0] else []
        typ, data = imap.search(None, "UNSEEN")
        unseen_nums = data[0].split() if data and data[0] else []
        unread_total = len(unseen_nums)
        # 并集，按序号（≈时间）升序；超量时只保留最新的 MAX_MESSAGES 封
        union = sorted({int(n) for n in since_nums} | {int(n) for n in unseen_nums})
        truncated = max(0, len(union) - MAX_MESSAGES)
        nums = [str(n) for n in union[-MAX_MESSAGES:]]
        log(f"SINCE {search_date} 命中 {len(since_nums)} 封 · UNSEEN 命中 "
            f"{unread_total} 封 · 并集 {len(union)} 封"
            + (f"（截到最新 {MAX_MESSAGES}，舍弃 {truncated} 封更旧的）" if truncated else ""))
        messages = []
        # 批量 FETCH：每次一条命令把一批邮件流式取回，而不是单封逐次往返。
        # 跨墙隧道下逐封往返太多，Gmail 会嫌慢、中途掐断连接（socket EOF）。
        # 分块 20 封，单条命令的响应体也不至于太大。
        # 只抓正文前 32KB：够拿全邮件头 + 正文开头，又不会把大附件整个拖过墙。
        for i in range(0, len(nums), 20):
            chunk = nums[i:i + 20]
            typ, fd = imap.fetch(
                ",".join(chunk),
                "(FLAGS INTERNALDATE X-GM-THRID BODY.PEEK[]<0.32768>)")
            if typ != "OK":
                raise imaplib.IMAP4.abort(f"批量 FETCH 返回 {typ}")
            # 批量响应里每个 tuple 就是一封邮件：item[0]=元数据前导、item[1]=正文；
            # tuple 之间夹的纯 bytes 项是 ')' 分隔符，跳过即可。
            for item in fd:
                if not isinstance(item, tuple) or item[1] is None:
                    continue
                meta_s = item[0].decode("latin-1", "replace")
                seen = "\\Seen" in meta_s
                thrid = ""
                m = re.search(r"X-GM-THRID (\d+)", meta_s)
                if m:
                    thrid = format(int(m.group(1)), "x")   # 十进制 → 十六进制（Gmail web URL 用）
                msg = email.message_from_bytes(item[1])
                date_hdr = msg.get("Date", "")
                try:
                    dt = email.utils.parsedate_to_datetime(date_hdr)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                except (TypeError, ValueError):
                    dt = since_dt
                # 保留条件：未读的全要（不限时间）；已读的只要上次 summary 后新到的。
                # 这样既覆盖新邮件，又把之前就一直没读的旧邮件一并纳入。
                if seen and dt < since_dt:
                    continue
                from_raw = _decode_header(msg.get("From", ""))
                messages.append({
                    "gm_thread_hex": thrid,
                    "message_id": (msg.get("Message-ID", "") or "").strip(),
                    "from": from_raw,
                    "from_email": email.utils.parseaddr(msg.get("From", ""))[1],
                    "to": _addr_list(msg.get("To", "")),
                    "cc": _addr_list(msg.get("Cc", "")),
                    "delivered_to": _addr_list(msg.get("Delivered-To", "")),
                    "subject": _decode_header(msg.get("Subject", "")),
                    "date_utc": dt.astimezone(timezone.utc).isoformat(),
                    "seen": seen,
                    "new_since_last": dt >= since_dt,        # 上次 summary 后新到
                    "snippet": _extract_snippet(msg),
                })
        messages.sort(key=lambda m: m["date_utc"], reverse=True)
        new_count = sum(1 for m in messages if m["new_since_last"])
        out = {
            "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
            "since_utc": since_dt.astimezone(timezone.utc).isoformat(),
            "account": user,
            "message_count": len(messages),
            "new_count": new_count,            # 上次 summary 后新到的封数
            "unread_total": unread_total,      # 收件箱当前未读总数（含本批之外的）
            "messages_truncated": truncated,   # 因超量被舍弃的更旧未读封数
            "messages": messages,
        }
        Path(out_path).write_text(json.dumps(out, ensure_ascii=False, indent=2),
                                  encoding="utf-8")
        log(f"写出 {len(messages)} 封到 {out_path}")
    finally:
        try:
            imap.logout()
        except Exception:
            pass


def _find_drafts_folder(imap):
    """用 SPECIAL-USE 属性找草稿箱，找不到退回 [Gmail]/Drafts。"""
    typ, data = imap.list()
    if typ == "OK":
        for line in data:
            s = line.decode("utf-8", "replace") if isinstance(line, bytes) else str(line)
            if "\\Drafts" in s:
                # 行尾被引号括起来的就是文件夹名
                name = s.split('"')[-2] if s.count('"') >= 2 else s.split()[-1]
                return name
    return "[Gmail]/Drafts"


def cmd_draft(drafts_path):
    payload = json.loads(Path(drafts_path).read_text(encoding="utf-8"))
    drafts = payload.get("drafts", [])
    if not drafts:
        log("drafts.json 里没有草稿，跳过")
        return
    imap, user = connect()
    try:
        folder = _find_drafts_folder(imap)
        log(f"草稿箱文件夹：{folder}")
        ok = 0
        for d in drafts:
            msg = email.message.EmailMessage()
            msg["From"] = user
            msg["To"] = d["to"]
            msg["Subject"] = d.get("subject", "")
            if d.get("in_reply_to"):
                msg["In-Reply-To"] = d["in_reply_to"]
                msg["References"] = d.get("references", d["in_reply_to"])
            msg["Date"] = email.utils.formatdate(localtime=True)
            msg.set_content(d.get("body", ""))
            try:
                imap.append(folder, "(\\Draft)", None, msg.as_bytes())
                ok += 1
                log(f"草稿已建：To {d['to']} / {d.get('subject','')}")
            except Exception as e:
                log(f"草稿建失败（跳过）：{d.get('subject','')} — {e}")
        log(f"共建 {ok}/{len(drafts)} 个草稿")
    finally:
        try:
            imap.logout()
        except Exception:
            pass


# ─────────────────────── send：SMTP 私密直投 ───────────────────────

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 465

_HTML_SHELL = """<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{{font-family:-apple-system,"PingFang SC","Microsoft YaHei",Helvetica,Arial,sans-serif;
  color:#1a1a1a;line-height:1.6;max-width:660px;margin:0 auto;padding:20px 18px;
  font-size:15px;background:#fff}}
.head{{font-size:19px;font-weight:700;margin:0 0 3px}}
.meta{{color:#8a8a8a;font-size:13px;margin:0 0 18px}}
.sec{{font-size:15px;font-weight:700;margin:24px 0 10px;padding-bottom:5px;
  border-bottom:1px solid #ececec}}
.card{{border:1px solid #e8e8e8;border-left:4px solid #c8c8c8;border-radius:6px;
  padding:11px 13px;margin:9px 0;background:#fafafa}}
.card.red{{border-left-color:#df5448;background:#fdf4f3}}
.card.yellow{{border-left-color:#dca233;background:#fdfaf1}}
.card .top{{font-size:12.5px;color:#999;margin-bottom:3px}}
.tag{{display:inline-block;background:#ebebeb;color:#666;border-radius:3px;
  padding:0 5px;font-size:11.5px;margin-right:5px}}
.carry{{display:inline-block;background:#f0e6cf;color:#946f1f;border-radius:3px;
  padding:0 5px;font-size:11px;margin-left:4px}}
.card .subj{{font-weight:700;font-size:14px;margin:1px 0 4px}}
.card .gist{{font-size:14px;margin:4px 0 0}}
.card .gist ul{{margin:4px 0;padding-left:19px}}
.card .gist li{{margin:2px 0}}
.card .act{{margin-top:6px;font-size:13px;color:#bb3a2c}}
.card .lnk{{margin-top:4px;font-size:12px}}
a{{color:#3b6fb0;text-decoration:none}}
details{{margin:8px 0}}
summary{{cursor:pointer;color:#3b6fb0;font-size:14px}}
.fold li{{font-size:13px;color:#555;margin:3px 0;list-style:none}}
.fold ul{{padding-left:2px;margin:8px 0}}
.event{{font-size:14px;margin:7px 0}}
.event b{{color:#bb3a2c}}
.empty{{color:#9a9a9a;font-size:13.5px;margin:6px 0}}
hr{{border:none;border-top:1px solid #ececec;margin:20px 0}}
</style></head><body>
{content}
</body></html>"""


class ProxySMTP_SSL(smtplib.SMTP_SSL):
    """经 HTTP CONNECT 代理连接的 SMTP_SSL（国内经 Clash 用）。"""

    def __init__(self, host, port, proxy_host, proxy_port):
        self._proxy = (proxy_host, int(proxy_port))
        super().__init__(host, port, context=_ssl_context(), timeout=30)

    def _get_socket(self, host, port, timeout):
        log(f"经代理 {self._proxy[0]}:{self._proxy[1]} CONNECT 到 {host}:{port}")
        raw = socket.create_connection(self._proxy, timeout or 30)
        raw.sendall((f"CONNECT {host}:{port} HTTP/1.1\r\n"
                     f"Host: {host}:{port}\r\n\r\n").encode("ascii"))
        resp = b""
        while b"\r\n\r\n" not in resp:
            chunk = raw.recv(4096)
            if not chunk:
                break
            resp += chunk
        status_line = resp.split(b"\r\n", 1)[0].decode("latin-1", "replace")
        if " 200 " not in status_line:
            raw.close()
            raise OSError(f"代理 CONNECT 失败：{status_line}")
        return self.context.wrap_socket(raw, server_hostname=host)


def _html_to_text(html):
    """HTML 片段 → 朴素纯文本，给不支持 HTML 的客户端兜底。"""
    txt = re.sub(r"(?is)</(p|div|h\d|li|tr|details|summary)\s*>", "\n", html)
    txt = re.sub(r"(?is)<br\s*/?>", "\n", txt)
    txt = _strip_html(txt)
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n[ \t]+", "\n", txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt)
    return _html.unescape(txt).strip()


def cmd_send(subject, body_path):
    """把 claude 生成的 HTML 正文片段套进邮件外壳，经 SMTP 私密直投到自己邮箱。"""
    user, passwd = load_credentials()
    fragment = Path(body_path).read_text(encoding="utf-8")
    msg = email.message.EmailMessage()
    msg["From"] = user
    msg["To"] = user                       # 私密直投：发给自己
    msg["Subject"] = subject
    msg["Date"] = email.utils.formatdate(localtime=True)
    msg.set_content(_html_to_text(fragment) or subject)                  # 纯文本兜底
    msg.add_alternative(_HTML_SHELL.format(content=fragment), subtype="html")  # 渲染版

    proxy_host = os.environ.get("IMAP_PROXY_HOST", "").strip()
    proxy_port = os.environ.get("IMAP_PROXY_PORT", "").strip()
    if proxy_host and proxy_port:
        srv = ProxySMTP_SSL(SMTP_HOST, SMTP_PORT, proxy_host, proxy_port)
    else:
        log(f"直连 {SMTP_HOST}:{SMTP_PORT}")
        srv = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=_ssl_context(), timeout=30)
    with srv:
        srv.login(user, passwd)
        srv.send_message(msg)
    log(f"summary 邮件已发往 {user}")


def main():
    if len(sys.argv) < 2:
        sys.exit("用法：email_summary_imap.py fetch <since_iso> <out_json> | "
                 "draft <drafts_json> | send <subject> <body_html>")
    mode = sys.argv[1]
    if mode == "fetch":
        if len(sys.argv) != 4:
            sys.exit("用法：email_summary_imap.py fetch <since_iso> <out_json>")
        cmd_fetch(sys.argv[2], sys.argv[3])
    elif mode == "draft":
        if len(sys.argv) != 3:
            sys.exit("用法：email_summary_imap.py draft <drafts_json>")
        cmd_draft(sys.argv[2])
    elif mode == "send":
        if len(sys.argv) != 4:
            sys.exit("用法：email_summary_imap.py send <subject> <body_html>")
        cmd_send(sys.argv[2], sys.argv[3])
    else:
        sys.exit(f"未知模式：{mode}")


if __name__ == "__main__":
    main()
