#!/usr/bin/env python3
"""发兑换码脚本 —— 在爱发电（或收款码）收到钱后，给读者发一张能解锁的码。

机制：本脚本调后端 /api/paid?action=mintcode（带 X-Admin-Secret），后端在 Upstash
里写入码记录并返回明码。你把码发给读者，读者在文章付费墙里输码即解锁。

两种码：
  - 单篇买断：解锁某一篇付费文章。
        python3 scripts/paywall/gen_codes.py article --slug my-slug --count 5
  - 站点会员：N 天内解锁全部付费文章。
        python3 scripts/paywall/gen_codes.py member --days 30 --count 3

每张码默认只能用 1 次（--max 1）。想发"一码多人用"（如群发的体验码）可调 --max。

    export PAYWALL_ADMIN_SECRET=xxxx
    python3 scripts/paywall/gen_codes.py article --slug my-slug --count 10
"""
from __future__ import annotations

import argparse
import os
import sys

try:
    import requests
except ImportError:
    print("需要 requests：pip3 install requests")
    sys.exit(1)

DEFAULT_BACKEND = "https://zircon-urge.fly.dev"


def main() -> int:
    ap = argparse.ArgumentParser(description="发付费墙兑换码")
    sub = ap.add_subparsers(dest="kind", required=True)

    a = sub.add_parser("article", help="单篇买断码")
    a.add_argument("--slug", required=True, help="付费文章的 paid_slug")

    m = sub.add_parser("member", help="会员码（解锁全部付费文章 N 天）")
    m.add_argument("--days", type=int, required=True, help="会员天数")

    for p in (a, m):
        p.add_argument("--count", type=int, default=1, help="发几张码（默认 1）")
        p.add_argument("--max", type=int, default=1, help="每张码可用几次（默认 1）")
        p.add_argument("--note", default="", help="备注（只存后端，自己看）")
        p.add_argument("--backend", default=os.environ.get("PAYWALL_BACKEND", DEFAULT_BACKEND))

    args = ap.parse_args()
    secret = os.environ.get("PAYWALL_ADMIN_SECRET", "")
    if not secret:
        print("缺 PAYWALL_ADMIN_SECRET 环境变量。")
        return 1

    payload = {"kind": args.kind, "count": args.count, "max": args.max, "note": args.note}
    if args.kind == "article":
        payload["slug"] = args.slug
    else:
        payload["days"] = args.days

    resp = requests.post(
        f"{args.backend}/api/paid?action=mintcode",
        headers={"Content-Type": "application/json", "X-Admin-Secret": secret},
        json=payload, timeout=30,
    )
    if not resp.ok:
        print(f"发码失败 {resp.status_code}: {resp.text[:300]}")
        return 2

    data = resp.json()
    codes = data.get("codes", [])
    print(f"✓ 已发 {len(codes)} 张码（kind={args.kind}, 每张可用 {args.max} 次）：\n")
    for c in codes:
        print(f"    {c}")
    print(f"\ngrant={data.get('grant')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
