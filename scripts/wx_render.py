#!/usr/bin/env python3
"""
把 ruizhou03.github.io 的源 markdown 转换成适合粘贴到 https://md.doocs.org/
（公众号排版工具）的版本。

转换规则：
  1. 剥掉 YAML front-matter
  2. 图片相对路径 / -> 绝对 URL https://ruizhou03.github.io/...
  3. <p class="img-caption">…</p>
       -> <p style="text-align:center;font-size:13px;color:#9ca3af;
                    line-height:1.6;margin-top:6px;">…</p>
       （inline style，doocs/md 原样保留，公众号粘贴后样式也保留）

用法：
  python3 scripts/wx_render.py <md 文件>     # 输出到 stdout，并 pbcopy 到剪贴板
  python3 scripts/wx_render.py <md 文件> --no-copy   # 仅输出 stdout

仅适用于 layout=post 的文章。
菜谱（layout=recipe）的 ingredients/prep/steps 在 YAML 中，去掉 YAML 后会丢失，不适用。
"""
from __future__ import annotations

import argparse
import html
import re
import subprocess
import sys
from pathlib import Path

SITE_BASE = "https://ruizhou03.github.io"
CAPTION_STYLE = (
    "text-align:center;font-size:13px;color:#9ca3af;"
    "line-height:1.6;margin-top:6px;"
)


def strip_frontmatter(text: str) -> str:
    if not (text.startswith("---\n") or text.startswith("---\r\n")):
        return text
    lines = text.splitlines(keepends=True)
    end = None
    for i in range(1, len(lines)):
        if lines[i].rstrip("\r\n") == "---":
            end = i
            break
    if end is None:
        return text
    return "".join(lines[end + 1 :]).lstrip("\n")


def absolutize_images(text: str) -> str:
    def md_repl(m: re.Match) -> str:
        alt, src = m.group(1), m.group(2)
        if src.startswith("/"):
            return f"![{alt}]({SITE_BASE}{src})"
        return m.group(0)

    text = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", md_repl, text)

    def img_repl(m: re.Match) -> str:
        src = m.group(1)
        if src.startswith("/"):
            return m.group(0).replace(src, SITE_BASE + src)
        return m.group(0)

    text = re.sub(r'<img[^>]+src="([^"]+)"', img_repl, text)
    return text


def convert_caption(text: str) -> str:
    return re.sub(
        r'<p\s+class=["\']img-caption["\']>(.+?)</p>',
        f'<p style="{CAPTION_STYLE}">\\1</p>',
        text,
        flags=re.DOTALL,
    )


def convert_export_blocks(text: str) -> str:
    """把站内交互组件替换成公众号可渲染的静态内容。"""
    text = re.sub(
        r'<!--\s*wx:image\|([^|]+)\|([^\s]+)\s*-->.*?<!--\s*/wx:image\s*-->',
        lambda m: f"![{m.group(1).strip()}]({m.group(2).strip()})",
        text,
        flags=re.DOTALL,
    )

    def mermaid_repl(match: re.Match) -> str:
        source = html.unescape(match.group(1)).strip()
        return f"```mermaid\n{source}\n```"

    text = re.sub(
        r'<details\s+class=["\']dg-rules-details["\']>.*?'
        r'<pre\s+class=["\']mermaid dg-rules-flow["\'][^>]*>(.*?)</pre>.*?</details>',
        mermaid_repl,
        text,
        flags=re.DOTALL,
    )
    text = re.sub(r'^<(?:link|script)\b[^>]*>.*?</script>\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^<link\b[^>]*>\s*$', '', text, flags=re.MULTILINE)

    def summary_repl(match: re.Match) -> str:
        items = re.findall(
            r'<div class=["\']dg-stat["\']><strong>(.*?)</strong>'
            r'<span>(.*?)</span></div>',
            match.group(1),
            flags=re.DOTALL,
        )
        lines = []
        for heading, detail in items:
            clean_detail = re.sub(r'<br\s*/?>', '：', detail).strip()
            lines.append(f"> **{html.unescape(heading)}**｜{html.unescape(clean_detail)}")
        return "\n\n".join(lines)

    text = re.sub(
        r'<div\s+class=["\']dg-summary["\']>\s*'
        r'((?:<div\s+class=["\']dg-stat["\']>.*?</div>\s*)+)</div>',
        summary_repl,
        text,
        flags=re.DOTALL,
    )

    def links_repl(match: re.Match) -> str:
        links = re.findall(r'<a\s+href=["\']([^"\']+)["\']>(.*?)</a>', match.group(1))
        return "\n".join(f"- [{html.unescape(label)}]({href})" for href, label in links)

    text = re.sub(
        r'<div\s+class=["\']dg-data-links["\']>(.*?)</div>',
        links_repl,
        text,
        flags=re.DOTALL,
    )
    text = re.sub(
        r'<div\s+class=["\']dg-note["\']>(.*?)</div>',
        lambda m: '> ' + re.sub(r'<code>(.*?)</code>', r'`\1`', m.group(1), flags=re.DOTALL),
        text,
        flags=re.DOTALL,
    )
    return text


def absolutize_links(text: str) -> str:
    text = re.sub(
        r'\[([^\]]+)\]\((/[^)]+)\)',
        lambda m: f"[{m.group(1)}]({SITE_BASE}{m.group(2)})",
        text,
    )
    return re.sub(
        r'href=(["\'])(/[^"\']+)\1',
        lambda m: f'href={m.group(1)}{SITE_BASE}{m.group(2)}{m.group(1)}',
        text,
    )


def render(md_path: Path) -> str:
    text = md_path.read_text(encoding="utf-8")
    text = strip_frontmatter(text)
    text = convert_export_blocks(text)
    text = absolutize_images(text)
    text = absolutize_links(text)
    text = convert_caption(text)
    return text


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("path", help="markdown 文件路径")
    ap.add_argument("--no-copy", action="store_true", help="不拷贝到剪贴板")
    args = ap.parse_args()

    src = Path(args.path)
    if not src.is_file():
        print(f"找不到文件: {src}", file=sys.stderr)
        return 1

    text = render(src)
    sys.stdout.write(text)

    if not args.no_copy:
        try:
            subprocess.run(
                ["pbcopy"], input=text.encode("utf-8"), check=True
            )
            print(
                f"\n\n[✓ 已拷贝 {len(text)} 字到剪贴板。"
                f"打开 https://md.doocs.org/ 粘贴即可。]",
                file=sys.stderr,
            )
        except (FileNotFoundError, subprocess.CalledProcessError) as e:
            print(f"\n\n[剪贴板拷贝失败: {e}]", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
