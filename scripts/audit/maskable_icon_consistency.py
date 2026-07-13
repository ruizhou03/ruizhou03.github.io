#!/usr/bin/env python3
"""maskable 图标巡检：声明为 `purpose:"maskable"` 的 PWA 图标不应与同尺寸 `purpose:"any"` 图标字节相同。

意图：maskable 图标会被 Android 启动器按圆形/squircle 遮罩裁掉外圈约 20%（安全区只保证中心
80% 直径的圆内可见）。如果 maskable 版和普通（any）版是同一张图，主体铺满时外圈装饰（如
forest 的金环、pindou 的爱心尖）就会被裁掉。正确做法是把主体收进 80% 安全圈、四周留同色出血。

2026-07-13：forest / ledger / pindou 三个工具的 `*-icon-maskable-512.png` 曾与 `*-icon-512.png`
字节完全相同（`5c58756` 声称做了「收进 80% 安全圈」的 v2 但未落地），挂了 7 天。本脚本就是
防这种退化再次发生——任何新工具若把 maskable 图标直接复用普通图标，这里会当场照亮。

判定：遍历每个 `manifest.json`（站点根 + `toolbox/*/`），取其中 `purpose` 含 "maskable" 的图标，
在同一 manifest 里找同尺寸、`purpose` 含 "any"（或未标 purpose）的图标，比较两者字节 md5。
相同即报警。找不到同尺寸 any 对照的 maskable 图标只做提示、不算错。

输出 markdown 报告到 stdout。不修改文件。
"""
import hashlib
import json
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def md5(path):
    return hashlib.md5(path.read_bytes()).hexdigest() if path.exists() else None


def purposes(icon):
    return set((icon.get("purpose") or "any").split())


def find_manifests():
    yield from sorted(REPO.glob("manifest.json"))
    yield from sorted(REPO.glob("toolbox/*/manifest.json"))


def main():
    print(f"# maskable 图标巡检（{time.strftime('%Y-%m-%d %H:%M')}）\n", flush=True)
    print("> 声明 `purpose:\"maskable\"` 的图标若与同尺寸 `any` 图标字节相同，安卓遮罩会裁掉外圈。\n")

    dupes = []      # (manifest_rel, maskable_src, any_src, size)
    missing = []    # maskable 声明了但文件不存在
    checked = 0

    for man in find_manifests():
        try:
            data = json.loads(man.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if not isinstance(data, dict):
            continue
        icons = data.get("icons") or []
        man_dir = man.parent
        man_rel = man.relative_to(REPO)

        def resolve(src):
            # manifest 里的 src 多为站点绝对路径（/assets/...），也兼容相对路径
            return (REPO / src.lstrip("/")) if src.startswith("/") else (man_dir / src)

        for icon in icons:
            if "maskable" not in purposes(icon):
                continue
            checked += 1
            m_src = icon.get("src", "")
            m_path = resolve(m_src)
            m_hash = md5(m_path)
            if m_hash is None:
                missing.append((str(man_rel), m_src))
                continue
            size = icon.get("sizes", "")
            # 找同尺寸的 any 对照
            for other in icons:
                if other is icon:
                    continue
                if other.get("sizes", "") != size:
                    continue
                if "any" not in purposes(other):
                    continue
                if md5(resolve(other.get("src", ""))) == m_hash:
                    dupes.append((str(man_rel), m_src, other.get("src", ""), size))
                    break

    if not dupes and not missing:
        print(f"✅ 已检查 {checked} 个 maskable 图标声明，均与 any 图标不同（外圈已收进安全圈）。", flush=True)
        return 0

    if dupes:
        print(f"## maskable 图标与 any 图标字节相同 —— {len(dupes)} 处\n")
        print("> 请把主体缩进 80% 安全圈后另存 maskable 版（四周留同色出血），别直接复用普通图标。\n")
        for man_rel, m_src, a_src, size in dupes:
            print(f"- `{man_rel}`（{size}）：`{m_src}` == `{a_src}`")
        print()

    if missing:
        print(f"## maskable 图标声明了但文件不存在 —— {len(missing)} 处\n")
        for man_rel, m_src in missing:
            print(f"- `{man_rel}`：`{m_src}`")

    return 0


if __name__ == "__main__":
    sys.exit(main())
