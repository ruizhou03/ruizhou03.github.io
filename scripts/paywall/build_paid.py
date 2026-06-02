#!/usr/bin/env python3
"""付费文章构建脚本 —— 把 _paid/ 里的全文劈成「公开预览」+「锁定正文」。

核心铁律：锁定正文绝不进公开仓库、绝不进 Jekyll 构建产物，只上传到后端 Upstash。
本脚本做两件事：
  1. 把 `<!-- PAYWALL -->` 标记之前的预览部分，写成一篇正常的已发布文章（committed，
     Jekyll 照常构建），front-matter 带 paid:true，让 post.html 渲染付费墙卡片。
  2. 把标记之后的锁定正文（markdown）POST 到后端 /api/paid?action=publish，存进 Upstash。
     前端验证读者凭证后才下发、用 marked.js 渲染。

_paid/<name>.md 的 front-matter 约定（除常规 post 字段外）：
    paid: true              # 必须
    paid_public: life/xxx/slug.md   # 必须：预览文件写到仓库里的哪个路径
    paid_slug: my-slug      # 可选：后端 key，默认取 permalink 末段
    price: 9.9              # 单篇买断价（元），展示用
    column: liuxue          # 可选：所属专栏 id；买断该专栏的码可解锁本篇（含将来新增）
    column_price: 39        # 可选：整栏买断价（元），展示用
    member_price: 19        # 可选：月费会员价，展示用
    afdian_url: https://afdian.com/a/ruizhou03   # 可选：爱发电付款页
正文里用一行 `<!-- PAYWALL -->` 分隔免费预览和锁定正文。

用法：
    export PAYWALL_ADMIN_SECRET=xxxx          # 与后端 fly secret 一致
    python3 scripts/paywall/build_paid.py _paid/my-article.md
    python3 scripts/paywall/build_paid.py --all
    python3 scripts/paywall/build_paid.py --dry-run _paid/my-article.md   # 只写预览、不上传

锁定正文限制：标准 markdown（marked.js 能渲染），可内嵌 <p class="img-caption"> 等 HTML
和 $...$ 数学（页面已加载 KaTeX，注入后自动渲染）。不要用 Liquid 标签 / kramdown {:...} 属性。
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import yaml

try:
    import requests
except ImportError:
    requests = None

REPO = Path(__file__).resolve().parents[2]
PAID_DIR = REPO / "_paid"
MARKER = "<!-- PAYWALL -->"
DEFAULT_BACKEND = "https://zircon-urge.fly.dev"

# 写进公开预览 front-matter 的字段顺序（只保留对外安全的）
PUBLIC_FIELDS = [
    "layout", "title", "main_category", "sub_category", "date", "author",
    "permalink", "published", "keywords", "summary", "image", "cover",
    "paid", "paid_slug", "price", "column", "column_price", "member_price", "afdian_url",
]
# 仅供构建用、绝不写进公开文件的字段
INTERNAL_FIELDS = {"paid_public"}


def split_frontmatter(text: str):
    if not text.startswith("---"):
        raise ValueError("文件缺少 YAML front-matter")
    end = text.find("\n---", 3)
    if end == -1:
        raise ValueError("front-matter 未正确闭合")
    fm_raw = text[3:end].strip("\n")
    body = text[end + 4:]
    if body.startswith("\n"):
        body = body[1:]
    return yaml.safe_load(fm_raw) or {}, body


def build_preview_frontmatter(fm: dict) -> str:
    out = {}
    for k in PUBLIC_FIELDS:
        if k in fm and k not in INTERNAL_FIELDS:
            out[k] = fm[k]
    # 兜底：未声明的其它公开字段也带上（除内部字段），保持作者自由
    for k, v in fm.items():
        if k not in out and k not in INTERNAL_FIELDS:
            out[k] = v
    out["paid"] = True
    if fm.get("published") is None:
        out["published"] = True
    dumped = yaml.safe_dump(out, allow_unicode=True, sort_keys=False, default_flow_style=False)
    return f"---\n{dumped}---\n"


def process(path: Path, backend: str, secret: str, dry_run: bool) -> bool:
    text = path.read_text(encoding="utf-8")
    fm, body = split_frontmatter(text)

    if not fm.get("paid"):
        print(f"  ✗ {path.name}: front-matter 缺 paid:true，跳过")
        return False
    public_rel = fm.get("paid_public")
    if not public_rel:
        print(f"  ✗ {path.name}: 缺 paid_public（预览文件写到哪），跳过")
        return False

    if MARKER not in body:
        print(f"  ✗ {path.name}: 正文里没有 {MARKER} 分隔标记，跳过")
        return False
    preview, locked = body.split(MARKER, 1)
    preview, locked = preview.strip() + "\n", locked.strip() + "\n"
    if not locked.strip():
        print(f"  ✗ {path.name}: 标记之后没有锁定正文，跳过")
        return False

    slug = fm.get("paid_slug") or fm.get("permalink", "").rstrip("/").split("/")[-1]
    if not slug:
        print(f"  ✗ {path.name}: 无法确定 slug（给个 paid_slug 或 permalink）")
        return False
    # 始终把算出的 slug 写进预览 front-matter，前端付费墙靠 page.paid_slug 取它
    fm["paid_slug"] = slug

    # 1) 写公开预览文件
    public_path = REPO / public_rel
    public_path.parent.mkdir(parents=True, exist_ok=True)
    banner = (
        "<!-- ⚠ 本文件由 scripts/paywall/build_paid.py 从 _paid/" + path.name +
        " 自动生成：只含免费预览，锁定正文在后端。请勿手改这里，改源文件后重跑脚本。 -->\n"
    )
    public_path.write_text(
        build_preview_frontmatter(fm) + "\n" + banner + preview, encoding="utf-8"
    )
    print(f"  ✓ 预览 → {public_rel}  (slug={slug}, 预览 {len(preview)} 字符, 锁定 {len(locked)} 字符)")

    # 2) 上传锁定正文到后端
    if dry_run:
        print(f"    [dry-run] 跳过上传；锁定正文前 80 字：{locked.strip()[:80]!r}")
        return True
    if requests is None:
        print("    ✗ 未安装 requests，无法上传。pip3 install requests 后重试。")
        return False
    if not secret:
        print("    ✗ 缺 PAYWALL_ADMIN_SECRET 环境变量，无法上传。")
        return False

    meta = {
        "price": fm.get("price"),
        "columnPrice": fm.get("column_price"),
        "memberPrice": fm.get("member_price"),
        "afdianUrl": fm.get("afdian_url"),
        "column": fm.get("column"),
    }
    meta = {k: v for k, v in meta.items() if v is not None}
    resp = requests.post(
        f"{backend}/api/paid?action=publish",
        headers={"Content-Type": "application/json", "X-Admin-Secret": secret},
        json={"slug": slug, "body": locked, "format": "markdown",
              "title": fm.get("title"), "column": fm.get("column"), "meta": meta},
        timeout=30,
    )
    if resp.ok:
        print(f"    ✓ 锁定正文已上传后端：{resp.json()}")
        return True
    print(f"    ✗ 上传失败 {resp.status_code}: {resp.text[:200]}")
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description="构建付费文章：劈分预览 + 上传锁定正文")
    ap.add_argument("paths", nargs="*", help="_paid/ 下的 markdown 文件；留空配 --all")
    ap.add_argument("--all", action="store_true", help="处理 _paid/ 下所有 .md")
    ap.add_argument("--backend", default=os.environ.get("PAYWALL_BACKEND", DEFAULT_BACKEND))
    ap.add_argument("--dry-run", action="store_true", help="只写预览、不上传后端")
    args = ap.parse_args()

    secret = os.environ.get("PAYWALL_ADMIN_SECRET", "")

    if args.all:
        files = sorted(PAID_DIR.glob("*.md"))
    else:
        files = [Path(p) if Path(p).is_absolute() else (REPO / p) for p in args.paths]
    if not files:
        print("没有要处理的文件。给个 _paid/xxx.md 或用 --all。")
        return 1

    print(f"后端：{args.backend}{'  (dry-run)' if args.dry_run else ''}")
    ok = 0
    for f in files:
        if not f.exists():
            print(f"  ✗ 找不到 {f}")
            continue
        print(f"处理 {f.name} …")
        if process(f, args.backend, secret, args.dry_run):
            ok += 1
    print(f"\n完成：{ok}/{len(files)} 篇。")
    return 0 if ok == len(files) else 2


if __name__ == "__main__":
    sys.exit(main())
