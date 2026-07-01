#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""机票监控 · CLI 入口。

编排 config → scrape → judge(api|simple) → notify，外加几个管理子命令。
运行器实例目录默认 ~/.flightwatch/（FLIGHTWATCH_HOME 覆盖），
不复用任何私人 zircon 路径。定时调度的安装由安装器负责（Phase 3）。

    flightwatch run [--force]   跑一轮（定时触发点调这个）
    flightwatch panel           打开本地面板
    flightwatch status          看上次运行
    flightwatch pause / on      暂停 / 恢复盯票
    flightwatch uninstall       卸载（清定时 + 实例目录）
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from . import config as configmod
from . import notify as notifymod
from . import platform as plat


def home():
    return Path(os.environ.get("FLIGHTWATCH_HOME", str(Path.home() / ".flightwatch")))


class Paths:
    def __init__(self):
        self.dir = home()
        self.dir.mkdir(parents=True, exist_ok=True)
        self.config = self.dir / "flightwatch.json"
        self.settings = self.dir / "settings.json"
        self.credentials = self.dir / "credentials"
        self.history = self.dir / "history.json"
        self.state = self.dir / "state.json"
        self.results = self.dir / "results.json"
        self.verdict = self.dir / "verdict.json"
        self.report = self.dir / "report.md"
        self.panel = self.dir / "panel.html"
        self.pause = self.dir / "PAUSED"
        self.lastrun = self.dir / "lastrun"
        self.log = self.dir / "run.log"


def _now():
    return datetime.now(timezone.utc).isoformat()


def _read_json(path, default):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception:
        return default


def _read_kv(path):
    d = {}
    p = Path(path)
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                d[k.strip()] = v.strip()
    return d


def _email_creds(creds):
    user = os.environ.get("FLIGHTWATCH_EMAIL_USER") or creds.get("EMAIL_USER")
    if not user:
        return None
    return {"user": user,
            "password": os.environ.get("FLIGHTWATCH_EMAIL_PASSWORD") or creds.get("EMAIL_PASSWORD"),
            "host": creds.get("SMTP_HOST"), "port": creds.get("SMTP_PORT")}


def _has_api_key(creds):
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY")
                or os.environ.get("FLIGHTWATCH_API_KEY") or creds.get("API_KEY"))


# ─────────────────────────── run ───────────────────────────

def run_cycle(P, force=False, log=print, scrape=None):
    """一轮：抓取 → 判断 → 投递。scrape 可注入（测试）；否则懒导入 runner.scrape。"""
    if P.pause.exists() and not force:
        log("已暂停（flightwatch on 恢复）")
        return 0
    if not P.config.exists():
        log(f"配置缺失：{P.config}")
        return 1
    cfg = configmod.load(str(P.config))
    settings = _read_json(P.settings, {})
    creds = _read_kv(P.credentials)
    mode = settings.get("mode") or ("full" if _has_api_key(creds) else "simple")

    if scrape is None:
        try:
            from . import scrape as scrape  # noqa: PLW0127  唯一需真机的一层
        except Exception as e:
            log(f"scrape 模块未就绪（{e}）——抓取跳过；判断/投递不执行")
            return 2
    with plat.keep_awake():
        scrape.run(cfg, str(P.results), log=log)     # 约定：scrape.run(cfg, out_path, log=)

    now = _now()
    if mode == "full" and _has_api_key(creds):
        from . import judge_api
        verdict = judge_api.judge_files(cfg, str(P.results), str(P.history), str(P.state),
                                        str(P.verdict), str(P.report), now)
    else:
        from . import judge_simple
        verdict = judge_simple.simple_files(cfg, str(P.results), str(P.history), str(P.state),
                                            str(P.verdict), str(P.report), now)

    report_md = P.report.read_text(encoding="utf-8") if P.report.exists() else ""
    notifymod.deliver(verdict, report_md, cfg.get("delivery"),
                      creds=_email_creds(creds), panel_path=str(P.panel))
    P.lastrun.write_text(
        f"{now}\t{mode}\t{verdict.get('reason')}\t"
        f"{'notify' if verdict.get('should_notify') else 'quiet'}\n", encoding="utf-8")
    log(f"完成（{mode}）：{verdict.get('reason')} · should_notify={verdict.get('should_notify')}")
    return 0


def _logger(P):
    def log(msg):
        line = f"[{_now()}] {msg}"
        print(line)
        with open(P.log, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    return log


# ─────────────────────────── 管理子命令 ───────────────────────────

def cmd_panel(P):
    if not P.panel.exists():
        print("还没有面板（先跑一次 flightwatch run）")
        return 1
    plat.open_path(str(P.panel))
    print(f"已打开面板：{P.panel}")
    return 0


def cmd_status(P):
    if P.lastrun.exists():
        print("上次运行：" + P.lastrun.read_text(encoding="utf-8").strip())
    else:
        print("还没跑过（flightwatch run）")
    v = _read_json(P.verdict, None)
    if v:
        print(f"最近裁决：{v.get('reason')} · {v.get('summary', '')}")
    print(f"状态：{'已暂停' if P.pause.exists() else '盯票中'}")
    return 0


def cmd_pause(P):
    P.pause.write_text(_now(), encoding="utf-8")
    print("已暂停盯票（定时仍会触发，但会直接跳过）。flightwatch on 恢复。")
    return 0


def cmd_on(P):
    if P.pause.exists():
        P.pause.unlink()
    print("已恢复盯票。")
    return 0


def cmd_uninstall(P):
    if sys.platform == "darwin":
        plist = Path.home() / "Library/LaunchAgents/com.flightwatch.plist"
        if plist.exists():
            subprocess.run(["launchctl", "bootout", f"gui/{os.getuid()}", str(plist)],
                           capture_output=True)
            plist.unlink()
    import shutil
    shutil.rmtree(P.dir, ignore_errors=True)
    print("已卸载：定时任务与实例目录已清除，不留垃圾。")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="flightwatch", description="机票监控运行器")
    sub = ap.add_subparsers(dest="cmd")
    r = sub.add_parser("run", help="跑一轮")
    r.add_argument("--force", action="store_true", help="忽略暂停标记，强制跑")
    for c in ("panel", "status", "pause", "on", "uninstall"):
        sub.add_parser(c)
    args = ap.parse_args(argv)
    P = Paths()
    if args.cmd == "run":
        return run_cycle(P, force=args.force, log=_logger(P))
    if args.cmd == "panel":
        return cmd_panel(P)
    if args.cmd == "status":
        return cmd_status(P)
    if args.cmd == "pause":
        return cmd_pause(P)
    if args.cmd == "on":
        return cmd_on(P)
    if args.cmd == "uninstall":
        return cmd_uninstall(P)
    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
