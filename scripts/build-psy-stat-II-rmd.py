#!/usr/bin/env python3
"""第四版 R 编译：逐个 Rmd 针对性补丁
   每个 Rmd 报错根因明确后，对应一个 patch 函数"""
import subprocess, shutil, re
from pathlib import Path

DEMO_BASE = Path.home() / "Desktop/其他/北京大学/课程/大二下学期/心理统计 II/Demo"
HW_BASE = Path.home() / "Desktop/其他/北京大学/课程/大二下学期/心理统计 II/Homework"
REPO = Path(__file__).resolve().parent.parent
TMP = Path("/tmp/rb_psy4")

# 通用：剥掉本机绝对路径前缀（单/双引号都处理）
def strip_abspath(text):
    text = re.sub(
        rf"(['\"]){re.escape(str(Path.home()))}/Desktop/Psychological Statistics/[^'\"]+?/([^'\"/]+?)\1",
        lambda m: m.group(1) + m.group(2) + m.group(1),
        text
    )
    return text

def patch_mlr(text):
    """chunk 4 用 salary 等变量但没 attach。在 chunk 3 之后加 attach(df)。"""
    text = strip_abspath(text)
    # 在 chunk `df = readxl::read_excel("data02-01.xlsx", sheet = 1)` 之后追加 attach
    text = text.replace(
        'df = readxl::read_excel("data02-01.xlsx", sheet = 1)\n',
        'df = readxl::read_excel("data02-01.xlsx", sheet = 1)\nattach(df)\n'
    )
    return text

def patch_survival(text):
    """sfit_sex 用 strata(sex) 在新版 survminer 里 ggsurvplot 取不到 groups。
       改成 ~ sex 兼容写法 + 显式传 data=lung。"""
    text = strip_abspath(text)
    text = text.replace(
        'sfit_sex = survfit(Surv(time,status==2)~strata(sex))',
        'sfit_sex = survfit(Surv(time, status==2) ~ sex, data = lung)'
    )
    return text

def patch_cluster(text):
    """chunk 22 用 Homework/7/construction.xlsx —— 已经在 extra_files 里拷过去，
       只需剥路径。"""
    text = strip_abspath(text)
    return text

def patch_moderation(text):
    """图片路径剥掉，依赖 Demo 子目录里的同名 jpeg/png（已 copytree 进来）。"""
    text = strip_abspath(text)
    return text

def patch_correlation(text):
    """同 moderation。"""
    text = strip_abspath(text)
    return text

# slug, demo_dir, rmd_file, patch_fn, extra_files
TASKS = [
    ("r-anova-manova",                  "5 Nested ANOVA & MANOVA",         "Nested_MANOVA2023.Rmd",                       strip_abspath, []),
    ("r-multiple-linear-regression",    "7 Multiple Linear Regression",    "Lecture7_MLR.Rmd",                            patch_mlr,
        [(HW_BASE / "4" / "heart.csv", "heart.csv")]),
    ("r-moderation-mediation",          "8 Moderation & Mediation",        "Lecture8_Moderation.Mediation 2023.Rmd",      patch_moderation, []),
    ("r-correlation-distance",          "9 Correlation & Distance",        "Lecture9_correlation distance.Rmd",           patch_correlation, []),
    ("r-survival-analysis",             "12 Survival Analysis",            "L12_Survival_Analysis.Rmd",                   patch_survival, []),
    ("r-cluster-analysis",              "13 Clustering",                   "L13_Clustering.Rmd",                          patch_cluster,
        [(HW_BASE / "7" / "construction.xlsx", "construction.xlsx")]),
]

TMP.mkdir(exist_ok=True)
results = []

for slug, demo_dir, rmd_file, patch_fn, extra_files in TASKS:
    src_dir = DEMO_BASE / demo_dir
    work_dir = TMP / slug
    if work_dir.exists():
        shutil.rmtree(work_dir)
    shutil.copytree(src_dir, work_dir)
    for src, dst_name in extra_files:
        if src.exists():
            shutil.copy(src, work_dir / dst_name)
    rmd_path = work_dir / rmd_file
    new_rmd = work_dir / f"{slug}.Rmd"
    text = rmd_path.read_text(encoding="utf-8", errors="ignore")
    text = patch_fn(text)
    new_rmd.write_text(text)
    rmd_path.unlink()
    cmd = [
        "Rscript", "-e",
        f'rmarkdown::render("{slug}.Rmd", output_format = rmarkdown::pdf_document(keep_tex = TRUE, latex_engine = "xelatex", number_sections = TRUE, toc = TRUE))'
    ]
    print(f"=== {slug} ===", flush=True)
    proc = subprocess.run(cmd, cwd=str(work_dir), capture_output=True, text=True, timeout=600)
    out_pdf = work_dir / f"{slug}.pdf"
    out_tex = work_dir / f"{slug}.tex"
    if out_pdf.exists() and out_tex.exists():
        shutil.copy(out_pdf, REPO / "files/r-tutorials" / f"{slug}.pdf")
        shutil.copy(out_tex, REPO / "files/r-tutorials/source" / f"{slug}.tex")
        results.append((slug, f"OK pdf={out_pdf.stat().st_size}B tex={out_tex.stat().st_size}B"))
    else:
        tail = (proc.stderr or proc.stdout)[-500:]
        results.append((slug, f"FAIL: ...{tail!r}"))

print()
print("=== RESULTS ===")
for slug, status in results:
    print(f"{slug}: {status[:300]}")
