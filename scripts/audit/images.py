#!/usr/bin/env python3
"""图片可发现性 + 体积巡检：
- 找 markdown / html 里的 `![alt](path)` 和 `<img ...>`
- 报：① alt 为空 ② 紧邻下方没有 `<p class="img-caption">` ③ 体积过大可瘦身
- 也扫 assets / files / 顶层 *.png|jpg|gif|webp 大于阈值的原始文件

输出 markdown 报告到 stdout。不修改文件。

约定（来自 memory）：图片说明文字一律用 `<p class="img-caption">`。
"""
import os
import re
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SCAN_DIRS = ["_notes", "life", "research", "essays", "notes", "study"]
SCAN_EXT = {".md", ".html"}

# 图片体积阈值（字节）
IMG_LARGE = 500 * 1024     # 500 KB 警告
IMG_HUGE = 1500 * 1024     # 1.5 MB 强烈建议
PDF_LARGE = 2 * 1024 * 1024  # 2 MB 警告（PDF）

# 已知豁免：损坏 PDF（不能重压）、已知就该大的归档文件
EXEMPT_FILES = {
    "files/monetary-econ/monetary-econ-2023.pdf",   # 损坏，重压会丢内容
}

MD_IMG_RE = re.compile(r'!\[([^\]]*)\]\(([^)]+)\)')
HTML_IMG_RE = re.compile(r'<img\s+[^>]*src=["\']([^"\']+)["\'][^>]*>', re.I)
HTML_IMG_ALT_RE = re.compile(r'alt=["\']([^"\']*)["\']', re.I)
CAPTION_RE = re.compile(r'<p\s+class=["\']img-caption["\']')
# "应该是配文但用错形式"的启发式：图后紧跟一段短文（<= 80 字符）
# 且不是 markdown 标题/列表/代码/引用/另一张图/HTML 标签开头。
SHORT_PARAGRAPH_RE = re.compile(r'^[一-鿿A-Za-z0-9（(].{0,80}$')
EXCLUDE_LINE_RE = re.compile(r'^(#|>|-|\*|`|<|!\[|\[|\d+\.)')

# 已人工核对为正文（非配文）的条目，巡检时跳过——见同目录 caption_whitelist.txt
CAPTION_WHITELIST_FILE = Path(__file__).resolve().parent / "caption_whitelist.txt"


def load_caption_whitelist():
    """读 caption_whitelist.txt，返回 {(markdown相对路径, 图片src)} 集合。"""
    wl = set()
    if not CAPTION_WHITELIST_FILE.exists():
        return wl
    for line in CAPTION_WHITELIST_FILE.read_text(encoding="utf-8").splitlines():
        line = line.rstrip()
        if not line or line.startswith("#") or "\t" not in line:
            continue
        path, src = line.split("\t", 1)
        wl.add((path.strip(), src.strip()))
    return wl


CAPTION_WHITELIST = load_caption_whitelist()


def resolve_img_path(md_path: Path, src: str):
    """把 markdown 里写的 src 解析成仓库内路径。绝对 / 站内根路径都给抓上来。"""
    if src.startswith("http://") or src.startswith("https://"):
        return None  # 外链，不查体积
    if src.startswith("/"):
        return REPO / src.lstrip("/")
    return (md_path.parent / src).resolve()


def file_size(p: Path):
    try:
        return p.stat().st_size
    except Exception:
        return None


def main():
    print(f"# 图片巡检报告（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)

    missing_alt = []        # (file:line, src)
    missing_caption = []    # (file:line, src)
    large_in_post = []      # (file:line, src, size_kb)
    huge_in_post = []
    big_assets = []         # (path, size_kb) —— 仓库里独立的大文件

    for d in SCAN_DIRS:
        base = REPO / d
        if not base.exists():
            continue
        for root, _, files in os.walk(base):
            for fn in files:
                if os.path.splitext(fn)[1].lower() not in SCAN_EXT:
                    continue
                fp = Path(root) / fn
                try:
                    text = fp.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue
                lines = text.splitlines()
                for i, line in enumerate(lines, 1):
                    # markdown ![alt](src)
                    for m in MD_IMG_RE.finditer(line):
                        alt, src = m.group(1).strip(), m.group(2).strip()
                        if not alt:
                            missing_alt.append((f"{fp.relative_to(REPO)}:{i}", src))
                        # caption 检查（启发式）：下一非空行是"看起来像配文的短段落"
                        # 且不是 img-caption 包裹 → 才算漏写约定。
                        # 如果下一非空行是标题/列表/代码/另一张图/正文长段，
                        # 视为作者没写 caption（合法），不报。
                        nxt = ""
                        for j in range(i, min(i + 3, len(lines))):
                            s = lines[j].strip()
                            if s:
                                nxt = s
                                break
                        if (nxt
                                and not CAPTION_RE.search(nxt)
                                and not EXCLUDE_LINE_RE.match(nxt)
                                and SHORT_PARAGRAPH_RE.match(nxt)
                                and (str(fp.relative_to(REPO)), src) not in CAPTION_WHITELIST):
                            missing_caption.append((f"{fp.relative_to(REPO)}:{i}", src, nxt[:60]))
                        # 体积
                        ip = resolve_img_path(fp, src)
                        if ip and ip.exists():
                            sz = file_size(ip)
                            if sz and sz >= IMG_HUGE:
                                huge_in_post.append((f"{fp.relative_to(REPO)}:{i}", str(ip.relative_to(REPO)), sz // 1024))
                            elif sz and sz >= IMG_LARGE:
                                large_in_post.append((f"{fp.relative_to(REPO)}:{i}", str(ip.relative_to(REPO)), sz // 1024))
                    # html <img>
                    for m in HTML_IMG_RE.finditer(line):
                        src = m.group(1).strip()
                        am = HTML_IMG_ALT_RE.search(line)
                        alt = (am.group(1).strip() if am else "")
                        if not alt:
                            missing_alt.append((f"{fp.relative_to(REPO)}:{i}", src))

    # 扫一遍 assets/ files/ 下所有图与 pdf 的体积
    for d in ["assets", "files"]:
        base = REPO / d
        if not base.exists():
            continue
        for root, _, files in os.walk(base):
            for fn in files:
                ext = os.path.splitext(fn)[1].lower()
                fp = Path(root) / fn
                rel = str(fp.relative_to(REPO))
                if rel in EXEMPT_FILES:
                    continue
                sz = file_size(fp)
                if sz is None:
                    continue
                if ext in {".jpg", ".jpeg", ".png", ".gif", ".webp"} and sz >= IMG_HUGE:
                    big_assets.append((rel, sz // 1024, "图"))
                elif ext == ".pdf" and sz >= PDF_LARGE:
                    big_assets.append((rel, sz // 1024, "PDF"))

    total_issues = len(missing_alt) + len(missing_caption) + len(huge_in_post) + len(large_in_post) + len(big_assets)
    if total_issues == 0:
        print("✅ 图片可发现性 / 体积均无问题。", flush=True)
        return 0

    if huge_in_post:
        print(f"## 🔴 文章中引用的超大图（>1.5MB，强烈建议 imgslim）—— {len(huge_in_post)} 处\n")
        for ref, ip, kb in huge_in_post[:30]:
            print(f"- `{ip}` ({kb} KB) ← {ref}")
        if len(huge_in_post) > 30:
            print(f"- ...另 {len(huge_in_post)-30} 处")
        print()

    if large_in_post:
        print(f"## 🟡 文章中引用的较大图（500KB–1.5MB）—— {len(large_in_post)} 处\n")
        for ref, ip, kb in large_in_post[:20]:
            print(f"- `{ip}` ({kb} KB) ← {ref}")
        if len(large_in_post) > 20:
            print(f"- ...另 {len(large_in_post)-20} 处")
        print()

    if big_assets:
        print(f"## 📦 仓库内独立大文件（未必在用，建议核查）—— {len(big_assets)} 处\n")
        for p, kb, kind in big_assets[:30]:
            mb = kb / 1024
            print(f"- {kind} `{p}` ({mb:.2f} MB)")
        if len(big_assets) > 30:
            print(f"- ...另 {len(big_assets)-30} 处")
        print()

    if missing_caption:
        print(f"## 💬 疑似漏用 `<p class=\"img-caption\">` 包裹的配文 —— {len(missing_caption)} 处\n")
        print("> 站主约定：图片下方的说明文字应使用 `<p class=\"img-caption\">说明</p>` 包裹。\n")
        print('> 下面是图片紧邻短段落像配文但未包裹的情况；偶尔会把"短首段"误报。\n')
        for ref, src, nxt in missing_caption[:20]:
            print(f"- {ref} `{src}` → 紧邻段落：`{nxt}`")
        if len(missing_caption) > 20:
            print(f"- ...另 {len(missing_caption)-20} 处")
        print()

    if missing_alt:
        # alt 缺失是中文博客历史习惯，普遍存在；只汇总不刷屏
        print(f"## ♿ 缺 alt 文本的图 —— {len(missing_alt)} 处\n")
        print("> 仅作可访问性 / SEO 提醒；批量补 alt 是大改造，不属于每日修复范围。\n")
        # 列前 3 个作样本
        for ref, src in missing_alt[:3]:
            print(f"- {ref} `{src}`")
        if len(missing_alt) > 3:
            print(f"- ...另 {len(missing_alt)-3} 处（略）\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
