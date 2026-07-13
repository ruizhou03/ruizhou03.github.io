/* doudizhu/net.js — DouZero-ADP (Hard) + DouZero-ResNet (Master) pure-JS inference.
 * AUTO-ASSEMBLED from verified ddz_encode.js + ddz_net.js (forward/encode parity 0 move-mismatches vs PyTorch).
 * Do not hand-edit the math; regenerate via ~/doudizhu-rl/build_browser.js. */
(function(){
  'use strict';
  const E = window.DDZEngine;
const Card2Col = {3:0,4:1,5:2,6:3,7:4,8:5,9:6,10:7,11:8,12:9,13:10,14:11,17:12};
const ONES = [[0,0,0,0],[1,0,0,0],[1,1,0,0],[1,1,1,0],[1,1,1,1]];
function cards2array(list) {          // -> Float32Array(54)
  const a = new Float32Array(54);
  if (!list || list.length === 0) return a;
  const cnt = {};
  for (const c of list) cnt[c] = (cnt[c]||0) + 1;
  for (const c in cnt) {
    const card = +c, n = cnt[c];
    if (card < 20) { const col = Card2Col[card]; const pat = ONES[n]; for (let r=0;r<4;r++) a[col*4+r] = pat[r]; }
    else if (card === 20) a[52] = 1;
    else if (card === 30) a[53] = 1;
  }
  return a;
}
function oneHot(numLeft, maxN) { const a = new Float32Array(maxN); if (numLeft>=1) a[numLeft-1]=1; return a; }
function oneHotBomb(b) { const a = new Float32Array(15); a[b]=1; return a; }
function cat(...arrs) { let n=0; for(const x of arrs) n+=x.length; const o=new Float32Array(n); let k=0; for(const x of arrs){o.set(x,k); k+=x.length;} return o; }

// base z: last 15 moves (front-pad []), each ->54, concat = 810 (used as 5x162)
function baseZ(seq) {
  let s = seq.slice(-15);
  while (s.length < 15) s.unshift([]);
  const o = new Float32Array(810);
  for (let i=0;i<15;i++) o.set(cards2array(s[i]), i*54);
  return o;
}
// base x_no_action (order matters). d = num_cards_left_dict, p = played_cards, lm = last_move, lmd=last_move_dict
function baseXNoAction(infoset) {
  const d=infoset.num_cards_left_dict, p=infoset.played_cards, pos=infoset.position;
  const my=cards2array(infoset.player_hand_cards), other=cards2array(infoset.other_hand_cards), last=cards2array(infoset.last_move);
  const bomb=oneHotBomb(infoset.bomb_num);
  if (pos==='landlord') {
    return cat(my, other, last,
      cards2array(p['landlord_up']), cards2array(p['landlord_down']),
      oneHot(d['landlord_up'],17), oneHot(d['landlord_down'],17), bomb);
  }
  const lmd=infoset.last_move_dict;
  const mate = (pos==='landlord_up') ? 'landlord_down' : 'landlord_up';
  return cat(my, other,
    cards2array(p['landlord']), cards2array(p[mate]),
    last, cards2array(lmd['landlord']), cards2array(lmd[mate]),
    oneHot(d['landlord'],20), oneHot(d[mate],17), bomb);
}
// resnet: shared z (39x54) + x(15); per-action z = [action(54), sharedZ]
function resnetShared(infoset) {
  const d=infoset.num_cards_left_dict, p=infoset.played_cards, pos=infoset.position;
  const numLeft = cat(oneHot(d['landlord'],20), oneHot(d['landlord_up'],17), oneHot(d['landlord_down'],17)); // 54
  // action seq: last 32, reverse, front-pad with null(-1 rows); each real -> cards2array, pad -> -1
  let s = infoset.card_play_action_seq.slice(-32).reverse();
  while (s.length < 32) s.unshift(null);
  const seqArr = new Float32Array(32*54);
  for (let i=0;i<32;i++){ if (s[i]===null) seqArr.fill(-1, i*54, i*54+54); else seqArr.set(cards2array(s[i]), i*54); }
  const shared = cat(numLeft, cards2array(infoset.player_hand_cards), cards2array(infoset.other_hand_cards),
    cards2array(infoset.three_landlord_cards), cards2array(p['landlord']), cards2array(p['landlord_up']),
    cards2array(p['landlord_down']), seqArr); // 8 blocks: 7*54 + 32*54 = 39*54 = 2106
  let bid, mult;
  if (pos==='landlord') { bid=[1,0.5,1,1,1,1,1,5,-4,1,1,1]; mult=[1,1,1]; }
  else { bid=[1,0.2,1,1,3.5,1,1,5,4,1.035,1,0.15]; mult=[1,2.5,1.2]; }
  return { shared, x: Float32Array.from(bid.concat(mult)) };
}

const sigmoid = x => 1 / (1 + Math.exp(-x));
// PyTorch Linear: y = W(out,in) @ x + b
function linear(W, b, x, outDim, inDim) {
  const y = new Float32Array(outDim);
  for (let o = 0; o < outDim; o++) {
    let s = b ? b[o] : 0; const base = o * inDim;
    for (let i = 0; i < inDim; i++) s += W[base + i] * x[i];
    y[o] = s;
  }
  return y;
}
const relu = y => { for (let i = 0; i < y.length; i++) if (y[i] < 0) y[i] = 0; return y; };
// z: Float32Array length T*IN (row-major T×IN). PyTorch LSTM(IN,HID), gate order i,f,g,o
function lstmLast(W, z, T, IN, HID) {
  const Wih = W['lstm.weight_ih_l0'], Whh = W['lstm.weight_hh_l0'];
  const bih = W['lstm.bias_ih_l0'], bhh = W['lstm.bias_hh_l0'];
  let h = new Float32Array(HID), c = new Float32Array(HID);
  const g = new Float32Array(4 * HID);
  for (let t = 0; t < T; t++) {
    const xo = t * IN;
    for (let k = 0; k < 4 * HID; k++) {
      let s = bih[k] + bhh[k];
      const ihb = k * IN; for (let i = 0; i < IN; i++) s += Wih[ihb + i] * z[xo + i];
      const hhb = k * HID; for (let j = 0; j < HID; j++) s += Whh[hhb + j] * h[j];
      g[k] = s;
    }
    const nc = new Float32Array(HID), nh = new Float32Array(HID);
    for (let j = 0; j < HID; j++) {
      const ig = sigmoid(g[j]), fg = sigmoid(g[HID + j]), gg = Math.tanh(g[2 * HID + j]), og = sigmoid(g[3 * HID + j]);
      nc[j] = fg * c[j] + ig * gg; nh[j] = og * Math.tanh(nc[j]);
    }
    h = nh; c = nc;
  }
  return h;
}
// base LSTM DouZero forward: returns scalar Q for one (z,x)
function forwardBase(W, z, x, T = 5, IN = 162, HID = 128) {
  const h = lstmLast(W, z, T, IN, HID);
  const xin = new Float32Array(HID + x.length);
  xin.set(h, 0); xin.set(x, HID);
  let v = xin;
  const dims = [[512, HID + x.length], [512, 512], [512, 512], [512, 512], [512, 512], [1, 512]];
  for (let L = 1; L <= 6; L++) {
    const [o, i] = dims[L - 1];
    v = linear(W['dense' + L + '.weight'], W['dense' + L + '.bias'], v, o, i);
    if (L < 6) relu(v);
  }
  return v[0];
}

// ---- ResNet (DouZero-ResNet / best) forward ----
const leaky = (y, s=0.01) => { for (let i=0;i<y.length;i++) if (y[i]<0) y[i]*=s; return y; };
// fmap: {d:Float32Array(C*L), C, L}. weight (OC,IC,K) row-major. stride, pad.
function conv1d(fm, W, OC, IC, K, stride, pad) {
  const L = fm.L, Lo = Math.floor((L + 2*pad - K)/stride) + 1;
  const out = new Float32Array(OC*Lo);
  for (let oc=0; oc<OC; oc++) {
    const wbase = oc*IC*K;
    for (let t=0; t<Lo; t++) {
      let s=0; const start = t*stride - pad;
      for (let ic=0; ic<IC; ic++) {
        const wb = wbase + ic*K, ib = ic*L;
        for (let k=0;k<K;k++){ const p=start+k; if(p>=0&&p<L) s += W[wb+k]*fm.d[ib+p]; }
      }
      out[oc*Lo+t]=s;
    }
  }
  return {d:out, C:OC, L:Lo};
}
function bn1d(fm, w, b, rm, rv, eps=1e-5) {
  const {C,L}=fm, out=new Float32Array(C*L);
  for (let c=0;c<C;c++){ const sc=w[c]/Math.sqrt(rv[c]+eps), sh=b[c]-rm[c]*sc, base=c*L;
    for (let t=0;t<L;t++) out[base+t]=fm.d[base+t]*sc+sh; }
  return {d:out,C,L};
}
const reluf = fm => { for(let i=0;i<fm.d.length;i++) if(fm.d[i]<0) fm.d[i]=0; return fm; };
function addRelu(a, b) { for(let i=0;i<a.d.length;i++){ a.d[i]+=b.d[i]; if(a.d[i]<0)a.d[i]=0;} return a; }
function basicBlock(W, fm, pfx, inC, outC, stride, hasSC) {
  let out = conv1d(fm, W[pfx+'.conv1.weight'], outC, inC, 3, stride, 1);
  out = reluf(bn1d(out, W[pfx+'.bn1.weight'],W[pfx+'.bn1.bias'],W[pfx+'.bn1.running_mean'],W[pfx+'.bn1.running_var']));
  out = conv1d(out, W[pfx+'.conv2.weight'], outC, outC, 3, 1, 1);
  out = bn1d(out, W[pfx+'.bn2.weight'],W[pfx+'.bn2.bias'],W[pfx+'.bn2.running_mean'],W[pfx+'.bn2.running_var']);
  let sc = fm;
  if (hasSC) { sc = conv1d(fm, W[pfx+'.shortcut.0.weight'], outC, inC, 1, stride, 0);
    sc = bn1d(sc, W[pfx+'.shortcut.1.weight'],W[pfx+'.shortcut.1.bias'],W[pfx+'.shortcut.1.running_mean'],W[pfx+'.shortcut.1.running_var']); }
  return addRelu(out, sc);
}
function forwardResnet(W, z, x) {   // z: Float32Array 40*54, x: Float32Array 15
  let fm = {d: z, C:40, L:54};
  fm = conv1d(fm, W['conv1.weight'], 80, 40, 3, 2, 1);
  fm = reluf(bn1d(fm, W['bn1.weight'],W['bn1.bias'],W['bn1.running_mean'],W['bn1.running_var']));
  fm = basicBlock(W, fm, 'layer1.0', 80, 80, 2, true);
  fm = basicBlock(W, fm, 'layer1.1', 80, 80, 1, false);
  fm = basicBlock(W, fm, 'layer2.0', 80, 160, 2, true);
  fm = basicBlock(W, fm, 'layer2.1', 160,160, 1, false);
  fm = basicBlock(W, fm, 'layer3.0', 160,320, 2, true);
  fm = basicBlock(W, fm, 'layer3.1', 320,320, 1, false);
  // flatten(1,2): (C,L)->C*L row-major, matches fm.d
  const flat = fm.d;  // 320*4 = 1280
  const feat = new Float32Array(x.length*4 + flat.length);
  for (let r=0;r<4;r++) feat.set(x, r*x.length);
  feat.set(flat, x.length*4);
  let v = feat;
  v = leaky(linear(W['linear1.weight'],W['linear1.bias'], v, 1024, feat.length));
  v = leaky(linear(W['linear2.weight'],W['linear2.bias'], v, 512, 1024));
  v = leaky(linear(W['linear3.weight'],W['linear3.bias'], v, 256, 512));
  v = leaky(linear(W['linear4.weight'],W['linear4.bias'], v, 1, 256));
  return v[0];
}

// ---- encode + forward over legal actions ----
function chooseBase(W, infoset) {
  const z = baseZ(infoset.card_play_action_seq);
  const xna = baseXNoAction(infoset);
  const qs = []; let best = -Infinity, bi = 0;
  infoset.legal_actions.forEach((a, j) => {
    const q = forwardBase(W, z, cat(xna, cards2array(a)));
    qs.push(q); if (q > best) { best = q; bi = j; }
  });
  return { qs, argmax: bi };
}
function chooseResnet(W, infoset) {
  const { shared, x } = resnetShared(infoset);
  const qs = []; let best = -Infinity, bi = 0;
  infoset.legal_actions.forEach((a, j) => {
    const q = forwardResnet(W, cat(cards2array(a), shared), x);
    qs.push(q); if (q > best) { best = q; bi = j; }
  });
  return { qs, argmax: bi };
}


  // ---- weights fetch loader (int8/int16 dequant -> f32 W map; forward unchanged) ----
  const WEIGHTS_BASE = (typeof window!=='undefined' && window.DDZNET_WEIGHTS_BASE) || '/assets/js/doudizhu/weights/';
  async function _fetchBuf(u){ const r=await fetch(u); if(!r.ok) throw new Error('fetch '+u+' '+r.status); return await r.arrayBuffer(); }
  async function loadNetQ8(prefix){
    const man = await (await fetch(prefix+'.json')).json();
    const QT = man.bits===8 ? Int8Array : Int16Array;
    const qw = new QT(await _fetchBuf(prefix+'.qw'));
    const f32 = new Float32Array(await _fetchBuf(prefix+'.f32'));
    const W = {};
    for (const p of man.params){
      if (p.q){ const OC=p.nscale, rest=p.count/OC, out=new Float32Array(p.count);
        for(let oc=0;oc<OC;oc++){ const s=f32[p.scale_off+oc], b=oc*rest, ib=p.off+b;
          for(let i=0;i<rest;i++) out[b+i]=qw[ib+i]*s; }
        W[p.name]=out;
      } else W[p.name]=f32.subarray(p.f32_off, p.f32_off+p.count);
    }
    return W;
  }
  const cache={}, loading={};
  function ready(model){ return !!cache[model]; }
  function ensureModel(model){
    if (cache[model]) return Promise.resolve(true);
    if (loading[model]) return loading[model];
    loading[model] = (async()=>{
      const parts={};
      for (const pos of ['landlord','landlord_up','landlord_down'])
        parts[pos]=await loadNetQ8(WEIGHTS_BASE+model+'_'+pos);
      cache[model]=parts; return true;
    })().catch(e=>{ console.warn('[DDZNet] load failed',model,e); loading[model]=null; return false; });
    return loading[model];
  }

  // ---- rank mapping: our weight 0..14 -> DouZero rank ----
  const W2DZ=[3,4,5,6,7,8,9,10,11,12,13,14,17,20,30];
  const toRanks = cards => cards.map(c=>W2DZ[E.cardWeight(c)]).sort((a,b)=>a-b);

  // ---- adapter: site state -> DouZero infoset (public info only) ----
  function posOf(seat, L){ const d=((seat-L)%3+3)%3; return d===0?'landlord':(d===1?'landlord_down':'landlord_up'); }
  function buildInfoset(seat, hand, prev, state, legalRanks){
    const L=state.landlordIdx, hands=state.hands;
    const sp = s => posOf(s, L);
    const other=[]; for(let s=0;s<3;s++) if(s!==seat) for(const c of hands[s]) other.push(c);
    const netPlayed = state.netPlayed || [[],[],[]];
    const netSeq = state.netSeq || [];
    const played={landlord:[],landlord_up:[],landlord_down:[]};
    for(let s=0;s<3;s++) played[sp(s)] = netPlayed[s].map(c=>W2DZ[E.cardWeight(c)]);
    const lmd={landlord:[],landlord_up:[],landlord_down:[]}, seen=[false,false,false];
    for(let i=netSeq.length-1;i>=0;i--){ const e=netSeq[i]; if(!seen[e.seat]){ seen[e.seat]=true; lmd[sp(e.seat)]=toRanks(e.cards); } }
    const seq=netSeq.map(e=>toRanks(e.cards));
    let three=[]; if(state.bottom){ const bp=state.bottomPlayed||new Set(); three=toRanks(state.bottom.filter(c=>!bp.has(c))); }
    return {
      position: sp(seat),
      player_hand_cards: toRanks(hand),
      other_hand_cards: toRanks(other),
      last_move: prev ? toRanks(prev.cards) : [],
      last_move_dict: lmd,
      num_cards_left_dict: { landlord:hands[L].length, landlord_down:hands[(L+1)%3].length, landlord_up:hands[(L+2)%3].length },
      played_cards: played,
      card_play_action_seq: seq,
      three_landlord_cards: three,
      bomb_num: state.bombCount||0,
      legal_actions: legalRanks,
    };
  }

  // ---- choose: our move object (or null=pass); undefined if net not loaded ----
  function choose(model, seat, hand, prev, state){
    if (!cache[model]) return undefined;
    const legal = E.enumerateBeats(hand, prev) || [];
    const cands = legal.map(m=>({move:m, ranks: toRanks(m.cards)}));
    if (prev) cands.push({move:null, ranks:[]});
    if (!cands.length) return null;
    const infoset = buildInfoset(seat, hand, prev, state, cands.map(c=>c.ranks));
    const W = cache[model][infoset.position];
    const r = (model==='adp') ? chooseBase(W, infoset) : chooseResnet(W, infoset);
    return cands[r.argmax].move;
  }
  window.DDZNet = { ensureModel, ready, choose,
    _buildInfoset: buildInfoset, _chooseBase: chooseBase, _chooseResnet: chooseResnet, _loadNetQ8: loadNetQ8 };

})();
