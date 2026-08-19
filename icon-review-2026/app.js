(function () {
  'use strict';

  const DATA = window.ICON_REVIEW_DATA;
  const STORE_KEY = 'zircon.icon-review.sitewide-png-01.v1';
  const categories = { toolbox: '百宝箱', site: '全站公共 UI', flight: '机票工具' };
  const state = loadState();
  let activeFilter = 'all';

  const allScenes = DATA.toolbox.concat(DATA.uiScenes);
  const root = document.getElementById('review-root');
  const emptyFilter = document.getElementById('empty-filter');
  const globalNote = document.getElementById('global-note');

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    updateProgress();
  }

  function esc(value) {
    return String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function svg(name) {
    return `<svg class="zi" aria-hidden="true"><use href="/assets/icons/zircon-ui.svg#i-${esc(name)}"></use></svg>`;
  }

  function bgStyle(scene, styleId) {
    const x = [0, 25, 50, 75, 100][scene.x];
    const y = scene.y === 0 ? 14.3 : 85.7;
    return `background-image:url('${DATA.styleSheets[styleId]}');background-position:${x}% ${y}%`;
  }

  function renderCurrent(scene) {
    if (scene.category === 'toolbox') {
      return `<div class="current-tool-card">
        <div class="tool-card-icon">${esc(scene.current)}</div>
        <div class="tool-card-name">${esc(scene.name)}</div>
        <div class="tool-card-tagline">${esc(scene.tagline)}</div>
      </div>`;
    }
    return `<div class="current-ui">${esc(scene.current)}</div>`;
  }

  function renderToolboxChoice(scene, id) {
    return `<div class="toolbox-art">
      <div class="sheet-crop" style="${bgStyle(scene, id)}" aria-label="${esc(DATA.styleLabels[id])}大图"></div>
      <div class="candidate-tool-card">
        <div class="tool-card-icon" style="${bgStyle(scene, id)}"></div>
        <div class="tool-card-name">${esc(scene.name)}</div>
        <div class="tool-card-tagline">${esc(scene.tagline)}</div>
      </div>
    </div>`;
  }

  function renderCalendar(kind) {
    return `<div class="calendar-demo ${kind}"><span class="cal-cell">18</span><span class="cal-cell">19</span><span class="cal-cell">20</span></div>`;
  }

  function arrowSvg(direction) {
    const path = direction === 'up' ? 'M5 14l7-7 7 7' : direction === 'down' ? 'M5 10l7 7 7-7' : 'M6 9l6 6 6-6';
    return `<svg class="zi" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`;
  }

  function renderSort(kind) {
    if (kind === 'sort-segmented') {
      return `<div class="sort-demo sort-segmented"><button>${arrowSvg('up')}</button><button>${arrowSvg('down')}</button><button>${arrowSvg('chev')}</button></div>`;
    }
    if (kind === 'sort-drag') {
      return `<div class="sort-demo"><span class="drag-handle">${'<i></i>'.repeat(6)}</span><button>${arrowSvg('chev')}</button></div>`;
    }
    return `<div class="sort-demo"><button>${arrowSvg('up')}</button><button>${arrowSvg('down')}</button><button>${arrowSvg('chev')}</button></div>`;
  }

  function renderUiChoice(choice) {
    let demo = '';
    if (choice.kind === 'icon-label' || choice.kind === 'heading-icon') demo = `<span class="ui-demo">${svg(choice.icon)}${esc(choice.text)}</span>`;
    if (choice.kind === 'badge') demo = `<span class="ui-demo ui-demo--badge">${svg(choice.icon)}${esc(choice.text)}</span>`;
    if (choice.kind === 'rule-label') demo = `<span class="ui-demo ui-demo--rule">${esc(choice.text)}</span>`;
    if (choice.kind === 'dual-icon') demo = `<span class="ui-demo dual-icons">${choice.icons.map(svg).join('')}</span>`;
    if (choice.kind === 'theme-dial') demo = '<span class="theme-dial" aria-hidden="true"></span>';
    if (choice.kind === 'moon-ring') demo = '<span class="moon-ring" aria-hidden="true"></span>';
    if (choice.kind === 'route-heading') demo = `<span class="ui-demo"><span class="route-node"><i></i><b></b><i></i><b></b><i></i></span>${esc(choice.text)}</span>`;
    if (choice.kind === 'date-range-heading') demo = `<span class="ui-demo"><span class="date-range"><i></i><b></b><i></i></span>${esc(choice.text)}</span>`;
    if (choice.kind.indexOf('calendar-') === 0) demo = renderCalendar(choice.kind);
    if (choice.kind.indexOf('sort-') === 0) demo = renderSort(choice.kind);
    return `<div class="ui-stage">${demo}</div>`;
  }

  function choicesFor(scene) {
    if (scene.category === 'toolbox') {
      return ['A', 'B', 'C'].map(id => ({ id, label: DATA.styleLabels[id] }));
    }
    return scene.choices;
  }

  function renderScene(scene) {
    const saved = state[scene.id] || {};
    const choiceHtml = choicesFor(scene).map(choice => {
      const art = scene.category === 'toolbox' ? renderToolboxChoice(scene, choice.id) : renderUiChoice(choice);
      return `<label class="choice">
        <input type="radio" name="${esc(scene.id)}" value="${esc(choice.id)}" ${saved.decision === choice.id ? 'checked' : ''}>
        <span class="choice__surface">
          <span class="choice__art">${art}</span>
          <span class="choice__footer"><strong>${esc(choice.label)}</strong><span class="choice-letter">${esc(choice.id)}</span></span>
        </span>
      </label>`;
    }).join('');

    const cls = saved.decision ? (saved.decision === 'reject' ? ' is-rejected' : ' is-complete') : '';
    return `<article class="review-card${cls}" data-scene="${esc(scene.id)}" data-category="${esc(scene.category)}">
      <header class="review-card__header">
        <div>
          <div class="scene-meta"><span class="scene-tag">${esc(categories[scene.category])}</span><span class="scene-tag">revision 1</span></div>
          <h3>${esc(scene.name)}</h3>
          <p>${esc(scene.rationale)}</p>
        </div>
        <div class="scene-source">${esc(scene.source)}</div>
      </header>
      <div class="current-scene">
        <div class="current-label">当前线上表现</div>
        <div class="current-preview">${renderCurrent(scene)}</div>
      </div>
      <div class="choice-grid">${choiceHtml}</div>
      <footer class="review-card__footer">
        <label class="reject-choice">
          <input type="radio" name="${esc(scene.id)}" value="reject" ${saved.decision === 'reject' ? 'checked' : ''}>
          <span>三套全部打回</span>
        </label>
        <textarea class="scene-note" data-note="${esc(scene.id)}" placeholder="给这一项写批注：保留什么、换什么、材质/颜色/构图如何调整……">${esc(saved.note || '')}</textarea>
      </footer>
    </article>`;
  }

  function renderAll() {
    root.innerHTML = allScenes.map(renderScene).join('');
    bindReviewEvents();
    applyFilter();
    updateProgress();
  }

  function bindReviewEvents() {
    root.querySelectorAll('input[type=radio]').forEach(input => {
      input.addEventListener('change', () => {
        state[input.name] = state[input.name] || {};
        state[input.name].decision = input.value;
        saveState();
        const card = input.closest('.review-card');
        card.classList.toggle('is-complete', input.value !== 'reject');
        card.classList.toggle('is-rejected', input.value === 'reject');
        if (activeFilter !== 'all') applyFilter();
      });
    });
    root.querySelectorAll('[data-note]').forEach(note => {
      note.addEventListener('input', () => {
        const id = note.dataset.note;
        state[id] = state[id] || {};
        state[id].note = note.value;
        saveState();
      });
    });
  }

  function updateProgress() {
    const done = allScenes.filter(scene => state[scene.id] && state[scene.id].decision).length;
    document.getElementById('done-count').textContent = done;
    document.getElementById('total-count').textContent = allScenes.length;
    document.getElementById('progress-fill').style.width = `${done / allScenes.length * 100}%`;
  }

  function matchesFilter(card) {
    const id = card.dataset.scene;
    const decision = state[id] && state[id].decision;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'unreviewed') return !decision;
    if (activeFilter === 'rejected') return decision === 'reject';
    return card.dataset.category === activeFilter;
  }

  function applyFilter() {
    let visible = 0;
    root.querySelectorAll('.review-card').forEach(card => {
      const show = matchesFilter(card);
      card.hidden = !show;
      if (show) visible += 1;
    });
    emptyFilter.hidden = visible !== 0;
  }

  function renderAudit() {
    document.getElementById('audit-grid').innerHTML = DATA.auditGroups.map(group => `<article class="audit-card audit-card--${esc(group.tone)}">
      <div class="audit-card__top"><span class="audit-card__status">${esc(group.status)}</span><span class="audit-card__count">${group.count}</span></div>
      <h3>${esc(group.title)}</h3><p>${esc(group.body)}</p>
    </article>`).join('');
  }

  function exportObject() {
    return {
      format: 'ICON_REVIEW_V2',
      batch: DATA.batch,
      revision: DATA.revision,
      audited_commit: DATA.auditedCommit,
      exported_at: new Date().toISOString(),
      global_note: globalNote.value.trim(),
      scenes: allScenes.map(scene => ({
        id: scene.id,
        revision: 1,
        category: scene.category,
        decision: (state[scene.id] && state[scene.id].decision) || 'unreviewed',
        note: (state[scene.id] && state[scene.id].note || '').trim()
      }))
    };
  }

  function exportText() {
    const payload = exportObject();
    const lines = [
      payload.format,
      `batch=${payload.batch}`,
      `revision=${payload.revision}`,
      `audited_commit=${payload.audited_commit}`,
      `exported_at=${payload.exported_at}`,
      `global_note=${payload.global_note || '(none)'}`,
      ''
    ];
    payload.scenes.forEach(scene => {
      lines.push(`[${scene.id}] revision=${scene.revision} category=${scene.category} decision=${scene.decision}`);
      lines.push(`note=${scene.note || '(none)'}`);
      lines.push('');
    });
    return lines.join('\n');
  }

  async function copyExport() {
    const text = exportText();
    const status = document.getElementById('export-status');
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = '已复制。直接粘贴回 Codex 即可。';
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      status.textContent = '已复制。直接粘贴回 Codex 即可。';
    }
  }

  function downloadExport() {
    const blob = new Blob([JSON.stringify(exportObject(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icon-review-${DATA.batch}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    document.getElementById('export-status').textContent = 'JSON 文件已下载。';
  }

  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('is-active', item === button));
      applyFilter();
    });
  });

  document.querySelectorAll('[data-apply-family]').forEach(button => {
    button.addEventListener('click', () => {
      const decision = button.dataset.applyFamily;
      DATA.toolbox.forEach(scene => {
        state[scene.id] = state[scene.id] || {};
        state[scene.id].decision = decision;
      });
      saveState();
      renderAll();
    });
  });

  globalNote.value = state.__globalNote || '';
  globalNote.addEventListener('input', () => { state.__globalNote = globalNote.value; saveState(); });
  document.getElementById('copy-export').addEventListener('click', copyExport);
  document.getElementById('download-export').addEventListener('click', downloadExport);
  document.getElementById('preview-export').addEventListener('click', () => {
    const preview = document.getElementById('export-preview');
    preview.textContent = exportText();
    preview.hidden = !preview.hidden;
    if (!preview.hidden) preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  renderAll();
  renderAudit();
}());
