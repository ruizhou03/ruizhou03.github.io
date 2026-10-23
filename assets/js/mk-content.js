/* 墨园 · 内容页脚本：文章目录轨 / 阅读时长 / 菜谱时间线。
   依赖 mk-category.js 处理页脚年份与联系邮箱。 */
(function () {
  'use strict';

  /* ---------- 文章：阅读时长 + 字数 ---------- */
  var art = document.querySelector('.mk-art');
  if (art) {
    var content = document.getElementById('post-content');
    var rt = document.querySelector('.js-readtime');
    if (content && rt) {
      var txt = content.textContent || '';
      var cjk = (txt.match(/[一-鿿]/g) || []).length;
      var words = (txt.replace(/[一-鿿]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
      var n = cjk + words;
      if (n > 80) {
        var mins = Math.max(1, Math.round(n / 420));
        rt.textContent = '约 ' + mins + ' 分钟 · ' + n.toLocaleString('en-US') + ' 字';
      } else { rt.remove(); }
    }

    /* ---------- 文章：目录轨 ---------- */
    var rail = document.getElementById('mk-rail');
    var btn = document.getElementById('mk-rail-btn');
    var bd = document.getElementById('mk-rail-bd');
    if (content && rail) {
      var heads = Array.prototype.slice.call(content.querySelectorAll('h1, h2'));
      var hasH1 = heads.some(function (x) { return x.tagName === 'H1'; });
      heads.forEach(function (h) { if (h.tagName === 'H1' || !hasH1) h.classList.add('mk-h-top'); });
      // 只有 PDF 预览标题之类的单一标题时不出目录
      if (heads.length <= 1) {
        rail.remove(); if (btn) btn.remove(); if (bd) bd.remove();
      } else {
        // 目录只照抄标题文字：标题自带「一、」「1.」就跟着显示，不再另行编号，避免「一 一、」重复
        var panel = rail.querySelector('.mk-rail__panel');
        var links = [];
        heads.forEach(function (h, i) {
          var id = 'section-' + i; h.id = id;
          var isSub = h.tagName === 'H2' && hasH1;
          var a = document.createElement('a');
          a.href = '#' + id;
          if (isSub) a.className = 'sub';
          a.textContent = h.textContent.trim();
          a.addEventListener('click', function () { if (window.innerWidth <= 1100) closeRail(); });
          panel.appendChild(a);
          links.push(a);
        });
        function setActive(idx) {
          links.forEach(function (a, i) { a.classList.toggle('on', i === idx); });
        }
        function spy() {
          var y = window.scrollY + 130, best = 0;
          for (var i = 0; i < heads.length; i++) { if (heads[i].offsetTop <= y) best = i; else break; }
          setActive(best);
        }
        window.addEventListener('scroll', spy, { passive: true });
        window.addEventListener('resize', spy);
        spy();
        function openRail() { rail.classList.add('open'); if (bd) bd.classList.add('on'); }
        function closeRail() { rail.classList.remove('open'); if (bd) bd.classList.remove('on'); }
        if (btn) btn.addEventListener('click', function () { rail.classList.contains('open') ? closeRail() : openRail(); });
        if (bd) bd.addEventListener('click', closeRail);
      }
    }

    /* 评论：标题行点开抽屉 */
    var cmtRow = document.querySelector('.mk-cmt .mk-row');
    if (cmtRow) cmtRow.addEventListener('click', function () { if (window.CommentDrawer) window.CommentDrawer.open(); });
  }

  /* ---------- 菜谱：步骤用时 + 并行时间线 ---------- */
  var rcp = document.querySelector('.mk-rcp');
  if (rcp) {
    var steps = Array.prototype.slice.call(rcp.querySelectorAll('.mk-step'));
    var TONES = ['rgba(29,27,24,.3)', 'var(--mk-seal)', 'rgba(29,27,24,.55)', 'rgba(29,27,24,.14)', 'var(--mk-ink)', 'rgba(180,57,44,.45)'];
    function minutesOf(text) {
      // 取步骤里出现的时间：「50 分钟」「5–8 分钟」「90 秒」「3 min」；区间取上限，多处相加
      var re = /(\d+(?:\.\d+)?)(?:\s*[–\-~至到]\s*(\d+(?:\.\d+)?))?\s*(分钟|小时|秒|分(?![a-z钟])|min(?:ute)?s?(?![a-z])|hours?(?![a-z])|h(?![a-z])|sec(?:ond)?s?(?![a-z])|s(?![a-z]))/gi;
      var m, total = 0, hit = false;
      while ((m = re.exec(text))) {
        var v = parseFloat(m[2] || m[1]); var u = m[3].toLowerCase();
        if (/^(秒|s|sec|secs|second|seconds)$/.test(u)) v = v / 60;
        else if (/^(小时|h|hour|hours)$/.test(u)) v = v * 60;
        total += v; hit = true;
      }
      return hit ? total : null;
    }
    function fmt(v) { if (v == null) return ''; if (v < 1) return '½'; return (Math.round(v * 10) / 10).toString(); }
    var vals = steps.map(function (s) {
      var bd = s.querySelector('.bd'); var v = minutesOf(bd ? bd.textContent : '');
      var tm = s.querySelector('.tm'); if (tm && v != null) tm.textContent = fmt(v) + ' MIN';
      return v;
    });
    var tl = document.getElementById('mk-tl');
    var known = vals.filter(function (v) { return v != null; }).length;
    if (tl && steps.length > 1 && known >= 2) {
      var bar = tl.querySelector('.bar'), lg = tl.querySelector('.lg');
      var total = parseFloat(tl.dataset.total) || 0;
      var sumKnown = vals.reduce(function (a, v) { return a + (v || 0); }, 0);
      var fill = (total > sumKnown && steps.length > known) ? (total - sumKnown) / (steps.length - known) : 1;
      steps.forEach(function (s, i) {
        var v = vals[i] != null ? vals[i] : fill; var tone = TONES[i % TONES.length];
        var a = document.createElement('a'); a.href = '#' + s.id; a.style.flex = String(Math.max(v, 0.5)); a.style.background = tone;
        var lab = s.querySelector('.no').textContent.trim();
        a.setAttribute('aria-label', '第 ' + lab + ' 步 ' + (vals[i] != null ? fmt(v) + ' 分钟' : ''));
        bar.appendChild(a);
        var li = document.createElement('span'); var sw = document.createElement('i'); sw.style.background = tone;
        li.appendChild(sw); li.appendChild(document.createTextNode(lab + ' ' + (vals[i] != null ? fmt(v) : '·')));
        lg.appendChild(li);
      });
      tl.hidden = false;
    } else if (tl) { tl.remove(); }
  }
})();
