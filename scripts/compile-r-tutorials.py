#!/usr/bin/env python3
"""从 files/r-tutorials/source/r-*.Rmd 编译，把 PDF/tex 放回 files/r-tutorials/"""
import subprocess, shutil
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SOURCE = REPO / "files/r-tutorials/source"
DEST = REPO / "files/r-tutorials"
DEMO_BASE = Path.home() / "Desktop/其他/北京大学/课程/大二下学期/心理统计 II/Demo"
HW_BASE = Path.home() / "Desktop/其他/北京大学/课程/大二下学期/心理统计 II/Homework"
TMP = Path("/tmp/r_compile")

# slug → demo_dir → extra data files
CONFIGS = [
    ("r-anova-manova",                  "5 Nested ANOVA & MANOVA",        []),
    ("r-multiple-linear-regression",    "7 Multiple Linear Regression",   [HW_BASE / "4" / "heart.csv"]),
    ("r-moderation-mediation",          "8 Moderation & Mediation",       []),
    ("r-correlation-distance",          "9 Correlation & Distance",       []),
    ("r-survival-analysis",             "12 Survival Analysis",           []),
    ("r-cluster-analysis",              "13 Clustering",                  [HW_BASE / "7" / "construction.xlsx"]),
    ("r-pca",                           "10 Exploratory FA",              []),
]

TMP.mkdir(exist_ok=True)
results = []

for slug, demo_dir, extras in CONFIGS:
    work = TMP / slug
    if work.exists():
        shutil.rmtree(work)
    # 拷数据
    src_dir = DEMO_BASE / demo_dir
    shutil.copytree(src_dir, work)
    for src in extras:
        if src.exists():
            shutil.copy(src, work / src.name)
    # 删原 Rmd（避免名字冲突），用 source/ 里的优化版替换
    for old_rmd in work.glob("*.Rmd"):
        old_rmd.unlink()
    shutil.copy(SOURCE / f"{slug}.Rmd", work / f"{slug}.Rmd")
    # 跑 R
    print(f"=== {slug} ===", flush=True)
    proc = subprocess.run(
        ["Rscript", "-e",
         f'rmarkdown::render("{slug}.Rmd", output_format = rmarkdown::pdf_document(keep_tex = TRUE, latex_engine = "xelatex", number_sections = TRUE, toc = TRUE))'],
        cwd=str(work), capture_output=True, text=True, timeout=900
    )
    out_pdf = work / f"{slug}.pdf"
    out_tex = work / f"{slug}.tex"
    if out_pdf.exists() and out_tex.exists():
        shutil.copy(out_pdf, DEST / f"{slug}.pdf")
        shutil.copy(out_tex, SOURCE / f"{slug}.tex")
        results.append((slug, f"OK pdf={out_pdf.stat().st_size}B tex={out_tex.stat().st_size}B"))
    else:
        tail = (proc.stderr or proc.stdout)[-500:]
        results.append((slug, f"FAIL: ...{tail!r}"))

print()
print("=== RESULTS ===")
for slug, status in results:
    print(f"{slug}: {status[:250]}")
