export const meta = {
  name: 'monetary-figures-to-tikz',
  description: 'Convert the 7 figures in the Monetary Economics notes to TikZ/LaTeX, each agent self-renders and compares against the original to iterate',
  phases: [
    { title: 'Figures', detail: 'one agent per figure: view original + context, draw TikZ, render, compare, iterate' },
  ],
}

const MD = '~/Desktop/其他/北京大学/课程/大二下学期/货币经济学/Notes/Monetary Economics.md'
const SRC = 'files/monetary-econ/source'
const ECON_STYLE = 'files/interm-econometrics/source/chapters/ch6_dummies.tex'

const FIGS = [
  { id: 1, kind: 'diagram', ctx: '37-105',  what: 'OLG two-period model, "Golden Rule Allocation". Axes c1 (horizontal), c2 (vertical). A straight feasible/resource line through the endowment point (y, y) with the two axis-intercepts both labelled y; a family of convex indifference curves; the golden-rule allocation E = (c1*, c2*) where the highest attainable indifference curve is tangent to the feasible line, with dashed guide lines down to c1* and across to c2*. Other labelled points C (upper-left on the line), B (lower-right on the line), D (a point on a higher, unattainable indifference curve), and the annotation "The Golden Rule Allocation" with an arrow pointing to E.' },
  { id: 2, kind: 'table',   ctx: '179-199', what: 'A 2x3 cost-comparison TABLE (NOT a diagram): rows "Barter" and "Money"; columns "Expected Search Cost", "Exchange Cost", "Total Cost". Entries: Barter row = alpha*(J^2 - J),  lambda,  alpha*(J^2 - J) + lambda. Money row = 2*alpha*J,  lambda + lambda_M,  2*alpha*J + lambda + lambda_M. Render as a clean booktabs table, NOT TikZ.' },
  { id: 3, kind: 'diagram', ctx: '234-304', what: 'OLG monetary equilibrium. Axes c1, c2. A convex indifference curve U^0; a downward-sloping budget line with slope -(v_t/v_{t+1}); vertical-axis intercept labelled both y and y+a stacked (y below, y+a above) and the algebraic intercept [v_{t+1}/v_t] y + a = y/z + a; horizontal-axis the budget line reaches y + [v_t/v_{t+1}] a = y + z a; tangency equilibrium at (c1*, c2*) with dashed guides; a brace under the horizontal axis from c1* to y labelled "Real money demand".' },
  { id: 4, kind: 'diagram', ctx: '270-318', what: 'OLG with money, comparing two budget lines (a price/return change). Axes c1, c2. Vertical intercepts y (top) and y/z + a (lower, labelled). A thick grey steeper budget line and a thin black flatter budget line, crossing at the equilibrium (c1*, c2*) with dashed guides; indifference curve U^1; horizontal intercepts y and y + z a; the flatter line carries the label y + [v_t/v_{t+1}] a = y + z a; point A marked on the upper region.' },
  { id: 5, kind: 'diagram', ctx: '304-340', what: 'OLG with government expenditure g, comparing z>1 vs z=1. Axes c1, c2. Vertical intercepts y-g (top) and y/z (lower, labelled). A thick grey steep budget line and a thin black flatter line; points A (upper) and B (the equilibrium, where curves/lines meet); indifference curves; horizontal intercepts y-g and y; two horizontal braces / range bars beneath the axis: a shorter one "real money demand for z>1" and a longer one "real money demand for z=1".' },
  { id: 6, kind: 'diagram', ctx: '334-360', what: 'OLG with population growth n. Axes c1, c2. Vertical intercepts n*y (top, labelled "ny") and [n/z] y + a (lower, labelled); a thick grey steeper budget line and a thin black flatter line; points A (upper) and B (equilibrium at (c1*, c2*)) with dashed guides; indifference curves; horizontal intercepts y and y + (z/n) a.' },
  { id: 7, kind: 'diagram', ctx: '356-416', what: 'OLG with government expenditure financed by money (similar to fig 5 but the non-distorting/feasible version). Axes c1, c2. Vertical intercepts y-g (top) and y/z (lower, labelled); a thick grey steeper budget line and a thin black flatter line crossing at equilibrium B=(c1*, c2*) with dashed guides; point A above; indifference curves; horizontal intercepts y-g and y.' },
]

const SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    figId: { type: 'number' },
    caption: { type: 'string', description: 'a one-sentence figure caption in clean English, textbook voice' },
    matchConfidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    iterations: { type: 'number' },
    remainingDiscrepancies: { type: 'string', description: 'any ways the TikZ still differs from the original, or "none"' },
    whatItShows: { type: 'string', description: 'brief: what the diagram depicts, for the comparison doc' },
  },
  required: ['figId', 'caption', 'matchConfidence', 'iterations', 'remainingDiscrepancies', 'whatItShows'],
}

function figPrompt(f) {
  const wrapper = `\\documentclass[border=10pt]{standalone}
\\usepackage{amsmath,amssymb}
\\usepackage{tikz}\\usepackage{pgfplots}\\pgfplotsset{compat=1.18}
\\usetikzlibrary{positioning,arrows.meta,patterns,calc,decorations.pathreplacing}
\\usepackage{booktabs}
\\begin{document}
\\input{fig${f.id}.tex}
\\end{document}`
  return `You are reproducing ONE figure from a Monetary Economics lecture note as clean ${f.kind === 'table' ? 'LaTeX (a booktabs TABLE)' : 'TikZ'} for a published textbook. The figure must faithfully match the original.

=== STEP 1: SEE THE ORIGINAL ===
Read the original image: /tmp/monetary-figs/orig-fig${f.id}.png
Study every axis label, curve, line, point, intercept label, arrow, and annotation.

=== STEP 2: UNDERSTAND THE ECONOMICS ===
Read the surrounding explanation in the source notes: Read ${MD} with offset/limit covering lines ${f.ctx}. The equations there define the exact slopes and intercepts the figure encodes. ${f.kind === 'table' ? '' : 'Also read ' + ECON_STYLE + ' to match the house TikZ style (thick lines for the main curves, {-Latex} arrowheads on axes, $...$ math labels, [densely dotted] dashed guide lines).'}

What this figure shows: ${f.what}

=== STEP 3: WRITE THE FIGURE ===
Write the ${f.kind === 'table' ? 'table' : 'tikzpicture'} to EXACTLY this path: ${SRC}/figures/fig${f.id}.tex
- The file must contain ONLY the ${f.kind === 'table' ? '\\begin{tabular}...\\end{tabular} (booktabs: \\toprule/\\midrule/\\bottomrule)' : '\\begin{tikzpicture}[...]...\\end{tikzpicture}'} block (no figure float, no caption, no preamble).
- Use ONLY plain LaTeX + amsmath + tikz/pgfplots (for diagrams) or booktabs (for the table). Do NOT use any custom macros like \\E, \\Var, \\hb (those are book macros not loaded when rendering standalone). Axis/point labels are plain math like $c_1$, $c_2$, $y$, $\\frac{v_t}{v_{t+1}}$, $c_1^*$.
- Keep it self-contained and clean. Match the original's geometry: which line is steeper, where curves are tangent, which intercept is higher, the positions of labelled points (A, B, C, D, E), dashed guide lines to (c1*, c2*), and any braces/annotations.

=== STEP 4: SELF-VERIFY BY RENDERING (critical) ===
Compile your figure standalone and compare it to the original, then ITERATE until it matches. Concretely:
1. Create the wrapper file ${SRC}/figures/_check_fig${f.id}.tex with exactly this content:
${wrapper}
2. Run: cd "${SRC}/figures" && pdflatex -interaction=nonstopmode _check_fig${f.id}.tex   (fix any LaTeX errors until it compiles to a PDF).
3. Run: cd "${SRC}/figures" && pdftoppm -png -r 130 _check_fig${f.id}.pdf _render_fig${f.id}
4. Read your rendered PNG (_render_fig${f.id}-1.png or similar) AND re-read the original /tmp/monetary-figs/orig-fig${f.id}.png. Compare them side by side in your mind: are all labels present and correctly placed? Is the geometry right (slopes, tangency, intercept ordering, point positions)? Are there overlaps or run-off labels?
5. Edit ${SRC}/figures/fig${f.id}.tex to fix every discrepancy, and repeat steps 2-4. Iterate until the rendering faithfully matches the original (aim for 3-5 iterations; stop when it is a faithful, clean reproduction).
6. When done, delete your scratch files: rm -f ${SRC}/figures/_check_fig${f.id}.* ${SRC}/figures/_render_fig${f.id}*.png  (leave ONLY fig${f.id}.tex).

Return: the figId, a clean one-sentence caption, your match confidence, how many iterations you ran, any remaining discrepancies, and a brief note of what the figure shows.`
}

log(`Converting ${FIGS.length} monetary-economics figures to TikZ/LaTeX, each with a self-render-and-compare loop.`)

const results = await parallel(
  FIGS.map(f => () => agent(figPrompt(f), { label: `fig${f.id}:${f.kind}`, phase: 'Figures', schema: SCHEMA }))
)

return results.filter(Boolean)
