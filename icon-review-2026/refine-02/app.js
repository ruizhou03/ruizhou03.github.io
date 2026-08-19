(function () {
  'use strict';
  const DATA = window.ICON_REFINE_DATA;
  const STORE_KEY = 'zircon.icon-review.sitewide-png-refine-02.v1';
  const state = load();
  let filter = 'all';

  const list = document.getElementById('review-list');
  const globalNote = document.getElementById('global-note');

  function load() {
    try {
      const value = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch (_) { return {}; }
  }
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); updateProgress(); }
  function esc(value) { return String(value).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function thumb(item) { return item.asset.replace('assets/', 'assets/thumbs/'); }

  function renderFamily() {
    document.getElementById('family-grid').innerHTML = DATA.items.map(item => `<a class="family-item" href="#${esc(item.id)}"><img src="${esc(thumb(item))}" alt="" width="384" height="384"><span>${esc(item.name)}</span></a>`).join('');
  }
  function renderLocked() {
    document.getElementById('locked-grid').innerHTML = DATA.lockedApprovals.map(item => `<div class="locked-item"><strong>${esc(item.label)}</strong><span>${esc(item.choice)} · ${esc(item.result)}</span></div>`).join('');
  }
  function preview(item, size, extra) {
    return `<div class="site-card ${extra || ''}"><img src="${esc(thumb(item))}" alt="" width="${size}" height="${size}"><div><strong>${esc(item.name)}</strong><small>${esc(item.tagline)}</small></div></div>`;
  }
  function renderItem(item) {
    const saved = state[item.id] || {};
    const cls = saved.decision === 'approve' ? ' is-approved' : saved.decision === 'revise' ? ' is-revise' : '';
    return `<article class="review-card${cls}" id="${esc(item.id)}" data-id="${esc(item.id)}">
      <header class="card-head"><div><p class="eyebrow">${esc(item.id)}</p><h3>${esc(item.name)}</h3><p>${esc(item.change)}</p></div><span class="previous">上轮选 ${esc(item.previous)}</span></header>
      ${item.previousNote ? `<p class="previous-note">你的上轮批注：${esc(item.previousNote)}</p>` : ''}
      <div class="visual-check">
        <div class="original"><img src="${esc(item.asset)}" alt="${esc(item.name)}第二轮完整 PNG" width="1254" height="1254" loading="lazy"></div>
        <div class="size-panel">
          <h4>同一个独立文件，直接缩小</h4>
          <div class="size-row"><span>32 px</span>${preview(item,32,'')}</div>
          <div class="size-row"><span>64 px</span>${preview(item,64,'site-card--64')}</div>
          <div class="size-row"><span>192 px</span>${preview(item,192,'site-card--192')}</div>
        </div>
      </div>
      <div class="decision">
        <label><input type="radio" name="${esc(item.id)}" value="approve" ${saved.decision === 'approve' ? 'checked' : ''}><span>批准这个修复版</span></label>
        <label><input type="radio" name="${esc(item.id)}" value="revise" ${saved.decision === 'revise' ? 'checked' : ''}><span>仍需修改</span></label>
      </div>
      <footer class="card-foot"><textarea data-note="${esc(item.id)}" placeholder="如果仍需修改，请说明具体要保留什么、改变什么……">${esc(saved.note || '')}</textarea></footer>
    </article>`;
  }
  function renderAll() {
    list.innerHTML = DATA.items.map(renderItem).join('');
    list.querySelectorAll('input[type=radio]').forEach(input => input.addEventListener('change', () => {
      state[input.name] = state[input.name] || {};
      state[input.name].decision = input.value;
      save();
      const card = input.closest('.review-card');
      card.classList.toggle('is-approved', input.value === 'approve');
      card.classList.toggle('is-revise', input.value === 'revise');
      applyFilter();
    }));
    list.querySelectorAll('[data-note]').forEach(note => note.addEventListener('input', () => {
      const id = note.dataset.note;
      state[id] = state[id] || {};
      state[id].note = note.value;
      save();
    }));
    applyFilter();
    updateProgress();
  }
  function updateProgress() {
    const done = DATA.items.filter(item => state[item.id] && state[item.id].decision).length;
    document.getElementById('done-count').textContent = done;
    document.getElementById('progress-fill').style.width = `${done / DATA.items.length * 100}%`;
  }
  function applyFilter() {
    let visible = 0;
    list.querySelectorAll('.review-card').forEach(card => {
      const decision = state[card.dataset.id] && state[card.dataset.id].decision;
      const show = filter === 'all' || (filter === 'unreviewed' ? !decision : decision === filter);
      card.hidden = !show;
      if (show) visible += 1;
    });
    document.getElementById('empty').hidden = visible !== 0;
  }
  function exportObject() {
    return {
      format: DATA.format,
      batch: DATA.batch,
      revision: DATA.revision,
      audited_commit: DATA.auditedCommit,
      exported_at: new Date().toISOString(),
      global_note: globalNote.value.trim(),
      locked_approvals: DATA.lockedApprovals.map(item => ({id:item.id,decision:item.choice})),
      scenes: DATA.items.map(item => ({
        id: item.id,
        revision: DATA.revision,
        category: 'toolbox',
        previous_decision: item.previous,
        decision: (state[item.id] && state[item.id].decision) || 'unreviewed',
        note: (state[item.id] && state[item.id].note || '').trim()
      }))
    };
  }
  function exportText() {
    const p = exportObject();
    const lines = [p.format,`batch=${p.batch}`,`revision=${p.revision}`,`audited_commit=${p.audited_commit}`,`exported_at=${p.exported_at}`,`global_note=${p.global_note || '(none)'}`,'','LOCKED_APPROVALS'];
    p.locked_approvals.forEach(item => lines.push(`[${item.id}] decision=${item.decision}`));
    lines.push('');
    p.scenes.forEach(scene => { lines.push(`[${scene.id}] revision=${scene.revision} category=${scene.category} previous=${scene.previous_decision} decision=${scene.decision}`); lines.push(`note=${scene.note || '(none)'}`,''); });
    return lines.join('\n');
  }
  async function copyExport() {
    const text = exportText();
    try { await navigator.clipboard.writeText(text); }
    catch (_) { const area=document.createElement('textarea');area.value=text;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove(); }
    document.getElementById('export-status').textContent = '已复制，直接粘贴回 Codex 即可。';
  }
  function downloadExport() {
    const blob = new Blob([JSON.stringify(exportObject(),null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`icon-review-${DATA.batch}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    document.getElementById('export-status').textContent = 'JSON 文件已下载。';
  }

  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('is-active',x===button));
    applyFilter();
  }));
  document.getElementById('approve-all').addEventListener('click', () => {
    DATA.items.forEach(item => { state[item.id]=state[item.id]||{}; state[item.id].decision='approve'; });
    save(); renderAll();
  });
  globalNote.value = state.__globalNote || '';
  globalNote.addEventListener('input', () => { state.__globalNote=globalNote.value; save(); });
  document.getElementById('copy-export').addEventListener('click',copyExport);
  document.getElementById('download-export').addEventListener('click',downloadExport);
  document.getElementById('preview-export').addEventListener('click', () => { const p=document.getElementById('export-preview');p.textContent=exportText();p.hidden=!p.hidden;if(!p.hidden)p.scrollIntoView({behavior:'smooth',block:'nearest'}); });

  renderFamily(); renderLocked(); renderAll();
}());
