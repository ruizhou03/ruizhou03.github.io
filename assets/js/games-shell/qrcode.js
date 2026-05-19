/* qrcode.js — 自包含 QR Code 生成器（games-shell 共享）
 *
 * 为什么不引第三方 lib：本站全部资源自托管、零运行时 CDN。这里按
 * ISO/IEC 18004 标准实现，所有易错表（GF(256) 对数表、RS 生成多项式、
 * 格式/版本 BCH）都在代码里算出来，不手抄；仅硬编码标准里的
 * EC 分块表 / 总码字数 / 对齐图案坐标（v1–v10），并在 self-test 里
 * 用 totalCW 交叉校验，且用 ISO 附录 I 的官方算例验证 RS 流水线。
 *
 * 公开接口：
 *   GamesShell.QR.toCanvas(text, opts) -> <canvas>
 *   GamesShell.QR.render(container, text, opts)   // 清空容器并塞入二维码
 * opts: { ec:'L'|'M'|'Q'|'H'(默认 M), scale(每模块 px,默认 4),
 *         margin(模块数,默认 4), dark, light }
 */
(function (root) {
  'use strict';

  // ── GF(256)：x^8+x^4+x^3+x^2+1 (0x11D) ──
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11D;
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  // RS 生成多项式（次数 = EC 码字数）
  function rsGenPoly(deg) {
    var p = [1];
    for (var d = 0; d < deg; d++) {
      var np = new Array(p.length + 1).fill(0);
      for (var i = 0; i < p.length; i++) {
        np[i] ^= p[i];
        np[i + 1] ^= gmul(p[i], EXP[d]);
      }
      p = np;
    }
    return p; // length deg+1
  }
  // 对一组数据码字算 EC 码字
  function rsEncode(data, ecLen) {
    var gen = rsGenPoly(ecLen);
    var res = new Array(ecLen).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ res[0];
      res.shift(); res.push(0);
      if (factor !== 0) {
        for (var j = 0; j < ecLen; j++) res[j] ^= gmul(gen[j + 1], factor);
      }
    }
    return res;
  }

  // ── 标准表（v1–v10） ──
  // 每行 [ecPerBlock, g1Blocks, g1DataCW, g2Blocks, g2DataCW]
  var ECB = {
    L: [null,[7,1,19,0,0],[10,1,34,0,0],[15,1,55,0,0],[20,1,80,0,0],[26,1,108,0,0],[18,2,68,0,0],[20,2,78,0,0],[24,2,97,0,0],[30,2,116,0,0],[18,2,68,2,69]],
    M: [null,[10,1,16,0,0],[16,1,28,0,0],[26,1,44,0,0],[18,2,32,0,0],[24,2,43,0,0],[16,4,27,0,0],[18,4,31,0,0],[22,2,38,2,39],[22,3,36,2,37],[26,4,43,1,44]],
    Q: [null,[13,1,13,0,0],[22,1,22,0,0],[18,2,17,0,0],[26,2,24,0,0],[18,2,15,2,16],[24,4,19,0,0],[18,2,14,4,15],[22,4,18,2,19],[20,4,16,4,17],[24,6,19,2,20]],
    H: [null,[17,1,9,0,0],[28,1,16,0,0],[22,2,13,0,0],[16,4,9,0,0],[22,2,11,2,12],[28,4,15,0,0],[26,4,13,1,14],[26,4,14,2,15],[24,4,12,4,13],[28,6,15,2,16]]
  };
  // 每版本总码字数（与 EC level 无关）——用于交叉校验 ECB
  var TOTAL_CW = [0,26,44,70,100,134,172,196,242,292,346];
  // 对齐图案中心坐标（v1 无）
  var ALIGN = [null,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]];
  var EC_BITS = { L: 1, M: 0, Q: 3, H: 2 }; // 格式信息里的 2 bit

  function cciBits(version) { return version <= 9 ? 8 : 16; } // 字节模式字符计数指示符位数

  // 选最小版本（1–10）容纳 byteLen 字节
  function pickVersion(byteLen, ec) {
    for (var v = 1; v <= 10; v++) {
      var t = ECB[ec][v];
      var dataCW = t[1] * t[2] + t[3] * t[4];
      var capBits = dataCW * 8;
      var needBits = 4 + cciBits(v) + 8 * byteLen; // 终止符可被填充字节吸收
      if (needBits <= capBits) return v;
    }
    return -1;
  }

  // ── 编码：text(UTF-8) -> 最终交织码字 ──
  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(str));
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) { out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F)); }
      else if (c < 0xD800 || c >= 0xE000) { out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F)); }
      else { // surrogate pair
        i++; c = 0x10000 + (((c & 0x3FF) << 10) | (str.charCodeAt(i) & 0x3FF));
        out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 0x3F), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
      }
    }
    return out;
  }

  function makeCodewords(text, ec) {
    var bytes = utf8Bytes(text);
    var version = pickVersion(bytes.length, ec);
    if (version < 0) throw new Error('QR: content too long');
    var t = ECB[ec][version];
    var ecPerBlock = t[0], g1 = t[1], g1d = t[2], g2 = t[3], g2d = t[4];
    var totalBlocks = g1 + g2;
    var totalDataCW = g1 * g1d + g2 * g2d;
    // 交叉校验标准表
    if (ecPerBlock * totalBlocks + totalDataCW !== TOTAL_CW[version]) {
      throw new Error('QR: ECB table inconsistent at v' + version + ' ' + ec);
    }

    // 比特流：模式(0100) + 字符计数 + 数据 + 终止符 + 补零到字节 + 交替填充
    var bits = [];
    function push(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); }
    push(0x4, 4);
    push(bytes.length, cciBits(version));
    for (var i = 0; i < bytes.length; i++) push(bytes[i], 8);
    var cap = totalDataCW * 8;
    for (var k = 0; k < 4 && bits.length < cap; k++) bits.push(0); // 终止符
    while (bits.length % 8 !== 0) bits.push(0);
    var pads = [0xEC, 0x11], pi = 0;
    while (bits.length < cap) { push(pads[pi], 8); pi ^= 1; }
    // 比特 -> 数据码字
    var dataCW = [];
    for (var b = 0; b < bits.length; b += 8) {
      var v = 0; for (var q = 0; q < 8; q++) v = (v << 1) | bits[b + q];
      dataCW.push(v);
    }

    // 分块 + 各块 EC
    var blocks = [];
    var pos = 0;
    for (var bi = 0; bi < totalBlocks; bi++) {
      var dlen = bi < g1 ? g1d : g2d;
      var d = dataCW.slice(pos, pos + dlen); pos += dlen;
      blocks.push({ data: d, ec: rsEncode(d, ecPerBlock) });
    }
    // 交织
    var out = [];
    var maxData = Math.max(g1d, g2d);
    for (var c = 0; c < maxData; c++)
      for (var bb = 0; bb < totalBlocks; bb++)
        if (c < blocks[bb].data.length) out.push(blocks[bb].data[c]);
    for (var e = 0; e < ecPerBlock; e++)
      for (var bb2 = 0; bb2 < totalBlocks; bb2++) out.push(blocks[bb2].ec[e]);

    return { version: version, codewords: out };
  }

  // ── 矩阵摆放 ──
  function buildMatrix(version) {
    var n = version * 4 + 17;
    var m = []; var fn = []; // m: 模块值, fn: 是否功能图案（不可被数据/掩码覆盖）
    for (var r = 0; r < n; r++) { m.push(new Int8Array(n).fill(-1)); fn.push(new Uint8Array(n)); }
    function setF(r, c, v) { m[r][c] = v; fn[r][c] = 1; }

    function finder(R, C) {
      for (var dr = -1; dr <= 7; dr++) for (var dc = -1; dc <= 7; dc++) {
        var rr = R + dr, cc = C + dc;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        var inb = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        var ring = inb && (dr === 0 || dr === 6 || dc === 0 || dc === 6);
        var core = inb && dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setF(rr, cc, (ring || core) ? 1 : 0);
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
    // 时序图案
    for (var i = 8; i < n - 8; i++) { var v = (i % 2 === 0) ? 1 : 0; setF(6, i, v); setF(i, 6, v); }
    // 对齐图案
    var ap = ALIGN[version];
    for (var a = 0; a < ap.length; a++) for (var b = 0; b < ap.length; b++) {
      var cr = ap[a], cc2 = ap[b];
      if (fn[cr][cc2]) continue; // 与定位图案重叠则跳过
      for (var u = -2; u <= 2; u++) for (var w = -2; w <= 2; w++) {
        var on = (Math.max(Math.abs(u), Math.abs(w)) !== 1) ? 1 : 0;
        setF(cr + u, cc2 + w, on);
      }
    }
    // 预留格式信息区（值稍后填）
    for (var z = 0; z < 9; z++) { if (!fn[8][z]) setF(8, z, 0); if (!fn[z][8]) setF(z, 8, 0); }
    for (var z2 = 0; z2 < 8; z2++) setF(8, n - 1 - z2, 0);   // copy2 横向 8 格
    for (var z3 = 0; z3 < 7; z3++) setF(n - 1 - z3, 8, 0);   // copy2 纵向 7 格 (n-1..n-7)
    // 暗模块（放在保留之后，确保不被覆盖）
    setF(n - 8, 8, 1);
    // 版本信息区（v≥7）
    if (version >= 7) {
      for (var p = 0; p < 18; p++) { var rr2 = Math.floor(p / 3), cc3 = p % 3; setF(rr2, n - 11 + cc3, 0); setF(n - 11 + cc3, rr2, 0); }
    }
    return { m: m, fn: fn, n: n };
  }

  function placeData(M, codewords) {
    var m = M.m, fn = M.fn, n = M.n;
    var bitIdx = 0, total = codewords.length * 8;
    function bit(i) { return i < total ? (codewords[i >> 3] >> (7 - (i & 7))) & 1 : 0; }
    var col = n - 1, up = true;
    while (col > 0) {
      if (col === 6) col--; // 跳过时序列
      for (var t = 0; t < n; t++) {
        var row = up ? (n - 1 - t) : t;
        for (var s = 0; s < 2; s++) {
          var cc = col - s;
          if (fn[row][cc]) continue;
          m[row][cc] = bit(bitIdx++);
        }
      }
      col -= 2; up = !up;
    }
  }

  function maskFn(k, r, c) {
    switch (k) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  }

  // 格式信息 BCH(15,5)，生成多项式 0x537，掩码 0x5412
  function formatBits(ec, mask) {
    var data = (EC_BITS[ec] << 3) | mask; // 5 bit
    var rem = data << 10;
    for (var i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
    return ((data << 10) | rem) ^ 0x5412; // 15 bit
  }
  // 版本信息 BCH(18,6)，生成多项式 0x1F25（v≥7）
  function versionBits(version) {
    var rem = version << 12;
    for (var i = 17; i >= 12; i--) if ((rem >> i) & 1) rem ^= 0x1F25 << (i - 12);
    return (version << 12) | rem;
  }

  function applyFormatVersion(M, ec, mask, version) {
    var m = M.m, n = M.n;
    var f = formatBits(ec, mask);
    for (var i = 0; i < 15; i++) {
      var b = (f >> i) & 1;
      // 副本 1（左上角周边）
      if (i < 6) m[8][i] = b;
      else if (i === 6) m[8][7] = b;
      else if (i === 7) m[8][8] = b;
      else if (i === 8) m[7][8] = b;
      else m[14 - i][8] = b;
      // 副本 2（右上 / 左下）
      if (i < 8) m[8][n - 1 - i] = b;
      else m[n - 15 + i][8] = b;
    }
    if (version >= 7) {
      var vb = versionBits(version);
      for (var p = 0; p < 18; p++) {
        var bit = (vb >> p) & 1, rr = Math.floor(p / 3), cc = p % 3;
        m[rr][n - 11 + cc] = bit;
        m[n - 11 + cc][rr] = bit;
      }
    }
  }

  function penalty(m, n) {
    var s = 0, r, c, i;
    // 规则 1：行/列连续 ≥5 同色
    for (r = 0; r < n; r++) {
      var run = 1;
      for (c = 1; c < n; c++) {
        if (m[r][c] === m[r][c - 1]) { run++; if (run === 5) s += 3; else if (run > 5) s++; }
        else run = 1;
      }
    }
    for (c = 0; c < n; c++) {
      var run2 = 1;
      for (r = 1; r < n; r++) {
        if (m[r][c] === m[r - 1][c]) { run2++; if (run2 === 5) s += 3; else if (run2 > 5) s++; }
        else run2 = 1;
      }
    }
    // 规则 2：2x2 同色块
    for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) {
      var v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) s += 3;
    }
    // 规则 3：1011101(0000) 形状
    var pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function look(arr) {
      var a, ok1, ok2, k;
      for (a = 0; a + 11 <= arr.length; a++) {
        ok1 = ok2 = true;
        for (k = 0; k < 11; k++) { if (arr[a + k] !== pat1[k]) ok1 = false; if (arr[a + k] !== pat2[k]) ok2 = false; }
        if (ok1 || ok2) s += 40;
      }
    }
    for (r = 0; r < n; r++) { var rowArr = []; for (c = 0; c < n; c++) rowArr.push(m[r][c]); look(rowArr); }
    for (c = 0; c < n; c++) { var colArr = []; for (r = 0; r < n; r++) colArr.push(m[r][c]); look(colArr); }
    // 规则 4：暗色比例
    var dark = 0;
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (m[r][c]) dark++;
    var pct = (dark * 100) / (n * n);
    s += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return s;
  }

  // 生成模块矩阵（0/1），含自动选掩码
  function generate(text, ec) {
    ec = ec || 'M';
    var enc = makeCodewords(text, ec);
    var version = enc.version;
    var best = null, bestPenalty = Infinity, bestMask = 0;
    for (var mask = 0; mask < 8; mask++) {
      var M = buildMatrix(version);
      placeData(M, enc.codewords);
      // 应用掩码（仅非功能模块）
      for (var r = 0; r < M.n; r++) for (var c = 0; c < M.n; c++)
        if (!M.fn[r][c] && maskFn(mask, r, c)) M.m[r][c] ^= 1;
      applyFormatVersion(M, ec, mask, version);
      var p = penalty(M.m, M.n);
      if (p < bestPenalty) { bestPenalty = p; best = M; bestMask = mask; }
    }
    return { matrix: best.m, n: best.n, version: version, mask: bestMask, ec: ec };
  }

  // ── 渲染 ──
  function toCanvas(text, opts) {
    opts = opts || {};
    var ec = opts.ec || 'M', scale = opts.scale || 4, margin = opts.margin == null ? 4 : opts.margin;
    var dark = opts.dark || '#1a1a1a', light = opts.light || '#ffffff';
    var g = generate(text, ec);
    var dim = (g.n + margin * 2) * scale;
    var cv = document.createElement('canvas');
    cv.width = dim; cv.height = dim;
    cv.style.width = dim + 'px'; cv.style.height = dim + 'px';
    var ctx = cv.getContext('2d');
    ctx.fillStyle = light; ctx.fillRect(0, 0, dim, dim);
    ctx.fillStyle = dark;
    for (var r = 0; r < g.n; r++) for (var c = 0; c < g.n; c++)
      if (g.matrix[r][c]) ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', '房间邀请二维码');
    return cv;
  }

  function render(container, text, opts) {
    if (!container) return null;
    container.innerHTML = '';
    var cv;
    try { cv = toCanvas(text, opts); }
    catch (e) { container.textContent = '二维码生成失败'; return null; }
    container.appendChild(cv);
    return cv;
  }

  var QR = { generate: generate, toCanvas: toCanvas, render: render,
             _internal: { rsEncode: rsEncode, formatBits: formatBits, versionBits: versionBits,
                          makeCodewords: makeCodewords, ECB: ECB, TOTAL_CW: TOTAL_CW } };

  if (typeof module !== 'undefined' && module.exports) module.exports = QR; // Node self-test
  root.GamesShell = root.GamesShell || {};
  root.GamesShell.QR = QR;
})(typeof window !== 'undefined' ? window : globalThis);
