#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""机票监控 · 平台适配层。

把私人版散落在 flight_watch.sh 里的 macOS 专属机制（桌面通知 / 防休眠 /
文件年龄 / 打开文件）抽成一层，按 platform.system() 分发。
**mac 优先**：darwin 全实现；win32 / linux 给能用的实现或安全降级，
Windows/Linux 的定时调度另在安装器里做（见 flightwatch CLI / Phase 3）。
"""
import contextlib
import os
import subprocess
import sys

OS = sys.platform  # 'darwin' | 'win32' | 'linux'


# ─────────────────────────── 桌面通知 ───────────────────────────

def notify_desktop(title, body):
    """弹一条系统桌面通知。best-effort，失败不抛。"""
    body = (body or "").replace("\n", " ")[:240]
    try:
        if OS == "darwin":
            t = title.replace('"', "'")
            b = body.replace('"', "'")
            subprocess.run(["/usr/bin/osascript", "-e",
                            f'display notification "{b}" with title "{t}" sound name "Glass"'],
                           check=True, capture_output=True, timeout=10)
        elif OS == "linux":
            subprocess.run(["notify-send", title, body], check=True,
                           capture_output=True, timeout=10)
        elif OS == "win32":
            # 无第三方库时用 PowerShell toast（best-effort）
            ps = (f'[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,'
                  f'ContentType=WindowsRuntime]|Out-Null;'
                  f'$t="{title} — {body}";'
                  f'[System.Windows.Forms.MessageBox]::Show($t)')
            subprocess.run(["powershell", "-NoProfile", "-Command", ps],
                           check=False, capture_output=True, timeout=10)
        else:
            return False
        return True
    except Exception:
        return False


# ─────────────────────────── 防休眠 ───────────────────────────

@contextlib.contextmanager
def keep_awake():
    """抓取/判断期间防止系统空闲休眠把无人值守进程冻住。非 mac 上是 no-op。"""
    proc = None
    try:
        if OS == "darwin":
            proc = subprocess.Popen(["/usr/bin/caffeinate", "-dimsu", "-w", str(os.getpid())])
        elif OS == "linux":
            # systemd-inhibit 有就用，没有就算了
            if _which("systemd-inhibit"):
                proc = subprocess.Popen(["systemd-inhibit", "--what=idle:sleep",
                                         "--who=flightwatch", "--why=盯票中", "sleep", "86400"])
        yield
    finally:
        if proc:
            with contextlib.suppress(Exception):
                proc.terminate()


# ─────────────────────────── 杂项 ───────────────────────────

def file_mtime(path):
    """文件修改时间（epoch 秒）。跨平台，替代 BSD `stat -f %m`。"""
    try:
        return os.path.getmtime(path)
    except OSError:
        return 0.0


def open_path(path):
    """用系统默认程序打开文件/目录（如本地面板 HTML）。best-effort。"""
    try:
        if OS == "darwin":
            subprocess.run(["/usr/bin/open", str(path)], check=False)
        elif OS == "win32":
            os.startfile(str(path))  # type: ignore[attr-defined]
        else:
            subprocess.run(["xdg-open", str(path)], check=False)
        return True
    except Exception:
        return False


def _which(cmd):
    from shutil import which
    return which(cmd)
