// Guandan DanZero DMC value net — browser inference (also Node-requireable for tests).
// Self-contained: forward pass + DanZero encoding + per-seat play tracker + move pick.
// Weights are the released DanZero q_network.ckpt extracted to float32 (567->512x5->1, tanh).
// Card ints follow our engine: 0..107, suit 0♠1♥2♦3♣, rank 0='2'..12='A', jokers d%54==52/53.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GuandanDMC = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---- card encoding: our int -> DanZero 54-dim (suit map ♠→S ♥→H ♦→D ♣→C; idx=rank*4+row) ----
  var TROW = [1, 0, 3, 2];
  function card2array(cards) {
    var v = new Float32Array(54);
    for (var i = 0; i < cards.length; i++) {
      var d = cards[i] % 54;
      if (d === 52) { v[52] += 1; continue; }
      if (d === 53) { v[53] += 1; continue; }
      v[(d % 13) * 4 + TROW[(d / 13) | 0]] += 1;
    }
    return v;
  }

  // ---- proc_universal: 12 wild-card flags (verbatim port of game.py:284-345) ----
  function procUniversal(hand54, curRank) {
    var res = new Array(12).fill(0), lvlIdx = (curRank - 1) * 4, i, j, k;
    if (hand54[lvlIdx] === 0) return res;
    res[0] = 1;
    var rock = 0;
    for (i = 0; i < 4; i++) {
      var right = 5, temp = [];
      for (j = 0; j < 5; j++) temp.push((i + j * 4 !== lvlIdx) ? hand54[i + j * 4] : 0);
      while (right <= 12) {
        var zn = 0; for (k = 0; k < temp.length; k++) if (temp[k] === 0) zn++;
        if (zn <= 1) { rock = 1; break; }
        temp.push((i + right * 4 !== lvlIdx) ? hand54[i + right * 4] : 0); temp.shift(); right++;
      }
      if (rock) break;
    }
    res[1] = rock;
    var nc = new Array(13).fill(0);
    for (i = 0; i < 4; i++) for (j = 0; j < 13; j++) if (hand54[i + j * 4] !== 0 && i + j * 4 !== lvlIdx) nc[j]++;
    var nm = Math.max.apply(null, nc);
    if (nm >= 6) for (k = 2; k < 8; k++) res[k] = 1;
    else if (nm === 5) for (k = 3; k < 8; k++) res[k] = 1;
    else if (nm === 4) for (k = 4; k < 8; k++) res[k] = 1;
    else if (nm === 3) for (k = 5; k < 8; k++) res[k] = 1;
    else if (nm === 2) for (k = 6; k < 8; k++) res[k] = 1;
    else res[7] = 1;
    var t = 0;
    for (i = 0; i < 13; i++) {
      if (nc[i] !== 0) {
        t++;
        if (i >= 1) {
          if ((nc[i] === 2 && nc[i - 1] >= 3) || (nc[i] >= 3 && nc[i - 1] === 2)) res[9] = 1;
          else if (nc[i] === 2 && nc[i - 1] === 2) res[11] = 1;
        }
        if (i >= 2 && ((nc[i - 2] === 1 && nc[i - 1] >= 2 && nc[i] >= 2) || (nc[i - 2] >= 2 && nc[i - 1] === 1 && nc[i] >= 2) || (nc[i - 2] >= 2 && nc[i - 1] >= 2 && nc[i] === 1))) res[10] = 1;
      } else t = 0;
    }
    if (t >= 4) res[8] = 1;
    return res;
  }

  var LEVEL_RANK = { '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '10': 9, 'J': 10, 'Q': 11, 'K': 12, 'A': 13 };
  function oneHotLevel(lbl) { var v = new Float32Array(13), r = LEVEL_RANK[lbl]; if (r) v[r - 1] = 1; return v; }
  function oneHotCount(c) { var v = new Float32Array(28); v[Math.max(0, Math.min(27, c | 0))] = 1; return v; }

  // ---- per-seat play tracker (maintained by the host game via record/reset) ----
  var track = { played: [[], [], [], []], seq: [], lastAct: [null, null, null, null] };
  function resetRound() { track = { played: [[], [], [], []], seq: [], lastAct: [null, null, null, null] }; }
  function recordPlay(seat, cards) { for (var i = 0; i < cards.length; i++) track.played[seat].push(cards[i]); track.seq.push(cards.slice()); track.lastAct[seat] = cards.slice(); }
  function recordPass(seat) { track.seq.push([]); track.lastAct[seat] = []; }

  function build513(seat, hands, over, level, selfLevel, oppoLevel) {
    var down = (seat + 1) % 4, tm = (seat + 2) % 4, up = (seat + 3) % 4;
    var myHand54 = card2array(hands[seat]);
    var wild = procUniversal(myHand54, LEVEL_RANK[level]);
    var others = []; for (var s = 0; s < 4; s++) if (s !== seat) for (var i = 0; i < hands[s].length; i++) others.push(hands[s][i]);
    var last54;
    if (track.seq.length === 0) { last54 = new Float32Array(54); last54.fill(-1); }
    else { var a = track.seq[track.seq.length - 1]; last54 = (a && a.length) ? card2array(a) : new Float32Array(54); }
    var tm54, ta = track.lastAct[tm];
    if (ta != null && over.indexOf(tm) < 0) tm54 = (ta.length ? card2array(ta) : new Float32Array(54));
    else { tm54 = new Float32Array(54); tm54.fill(-1); }
    var out = new Float32Array(513), o = 0;
    function put(arr) { out.set(arr, o); o += arr.length; }
    put(myHand54); put(Float32Array.from(wild)); put(card2array(others)); put(last54); put(tm54);
    put(card2array(track.played[down])); put(card2array(track.played[tm])); put(card2array(track.played[up]));
    put(oneHotCount(hands[down].length)); put(oneHotCount(hands[tm].length)); put(oneHotCount(hands[up].length));
    put(oneHotLevel(selfLevel || level)); put(oneHotLevel(oppoLevel || level)); put(oneHotLevel(level));
    return out;
  }

  // ---- forward net ----
  var L = null;                       // [{inD,outD,W,b}]
  var DIMS = [[567, 512], [512, 512], [512, 512], [512, 512], [512, 512], [512, 1]];
  function loadWeights(src) {         // src: ArrayBuffer | Float32Array
    // int8 packed (≈1.36MB: int8 权重 | f32 偏置 | f32 逐列scale) vs float32 packed (≈5.37MB)
    if (src instanceof ArrayBuffer && src.byteLength === 1359880) return loadWeightsInt8(src);
    var f32 = (src instanceof Float32Array) ? src : new Float32Array(src);
    L = []; var off = 0;
    for (var i = 0; i < DIMS.length; i++) { var inD = DIMS[i][0], outD = DIMS[i][1]; var W = f32.subarray(off, off + inD * outD); off += inD * outD; var b = f32.subarray(off, off + outD); off += outD; L.push({ inD: inD, outD: outD, W: W, b: b }); }
    if (off !== f32.length) { L = null; throw new Error('DMC weight length mismatch ' + off + '/' + f32.length); }
    return true;
  }
  function loadWeightsInt8(buf) {      // int8 权重在加载时反量化成 float32；前向不变
    var nW = 0, nB = 0, i, j, ii;
    for (i = 0; i < DIMS.length; i++) { nW += DIMS[i][0] * DIMS[i][1]; nB += DIMS[i][1]; }
    var q = new Int8Array(buf, 0, nW);
    var bias = new Float32Array(buf.slice(nW, nW + nB * 4));
    var scale = new Float32Array(buf.slice(nW + nB * 4, nW + nB * 4 + nB * 4));
    L = []; var wo = 0, bo = 0;
    for (i = 0; i < DIMS.length; i++) {
      var inD = DIMS[i][0], outD = DIMS[i][1];
      var W = new Float32Array(inD * outD);
      for (ii = 0; ii < inD; ii++) { var base = ii * outD; for (j = 0; j < outD; j++) W[base + j] = q[wo + base + j] * scale[bo + j]; }
      L.push({ inD: inD, outD: outD, W: W, b: bias.subarray(bo, bo + outD) });
      wo += inD * outD; bo += outD;
    }
    return true;
  }
  function ready() { return !!L; }

  var _h = new Float32Array(512), _t = new Float32Array(512), _pre1 = new Float32Array(512);
  function precompute(state513) {
    var W0 = L[0].W, b0 = L[0].b, o, i;
    for (o = 0; o < 512; o++) _pre1[o] = b0[o];
    for (i = 0; i < 513; i++) { var xi = state513[i]; if (xi === 0) continue; var base = i * 512; for (o = 0; o < 512; o++) _pre1[o] += xi * W0[base + o]; }
  }
  function scoreAction(a54) {
    var W0 = L[0].W, h = _h, o, i;
    h.set(_pre1);
    for (i = 0; i < 54; i++) { var av = a54[i]; if (av === 0) continue; var base = (513 + i) * 512; for (o = 0; o < 512; o++) h[o] += av * W0[base + o]; }
    for (o = 0; o < 512; o++) h[o] = Math.tanh(h[o]);
    var cur = h, nxt = _t;
    for (var kk = 1; kk <= 4; kk++) {
      var Wk = L[kk].W, bk = L[kk].b;
      for (o = 0; o < 512; o++) nxt[o] = bk[o];
      for (i = 0; i < 512; i++) { var ci = cur[i]; var b2 = i * 512; for (o = 0; o < 512; o++) nxt[o] += ci * Wk[b2 + o]; }
      for (o = 0; o < 512; o++) nxt[o] = Math.tanh(nxt[o]);
      var tmp = cur; cur = nxt; nxt = tmp;
    }
    var W5 = L[5].W, q = L[5].b[0];
    for (i = 0; i < 512; i++) q += cur[i] * W5[i];
    return q;
  }

  // moves: array of {combo,cards} (from the host's genMoves). Returns chosen combo (with .cards) or null (pass).
  function choose(seat, hands, over, level, selfLevel, oppoLevel, moves, leading) {
    if (!L) return undefined;        // not loaded
    precompute(build513(seat, hands, over, level, selfLevel, oppoLevel));
    var bestQ = -Infinity, best = null, q, m;
    for (var i = 0; i < moves.length; i++) { m = moves[i]; q = scoreAction(card2array(m.cards)); if (q > bestQ) { bestQ = q; best = m; } }
    if (!leading) { q = scoreAction(new Float32Array(54)); if (q > bestQ) { bestQ = q; best = null; } }
    return best ? best.combo : null;
  }

  return { loadWeights: loadWeights, ready: ready, resetRound: resetRound, recordPlay: recordPlay, recordPass: recordPass, choose: choose, _build513: build513, _card2array: card2array, _track: function () { return track; } };
}));
