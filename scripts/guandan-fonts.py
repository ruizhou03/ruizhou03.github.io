#!/usr/bin/env python3
"""掼蛋网页版自带字体（2026-11-26 用户：「提示」两个字和别的字字体不一样）。

原先借用百变小咪截好的字体（assets/fonts/zhamao/），但那份只截了小咪用到的字，
掼蛋的「示」「抗」「贡」等字缺字、退回系统字体。这里照 scripts/zhamao-fonts.py 的做法，
把思源宋体（Noto Serif SC，SIL OFL）常规 / 粗体截成掼蛋页面真用到的字：
  assets/fonts/guandan/gd-serif-400.woff2 / gd-serif-700.woff2
  assets/fonts/guandan/charset.txt
数字仍用小咪那份 zm-num-700.woff2（只含 ASCII，两边一样）。

**掼蛋里加了新字（改按钮、加提示……）要重跑本脚本**：
  python3 scripts/guandan-fonts.py <原始字体目录>
目录里要有 NotoSerifSC-Regular.(otf|ttf) 与 NotoSerifSC-Bold.(otf|ttf)，
或 npm 包 @expo-google-fonts/noto-serif-sc 里的 NotoSerifSC_400Regular.ttf / NotoSerifSC_700Bold.ttf。
依赖：pip install fonttools brotli
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets/fonts/guandan')
SOURCES_DIRS = [('assets/js/games', r'^guandan(?!.*\.min\.js$).*\.js$')]
SOURCES = ['toolbox/guandan/index.html', 'assets/css/guandan.css', 'assets/css/guandan-shell.css',
           'assets/js/games-shell/identity.js', 'assets/js/games/gongzhu-avatars.js', 'assets/js/games/gongzhu-social.js',
           'assets/js/games/games-fx.js', 'assets/js/auth/auth.js', '_includes/auth.html']
EXTRA = '×·—–…「」『』（）：；，。！？、“”‘’《》【】～✦★☆♥❤←→↑↓✓✗①②③④⑤⑥⑦⑧⑨'


def strip_comments(s):
    s = re.sub(r'/\*[\s\S]*?\*/', '', s)
    s = re.sub(r'<!--[\s\S]*?-->', '', s)
    return re.sub(r'(^|[^:\'"\\])//.*$', r'\1', s, flags=re.M)


def source_files():
    files = []
    for d, pat in SOURCES_DIRS:
        files += sorted(os.path.join(d, f) for f in os.listdir(os.path.join(ROOT, d)) if re.match(pat, f))
    return files + [f for f in SOURCES if os.path.exists(os.path.join(ROOT, f))]


def charset():
    cs = set(chr(c) for c in range(32, 127)) | set(EXTRA)
    for f in source_files():
        with open(os.path.join(ROOT, f), encoding='utf-8') as fh:
            cs |= {ch for ch in strip_comments(fh.read()) if ord(ch) > 127 and not ch.isspace()}
    return ''.join(sorted(cs))


def find_src(src, weight, name):
    for cand in ('NotoSerifSC-%s.otf' % name, 'NotoSerifSC-%s.ttf' % name, 'NotoSerifSC_%s%s.ttf' % (weight, name)):
        for dirpath, _, files in os.walk(src):
            if cand in files:
                return os.path.join(dirpath, cand)
    sys.exit('找不到 %s 粗细的思源宋体（%s）' % (weight, src))


def recenter(path):
    """2026-11-27 用户：按钮里的字整体偏下。思源宋体的行框是上 1.151 / 下 0.286 em，
    汉字字身却在 -0.08 ~ 0.84 em，字的中心比行框中心低约 0.05 em。把行框改成上 0.98 / 下 0.22
    （总高 1.2），字身正好落在正中。iOS 微信（WebKit）不认 CSS 的 ascent-override，只能改字体文件本身。"""
    from fontTools.ttLib import TTFont
    f = TTFont(path)
    asc, desc = 980, -220
    f['hhea'].ascent, f['hhea'].descent, f['hhea'].lineGap = asc, desc, 0
    o = f['OS/2']
    o.sTypoAscender, o.sTypoDescender, o.sTypoLineGap = asc, desc, 0
    o.usWinAscent, o.usWinDescent = asc, -desc
    o.fsSelection |= 1 << 7   # USE_TYPO_METRICS
    f.flavor = 'woff2'
    f.save(path)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    text = charset()
    cs_path = os.path.join(OUT, 'charset.txt')
    with open(cs_path, 'w', encoding='utf-8') as fh:
        fh.write(text)
    common = ['--flavor=woff2', '--no-hinting', '--desubroutinize', '--name-IDs=*']
    for w, name in (('400', 'Regular'), ('700', 'Bold')):
        subprocess.check_call([sys.executable, '-m', 'fontTools.subset', find_src(src, w, name),
                               '--text-file=' + cs_path, '--layout-features=', '--output-file=' + os.path.join(OUT, 'gd-serif-%s.woff2' % w)] + common)
        recenter(os.path.join(OUT, 'gd-serif-%s.woff2' % w))
    sizes = ', '.join('%s %d KB' % (f, os.path.getsize(os.path.join(OUT, f)) // 1024) for f in sorted(os.listdir(OUT)) if f.endswith('.woff2'))
    print('✓ 字表 %d 个字符；%s' % (len(text), sizes))


if __name__ == '__main__':
    main()
