/* 墨园 · 朗读模式
   #mk-narr 上带 data-json（时间轴）与 data-audio（mp3）。点「朗读」进入：正文换成听稿，
   读过的字转朱、当前字从左向右划过，点任一字跳到那里；底部播放条控制播放、拖动、倍速、退出。
   时间轴格式见 scripts/narration/align.py。 */
(function () {
  'use strict';
  var root = document.getElementById('mk-narr');
  var btn = document.getElementById('mk-narr-btn');
  if (!root || !btn) return;

  var KEY = 'mk-narr-pos:' + (root.dataset.slug || location.pathname);
  var audio = null, starts = [], spans = [], blockEls = [], built = false, loading = null;
  var cur = -1, raf = 0, lastUserScroll = 0, bar = null, speeds = [1, 1.25, 1.5, 0.75], si = 0;

  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function save() { try { if (audio && audio.currentTime > 3) localStorage.setItem(KEY, String(audio.currentTime | 0)); } catch (e) {} }
  function saved() { try { return +localStorage.getItem(KEY) || 0; } catch (e) { return 0; } }

  function build(data) {
    var frag = document.createDocumentFragment();
    var kick = document.createElement('span'); kick.className = 'mk-kick mk-narr-kick'; kick.textContent = '听稿 · Narration';
    frag.appendChild(kick);
    data.blocks.forEach(function (b) {
      var el = document.createElement(b.t === 'head' ? 'h2' : 'p'), box = el;
      if (b.t === 'head') {            // 标题是 flex（画朱砂菱），字要包进一个内层，否则每个字成了一个 flex 项
        el.className = 'mk-h-top';
        box = document.createElement('span'); el.appendChild(box);
      }
      b.r.forEach(function (r) {
        var s = document.createElement('span');
        s.className = 'nr'; s.textContent = r[0]; s.dataset.i = spans.length;
        starts.push(r[1] / 100); spans.push(s); box.appendChild(s);
      });
      blockEls.push(el); frag.appendChild(el);
    });
    root.textContent = ''; root.appendChild(frag); built = true;
  }

  function load() {
    if (loading) return loading;
    root.innerHTML = '<p class="mk-narr-wait">LOADING…</p>';
    loading = fetch(root.dataset.json, { cache: 'force-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status); return r.json();
    }).then(build).catch(function () {
      root.innerHTML = '<p class="mk-narr-wait">朗读稿暂时打不开，稍后再试。</p>'; loading = null; throw 0;
    });
    return loading;
  }

  function find(t) {                        // 最后一个 起点 ≤ t 的单元
    var lo = 0, hi = starts.length - 1, ans = -1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (starts[m] <= t) { ans = m; lo = m + 1; } else hi = m - 1; }
    return ans;
  }

  function paint() {
    var t = audio.currentTime, i = find(t);
    if (i !== cur) {
      var a, z;
      if (i > cur) { for (a = Math.max(cur, 0); a < i; a++) { spans[a].classList.add('r'); spans[a].classList.remove('c'); } }
      else { for (z = Math.max(i, 0); z <= cur && z < spans.length; z++) spans[z].classList.remove('r', 'c'); }
      if (cur >= 0 && cur < spans.length && cur !== i) spans[cur].classList.remove('c');
      cur = i;
      if (cur >= 0) { spans[cur].classList.add('c'); follow(spans[cur]); }
    }
    if (cur >= 0) {
      var nx = cur + 1 < starts.length ? starts[cur + 1] : (audio.duration || starts[cur] + 0.4);
      var p = Math.min(1, Math.max(0, (t - starts[cur]) / Math.max(0.05, nx - starts[cur])));
      spans[cur].style.setProperty('--p', (p * 100).toFixed(1) + '%');
      if (p >= 1) { spans[cur].classList.add('r'); }
    }
    var d = audio.duration || 0, f = d ? t / d : 0;
    bar.fill.style.width = (f * 100) + '%'; bar.knob.style.left = (f * 100) + '%';
    bar.time.textContent = fmt(t) + ' / ' + fmt(d);
  }

  function loop() { paint(); if (audio && !audio.paused) raf = requestAnimationFrame(loop); }

  function follow(el) {
    if (Date.now() - lastUserScroll < 3000) return;
    var r = el.getBoundingClientRect(), h = window.innerHeight;
    if (r.top < h * 0.18 || r.bottom > h * 0.72) {
      window.scrollTo({ top: window.scrollY + r.top - h * 0.38, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      lastUserScroll = 0;
    }
  }
  ['wheel', 'touchmove', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (ev === 'keydown' && !/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End)$/.test(e.key)) return;
      lastUserScroll = Date.now();
    }, { passive: true });
  });

  function setPlayIcon() {
    bar.play.innerHTML = audio && !audio.paused
      ? '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12"/><rect x="9.5" y="2" width="3.5" height="12"/></svg>'
      : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z"/></svg>';
    bar.play.setAttribute('aria-label', audio && !audio.paused ? '暂停' : '播放');
  }

  function makeBar() {
    var el = document.createElement('div');
    el.className = 'mk-narr-bar'; el.setAttribute('role', 'region'); el.setAttribute('aria-label', '朗读播放条');
    el.innerHTML = '<div class="in"><button type="button" class="pl"></button>' +
      '<div class="tk" role="slider" aria-label="播放进度" tabindex="0"><i></i><b></b></div>' +
      '<span class="tm">0:00 / 0:00</span><button type="button" class="sp" aria-label="倍速">1×</button>' +
      '<button type="button" class="ex">退出朗读</button></div>';
    document.body.appendChild(el);
    bar = { el: el, play: el.querySelector('.pl'), track: el.querySelector('.tk'), fill: el.querySelector('.tk i'),
            knob: el.querySelector('.tk b'), time: el.querySelector('.tm'), speed: el.querySelector('.sp'), exit: el.querySelector('.ex') };
    bar.play.addEventListener('click', toggle);
    bar.exit.addEventListener('click', exit);
    bar.speed.addEventListener('click', function () { si = (si + 1) % speeds.length; audio.playbackRate = speeds[si]; bar.speed.textContent = speeds[si] + '×'; });
    function seekTo(e) {
      var r = bar.track.getBoundingClientRect(), x = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width;
      if (isFinite(audio.duration)) { audio.currentTime = Math.max(0, Math.min(1, x)) * audio.duration; paint(); }
    }
    var drag = false;
    bar.track.addEventListener('pointerdown', function (e) { drag = true; bar.track.setPointerCapture(e.pointerId); seekTo(e); });
    bar.track.addEventListener('pointermove', function (e) { if (drag) seekTo(e); });
    bar.track.addEventListener('pointerup', function () { drag = false; save(); });
    bar.track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { audio.currentTime += e.key === 'ArrowRight' ? 5 : -5; paint(); e.preventDefault(); }
    });
    setPlayIcon();
  }

  function toggle() { if (audio.paused) audio.play(); else audio.pause(); }

  function enter() {
    if (!audio) {
      audio = new Audio(root.dataset.audio); audio.preload = 'auto';
      makeBar();
      audio.addEventListener('play', function () { setPlayIcon(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); });
      audio.addEventListener('pause', function () { setPlayIcon(); save(); paint(); });
      audio.addEventListener('ended', function () { setPlayIcon(); try { localStorage.removeItem(KEY); } catch (e) {} });
      audio.addEventListener('loadedmetadata', function () { paint(); });
      audio.addEventListener('timeupdate', function () { if (audio.paused) paint(); });
      setInterval(function () { if (audio && !audio.paused) save(); }, 5000);
      root.addEventListener('click', function (e) {
        var s = e.target.closest('.nr'); if (!s) return;
        audio.currentTime = starts[+s.dataset.i] + 0.01; lastUserScroll = 0;
        if (audio.paused) audio.play(); else paint();
      });
    }
    root.hidden = false;
    document.body.classList.add('mk-narr-on');
    btn.classList.add('active');
    load().then(function () {
      var top = root.getBoundingClientRect().top + window.scrollY - 96;
      if (window.scrollY > top) window.scrollTo({ top: top });
      var pos = saved();
      if (pos && !audio.currentTime) audio.currentTime = pos;
      audio.play().catch(function () {});
    }).catch(function () {});
  }

  function exit() {
    if (audio) audio.pause();
    document.body.classList.remove('mk-narr-on');
    root.hidden = true; btn.classList.remove('active');
  }

  btn.addEventListener('click', function () { if (document.body.classList.contains('mk-narr-on')) exit(); else enter(); });
  document.addEventListener('keydown', function (e) {
    if (!document.body.classList.contains('mk-narr-on') || e.key !== ' ' || /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable) return;
    e.preventDefault(); toggle();
  });
  window.addEventListener('beforeunload', save);
})();
