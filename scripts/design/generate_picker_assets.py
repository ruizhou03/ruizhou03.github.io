#!/usr/bin/env python3
"""Generate the picker card icon and 1200x630 social preview."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
CREAM = "#f5f1e8"
NAVY = "#1e3a5f"
GOLD = "#b89252"
BLUE = "#426d9c"
GREEN = "#657f3f"
TERRACOTTA = "#b56f61"
INK = "#1a1a2e"
MUTED = "#667085"
FONT_PATH = "/System/Library/Fonts/Supplemental/Songti.ttc"


def font(size: int, index: int = 1) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size=size, index=index)


def draw_wheel(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], pointer=True) -> None:
    colors = [BLUE, GREEN, TERRACOTTA, NAVY]
    for idx, color in enumerate(colors):
        draw.pieslice(box, start=-90 + idx * 90, end=idx * 90, fill=color)
    width = max(5, (box[2] - box[0]) // 28)
    draw.ellipse(box, outline=NAVY, width=width)
    cx = (box[0] + box[2]) // 2
    cy = (box[1] + box[3]) // 2
    hub = max(12, (box[2] - box[0]) // 9)
    draw.ellipse((cx - hub, cy - hub, cx + hub, cy + hub), fill=CREAM, outline=GOLD, width=max(4, width - 1))
    draw.ellipse((cx - hub // 3, cy - hub // 3, cx + hub // 3, cy + hub // 3), fill=NAVY)
    if pointer:
        tip_y = box[1] - max(18, width * 3)
        base_y = box[1] + max(8, width)
        half = max(14, width * 3)
        draw.polygon([(cx, tip_y), (cx - half, base_y), (cx + half, base_y)], fill=GOLD)


def generate_icon() -> None:
    scale = 4
    image = Image.new("RGB", (192 * scale, 192 * scale), CREAM)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, 192 * scale - 1, 192 * scale - 1), radius=38 * scale, fill=CREAM)
    draw_wheel(draw, (33 * scale, 42 * scale, 159 * scale, 168 * scale))
    image.resize((192, 192), Image.Resampling.LANCZOS).save(ROOT / "assets/icons/picker-icon-192.png", optimize=True)


def generate_og() -> None:
    image = Image.new("RGB", (1200, 630), CREAM)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 22, 630), fill=NAVY)
    draw.rectangle((22, 0, 29, 630), fill=GOLD)
    draw.ellipse((70, 55, 540, 525), fill="#eee8dc")
    draw_wheel(draw, (145, 135, 465, 455))
    draw.text((600, 120), "RANDOM PICKER", font=font(28, 0), fill=GOLD, spacing=6)
    draw.text((590, 180), "遇事不决", font=font(92, 1), fill=INK)
    draw.line((595, 305, 1085, 305), fill=GOLD, width=3)
    draw.text((600, 345), "随机转盘 · 权重抽签 · 多轮决胜", font=font(34, 0), fill=NAVY)
    draw.rounded_rectangle((600, 430, 1015, 500), radius=35, fill=NAVY)
    draw.text((652, 446), "免费  ·  本地  ·  可分享", font=font(28, 0), fill="#ffffff")
    draw.text((600, 548), "ruizhou03.com/toolbox/picker", font=font(22, 0), fill=MUTED)
    image.save(ROOT / "assets/images/picker-og.png", optimize=True)


if __name__ == "__main__":
    generate_icon()
    generate_og()
    print("generated picker-icon-192.png and picker-og.png")
