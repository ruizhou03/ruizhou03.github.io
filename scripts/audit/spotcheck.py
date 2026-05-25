#!/usr/bin/env python3
"""抽检专项：每天从全站随机抽 10 个"项目"做深度审查（建设期高频抽检）。

"项目"的定义：
- note          —— 散文/笔记类 markdown（_notes/life, /research, /essays, /course-reviews, /gre, /toefl, /pre-high-school）
- lecture_note  —— 课程笔记 markdown（_notes/study/**）；又分两小类：
                   - lecture_note_full      正文有实质内容
                   - lecture_note_pdf_only  仅 PDF 存档（front-matter 设 pdf_url 且 markdown 正文几乎为空）
- game          —— toolbox/<slug>/index.html（小游戏 / 互动工具）
- pdf_archive   —— files/**/*.pdf 中没有对应 .tex 源的 PDF（潜在 LaTeX 化候选）

每天用日期做随机种子（同一天多次跑选中的 10 项保持一致）。
**类型配额**：建设期重点品类强制保底——每天至少 1 game + 1 pdf_archive + 1 lecture_note_pdf_only，
剩余 7 项从全集纯随机（不去重类型，可以再抽到上面三类）。

输出每项的：路径、类型、关键 metadata、规模、以及"按类型量身定制的批判性审查清单"。
不修改任何文件；只输出 markdown 报告给 daily-review Claude 阅读。
"""
import hashlib
import os
import random
import re
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]

ARTICLE_DIRS = [
    "_notes/life",
    "_notes/research",
    "_notes/essays",
    "_notes/course-reviews",
    "_notes/gre",
    "_notes/toefl",
    "_notes/pre-high-school",
]
LECTURE_DIR = "_notes/study"
TOOLBOX_DIR = "toolbox"
FILES_DIR = "files"

PICK_COUNT = 10
# 建设期类型配额：每天至少抽到这些类型各 1 项；剩余从全集纯随机。
QUOTA_TYPES = ["game", "pdf_archive", "lecture_note_pdf_only"]


def split_fm(text):
    if not text.startswith("---"):
        return None, None
    end = text.find("\n---", 3)
    if end == -1:
        return None, None
    return text[3:end].lstrip("\n"), text[end + 4:]


def fm_get(fm, key):
    if fm is None:
        return None
    m = re.search(rf"^{re.escape(key)}:\s*(.+)$", fm, re.M)
    if not m:
        return None
    val = m.group(1).strip()
    return val.strip('"').strip("'")


def human_bytes(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f}{unit}" if unit == "B" else f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def collect_articles():
    out = []
    for d in ARTICLE_DIRS:
        base = REPO / d
        if not base.exists():
            continue
        for root, _, files in os.walk(base):
            for fn in sorted(files):
                if not fn.endswith(".md"):
                    continue
                fp = Path(root) / fn
                try:
                    text = fp.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue
                fm, body = split_fm(text)
                if fm is None:
                    continue
                # 跳过菜谱（layout: recipe）—— 它有自己的 schema，不归"文章"
                if re.search(r"^layout:\s*recipe", fm, re.M):
                    continue
                out.append({
                    "type": "note",
                    "path": fp.relative_to(REPO),
                    "fm": fm,
                    "body": body,
                    "size": fp.stat().st_size,
                    "lines": text.count("\n") + 1,
                })
    return out


def collect_lecture_notes():
    out = []
    base = REPO / LECTURE_DIR
    if not base.exists():
        return out
    for root, _, files in os.walk(base):
        for fn in sorted(files):
            if not fn.endswith(".md"):
                continue
            fp = Path(root) / fn
            try:
                text = fp.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            fm, body = split_fm(text)
            if fm is None:
                continue
            has_pdf_url = bool(re.search(r"^pdf_url:", fm, re.M))
            body_strip_len = len(body.strip())
            is_pdf_only = has_pdf_url and body_strip_len < 80
            out.append({
                "type": "lecture_note_pdf_only" if is_pdf_only else "lecture_note_full",
                "path": fp.relative_to(REPO),
                "fm": fm,
                "body": body,
                "size": fp.stat().st_size,
                "lines": text.count("\n") + 1,
                "body_chars": body_strip_len,
            })
    return out


def collect_games():
    out = []
    base = REPO / TOOLBOX_DIR
    if not base.exists():
        return out
    for entry in sorted(base.iterdir()):
        if not entry.is_dir():
            continue
        idx = entry / "index.html"
        if not idx.exists():
            continue
        try:
            text = idx.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        fm, body = split_fm(text)
        title = fm_get(fm, "title") if fm else None
        # 总体规模：index.html + 同目录下所有 .js / .css
        total_bytes = idx.stat().st_size
        sibling_js = []
        for sib in entry.iterdir():
            if sib.is_file() and sib.suffix in (".js", ".css") and sib.name != "index.html":
                total_bytes += sib.stat().st_size
                sibling_js.append(sib.name)
        out.append({
            "type": "game",
            "slug": entry.name,
            "path": idx.relative_to(REPO),
            "title": title,
            "html_lines": text.count("\n") + 1,
            "html_bytes": idx.stat().st_size,
            "total_bytes": total_bytes,
            "sibling_assets": sibling_js,
        })
    return out


def collect_pdf_archives():
    out = []
    base = REPO / FILES_DIR
    if not base.exists():
        return out
    for root, _, files in os.walk(base):
        for fn in sorted(files):
            if not fn.endswith(".pdf"):
                continue
            fp = Path(root) / fn
            tex = fp.with_suffix(".tex")
            if tex.exists():
                continue  # 已有 .tex 源，不算"PDF-only"
            out.append({
                "type": "pdf_archive",
                "path": fp.relative_to(REPO),
                "size": fp.stat().st_size,
            })
    return out


def daily_seed():
    """日期+仓库路径做种子；同一天选出来的 3 项稳定。"""
    today = time.strftime("%Y-%m-%d")
    raw = f"{today}::{REPO}".encode("utf-8")
    return int(hashlib.sha256(raw).hexdigest()[:16], 16)


def checklist_for(item):
    t = item["type"]
    if t == "note":
        return [
            "**内容正确性**：通读全文，标出任何事实错误、过期信息、不严谨的表述、自相矛盾的段落。",
            "**结构与可读性**：段落组织是否合理？标题层级是否清楚？开篇是否抓人？结尾是否有 takeaway？",
            "**搜索可发现性**：keywords 是否覆盖读者会用的口语词、同义词、英文术语、错别字（参照 .claude/skills/search-keywords/SKILL.md）。",
            "**图文与配文**：图片是否都有 `<p class=\"img-caption\">` 配文（[[feedback_image_caption_style]]）？alt 是否填了？是否有可以用 inline SVG 替代外链图片的地方？",
            "**排版与样式**：中英文混排空格、中文不用斜体（[[feedback_chinese_no_italic]]）、数学公式必须 LaTeX（[[feedback_latex_formulas]]）、`---` 分割线（[[feedback_markdown_style]]）。",
            "**专栏一致性**（如属\"生活之问\"/\"科研之问\"等专栏）：五段结构、循证文献、调性是否符合。",
        ]
    if t == "lecture_note_full":
        return [
            "**内容正确性**：核心定义/定理/公式是否准确？是否存在已被新版课程更新淘汰的内容？",
            "**LaTeX 数学**：所有公式都用 $...$/$$...$$ 包裹？符号使用是否一致（标量/向量/算子规范）？",
            "**结构与索引**：是否有清晰目录/章节锚点？长文是否有 TOC？关键术语首次出现是否加粗或定义？",
            "**搜索可发现性**：keywords 是否包含课程名、英文术语、PSU/PKU 等学校代号、章节关键词？",
            "**配套资源**：是否链接到对应作业/cheat-sheet/期末？引用的外部资源是否仍可用？",
            "**对学习者友好度**：例题是否够、有没有可以加 worked example 的位置、抽象概念是否给了 intuition？",
        ]
    if t == "lecture_note_pdf_only":
        return [
            "**PDF 可达性**：`pdf_url` 路径是否仍有效？PDF 是否能在浏览器内嵌预览（layout: post 已配置）？",
            "**front-matter 完整性**：discipline / course / material_type / date / keywords 是否齐全？author 是否正确？",
            "**LaTeX 化可行性评估**：这份 PDF 是否值得长期可编辑化？若值得，估算工作量（页数、是否含图、是否手写）。**这是本类抽检的重点产出之一**——给出明确建议：① 立刻 LaTeX 化（高频复用/打算更新）② 加入低优队列（偶尔参考）③ 维持 PDF 存档即可（一次性资料、扫描件）。",
            "**导语质量**：是否启用了 PDF 自动导语（docs/MAINTENANCE.md 约定）？导语是否准确介绍了本笔记？",
            "**搜索可发现性**：纯 PDF 存档对搜索引擎不友好，keywords 必须更厚（覆盖课程别名、英文术语、教科书名）。",
            "**关联性**：是否链接到同课程的其他材料（cheat-sheet、作业、相关笔记）？",
        ]
    if t == "game":
        return [
            "**架构审查**：HTML/JS/CSS 是否合理拆分？是否复用了 `assets/js/games-shell.js` 与 `assets/css/games-shell.css`（[[reference_games_shell]]）？有没有重复造轮子？",
            "**代码质量**：单文件行数是否过长（>1000 行考虑拆分）？变量命名/函数职责清晰度？魔法数字是否提取为常量？事件监听是否清理（避免内存泄漏）？",
            "**UI / 视觉**：是否符合站点整体风格（高端典雅、不低级廉价）？字号/间距/配色是否与其他游戏一致？深色模式是否适配？",
            "**响应式与移动端**：手机竖屏是否能玩？触摸事件是否实现？按钮是否够大（>= 44pt）？",
            "**游戏体验模拟**：心里走一遍完整对局——开始/进行中/胜负/再来一局。每一步是否流畅？反馈是否及时？是否有让用户困惑的地方？",
            "**联机/排行榜状态**：本游戏是否已接入排行榜（lb）/催更（urge）/评论？若适配但未启用，写进待办；若不适配（如纯单人小工具）说明原因。",
            "**可访问性**：键盘可操作？焦点状态可见？颜色对比度足够？屏幕阅读器友好？",
            "**性能**：首屏加载、动画 60fps、长时间游玩是否卡顿？",
        ]
    if t == "pdf_archive":
        return [
            "**归属与必要性**：这份 PDF 是被哪个 markdown 笔记 link 的？grep 一下 `files/<...>.pdf` 路径，找不到引用就说明已成孤儿文件。",
            "**体积合理性**：是否过大（> 5MB）？是否已经 imgslim/pdfslim 过（[[reference_slim_tools]]）？注意 monetary-econ-2023 损坏不能压缩。",
            "**LaTeX 化潜力**：评估值不值得 LaTeX 化（参考 lecture_note_pdf_only 的判定）。",
            "**front-matter 联动**：对应的 markdown 笔记 front-matter 中 `pdf_url` 路径是否一致？文件名是否符合 [[project_taxonomy_conventions]] 的命名规则？",
        ]
    return ["（未知类型，按通用 UX/正确性/可发现性三维度过一遍即可）"]


def render_item(idx, item):
    print(f"\n### 抽检 {idx + 1}/{PICK_COUNT} — `{item['type']}`")
    print()

    if item["type"] in ("note", "lecture_note_full", "lecture_note_pdf_only"):
        fm = item["fm"]
        title = fm_get(fm, "title") or "(无标题)"
        sub = fm_get(fm, "sub_category")
        main = fm_get(fm, "main_category")
        course = fm_get(fm, "course")
        date = fm_get(fm, "date")
        pdf_url = fm_get(fm, "pdf_url")
        permalink = fm_get(fm, "permalink")
        print(f"- **路径**：`{item['path']}`")
        print(f"- **标题**：{title}")
        meta_bits = []
        if main:
            meta_bits.append(f"main_category={main}")
        if sub:
            meta_bits.append(f"sub_category={sub}")
        if course:
            meta_bits.append(f"course={course}")
        if date:
            meta_bits.append(f"date={date}")
        if meta_bits:
            print(f"- **front-matter**：{' · '.join(meta_bits)}")
        if pdf_url:
            print(f"- **pdf_url**：`{pdf_url}`")
        if permalink:
            print(f"- **permalink**：`{permalink}`")
        print(f"- **规模**：{item['lines']} 行 / {human_bytes(item['size'])}")
        if item["type"] == "lecture_note_pdf_only":
            print(f"- **正文字符数**：{item['body_chars']}（< 80 视为 PDF-only 存档）")

    elif item["type"] == "game":
        print(f"- **路径**：`{item['path']}`")
        print(f"- **slug**：`{item['slug']}`")
        print(f"- **标题**：{item['title'] or '(未在 front-matter 设)'}")
        print(f"- **规模**：index.html {item['html_lines']} 行 / {human_bytes(item['html_bytes'])}；连同同目录 .js/.css 共 {human_bytes(item['total_bytes'])}")
        if item["sibling_assets"]:
            print(f"- **同目录资源**：{', '.join(item['sibling_assets'])}")
        else:
            print(f"- **同目录资源**：无独立 js/css（全部 inline 在 index.html）")

    elif item["type"] == "pdf_archive":
        print(f"- **路径**：`{item['path']}`")
        print(f"- **体积**：{human_bytes(item['size'])}")
        print(f"- **.tex 源**：不存在（这是被抽中的核心原因——评估 LaTeX 化潜力）")

    print(f"\n**审查清单**：")
    for item_line in checklist_for(item):
        print(f"- {item_line}")
    print()


def main():
    print(f"# 抽检专项（{time.strftime('%Y-%m-%d %H:%M')}）\n")
    print(f"建设期高频抽检：按日期种子抽 {PICK_COUNT} 项（强制配额 {len(QUOTA_TYPES)} 类各 1：{', '.join(QUOTA_TYPES)}，其余纯随机），逐项做深度批判性审查。")
    print()

    inventory = []
    inventory += collect_articles()
    inventory += collect_lecture_notes()
    inventory += collect_games()
    inventory += collect_pdf_archives()

    if not inventory:
        print("**未发现任何可抽检项**（仓库结构可能有变化，检查 spotcheck.py 的 ARTICLE_DIRS / LECTURE_DIR / TOOLBOX_DIR / FILES_DIR 配置）。")
        return

    # 统计
    type_count = {}
    for it in inventory:
        type_count[it["type"]] = type_count.get(it["type"], 0) + 1
    print(f"**资产池规模**：共 {len(inventory)} 项 — " + " / ".join(f"{k}: {v}" for k, v in sorted(type_count.items())))
    print()

    rng = random.Random(daily_seed())

    # 1) 配额抽：从每个 QUOTA_TYPES 里强制各抽 1 项
    by_type = {}
    for it in inventory:
        by_type.setdefault(it["type"], []).append(it)
    picks = []
    quota_filled = []
    for qt in QUOTA_TYPES:
        bucket = by_type.get(qt, [])
        if bucket:
            chosen = rng.choice(bucket)
            picks.append(chosen)
            quota_filled.append(qt)
    # 2) 剩余从"全集减去已选"里纯随机抽
    chosen_ids = {id(x) for x in picks}
    remaining = [x for x in inventory if id(x) not in chosen_ids]
    extra_n = max(0, min(PICK_COUNT, len(inventory)) - len(picks))
    if extra_n and remaining:
        picks.extend(rng.sample(remaining, k=min(extra_n, len(remaining))))

    # 元信息
    print(f"**今日种子**：基于日期 + 仓库路径 SHA256；同日重跑选项稳定。")
    print(f"**类型配额**：建设期重点品类强制保底各抽 1（已配额：{', '.join(quota_filled) if quota_filled else '池空'}），剩余 {extra_n} 项纯随机。")
    print()
    print("---")

    for i, item in enumerate(picks):
        render_item(i, item)

    print("---\n")
    print("## 处理规则（写给 daily-review Claude）")
    print()
    print('- 对每一项**逐条**走清单——不是泛泛说"挺好的"。每个 checklist item 都要给出结论：① 没问题 ② 有问题（描述 + 建议）③ 拿不准（写进待办）。')
    print('- **审查中发现的"小而无争议"问题可以直接修**（错别字、明显坏链、缺 caption、缺 keywords 等），按既有规则处理；')
    print("- **任何涉及设计判断、内容改写、LaTeX 化、架构重构的，一律写进待办**，不要擅自动手。")
    print("- 把本次抽检结果写进 `DAILY_REVIEW.md` 一个**独立小节** `### 🔬 抽检专项`，结构：")
    print("  ```")
    print("  ### 🔬 抽检专项")
    print(f"  **抽检 1/{PICK_COUNT} · <类型> · `<path>`**")
    print("  - 已修复：...")
    print("  - 待办（P0/P1/P2）：...")
    print("  - 长期建议：...（LaTeX 化、架构重构等）")
    print("  ```")
    print(f"- {PICK_COUNT} 项一视同仁地深审；不要因为时间紧就草率给某一项写一两行。宁可慢、宁可保守，也要把判断做对。建设期就是要在质量门槛上多花时间。")


if __name__ == "__main__":
    main()
