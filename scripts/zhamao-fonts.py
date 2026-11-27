#!/usr/bin/env python3
"""百变小咪网页版自带字体（2026-11-26 用户：模式牌、按钮、牌面这些游戏资产上的字要像图片一样固定，不随各人系统字体变）。

做法和微信小游戏（puffcat-wechat/tools/build-fonts.js）一样：把思源宋体（Noto Serif SC，SIL OFL，可商用）
常规 / 粗体截成只含游戏里真用到的字，再加一个 Gelasio 粗体（Georgia 的开源替身）的数字字体，放在自己站上：
  assets/fonts/zhamao/zm-serif-400.woff2 / zm-serif-700.woff2 / zm-num-700.woff2
  assets/fonts/zhamao/charset.txt     这次截了哪些字（tests/zhamao-fonts.test.js 拿它查漏字）

**游戏里加了新字（改牌名、加按钮、加台词……）要重跑本脚本**，否则新字会退回系统字体：
  python3 scripts/zhamao-fonts.py [原始字体目录]
原始字体目录里要有 NotoSerifSC-Regular.otf / NotoSerifSC-Bold.otf / Gelasio-700.ttf（或 Gelasio-Bold.ttf 可变字体）；
没给目录就下载到 /tmp/zhamao-fonts-src/（约 23 MB，不进 git）。依赖：pip install fonttools brotli
"""
import hashlib
import os
import re
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets/fonts/zhamao')
# 字表来源：游戏网页上会显示的所有代码（去掉注释）。和 tests/zhamao-fonts.test.js 里的 SOURCES 保持一致
SOURCES_DIRS = [('assets/js/games', r'^zhamao.*\.js$')]
SOURCES = ['assets/js/games/gongzhu-avatars.js', 'assets/js/games/gongzhu-social.js', 'assets/js/games/games-fx.js',
           'assets/js/games-shell/identity.js', 'assets/js/auth/auth.js', '_includes/auth.html',
           'assets/css/zhamao.css', 'toolbox/puffcat/index.html']
EXTRA = '×·—–…「」『』（）：；，。！？、“”‘’《》【】～✦★☆♥❤←→↑↓✓✗①②③④⑤⑥⑦⑧⑨'
NUM_TEXT = ''.join(chr(c) for c in range(32, 127)) + '×–—−·%‰'


def strip_comments(s):
    s = re.sub(r'/\*[\s\S]*?\*/', '', s)
    s = re.sub(r'<!--[\s\S]*?-->', '', s)
    return re.sub(r'(^|[^:\'"\\])//.*$', r'\1', s, flags=re.M)


def source_files():
    files = []
    for d, pat in SOURCES_DIRS:
        files += sorted(os.path.join(d, f) for f in os.listdir(os.path.join(ROOT, d)) if re.match(pat, f))
    return files + SOURCES


def charset():
    cs = set(chr(c) for c in range(32, 127)) | set(EXTRA)
    for f in source_files():
        with open(os.path.join(ROOT, f), encoding='utf-8') as fh:
            cs |= {ch for ch in strip_comments(fh.read()) if ord(ch) > 127 and not ch.isspace()}
    return ''.join(sorted(cs))


def fetch(src):
    os.makedirs(src, exist_ok=True)
    urls = {
        'NotoSerifSC-Regular.otf': 'https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf',
        'NotoSerifSC-Bold.otf': 'https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/SC/NotoSerifSC-Bold.otf',
        'Gelasio-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/gelasio/Gelasio%5Bwght%5D.ttf',
    }
    for name, url in urls.items():
        p = os.path.join(src, name)
        if not os.path.exists(p) and not (name == 'Gelasio-Bold.ttf' and os.path.exists(os.path.join(src, 'Gelasio-700.ttf'))):
            print('下载', name)
            urllib.request.urlretrieve(url, p)


# 版本号（2026-11-27 用户：设置里新加的「扮」字没走自带字体）：站点的 service worker 对静态资源是「先给缓存、后台再更新」，
# 字体网址一直不变 → 补了新字后第一次打开拿到的还是旧字体、新字退回系统字。所以网址带上文件内容的哈希，字体一变网址就变
STAMP_FILES = ['assets/css/zhamao.css', 'toolbox/puffcat/index.html']


def stamp():
    for f in STAMP_FILES:
        p = os.path.join(ROOT, f)
        with open(p, encoding='utf-8') as fh:
            s = fh.read()
        for name in ('zm-serif-400.woff2', 'zm-serif-700.woff2', 'zm-num-700.woff2'):
            with open(os.path.join(OUT, name), 'rb') as fh:
                h = hashlib.sha1(fh.read()).hexdigest()[:10]
            s = re.sub(re.escape('/assets/fonts/zhamao/' + name) + r'(\?v=[0-9a-f]+)?', '/assets/fonts/zhamao/' + name + '?v=' + h, s)
        with open(p, 'w', encoding='utf-8') as fh:
            fh.write(s)


def main():
    if '--stamp' in sys.argv:
        stamp(); return
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    src = args[0] if args else '/tmp/zhamao-fonts-src'
    fetch(src)
    gel = os.path.join(src, 'Gelasio-700.ttf')
    if not os.path.exists(gel):
        subprocess.check_call([sys.executable, '-m', 'fontTools.varLib.instancer', os.path.join(src, 'Gelasio-Bold.ttf'), 'wght=700', '-o', gel])
    os.makedirs(OUT, exist_ok=True)
    text = charset()
    cs_path = os.path.join(OUT, 'charset.txt')
    with open(cs_path, 'w', encoding='utf-8') as fh:
        fh.write(text)
    common = ['--flavor=woff2', '--no-hinting', '--desubroutinize', '--name-IDs=*']
    for w, name in (('400', 'Regular'), ('700', 'Bold')):
        subprocess.check_call([sys.executable, '-m', 'fontTools.subset', os.path.join(src, 'NotoSerifSC-%s.otf' % name),
                               '--text-file=' + cs_path, '--layout-features=', '--output-file=' + os.path.join(OUT, 'zm-serif-%s.woff2' % w)] + common)
    num = os.path.join(OUT, 'zm-num-700.woff2')
    if not os.path.exists(num) or '--num' in sys.argv:   # 数字字体只跟 NUM_TEXT 有关、不随游戏用字变：平时不重做（重做出来内容一样、二进制不同，白白换版本号）
        subprocess.check_call([sys.executable, '-m', 'fontTools.subset', gel, '--text=' + NUM_TEXT, '--layout-features=lnum,kern',
                               '--output-file=' + num] + common)
    stamp()
    sizes = ', '.join('%s %d KB' % (f, os.path.getsize(os.path.join(OUT, f)) // 1024) for f in sorted(os.listdir(OUT)) if f.endswith('.woff2'))
    print('✓ 字表 %d 个字符；%s' % (len(text), sizes))


if __name__ == '__main__':
    main()
