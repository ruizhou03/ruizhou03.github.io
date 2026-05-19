#!/usr/bin/env python3
"""给散文类文章（生活攻略/科研妙招/随笔漫谈，非 PDF 存档、非菜谱）注入
front-matter `keywords:`。读者常记得"文章讲过什么"而非确切标题，所以关键词
取自文章自己写下的、最具辨识度的部分——纯抽取、不杜撰：

  · 标题
  · 各级 markdown 小标题（剔除"问题/结论先行/参考来源"这类栏目骨架词）
  · 正文里括号内的英文 / 缩写，如（PCA）(MANOVA)
  · 作者加粗强调的短语 **…**
  · 行内代码里的函数 / 包名，如 `bruceR::EFA`

幂等：已有 keywords: 的文件跳过；可重复运行。生成的 keywords 是普通
front-matter，之后可手动增删。
"""
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..", "_notes")
TARGET_DIRS = ["life", "research", "essays"]
MAX_KW = 15

# 生活之问/通用文章的固定骨架小标题——每篇都有，做关键词没区分度
STOP = {
    "问题", "结论先行", "科学原理", "实践建议", "参考来源", "背景", "引言",
    "总结", "小结", "结语", "前言", "正文", "目录", "其他", "补充", "补充说明",
    "注意事项", "写在前面", "后记", "题外话",
}

def split_fm(text):
    if not text.startswith("---"):
        return None, None
    end = text.find("\n---", 3)
    if end == -1:
        return None, None
    return text[3:end].lstrip("\n"), text[end + 4:]

def clean(s):
    s = re.sub(r"`[^`]*`", " ", s)
    s = re.sub(r"\$[^$]*\$", " ", s)
    s = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", s)
    s = re.sub(r"[*_#>~]+", " ", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = s.replace("：", " ").replace(":", " ")
    s = re.sub(r"^[\U0001F000-\U0001FAFF☀-➿\s]+", "", s)  # 前导 emoji
    s = re.sub(r"\s+", " ", s).strip(" ：:·.，,、")
    return s

def extract(body):
    out = []
    in_code = False
    for line in body.splitlines():
        st = line.strip()
        if st.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        m = re.match(r"#{1,4}\s+(.+)", st)
        if m:
            h = clean(m.group(1))
            h = re.sub(r"^[\(（]?[0-9一二三四五六七八九十]+[\)）.、]\s*", "", h).strip()
            if 1 < len(h) <= 26 and h not in STOP:
                out.append(h)
    # 括号内英文 / 缩写
    for m in re.finditer(r"[（(]\s*([A-Za-z][\w .&/+-]{1,22})\s*[）)]", body):
        out.append(m.group(1).strip())
    # 加粗强调短语（只要短词组，跳过整句式的加粗）
    for m in re.finditer(r"\*\*([^*\n]{2,16})\*\*", body):
        b = clean(m.group(1))
        if b and b not in STOP and len(b) <= 14 and not re.search(r"[，。、；？！,.;]", b):
            out.append(b)
    # 行内代码里的函数 / 包名（含字母、像标识符）
    for m in re.finditer(r"`([^`\n]{2,22})`", body):
        c = m.group(1).strip()
        if re.search(r"[A-Za-z]", c) and re.fullmatch(r"[\w.:/&()+-]+", c):
            out.append(c)
    return out

def main():
    base = os.path.normpath(ROOT)
    seeded = skipped = 0
    for d in TARGET_DIRS:
        for dp, _, files in os.walk(os.path.join(base, d)):
            for fn in sorted(files):
                if not fn.endswith(".md"):
                    continue
                path = os.path.join(dp, fn)
                text = open(path, encoding="utf-8").read()
                fm, body = split_fm(text)
                if fm is None:
                    continue
                if re.search(r"^layout:\s*recipe", fm, re.M) or re.search(r"^keywords:", fm, re.M):
                    skipped += 1
                    continue
                if re.search(r"^pdf_url:", fm, re.M) and len(clean(body)) < 40:
                    skipped += 1
                    continue
                uniq, seen = [], set()
                # 标题永远收进来（无论多长——它本就最该被搜到）
                tm = re.search(r'^title:\s*"?(.+?)"?\s*$', fm, re.M)
                if tm:
                    t = clean(tm.group(1))
                    if t:
                        uniq.append(t)
                        seen.add(t.lower())
                # 抽取项：限制成短词组，去重
                for k in extract(body):
                    kl = k.lower()
                    if k and 1 < len(k) <= 26 and kl not in seen:
                        seen.add(kl)
                        uniq.append(k)
                uniq = uniq[:MAX_KW]
                if not uniq:
                    continue
                ylist = "[" + ", ".join('"%s"' % k.replace('"', "") for k in uniq) + "]"
                open(path, "w", encoding="utf-8").write(
                    "---\n" + fm.rstrip("\n") + "\nkeywords: " + ylist + "\n---" + body)
                seeded += 1
                print(f"{len(uniq):2d}kw  {os.path.relpath(path, base)}")
    print(f"\n== seeded {seeded}, skipped {skipped} ==")

if __name__ == "__main__":
    sys.exit(main())
