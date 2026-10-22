/* 墨园 · 类目页共用脚本：工具条筛选锚点、本卷搜索、题跋年份、那年今日小卡、联系 */
(function () {
  'use strict';
  var body = document.body;
  if (!body.classList.contains('mk-cat')) return;

  // 1) 子类筛选：给每个书目小节按 data-sub 补 id，工具条里的筛选项锚过去；滚动时高亮当前
  var secs = Array.prototype.slice.call(document.querySelectorAll('.post-list-section[data-sub], .yearly-story-section[data-sub], .mk-extra[data-sub]'));
  secs.forEach(function (s, i) { if (!s.id) s.id = 'sub-' + i; });
  var chips = Array.prototype.slice.call(document.querySelectorAll('.mk-bar .f a[data-sub]'));
  function secFor(sub) { return secs.filter(function (s) { return s.getAttribute('data-sub') === sub; })[0] || null; }
  chips.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var sub = a.getAttribute('data-sub');
      if (sub === '*') { window.scrollTo({ top: 0, behavior: 'smooth' }); setActive('*'); return; }
      var s = secFor(sub); if (!s) return;
      s.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActive(sub);
    });
  });
  function setActive(sub) { chips.forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-sub') === sub); }); }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking || body.classList.contains('mk-searching')) return;
    ticking = true;
    requestAnimationFrame(function () {
      var line = 140, cur = null;
      secs.forEach(function (s) { if (s.getBoundingClientRect().top <= line) cur = s; });
      setActive(cur ? cur.getAttribute('data-sub') : '*');
      ticking = false;
    });
  }, { passive: true });

  // 2) 本卷搜索：按书目行的 data-title（标题 + 关键词展开）过滤；命中项全部铺开，小节无命中则整段隐藏
  var input = document.querySelector('.mk-search input');
  if (input) {
    var items = function () { return Array.prototype.slice.call(document.querySelectorAll('.paginated-item')); };
    var apply = function () {
      var q = (input.value || '').trim().toLowerCase();
      body.classList.toggle('mk-searching', !!q);
      var hitSecs = {}, any = false;
      items().forEach(function (li) {
        var hit = !!q && (li.getAttribute('data-title') || '').indexOf(q) !== -1 && li.getAttribute('data-hidden') !== 'true' && li.getAttribute('data-trashed') !== 'true';
        li.classList.toggle('mk-hit', hit);
        if (hit) { any = true; var s = li.closest('.post-list-section'); if (s) hitSecs[s.id] = true; }
      });
      secs.forEach(function (s) { s.classList.toggle('mk-hit', !!hitSecs[s.id]); });
      body.classList.toggle('mk-nothing', !!q && !any);
    };
    input.addEventListener('input', apply);
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { input.value = ''; apply(); } });
  }

  // 3) 题跋：版权年按访问当天
  var Y = new Date().getFullYear();
  Array.prototype.forEach.call(document.querySelectorAll('.js-year'), function (el) { el.textContent = String(Y); });

  // 4) 联系：点一下才拼出邮箱
  var cbtn = document.querySelector('.js-contact');
  if (cbtn) cbtn.addEventListener('click', function () {
    var addr = ['ruizhou0312', 'gmail.com'].join('@');
    var a = document.createElement('a'); a.href = 'mailto:' + addr; a.textContent = addr;
    cbtn.replaceWith(a);
  });

  // 5) 那年今日小卡（有 #mk-otd 的页面才跑）：往年同一天的第一篇
  var card = document.getElementById('mk-otd');
  if (card) {
    var now = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
    var mmdd = pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    var MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'], WK = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    var want = card.getAttribute('data-category') || '';
    fetch('/assets/posts-by-mmdd.json', { cache: 'default' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !data.posts) return;
      var hits = data.posts.filter(function (p) { return p.mmdd === mmdd && p.year < Y && (!want || p.category === want); }).sort(function (a, b) { return a.year - b.year; });
      if (!hits.length) return;
      var p = hits[0];
      card.querySelector('.mon').textContent = MON[now.getMonth()];
      card.querySelector('.day').textContent = String(now.getDate());
      card.querySelector('.wk').textContent = WK[now.getDay()] + ' · ' + Y;
      card.querySelector('.k').textContent = '那年今日 · ' + p.year;
      card.querySelector('.t').textContent = p.title;
      card.setAttribute('href', p.url);
      card.classList.add('is-on');
    }).catch(function () {});
  }
})();
