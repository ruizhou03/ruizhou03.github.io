export const meta = {
  name: 'monetary-body-to-latex',
  description: 'Convert the Monetary Economics markdown notes into textbook-format LaTeX chapters (figures referenced via \\input placeholders)',
  phases: [
    { title: 'Draft', detail: 'one agent per chapter converts a markdown section to textbook LaTeX' },
    { title: 'Verify', detail: 'correctness + LaTeX/style review per chapter' },
    { title: 'Fix', detail: 'apply corrections' },
  ],
}

const MD = '/Users/zhourui/Desktop/其他/北京大学/课程/大二下学期/货币经济学/Notes/Monetary Economics.md'
const SRC = '/Users/zhourui/Desktop/ruizhou03.github.io/files/monetary-econ/source'
const ECON = '/Users/zhourui/Desktop/ruizhou03.github.io/files/interm-econometrics/source/chapters/ch1_simple_regression.tex'

const LABELS = 'ch:money-model (Ch1), ch:barter (Ch2), ch:commodity (Ch3), ch:inflation (Ch4), ch:international (Ch5), ch:central-bank (Ch6), ch:money-supply (Ch7)'

const GUIDE = `
You are converting one section of an English Monetary Economics lecture note (Markdown) into one chapter of a polished, permanent LaTeX TEXTBOOK, in the SAME house style as an existing econometrics textbook. The body content already exists in Markdown, so this is faithful reformatting + light polishing, NOT rewriting. Preserve all the models, derivations, equations, and economic content.

=== OUTPUT ===
- One pure-LaTeX file, no Markdown, no triple-backtick fences, no invisible/non-ASCII junk characters.
- First lines:  % !TEX root = ../main.tex   then  \\chapter{<TITLE>}   then  \\label{<LABEL>}
- Then a short 1-2 paragraph plain-English story intro (motivation), then \\section/\\subsection mirroring the markdown headings (Markdown #->chapter already given, ##->\\section, ###->\\subsection).
- Read ${ECON} first to match the house voice and box usage.

=== BOXES (defined in ${SRC}/theorems.tex — READ IT) ===
Use where natural (do not force): \\defn{title}{body} (definitions: e.g. seigniorage, fiat money, real money demand), \\thm{title}{body} + \\pf{...} (key results, e.g. the golden-rule / monetary-equilibrium conditions), \\state{title}{body} (boxed key takeaway), \\ex[name]{body} (worked example), \\rmkb[name]{body} / \\rmk{...} (remarks). Monetary models are derivation-heavy, so much will be running prose + display math; that is fine. DO NOT use exam-only macros (\\strategy,\\template,\\reproduce,\\structure,\\intuition,\\proofskip).

=== MATH MACROS (defined in ${SRC}/commands.tex — READ IT) ===
Prefer where helpful: \\E{x}, \\Var{x}, \\Cov{x}{y}, \\given, \\plim, \\pto, \\dto, \\ba..\\ea (aligned), \\bc..\\ec (cases), \\RR, \\NN, \\d, \\pd{}{}, \\dd{}{}, \\abs{}, \\pr{}, \\br{}. Never use a macro not defined in commands.tex/theorems.tex/amsmath. Use \\[..\\], align/aligned, $...$ normally.

=== FIGURES (critical) ===
This markdown contains <img ...> tags (Typora screenshots). The figures are being drawn separately as TikZ files named figures/fig1.tex ... figures/fig7.tex, numbered in document order across the WHOLE note. In YOUR chapter, replace each <img ...> tag, in order, with a proper figure float that inputs the corresponding TikZ file:
\\begin{figure}[h]
\\centering
\\input{figures/figN}
\\caption{<a clean one-sentence caption describing the diagram, written from the surrounding text>}
\\label{fig:money-N}
\\end{figure}
where N is the global figure number for that image (your chapter's figures are listed below). Do NOT \\includegraphics anything. Do NOT draw the TikZ yourself — just the \\input placeholder + caption + label. Reference figures in prose as "Figure~\\ref{fig:money-N}".

=== MARKDOWN TABLES ===
Convert any Markdown tables (e.g. Fed balance-sheet T-accounts in the Money Supply chapter) into clean LaTeX booktabs tables (\\toprule/\\midrule/\\bottomrule). Balance-sheet T-accounts can be rendered as a two-column Assets/Liabilities tabular.

=== CORRECTNESS & POLISH ===
Keep all content. Fix obvious typos and any non-native phrasing into clean textbook English. Verify equations transcribe correctly (subscripts, the v_t/v_{t+1} price ratios, z and n growth factors, seigniorage algebra). Do not drop derivation steps. You may \\ref other chapters: ${LABELS}.

=== TONE ===
Calm, rigorous, self-contained textbook prose. Complete over terse.
`

const CHAPTERS = [
  { file: 'ch1_money_model', label: 'ch:money-model', title: 'A Simple Model of Money', lines: '29-178', figs: 'Figure 1 (fig:money-1, the golden-rule OLG allocation) appears in this chapter.' },
  { file: 'ch2_barter', label: 'ch:barter', title: 'Barter and the Cost of Exchange', lines: '179-198', figs: 'Figure 2 (fig:money-2, the barter-vs-money cost TABLE) appears in this chapter.' },
  { file: 'ch3_commodity_money', label: 'ch:commodity', title: 'Commodity Money', lines: '199-229', figs: 'No figures in this chapter.' },
  { file: 'ch4_inflation', label: 'ch:inflation', title: 'Inflation and Seigniorage', lines: '230-415', figs: 'Figures 3,4,5,6,7 (fig:money-3 .. fig:money-7) appear in this chapter, in order: fig:money-3 (monetary equilibrium), fig:money-4 (a return/price change), fig:money-5 (government expenditure g, z>1 vs z=1), fig:money-6 (population growth n), fig:money-7 (government expenditure, feasible version). Place each \\input where its <img> tag sits in the markdown.' },
  { file: 'ch5_international', label: 'ch:international', title: 'International Monetary Systems', lines: '416-575', figs: 'No figures in this chapter.' },
  { file: 'ch6_central_bank', label: 'ch:central-bank', title: 'The Central Bank and Its Independence', lines: '576-726', figs: 'No figures in this chapter.' },
  { file: 'ch7_money_supply', label: 'ch:money-supply', title: 'The Money Supply Process', lines: '727-985', figs: 'No <img> figures; render the Fed balance-sheet T-accounts as booktabs tables.' },
]

const ISSUES_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    issues: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: {
        severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
        category: { type: 'string', enum: ['math-error', 'factual-error', 'latex-compile', 'undefined-macro', 'figure-placeholder', 'table', 'style', 'clarity', 'missing-content'] },
        location: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' },
      }, required: ['severity', 'category', 'location', 'problem', 'fix'] } },
    overall: { type: 'string' },
  }, required: ['issues', 'overall'],
}
const FIX_SCHEMA = { type: 'object', additionalProperties: false, properties: { appliedCount: { type: 'number' }, unresolved: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['appliedCount', 'unresolved', 'notes'] }

function draftPrompt(ch) {
  return `Convert a section of the Monetary Economics notes into the textbook chapter "${ch.title}".

STEP 1 read: the style guide below; ${SRC}/theorems.tex and ${SRC}/commands.tex; ${ECON} (house voice). Then read the SOURCE markdown: Read ${MD} with offset/limit covering lines ${ch.lines}.
STEP 2 write the chapter to EXACTLY: ${SRC}/chapters/${ch.file}.tex  with \\chapter{${ch.title}} and \\label{${ch.label}}.

FIGURES IN THIS CHAPTER: ${ch.figs}

${GUIDE}

After writing, return 2-4 sentences: what the chapter covers and anything a reviewer should check.`
}
function verifyPrompt(ch) {
  return `Review the drafted chapter ${SRC}/chapters/${ch.file}.tex against the source markdown (${MD}, lines ${ch.lines}) and the macros (${SRC}/theorems.tex, ${SRC}/commands.tex).
Check: (1) all economic content/equations from the markdown are present and correctly transcribed (monetary models: OLG budget lines, seigniorage, v_t/v_{t+1}, growth factors z,n); (2) every <img> became a \\begin{figure}...\\input{figures/figN}...\\caption...\\label{fig:money-N}...\\end{figure} float with the correct figure number, and no \\includegraphics; (3) markdown tables became booktabs tables; (4) it compiles (no undefined macros — only theorems.tex/commands.tex/amsmath; no markdown leakage, no non-ASCII junk, no exam-only macros; balanced envs); (5) clean textbook English, house style. Report concrete issues with quotes + fixes. Empty array if clean.`
}
function fixPrompt(ch, issues) {
  const list = (issues || []).map((x, i) => `${i + 1}. [${x.severity}/${x.category}] @ ${x.location}\n   PROBLEM: ${x.problem}\n   FIX: ${x.fix}`).join('\n')
  return `Apply these review fixes to ${SRC}/chapters/${ch.file}.tex with the Edit tool (read it first). Apply all critical/major and clear minor fixes; preserve content; pure LaTeX only.\n\n${list || '(none)'}\n\nReturn counts + notes.`
}

const results = await pipeline(
  CHAPTERS,
  (ch) => agent(draftPrompt(ch), { label: `draft:${ch.label}`, phase: 'Draft' }).then(s => ({ ch, s })),
  (p) => agent(verifyPrompt(p.ch), { label: `verify:${p.ch.label}`, phase: 'Verify', schema: ISSUES_SCHEMA }).then(v => ({ ch: p.ch, issues: (v && v.issues) || [], overall: v && v.overall })),
  (p) => agent(fixPrompt(p.ch, p.issues), { label: `fix:${p.ch.label}`, phase: 'Fix', schema: FIX_SCHEMA }).then(f => ({ chapter: p.ch.title, file: p.ch.file, issueCount: p.issues.length, applied: f && f.appliedCount, unresolved: (f && f.unresolved) || [], overall: p.overall })),
)
return results.filter(Boolean)
