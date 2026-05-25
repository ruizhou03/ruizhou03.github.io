#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 DAILY_REVIEW.md 顶部最新一天的小节转成 email_summary_imap.py 风格的 HTML 片段。

输出片段会被 email_summary_imap.py 的 _HTML_SHELL 套外壳，可直接 SMTP 投递。
复用既有 CSS class：.head / .meta / .sec / .card / .card.red / .card.yellow
/ .card .top / .card .subj / .card .gist / .tag / .carry / .empty。

识别规则（与 daily_review.prompt.md 输出格式对齐）：
  ## YYYY-MM-DD              -> .head + .meta
  ### ✅/📋/🗂/💓/📬 ...      -> .sec
  #### P0/P1/P2 ...           -> 子段小标题 + 设置后续卡片颜色（red/yellow/plain）
  1. **标题** ... 后跟 3 空格缩进的 - 子项  -> 一张 .card（颜色随当前 P 级别）
  - 顶级 list                 -> 普通 <ul>
  其他文本                    -> <p>
内联：`code` / **bold** / [text](url) / 裸 URL。

用法：python3 daily_review_to_html.py <DAILY_REVIEW.md 路径> <输出 HTML 片段路径>
"""
import html as H
import re
import sys
from pathlib import Path


# ── 内联转换 ──
_CODE_STYLE = "background:#f3f3f3;padding:1px 5px;border-radius:3px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace"

def inline(s: str) -> str:
    """把 markdown 内联标记换成 HTML。先 escape 再替，避免 escape 把 HTML tag 自己也吃掉。"""
    s = H.escape(s, quote=False)
    # 行内代码 `xxx`
    s = re.sub(r"`([^`]+)`", lambda m: f'<code style="{_CODE_STYLE}">{m.group(1)}</code>', s)
    # 加粗 **xxx**
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    # 链接 [text](url)
    s = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", r'<a href="\2">\1</a>', s)
    # 裸 URL（避开已经在 href=" 里的）
    s = re.sub(r"(?<![\">=])\b(https?://[^\s<)\]'\"]+)", r'<a href="\1">\1</a>', s)
    return s


# ── 主流程：把顶部一节的行序列转成 HTML 块序列 ──
def extract_top_section(src: str) -> str:
    """抽顶部第一个 ## 起、到下一个 ## 或 --- 分隔前的内容。"""
    m = re.search(r"^## .*?(?=^---\s*$|^## |\Z)", src, re.M | re.S)
    return m.group(0).rstrip() if m else ""


# 行类型常量
TYPE_DATE      = "date"        # ## 2026-05-25
TYPE_SEC       = "sec"         # ### ✅ 本次已自动修复
TYPE_PRIORITY  = "priority"    # #### P0/P1/P2 ...
TYPE_OL_ITEM   = "ol_item"     # 1. **标题** ...
TYPE_OL_SUB    = "ol_sub"      # 3空格缩进的 - 子项（属于 OL 卡片）
TYPE_OL_SUB2   = "ol_sub2"     # 5空格缩进的 - 二级子项
TYPE_UL_ITEM   = "ul_item"     # 顶层 - 列表
TYPE_PARA      = "para"        # 普通段落
TYPE_HR        = "hr"          # ---
TYPE_BLANK     = "blank"

OL_PREFIX = re.compile(r"^(\d+)\.\s+(.*)$")
PRIORITY_PREFIX = re.compile(r"^####\s+(P[0-2])(.*)$")


def classify(raw: str):
    """返回 (类型, 内容字符串)。"""
    line = raw.rstrip()
    if not line.strip():
        return (TYPE_BLANK, "")
    if line.startswith("## ") and not line.startswith("### "):
        return (TYPE_DATE, line[3:].strip())
    if line.startswith("### "):
        return (TYPE_SEC, line[4:].strip())
    m = PRIORITY_PREFIX.match(line)
    if m:
        return (TYPE_PRIORITY, (m.group(1), m.group(2).strip()))
    if line.strip() == "---":
        return (TYPE_HR, "")
    # 缩进 list 子项（OL 内部）
    if line.startswith("     - "):
        return (TYPE_OL_SUB2, line[7:])
    if line.startswith("   - "):
        return (TYPE_OL_SUB, line[5:])
    # 顶层有序列表
    m = OL_PREFIX.match(line)
    if m:
        return (TYPE_OL_ITEM, m.group(2))
    # 顶层无序列表
    if line.startswith("- ") or line.startswith("* "):
        return (TYPE_UL_ITEM, line[2:])
    return (TYPE_PARA, line)


_PROMPT_TAIL = ("请遵循 docs/MAINTENANCE.md 与 CLAUDE.md 的项目约定，"
                "先告诉我处理方案再动手；改完按既定 git 工作流 add + commit + push。")

# 占位符：在标题渲染时插入到「同一行右侧的 td」，最后整段渲染完按 P 级别累积的卡片填回。
# 这样按钮才能跟「📋 待你把关」/「P0/P1/P2」小标题处在同一行，而不是另起一行。
PLACEHOLDER_ALL = "<!--__ALL_TASKS_PROMPT_PLACEHOLDER__-->"
PLACEHOLDER_GROUP = {
    "P0": "<!--__GROUP_P0_PLACEHOLDER__-->",
    "P1": "<!--__GROUP_P1_PLACEHOLDER__-->",
    "P2": "<!--__GROUP_P2_PLACEHOLDER__-->",
}


def _build_group_prompt(date: str, level: str, cards: list[dict]) -> str:
    """同一 P 级别下所有任务的合并 prompt。"""
    body_parts = []
    for i, c in enumerate(cards, 1):
        bullets = "\n".join(f"- {x}" for x in c["gist"]) if c["gist"] else "（无更多明细）"
        body_parts.append(f"## {i}. {c['subj']}\n{bullets}")
    body = "\n\n".join(body_parts)
    plural = f"共 {len(cards)} 条" if len(cards) > 1 else "1 条"
    return (
        f"请帮我处理 ruizhou03.github.io 项目的每日巡检 {level} 待办（{date}，{plural}）：\n\n"
        f"{body}\n\n"
        f"{_PROMPT_TAIL}"
    )


def _build_all_prompt(date: str, cards: list[dict]) -> str:
    """跨优先级的全部任务 prompt。"""
    if not cards:
        return ""
    body_parts = []
    for i, c in enumerate(cards, 1):
        bullets = "\n".join(f"- {x}" for x in c["gist"]) if c["gist"] else "（无更多明细）"
        body_parts.append(f"## {i}. [{c['level']}] {c['subj']}\n{bullets}")
    body = "\n\n".join(body_parts)
    return (
        f"请帮我处理 ruizhou03.github.io 项目的每日巡检全部待办（{date}，共 {len(cards)} 条）：\n\n"
        f"{body}\n\n"
        f"请按优先级（P0 → P1 → P2）逐条告诉我处理方案，确认后再动手；按既定 git 工作流提交。"
    )


def _inline_button(label: str, text: str, accent: str = "blue") -> str:
    """放在 table td 里的右侧按钮（details + summary 仿按钮造型）。
    收起时 summary 像个小药丸贴右；展开时 pre 块从右栏向下流出，
    自动换行（white-space:pre-wrap），整段邮件高度增加但可读。
    Gmail/Mail.app 都原生支持 <details>。"""
    btn_bg, btn_border, btn_color = {
        "red":    ("#fdecea", "#f5b5ad", "#a4332a"),
        "yellow": ("#fdf6e3", "#e6ce8a", "#7a5b16"),
        "blue":   ("#eaf2fb", "#b8d0ec", "#1e4d8c"),
    }.get(accent, ("#f0f1f3", "#d6d9de", "#3b6fb0"))
    btn_style = (f"background:{btn_bg};border:1px solid {btn_border};"
                 f"color:{btn_color};border-radius:5px;padding:4px 10px;font-size:12.5px;"
                 f"font-weight:600;cursor:pointer;user-select:none;list-style:none;"
                 f"display:inline-block;white-space:nowrap")
    pre_style = ("background:#f6f8fa;border:1px solid #e1e4e8;border-radius:5px;"
                 "padding:11px 12px;margin:8px 0 0;font-size:12.5px;"
                 "font-family:ui-monospace,SFMono-Regular,Menlo,monospace;"
                 "white-space:pre-wrap;word-wrap:break-word;color:#24292e;line-height:1.45;"
                 "text-align:left")
    return (
        f'<details style="display:inline-block;text-align:left">'
        f'<summary style="{btn_style}">{H.escape(label, quote=False)}</summary>'
        f'<pre style="{pre_style}">{H.escape(text, quote=False)}</pre>'
        f'</details>'
    )


def render(section: str, date: str = "") -> str:
    """把顶部小节渲染成 HTML 片段串。"""
    out = []
    classified = [classify(l) for l in section.splitlines()]

    # 状态
    current_card_color = ""   # ""/"red"/"yellow"
    in_card = False
    card_gist_buf = []        # 当前卡片的 gist 子项列表（已是 HTML <li> 字符串）
    card_raw_subj = ""        # 当前卡片的原始 markdown 标题（用于生成 prompt）
    card_raw_gist = []        # 当前卡片的原始 markdown 子项列表
    card_raw_level = ""       # 当前卡片的优先级 P0/P1/P2
    card_raw_carry = False    # 是否承接昨日
    cards_collected = []      # 所有已完成的卡片（用于「待你把关」下的总 prompt 占位替换）
    group_buffers = {"P0": [], "P1": [], "P2": []}  # 按 P 级别累积；最后批量填占位符
    current_priority_level = ""  # 跟踪上一次 #### 的 P 级别，用于识别"同级别再开 ####"
    ul_buf = []               # 顶层 <ul> 未结束的累积
    para_buf = []             # 段落未结束的累积

    def flush_para():
        if para_buf:
            txt = "<br>".join(inline(x) for x in para_buf)
            out.append(f'<p style="margin:8px 0;font-size:14px">{txt}</p>')
            para_buf.clear()

    def flush_ul():
        if ul_buf:
            items = "".join(f'<li style="margin:4px 0">{inline(x)}</li>' for x in ul_buf)
            out.append(f'<ul style="padding-left:22px;margin:8px 0;font-size:14px">{items}</ul>')
            ul_buf.clear()

    def flush_card():
        nonlocal in_card, current_card_color, card_raw_subj, card_raw_carry
        if not in_card:
            return
        gist = "".join(card_gist_buf)
        gist_html = f'<div class="gist"><ul style="margin:4px 0;padding-left:19px">{gist}</ul></div>' if gist else ""
        out.append(gist_html + "</div>")
        # 这张卡入收集列表 + 按 P 级别累积（最后批量填充按钮占位符）
        card_record = {
            "level": card_raw_level,
            "subj": card_raw_subj,
            "gist": list(card_raw_gist),
            "carry": card_raw_carry,
        }
        cards_collected.append(card_record)
        if card_raw_level in group_buffers:
            group_buffers[card_raw_level].append(card_record)
        in_card = False
        card_gist_buf.clear()
        card_raw_gist.clear()
        card_raw_subj = ""
        card_raw_carry = False

    def open_card(subj_md: str, carry: bool = False):
        nonlocal in_card, card_raw_subj, card_raw_level, card_raw_carry
        flush_para(); flush_ul()
        flush_card()
        color_class = f" {current_card_color}" if current_card_color else ""
        carry_tag = '<span class="carry">承接昨日</span>' if carry else ""
        subj = inline(subj_md)
        level_label = "P0" if current_card_color == "red" else ("P1" if current_card_color == "yellow" else "P2")
        out.append(
            f'<div class="card{color_class}">'
            f'<div class="top"><span class="tag">{level_label}</span>{carry_tag}</div>'
            f'<div class="subj">{subj}</div>'
        )
        in_card = True
        card_raw_subj = subj_md
        card_raw_level = level_label
        card_raw_carry = carry

    def push_card_sub(text: str, level: int = 1):
        """把缩进子项加进当前卡片的 gist。level=1 一级、2 嵌套。"""
        if not in_card:
            # 不在卡片里却来了缩进子项，当成顶层 ul（异常但兜底）
            ul_buf.append(text)
            return
        # 收集 raw markdown
        prefix = "  " if level == 2 else ""
        card_raw_gist.append(prefix + text)
        # 生成 HTML
        if level == 1:
            card_gist_buf.append(f'<li style="margin:3px 0">{inline(text)}</li>')
        else:
            # 嵌套子项：附在上一条 li 末尾
            if card_gist_buf and card_gist_buf[-1].endswith("</li>"):
                prev = card_gist_buf[-1][:-5]  # 去尾 </li>
                if "<ul" not in prev:
                    prev += '<ul style="margin:3px 0 0;padding-left:18px">'
                    prev_close_extra = "</ul>"
                else:
                    # 已经开了嵌套 ul，删掉它的 </ul> 把新条目塞进去
                    prev = prev.rsplit("</ul>", 1)[0]
                    prev_close_extra = "</ul>"
                prev += f'<li style="margin:2px 0">{inline(text)}</li>'
                card_gist_buf[-1] = prev + prev_close_extra + "</li>"
            else:
                card_gist_buf.append(f'<li style="margin:3px 0">{inline(text)}</li>')

    for typ, payload in classified:
        if typ == TYPE_DATE:
            flush_para(); flush_ul(); flush_card()
            out.append(f'<div class="head">🔍 每日巡检 · {H.escape(payload)}</div>')
            out.append('<div class="meta">由本机 LaunchAgent 跑完后直接 SMTP 投递</div>')
        elif typ == TYPE_SEC:
            flush_para(); flush_ul(); flush_card()
            current_card_color = ""           # 出新小节就清空 P 级别
            current_priority_level = ""       # 同时也清 P 跟踪
            if "待你把关" in payload:
                # 「📋 待你把关」改用 table 把按钮放右侧同一行；占位符最后用全部任务按钮替换
                out.append(
                    '<table cellpadding="0" cellspacing="0" border="0" width="100%" '
                    'style="border-collapse:collapse;margin:22px 0 10px">'
                    '<tr>'
                    f'<td style="font-size:15px;font-weight:700;color:#1a1a1a;'
                    'padding-bottom:5px;border-bottom:1px solid #ececec">'
                    f'{inline(payload)}</td>'
                    f'<td align="right" valign="middle" '
                    'style="border-bottom:1px solid #ececec;padding-bottom:3px">'
                    f'{PLACEHOLDER_ALL}</td>'
                    '</tr></table>'
                )
            else:
                out.append(f'<div class="sec">{inline(payload)}</div>')
        elif typ == TYPE_PRIORITY:
            flush_para(); flush_ul(); flush_card()
            level, rest = payload
            if level == "P0":
                current_card_color = "red"
            elif level == "P1":
                current_card_color = "yellow"
            else:
                current_card_color = ""
            # 同 P 级别再开 ####（如 P2 原 + P2 承接昨日）只输出小灰副标题，不重复 P 标签和按钮
            if level == current_priority_level:
                if rest:
                    rest_clean = inline(rest).lstrip("（(").rstrip("）)")
                    out.append(
                        f'<div style="font-size:12.5px;color:#888;margin:10px 0 4px;'
                        f'padding-left:4px">— {rest_clean}</div>'
                    )
            else:
                # 切到新 P 级别：用 table 一行两栏，左 P 标签 + rest，右 placeholder（最后填按钮）
                current_priority_level = level
                label_html = level + (
                    f' <span style="color:#999;font-weight:400;font-size:12.5px">{inline(rest)}</span>'
                    if rest else ""
                )
                out.append(
                    '<table cellpadding="0" cellspacing="0" border="0" width="100%" '
                    'style="border-collapse:collapse;margin:14px 0 6px">'
                    '<tr>'
                    f'<td style="font-size:13.5px;color:#666;font-weight:600">{label_html}</td>'
                    f'<td align="right" valign="middle">{PLACEHOLDER_GROUP[level]}</td>'
                    '</tr></table>'
                )
        elif typ == TYPE_OL_ITEM:
            # 解析"承接昨日"等标记（在 #### 行也可能出现）
            # 这里只是开新卡片，承接信息读自 #### 行——粗略：看 subject 里是否带「承接」
            carry = "承接" in payload
            open_card(payload, carry=carry)
        elif typ == TYPE_OL_SUB:
            push_card_sub(payload, level=1)
        elif typ == TYPE_OL_SUB2:
            push_card_sub(payload, level=2)
        elif typ == TYPE_UL_ITEM:
            flush_para()
            ul_buf.append(payload)
        elif typ == TYPE_HR:
            flush_para(); flush_ul(); flush_card()
            out.append('<hr>')
        elif typ == TYPE_PARA:
            flush_ul()
            para_buf.append(payload)
        elif typ == TYPE_BLANK:
            # 空行：结束当前段落，但不结束卡片（卡片里允许空行分组）
            flush_para()
            # ul 不在空行结束——下一非 ul 行才结束
        # 其他类型忽略

    flush_para(); flush_ul(); flush_card()

    result = "\n".join(out)

    # 替换占位符：「📋 待你把关」标题右侧 → 全部任务按钮
    if PLACEHOLDER_ALL in result:
        if cards_collected:
            all_prompt = _build_all_prompt(date or "今日", cards_collected)
            label = f"📋 复制所有 {len(cards_collected)} 条任务"
            all_block = _inline_button(label, all_prompt, accent="blue")
        else:
            all_block = ""
        result = result.replace(PLACEHOLDER_ALL, all_block)

    # 替换占位符：各 P 级别小标题右侧 → 组级按钮（同 P 级别只一个按钮）
    accent_for = {"P0": "red", "P1": "yellow", "P2": "blue"}
    for level in ("P0", "P1", "P2"):
        ph = PLACEHOLDER_GROUP[level]
        if ph not in result:
            continue
        cards = group_buffers[level]
        if cards:
            prompt = _build_group_prompt(date or "今日", level, cards)
            label = f"📋 复制 {level} 全部 {len(cards)} 条"
            block = _inline_button(label, prompt, accent=accent_for[level])
        else:
            block = ""
        result = result.replace(ph, block)

    return result


def main():
    if len(sys.argv) != 3:
        sys.exit("用法：daily_review_to_html.py <DAILY_REVIEW.md> <out.html>")
    src = Path(sys.argv[1]).read_text(encoding="utf-8")
    section = extract_top_section(src)
    if not section:
        Path(sys.argv[2]).write_text('<p class="empty">DAILY_REVIEW.md 没找到顶部小节。</p>', encoding="utf-8")
        return
    # 抽出顶部小节的日期（## YYYY-MM-DD 那行）
    date_match = re.match(r"^##\s+(\S+)", section)
    date = date_match.group(1) if date_match else ""
    html = render(section, date=date)
    Path(sys.argv[2]).write_text(html, encoding="utf-8")
    print(f"[daily-review-html] wrote {sys.argv[2]} ({len(html)} bytes)", file=sys.stderr)


if __name__ == "__main__":
    main()
