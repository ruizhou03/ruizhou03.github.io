#!/usr/bin/env python3
"""付费墙端到端冒烟测试 —— 部署后跑一次，确认整条链路通。

模拟：管理员上传一篇测试锁定正文 → 发一张单篇码 → 读者无凭证取正文被 402 拦 →
读者兑换码拿到 token → 带 token 取正文成功。全程打在一个临时 slug 上，跑完自动下架。

    export PAYWALL_ADMIN_SECRET=xxxx
    python3 scripts/paywall/smoke_test.py
    python3 scripts/paywall/smoke_test.py --backend http://localhost:3000   # 本地起服务时
"""
from __future__ import annotations
import argparse, os, sys
try:
    import requests
except ImportError:
    print("需要 requests：pip3 install requests"); sys.exit(1)

DEFAULT_BACKEND = "https://zircon-urge.fly.dev"
SLUG = "__smoke_test__"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--backend", default=os.environ.get("PAYWALL_BACKEND", DEFAULT_BACKEND))
    args = ap.parse_args()
    secret = os.environ.get("PAYWALL_ADMIN_SECRET", "")
    if not secret:
        print("缺 PAYWALL_ADMIN_SECRET。"); return 1
    B = args.backend
    admin = {"Content-Type": "application/json", "X-Admin-Secret": secret}
    fails = []

    def check(label, cond):
        print(("  ✓ " if cond else "  ✗ ") + label)
        if not cond: fails.append(label)

    print(f"后端 {B}\n1) 上传锁定正文")
    r = requests.post(f"{B}/api/paid?action=publish", headers=admin,
                      json={"slug": SLUG, "body": "# 测试\n这是锁定正文。", "title": "冒烟"}, timeout=30)
    check(f"publish 200 (got {r.status_code})", r.status_code == 200)

    print("2) 读者无凭证取正文 → 应 402")
    r = requests.get(f"{B}/api/paid?action=content&slug={SLUG}", timeout=30)
    check(f"无凭证 402 (got {r.status_code})", r.status_code == 402)

    print("3) 发一张单篇买断码")
    r = requests.post(f"{B}/api/paid?action=mintcode", headers=admin,
                      json={"kind": "article", "slug": SLUG, "count": 1}, timeout=30)
    code = (r.json().get("codes") or [None])[0] if r.ok else None
    check(f"mintcode 拿到码 ({code})", bool(code))

    token = None
    if code:
        print("4) 读者兑换")
        r = requests.post(f"{B}/api/redeem", headers={"Content-Type": "application/json"},
                          json={"code": code}, timeout=30)
        d = r.json() if r.ok else {}
        token = d.get("token")
        check(f"redeem 拿到 token ({str(token)[:14]}…)", bool(token))
        check("redeem 同码二次用 → 409",
              requests.post(f"{B}/api/redeem", headers={"Content-Type": "application/json"},
                            json={"code": code}, timeout=30).status_code == 409)

    if token:
        print("5) 带凭证取正文 → 应 200 且有 body")
        r = requests.get(f"{B}/api/paid?action=content&slug={SLUG}",
                         headers={"X-Unlock-Token": token}, timeout=30)
        check(f"带凭证 200 (got {r.status_code})", r.status_code == 200)
        check("正文非空", bool(r.json().get("body")) if r.ok else False)

    print("6) 清理：下架测试 slug")
    requests.post(f"{B}/api/paid?action=unpublish", headers=admin, json={"slug": SLUG}, timeout=30)

    print(f"\n{'✅ 全部通过' if not fails else '❌ 失败: ' + ', '.join(fails)}")
    return 0 if not fails else 2


if __name__ == "__main__":
    sys.exit(main())
