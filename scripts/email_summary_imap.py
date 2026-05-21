#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""邮件 summary 的 IMAP I/O —— 纯标准库，无 pip 依赖。

两个模式：
  fetch <since_iso> <out_json>   从 Gmail 收件箱拉 SINCE 之后的邮件 → 写 JSON
  draft <drafts_json>            读 JSON、把回复草稿 APPEND 进 Gmail 草稿箱

凭证：~/.config/zirconeey-email-summary/imap_credentials（chmod 600），格式：
  IMAP_USER=ruizhou0312@gmail.com
  IMAP_APP_PASSWORD=xxxxxxxxxxxxxxxx     # Google「应用专用密码」，16 位、无空格

代理：在国内时 Gmail 走不通，需经 Clash。若环境变量 IMAP_PROXY_HOST / IMAP_PROXY_PORT
有值，则先对 Clash 端口做 HTTP CONNECT 隧道再上 TLS。美国直连时不设这两个变量即可。
"""
import email
import email.header
import email.message
import email.utils
import imaplib
import json
import os
import re
import socket
import ssl
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

IMAP_HOST = "imap.gmail.com"
IMAP_PORT = 993
CRED_PATH = Path.home() / ".config" / "zirconeey-email-summary" / "imap_credentials"
MAX_MESSAGES = 60            # 单次最多细读这么多封（按时间倒序取最新）


def log(msg):
    print(f"[imap] {msg}", file=sys.stderr, flush=True)


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

    def __init__(self, host, port, proxy_host, proxy_port):
        self._proxy = (proxy_host, int(proxy_port))
        super().__init__(host, port, ssl_context=ssl.create_default_context())

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
    if proxy_host and proxy_port:
        imap = ProxyIMAP4SSL(IMAP_HOST, IMAP_PORT, proxy_host, proxy_port)
    else:
        log(f"直连 {IMAP_HOST}:{IMAP_PORT}")
        imap = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
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
        # IMAP SEARCH 只能精确到日期，往前多搜一天再用时间戳过滤
        search_date = (since_dt - timedelta(days=1)).strftime("%d-%b-%Y")
        typ, data = imap.search(None, "SINCE", search_date)
        nums = data[0].split() if data and data[0] else []
        nums = nums[-MAX_MESSAGES:]              # 最新 MAX_MESSAGES 封
        log(f"SINCE {search_date} 命中 {len(nums)} 封（已截到最新 {MAX_MESSAGES}）")
        messages = []
        for num in nums:
            typ, fd = imap.fetch(num, "(FLAGS INTERNALDATE X-GM-THRID BODY.PEEK[])")
            if typ != "OK" or not fd or fd[0] is None:
                continue
            meta = b""
            raw = b""
            for item in fd:
                if isinstance(item, tuple):
                    meta += item[0]
                    raw = item[1]
                elif isinstance(item, bytes):
                    meta += item
            meta_s = meta.decode("latin-1", "replace")
            seen = "\\Seen" in meta_s
            thrid = ""
            m = re.search(r"X-GM-THRID (\d+)", meta_s)
            if m:
                thrid = format(int(m.group(1)), "x")    # 十进制 → 十六进制（Gmail web URL 用十六进制）
            msg = email.message_from_bytes(raw)
            date_hdr = msg.get("Date", "")
            try:
                dt = email.utils.parsedate_to_datetime(date_hdr)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
            except (TypeError, ValueError):
                dt = since_dt
            if dt < since_dt:
                continue                                 # 早于基准时间，丢弃
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
                "snippet": _extract_snippet(msg),
            })
        messages.sort(key=lambda m: m["date_utc"], reverse=True)
        out = {
            "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
            "since_utc": since_dt.astimezone(timezone.utc).isoformat(),
            "account": user,
            "message_count": len(messages),
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


def main():
    if len(sys.argv) < 2:
        sys.exit("用法：email_summary_imap.py fetch <since_iso> <out_json> | "
                 "draft <drafts_json>")
    mode = sys.argv[1]
    if mode == "fetch":
        if len(sys.argv) != 4:
            sys.exit("用法：email_summary_imap.py fetch <since_iso> <out_json>")
        cmd_fetch(sys.argv[2], sys.argv[3])
    elif mode == "draft":
        if len(sys.argv) != 3:
            sys.exit("用法：email_summary_imap.py draft <drafts_json>")
        cmd_draft(sys.argv[2])
    else:
        sys.exit(f"未知模式：{mode}")


if __name__ == "__main__":
    main()
