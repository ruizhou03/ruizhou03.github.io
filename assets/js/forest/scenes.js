(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ForestScenes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function _stars(list){ return list.map(([x,y,r,br],i)=>{
  const d=(((i*0.53)%1)*3.6).toFixed(2);
  // 干净的星点(去掉放大后像廉价"✛"准星的十字光芒)
  return `<g class="sc-star" style="animation-delay:${d}s"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${br||0.9}"/></g>`;}).join(''); }
function _cloud(x,y,s,fill,op){ return `<g fill="${fill}" opacity="${op}"><ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s*0.42}"/><ellipse cx="${x-s*0.55}" cy="${y+s*0.12}" rx="${s*0.55}" ry="${s*0.32}"/><ellipse cx="${x+s*0.6}" cy="${y+s*0.1}" rx="${s*0.5}" ry="${s*0.3}"/><ellipse cx="${x-s*0.1}" cy="${y-s*0.18}" rx="${s*0.5}" ry="${s*0.32}"/></g>`; }
function _driftX(inner, cls){ return `<g class="${cls}"><g>${inner}</g><g transform="translate(400,0)">${inner}</g></g>`; }


// ===== default(专业化打磨版) =====
// 精修不推翻:保留原构图(太阳 310,90;云布局;山丘;蓝->奶油天空;草地绿)。
// 加的是:柔软有体积的云(受光顶亮+底部柔阴影+羽化边)、丰润天空+地平线大气霾、
//        更柔的日晕核心、受光的草地渐变+丘陵顶部一抹暖边光、极淡颗粒质感。
// 动画沿用共享 sc-drift / sc-drift-slow / sc-bloom;不改共享 _cloud/_stars。

// 一朵柔软有体积的云:silhouette(裹进滤镜羽化)由多个圆叠成蓬松轮廓;
//  顶部一层暖白高光偏移向光源方(右上),底部一层冷灰柔阴影 → 出体积。
// 用 df- 前缀 gradient/filter,自足不冲突。


function _scene_default(){
  // —— 共享 helper 局部副本(与 index.html 顶层 _driftX 完全一致) ——
  const _driftX=(inner,cls)=>`<g class="${cls}"><g>${inner}</g><g transform="translate(400,0)">${inner}</g></g>`;

  // —— 柔软有体积的云(v2:平涂主体零接缝 + 渐隐阴影/高光出体积) ——
  const _dcloud=(x,y,s,op)=>{
    const lobes=[
      [0,      0,     s*1.00, s*0.60],
      [-s*0.62,s*0.14,s*0.60, s*0.42],
      [ s*0.66,s*0.12,s*0.56, s*0.40],
      [-s*0.20,-s*0.26,s*0.58,s*0.44],
      [ s*0.30,-s*0.22,s*0.52,s*0.40],
      [-s*1.02,s*0.24,s*0.36, s*0.28],
      [ s*1.04,s*0.22,s*0.34, s*0.26],
    ];
    const ell=(cx,cy,rx,ry,fill)=>`<ellipse cx="${(x+cx).toFixed(1)}" cy="${(y+cy).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}"/>`;
    // 云底外沿的柔阴影(藏在主体内侧,只透出羽化边)
    const under=ell(0, s*0.26, s*0.92, s*0.24,'url(#dfsh)');
    // 主体:单一平涂近白色 → 椭圆再怎么叠都不会出现内部接缝
    const body=lobes.map(([cx,cy,rx,ry])=>ell(cx,cy,rx,ry,'#f9fbfd')).join('');
    // 云肚体积暗面:radial 渐隐(边缘α=0),叠在平涂主体上;
    // 三枚错落不对称(中心/半径都错开),并集起伏——不再是一枚可辨的大椭圆
    const belly=ell(-s*0.40,s*0.20,s*0.46,s*0.15,'url(#dfsh)')
              + ell( s*0.34,s*0.30,s*0.44,s*0.14,'url(#dfsh)')
              + ell(-s*0.04,s*0.34,s*0.58,s*0.16,'url(#dfsh)');
    // 顶部受光高光:radial 渐隐暖白(原 linear 渐变有可辨椭圆轮廓,渐隐后无)
    const lit=lobes.slice(0,5).map(([cx,cy,rx,ry])=>ell(cx+rx*0.12,cy-ry*0.30,rx*0.72,ry*0.60,'url(#dflit)')).join('');
    return `<g opacity="${op}">`
      + `<g filter="url(#dfblur)">${under}</g>`
      + `<g filter="url(#dfsoft)">${body}</g>`
      + `<g filter="url(#dfsoft)">${belly}${lit}</g>`
      + `</g>`;
  };

  // —— 草簇/草纹/野花(手工定点,确定性;低饱和贴合奶油绿色板) ——
  const f1=n=>(+n).toFixed(1);
  // 一簇三叶草(叶基错开,不是一点放射)
  const tuft=(x,y,k,c,w,o)=>`<path d="M ${f1(x-0.9*k)} ${f1(y)} q ${f1(-1.3*k)} ${f1(-2.6*k)} ${f1(-2.1*k)} ${f1(-4.3*k)} M ${f1(x)} ${f1(y+0.2)} q ${f1(0.2*k)} ${f1(-3.2*k)} ${f1(0.5*k)} ${f1(-5.4*k)} M ${f1(x+0.9*k)} ${f1(y)} q ${f1(1.5*k)} ${f1(-2.3*k)} ${f1(2.4*k)} ${f1(-4.0*k)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
  // 单叶散布(草纹)
  const blade=(x,y,k,dir,c,o)=>`<path d="M ${x} ${y} q ${f1(dir*1.1*k)} ${f1(-2.4*k)} ${f1(dir*1.7*k)} ${f1(-4.0*k)}" fill="none" stroke="${c}" stroke-width="0.9" stroke-linecap="round" opacity="${o}"/>`;
  // 五瓣小野花(奶油色系,带一点淡金花芯)
  const flower=(x,y,r,pc)=>{ let p='';
    for(let i=0;i<5;i++){ const a=i*1.2566-1.5708;
      p+=`<circle cx="${f1(x+Math.cos(a)*r*1.05)}" cy="${f1(y+Math.sin(a)*r*1.05)}" r="${(r*0.68).toFixed(2)}" fill="${pc}"/>`; }
    return `<g opacity="0.8">${p}<circle cx="${x}" cy="${y}" r="${(r*0.45).toFixed(2)}" fill="#dfc98b"/></g>`;
  };

  // 远丘:簇沿丘顶轮廓线定点(基部埋进坡里,叶尖略探出霾带),体量小、色浅=远
  const grassFar =
      tuft(68,289.5,0.75,'#a9bd85',0.9,0.6)
    + tuft(150,287,0.7,'#a9bd85',0.9,0.55)
    + tuft(226,293,0.75,'#a9bd85',0.9,0.6)
    + tuft(312,304.5,0.7,'#a9bd85',0.9,0.55)
    + blade(105,307,0.7,-1,'#e0e9bd',0.55)
    + blade(190,311,0.75,1,'#a9bd85',0.5)
    + blade(268,313,0.7,1,'#e0e9bd',0.5)
    + `<circle cx="140" cy="306" r="0.9" fill="#f2ead2" opacity="0.75"/>`
    + `<circle cx="247" cy="309.5" r="0.8" fill="#f2ead2" opacity="0.7"/>`;
  // 近丘:丘顶簇 + 坡身簇 + 受光/背光单叶 + 野花(压轴画在暗影带之上保持干净)
  const grassNear =
      tuft(52,331,0.9,'#8a9f6a',1.0,0.6)
    + tuft(138,326.5,0.85,'#8a9f6a',1.0,0.55)
    + tuft(206,327.5,0.9,'#8a9f6a',1.0,0.6)
    + tuft(283,333,0.85,'#8a9f6a',1.0,0.55)
    + tuft(352,340.5,0.9,'#8a9f6a',1.0,0.6)
    + tuft(95,356,1.1,'#879c66',1.05,0.5)
    + tuft(170,368,1.15,'#879c66',1.1,0.5)
    + tuft(248,353,1.05,'#879c66',1.05,0.5)
    + tuft(318,363,1.1,'#879c66',1.1,0.5)
    + tuft(30,378,1.15,'#879c66',1.1,0.45)
    + blade(60,347,0.9,1,'#d6e2ae',0.5)
    + blade(128,384,1.0,-1,'#b8c992',0.5)
    + blade(200,345,0.9,-1,'#d6e2ae',0.5)
    + blade(226,378,1.0,1,'#b8c992',0.5)
    + blade(288,389,1.0,-1,'#b8c992',0.45)
    + blade(340,348,0.9,1,'#d6e2ae',0.5)
    + blade(146,353,0.85,1,'#8ea36e',0.45)
    + blade(262,366,0.9,-1,'#8ea36e',0.45)
    + flower(86,353.5,1.1,'#f5eeda')
    + flower(186,364,1.15,'#ead8cc')
    + flower(256,350.5,1.05,'#f0e5ba')
    + flower(338,372,1.1,'#f5eeda');

  // 远层(慢、淡、偏小、偏灰) + 近层(快、白、体积强) 做景深
  const farClouds =
      _dcloud(210,92,26,0.55)
    + _dcloud(60,215,34,0.62);   // ③ 原(60,206):下沉 9,云底浸进低空薄雾
  const nearClouds =
      _dcloud(112,120,50,0.96)
    + _dcloud(300,192,44,0.90);

  return `<defs>
    <!-- 更丰润的天空:顶部通透蓝 -> 中段柔蓝 -> 近地平奶油,过渡更绵密 -->
    <linearGradient id="dfsky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"    stop-color="#8fb8d8"/>
      <stop offset="0.28" stop-color="#a7c8de"/>
      <stop offset="0.55" stop-color="#cadde4"/>
      <stop offset="0.80" stop-color="#e6ecdf"/>
      <stop offset="1"    stop-color="#eef0e2"/>
    </linearGradient>
    <!-- 太阳一侧的暖色空气染色(右上偏暖),让天空不是均匀冷蓝 -->
    <radialGradient id="dfwarm" cx="78%" cy="20%" r="70%">
      <stop offset="0"   stop-color="#fff2cf" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="#fdeccb" stop-opacity="0.14"/>
      <stop offset="1"   stop-color="#fdeccb" stop-opacity="0"/>
    </radialGradient>
    <!-- 地平线大气霾:一抹发亮的暖白横带,拉出景深 -->
    <linearGradient id="dfhaze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"    stop-color="#fbf6e6" stop-opacity="0"/>
      <stop offset="0.55" stop-color="#fbf6e6" stop-opacity="0.42"/>
      <stop offset="1"    stop-color="#fbf6e6" stop-opacity="0"/>
    </linearGradient>
    <!-- ③ 低空薄雾:两端归零、峰值压在远云底(y≈242),全宽,远云漂到哪都被托住 -->
    <linearGradient id="dfmist" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"    stop-color="#f9f4e4" stop-opacity="0"/>
      <stop offset="0.45" stop-color="#f9f4e4" stop-opacity="0.14"/>
      <stop offset="0.75" stop-color="#f9f4e4" stop-opacity="0.22"/>
      <stop offset="1"    stop-color="#f9f4e4" stop-opacity="0"/>
    </linearGradient>
    <!-- 太阳外晕 & 更柔的核心 -->
    <radialGradient id="dfsun" cx="50%" cy="50%" r="50%">
      <stop offset="0"    stop-color="#fff6df" stop-opacity="0.95"/>
      <stop offset="0.55" stop-color="#fff2d2" stop-opacity="0.34"/>
      <stop offset="1"    stop-color="#fff6df" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="dfcore" cx="50%" cy="46%" r="52%">
      <stop offset="0"    stop-color="#fffef8"/>
      <stop offset="0.62" stop-color="#fffbee"/>
      <stop offset="0.86" stop-color="#fff4d6"/>
      <stop offset="1"    stop-color="#ffedc4" stop-opacity="0.35"/>
    </radialGradient>
    <!-- ② 日核:实心圆换成边缘渐隐(0.82 后滚落),视觉尺寸≈原 r20 -->
    <radialGradient id="dfcore2" cx="50%" cy="50%" r="50%">
      <stop offset="0"    stop-color="#fffef8"/>
      <stop offset="0.6"  stop-color="#fffdf3"/>
      <stop offset="0.82" stop-color="#fffdf3" stop-opacity="0.95"/>
      <stop offset="1"    stop-color="#fff6dd" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="dbloom" cx="50%" cy="50%" r="50%">
      <stop offset="0"   stop-color="#fff3d0" stop-opacity="0.85"/>
      <stop offset="0.6" stop-color="#ffeec2" stop-opacity="0.28"/>
      <stop offset="1"   stop-color="#ffeec2" stop-opacity="0"/>
    </radialGradient>
    <!-- 云:渐隐高光 / 渐隐阴影 / 羽化滤镜(主体平涂无需渐变) -->
    <radialGradient id="dflit" cx="50%" cy="42%" r="55%">
      <stop offset="0"    stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="0.55" stop-color="#fffdf4" stop-opacity="0.5"/>
      <stop offset="1"    stop-color="#fff8ec" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="dfsh" cx="50%" cy="50%" r="50%">
      <stop offset="0"   stop-color="#aebecd" stop-opacity="0.2"/>
      <stop offset="0.7" stop-color="#aebecd" stop-opacity="0.1"/>
      <stop offset="1"   stop-color="#aebecd" stop-opacity="0"/>
    </radialGradient>
    <filter id="dfsoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.7"/></filter>
    <filter id="dfblur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.0"/></filter>
    <!-- 草地受光渐变 -->
    <linearGradient id="dfg1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="#cfdcae"/>
      <stop offset="1"   stop-color="#bccf97"/>
    </linearGradient>
    <linearGradient id="dfg2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="#b3c68c"/>
      <stop offset="1"   stop-color="#9db078"/>
    </linearGradient>
    <!-- 近丘底暗带:上缘 α=0 羽化(原平涂 0.22 有硬边),底部保持压重 -->
    <linearGradient id="dfg3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0"   stop-color="#8ba06d" stop-opacity="0"/>
      <stop offset="0.6" stop-color="#8ba06d" stop-opacity="0.14"/>
      <stop offset="1"   stop-color="#8ba06d" stop-opacity="0.24"/>
    </linearGradient>
    <!-- 极淡颗粒(去"塑料扁平"感) -->
    <filter id="dfgrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0"/></filter>
  </defs>

  <!-- 天空 + 暖染 + 霾 -->
  <rect width="400" height="400" fill="url(#dfsky)"/>
  <rect width="400" height="400" fill="url(#dfwarm)"/>

  <!-- 太阳:外晕 + 柔核(保留 310,90;② 内核改渐隐) -->
  <circle cx="310" cy="90" r="98" fill="url(#dfsun)"/>
  <circle cx="310" cy="90" r="34" fill="url(#dfcore)"/>
  <circle cx="310" cy="90" r="23" fill="url(#dfcore2)"/>

  <!-- 远景云(慢) -->
  ${_driftX(farClouds,'sc-drift-slow')}
  <!-- ③ 低空薄雾(压远云底) + 地平线大气霾带(压在云与地之间) -->
  <rect x="0" y="188" width="400" height="72" fill="url(#dfmist)"/>
  <rect x="0" y="236" width="400" height="86" fill="url(#dfhaze)"/>
  <!-- 近景云(快、体积强) -->
  ${_driftX(nearClouds,'sc-drift')}

  <!-- 云掠日暖光散射(保留) -->
  <circle cx="310" cy="90" r="104" fill="url(#dbloom)" class="sc-bloom"/>

  <!-- 草地:远丘 + 近丘,受光渐变;丘顶一抹暖边光 -->
  <path d="M0 300 Q 130 272 270 298 Q 340 310 400 296 L400 400 L0 400 Z" fill="url(#dfg1)"/>
  <path d="M0 300 Q 130 272 270 298 Q 340 310 400 296" fill="none" stroke="#eef3dc" stroke-width="1.4" opacity="0.55"/>
  ${grassFar}
  <path d="M0 336 Q 150 314 320 336 Q 370 344 400 334 L400 400 L0 400 Z" fill="url(#dfg2)"/>
  <path d="M0 336 Q 150 314 320 336 Q 370 344 400 334" fill="none" stroke="#c9d8a8" stroke-width="1.2" opacity="0.5"/>
  <!-- 近丘底部一层极淡暗影(dfg3 上缘羽化),压出体积、不再是一块平绿 -->
  <path d="M0 374 Q 150 368 400 372 L400 400 L0 400 Z" fill="url(#dfg3)"/>
  <!-- ① 草簇/草纹/野花(画在暗影带之上保持清晰) -->
  ${grassNear}

  <!-- 极淡颗粒质感覆盖全幅(不遮识别度) -->
  <rect width="400" height="400" filter="url(#dfgrain)" opacity="0.05"/>`;
}
// ===== sunrise(专业化打磨版) =====
// 保留原构图：太阳在地平线微升(200,308) / 云布局(95,150·310,120·250,200) /
// 暖色天空(顶部深橙→地平线暖金) / 两道远山剪影。
// 新增质感：多层暖霞天空(极淡霞带)、太阳柔光多层辉光+克制的光线散射、
// 云的暖 rim light 亮边+底部阴影(体积感)、地平线暖雾/霞气、远山暖反光边缘、
// 细腻颗粒/柔和噪点、近大远小景深。
// 所有 gradient / filter id 用 "sr" 前缀避免与其它主题冲突。



function _scene_sunrise(){
  // —— 局部 helper 副本（与 index.html 顶层 _driftX 同义，保证本函数自足） ——
  const _driftX=(inner,cls)=>`<g class="${cls}"><g>${inner}</g><g transform="translate(400,0)">${inner}</g></g>`;

  // —— 逆光云（体积版，签名不变）：太阳在下方(200,308) → 朝阳侧＝底部 ——
  const _sunriseRimCloud=(x,y,s,opBody,opRim)=>{
    // 前 4 片 = 旧版原 lobe（轮廓尺度不变），后 3 片小补片让整团连续蓬松
    const lobes=[
      [0,       0,      s*1.00, s*0.42],
      [-s*0.55, s*0.12, s*0.55, s*0.32],
      [ s*0.60, s*0.10, s*0.50, s*0.30],
      [-s*0.10,-s*0.18, s*0.50, s*0.32],
      [ s*0.34,-s*0.12, s*0.42, s*0.27],
      [-s*0.98, s*0.20, s*0.30, s*0.19],
      [ s*1.00, s*0.18, s*0.28, s*0.18],
    ];
    const el=(cx,cy,rx,ry,fill)=>`<ellipse cx="${(x+cx).toFixed(1)}" cy="${(y+cy).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${fill}"/>`;
    // 剪影：所有 lobe 同一中间调纯色 → 并集内部零分界（这是去掉"可辨椭圆弧线"的关键：
    // 任何不透明的 per-lobe 渐变在重叠处都会露出弧形分界，只有纯色并集是干净的）
    let sil='';
    for(const [cx,cy,rx,ry] of lobes) sil += el(cx,cy,rx,ry,'#e2a072');
    // 明暗全用「羽化径向、收尾全透明」的斑块叠（重叠自然混合→绝无弧线），
    // 保持 before 版被认可的受光结构：顶面天光略亮 → 云腹一条暗带 → 底缘朝阳金 rim。
    // 顶面天光：沿上排 lobe 三片浅暖光斑
    const lit =
        el(-s*0.10,-s*0.28,s*0.62,s*0.30,'url(#srClit)')
      + el( s*0.38,-s*0.22,s*0.52,s*0.26,'url(#srClit)')
      + el(-s*0.62,-s*0.02,s*0.42,s*0.22,'url(#srClit)')
      + el( s*0.90, s*0.06,s*0.30,s*0.16,'url(#srClit)');
    // 云腹暗带：贴着底排 lobe 中线的一排宽扁暗斑（在金 rim 之上），逆光云的"压舱"暗面
    let shade='';
    for(const i of [0,1,2]){
      const [cx,cy,rx,ry]=lobes[i];
      shade += el(cx,cy+ry*0.12,rx*1.00,ry*0.48,'url(#srCshade)');
    }
    // 底缘被朝阳染的暖亮 rim：亮核贴在各底排 lobe 的底缘线上（cy+ry*0.45、ry*0.55 →
    // 下缘恰在剪影底边），径向收尾全透明 + 模糊——金边烧在边上，不垂到云外变光雾
    let rim='';
    for(const i of [0,1,2,5,6]){
      const [cx,cy,rx,ry]=lobes[i];
      rim += el(cx,cy+ry*0.45,rx*0.86,ry*0.55,'url(#srCrim)');
    }
    return `<g opacity="${opBody}">`
      + `<g filter="url(#srCsoft)">${sil}</g>`
      + `<g filter="url(#srCblur)">${lit}</g>`
      + `<g filter="url(#srCblur)">${shade}</g>`
      + `<g filter="url(#srCblur)" opacity="${opRim}">${rim}</g>`
      + `</g>`;
  };

  // —— 山脊微起伏：沿旧版二次曲线包络叠固定小扰动，中点平滑成连续脊线 ——
  const qy=(p0,p1,p2,t)=>{const u=1-t;return u*u*p0+2*u*t*p1+t*t*p2;};
  const farEnv =x=> x<=240 ? qy(300,282,300,x/240) : qy(300,314,298,(x-240)/160);
  const nearEnv=x=> x<=320 ? qy(330,314,332,x/320) : qy(332,340,330,(x-320)/80);
  // 固定扰动（非随机，端点为 0 保住画幅边缘锚点；幅度 ≤2.6，"极克制"）
  const FAR_W =[0,-1.6,0.9,-2.2,-0.8,1.4,0.4,-1.1,1.8,0.6,-1.5,0.8,2.0,-0.6,1.2,-1.0,0];
  const NEAR_W=[0,1.2,-1.8,0.7,2.4,-0.9,-2.2,1.5,0.5,-1.6,2.2,-0.8,1.4,-2.6,0.9,-1.2,0];
  const ridgePts=(env,w)=>w.map((dy,i)=>[i*25, env(i*25)+dy]);
  const ridgeD=(pts)=>{
    let d=`M${pts[0][0]} ${pts[0][1].toFixed(1)}`;
    for(let i=1;i<pts.length-1;i++){
      const [x1,y1]=pts[i],[x2,y2]=pts[i+1];
      d+=` Q ${x1} ${y1.toFixed(1)} ${((x1+x2)/2).toFixed(1)} ${((y1+y2)/2).toFixed(1)}`;
    }
    const [xl,yl]=pts[pts.length-1];
    return d+` L ${xl} ${yl.toFixed(1)}`;
  };
  const farRidge =ridgeD(ridgePts(farEnv ,FAR_W ));
  const nearRidge=ridgeD(ridgePts(nearEnv,NEAR_W));

  // 三朵云（保留原位置/尺寸），下方光源在(200,308)，rim 打在朝向太阳的一侧
  const clouds =
      _sunriseRimCloud(95, 150, 44, 0.66, 0.95)
    + _sunriseRimCloud(310, 120, 52, 0.62, 0.9)
    + _sunriseRimCloud(250, 200, 60, 0.55, 1);

  // 克制的光线散射：极淡、宽、模糊的暖光楔，从太阳向上外扩，只做"晨光弥散"暗示，不做硬光柱
  const ray=(cx,w,op)=>`<path d="M${(200+cx).toFixed(1)} 40 L${(200+cx-w).toFixed(1)} 308 L${(200+cx+w).toFixed(1)} 308 Z" fill="url(#srRay)" opacity="${op}"/>`;
  const rays = ray(-70,34,0.28)+ray(-22,26,0.34)+ray(30,30,0.3)+ray(84,40,0.24);

  return `<defs>
    <!-- 天空：顶部深暖橙 → 中段暖橘 → 地平线暖金，比原版多两档过渡更柔 -->
    <linearGradient id="srSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b8442a"/>
      <stop offset="0.28" stop-color="#cf5c34"/>
      <stop offset="0.5" stop-color="#e07a44"/>
      <stop offset="0.68" stop-color="#ef9a55"/>
      <stop offset="0.85" stop-color="#f7be70"/>
      <stop offset="1" stop-color="#fcdd94"/>
    </linearGradient>
    <!-- 地平线暖光穹：以太阳为中心的大范围暖光弥散，营造"天要亮"的整体氛围 -->
    <radialGradient id="srGlowDome" cx="50%" cy="77%" r="72%">
      <stop offset="0" stop-color="#fff1c8" stop-opacity="0.72"/>
      <stop offset="0.34" stop-color="#ffd98f" stop-opacity="0.38"/>
      <stop offset="0.68" stop-color="#ffbf70" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#ffbf70" stop-opacity="0"/>
    </radialGradient>
    <!-- 极淡霞带：横向暖色光晕，加一点分层不匀感 -->
    <linearGradient id="srBand" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffcaa0" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffdca8" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#ffdca8" stop-opacity="0"/>
    </linearGradient>
    <!-- 太阳本体：中心炽白 → 暖金，边缘柔化 -->
    <radialGradient id="srSunCore" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fffdf4"/>
      <stop offset="0.55" stop-color="#fff2cf"/>
      <stop offset="0.86" stop-color="#ffe1a2"/>
      <stop offset="1" stop-color="#ffd98f" stop-opacity="0.9"/>
    </radialGradient>
    <!-- 太阳外辉光：多层柔散 -->
    <radialGradient id="srSunHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff4d6" stop-opacity="0.95"/>
      <stop offset="0.4" stop-color="#ffe3a8" stop-opacity="0.5"/>
      <stop offset="0.72" stop-color="#ffcf88" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#ffcf88" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="srSunFar" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffe9b8" stop-opacity="0.4"/>
      <stop offset="1" stop-color="#ffe9b8" stop-opacity="0"/>
    </radialGradient>
    <!-- 光柱：竖直暖白，底端亮顶端化开，靠 screen 叠加 + 模糊，做弥散晨光 -->
    <linearGradient id="srRay" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#fff1cc" stop-opacity="0.5"/>
      <stop offset="0.5" stop-color="#ffe6b0" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#ffe6b0" stop-opacity="0"/>
    </linearGradient>
    <filter id="srRayBlur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
    <!-- 逆光云：中间调剪影上叠「羽化天光/暗带/金 rim」（皆 objectBoundingBox，随漂移复制安全） -->
    <radialGradient id="srClit" cx="50%" cy="50%" r="52%">
      <stop offset="0" stop-color="#ffd9a8" stop-opacity="0.95"/>
      <stop offset="0.55" stop-color="#fbcd97" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#fbcd97" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="srCshade" cx="50%" cy="50%" r="52%">
      <stop offset="0" stop-color="#9c5634" stop-opacity="0.52"/>
      <stop offset="0.6" stop-color="#9c5634" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#9c5634" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="srCrim" cx="50%" cy="55%" r="55%">
      <stop offset="0" stop-color="#fff3cf" stop-opacity="1"/>
      <stop offset="0.55" stop-color="#ffd28c" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ffd28c" stop-opacity="0"/>
    </radialGradient>
    <filter id="srCsoft" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="0.7"/></filter>
    <filter id="srCblur" x="-45%" y="-45%" width="190%" height="190%"><feGaussianBlur stdDeviation="1.6"/></filter>
    <!-- 地平线暖雾/霞气 -->
    <linearGradient id="srMist" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe0ad" stop-opacity="0"/>
      <stop offset="0.55" stop-color="#ffdca0" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#ffcf8c" stop-opacity="0.72"/>
    </linearGradient>
    <!-- 远山：暖棕多档剪影(顶部大气提亮) + 顶边暖反光 -->
    <linearGradient id="srHillFar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d88152"/>
      <stop offset="0.12" stop-color="#cf7448"/>
      <stop offset="0.32" stop-color="#c46b41"/>
      <stop offset="1" stop-color="#b25e39"/>
    </linearGradient>
    <linearGradient id="srHillNear" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b05c35"/>
      <stop offset="0.16" stop-color="#a3512d"/>
      <stop offset="0.45" stop-color="#964827"/>
      <stop offset="1" stop-color="#874022"/>
    </linearGradient>
    <!-- 柔和颗粒：极淡噪点，压掉大色块的塑料感 -->
    <filter id="srGrain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0"/>
    </filter>
  </defs>

  <!-- 天空底 -->
  <rect width="400" height="400" fill="url(#srSky)"/>
  <!-- 极淡横向霞带（两条，位置错开，破除纯渐变的均匀感） -->
  <rect x="0" y="120" width="400" height="90" fill="url(#srBand)"/>
  <rect x="0" y="210" width="400" height="70" fill="url(#srBand)" opacity="0.7"/>

  <!-- 地平线暖光穹（大范围氛围光） -->
  <rect width="400" height="400" fill="url(#srGlowDome)"/>

  <!-- 克制的光线散射（在云与太阳之间，用 screen 只在暗处显形） -->
  <g class="srsun-rays" filter="url(#srRayBlur)" style="mix-blend-mode:screen">${rays}</g>

  <!-- 太阳外层远辉 + 主辉光 + 本体（保留 sc-riser 微升） -->
  <g class="sc-riser">
    <circle cx="200" cy="308" r="150" fill="url(#srSunFar)"/>
    <circle cx="200" cy="308" r="112" fill="url(#srSunHalo)"/>
    <circle cx="200" cy="308" r="44" fill="url(#srSunCore)"/>
    <!-- 太阳边缘一圈更亮的暖光唇，增加"炽热"感 -->
    <circle cx="200" cy="308" r="44" fill="none" stroke="#fff6da" stroke-width="2.2" opacity="0.55"/>
  </g>

  <!-- 云（慢飘，体积逆光云：多档色阶+羽化+底缘金 rim） -->
  ${_driftX(clouds,'sc-drift-slow')}

  <!-- 地平线暖雾/霞气：压在山与天交界，做空气透视 -->
  <rect x="0" y="286" width="400" height="60" fill="url(#srMist)"/>

  <!-- 远山（浅、被暖雾罩；脊线带极克制起伏） -->
  <path d="${farRidge} L400 400 L0 400 Z" fill="url(#srHillFar)" opacity="0.92"/>
  <!-- 远山顶边暖反光（沿新脊线） -->
  <path d="${farRidge}" fill="none" stroke="#ffd9a0" stroke-width="1.4" opacity="0.5"/>
  <!-- 近山 -->
  <path d="${nearRidge} L400 400 L0 400 Z" fill="url(#srHillNear)"/>
  <path d="${nearRidge}" fill="none" stroke="#e89a63" stroke-width="1.2" opacity="0.4"/>

  <!-- 全幅柔和颗粒（叠在最上，极淡） -->
  <rect width="400" height="400" filter="url(#srGrain)" opacity="0.05"/>`;
}

// 光柱缓慢左右摇曳（无缝往返），裹在 reduced-motion 内
// ===== night(专业化打磨版) =====
// 保留：干净月牙(月位/朝向不变)、月晕、深冷天空、微淡银河带、明灭星、夜山
// 新增质感：天空多层冷色纵深渐变+顶部墨蓝压暗+地平线暖冷光晕、银河聚成柔带
//          有光晕/亮度大小错落的星(核心亮点+柔晕)、山体夜雾/微反光/雾气浮层、
//          月面柔和明暗(明暗交界线)、极细颗粒。gradient id 统一 nt- 前缀避免冲突。

// 有质感的星：亮核 + 柔光晕，随尺寸/亮度错落；沿用 sc-star 明灭
function _ntStars(list){ return list.map(([x,y,r,br,glow],i)=>{
  const d=(((i*0.53)%1)*3.6).toFixed(2), dur=(3.0+((i*0.37)%1)*2.8).toFixed(2);
  const halo = glow ? `<circle cx="${x}" cy="${y}" r="${(r*3.4).toFixed(2)}" fill="url(#ntStarHalo)" opacity="${(br*0.9).toFixed(2)}"/>` : '';
  return `<g class="sc-star" style="animation-delay:${d}s;animation-duration:${dur}s">${halo}`
    + `<circle cx="${x}" cy="${y}" r="${r}" fill="#f4f8ff" opacity="${br}"/>`
    + (r>1.2?`<circle cx="${x}" cy="${y}" r="${(r*0.45).toFixed(2)}" fill="#ffffff" opacity="1"/>`:'')
    + `</g>`;}).join(''); }

function _scene_night(){
  // 星表：[x,y,r,亮度,是否带柔晕]。亮度/大小刻意错落，几颗“主星”带明显光晕（未动）
  const stars=[
    [60,60,1.9,1,1],[120,40,1.0,0.7,0],[168,86,2.3,1,1],[240,50,1.3,0.85,0],
    [300,78,1.0,0.7,0],[344,50,1.7,0.95,1],[92,138,1.1,0.72,0],[200,150,1.5,0.85,1],
    [280,158,1.0,0.68,0],[352,182,1.3,0.8,0],[40,200,0.9,0.55,0],[150,208,1.0,0.6,0],
    [322,228,1.0,0.58,0],[130,110,0.8,0.55,0],[250,108,1.0,0.7,0],[74,96,0.85,0.5,0],
    [212,196,0.9,0.55,0],[96,250,1.0,0.6,0],[184,44,0.8,0.5,0],[36,120,1.4,0.85,1],
    [270,206,0.85,0.5,0],[158,168,0.9,0.55,0],[318,132,1.1,0.7,0],[224,246,0.8,0.5,0],
  ];
  // 确定性伪随机（sin-fract，替代 (i*53)%40 的格点感；绝不用 Math.random）
  const ntH=n=>{const x=Math.sin(n)*43758.5453;return x-Math.floor(x);};
  // 银河脊线（与原实现同一条曲线，微尘星与椭圆链共用）
  const ntSpine=t=>150-Math.sin(Math.min(1,Math.max(0,(t-0.02)))*Math.PI)*70;
  // 银河椭圆链：[cx,cy,rx,ry,rot,op]，cy 取自脊线；宽柔底层 + 略亮脊层。
  // 左端椭圆加宽使带体一直延到画左缘(不在画内"凭空开始"；注意别放完全出画的大椭圆，
  // resvg 裁切视窗下会 panic)；右端靠近月亮逐级降透明淡出(月光把银河洗掉，物理上也对)
  const mwSoft=[
    [25,129,115,27,-19,1],[120,94,95,27,-10,1],[205,80,95,28,0,0.9],[285,96,88,25,12,0.42],[382,134,86,24,22,0.25],
  ];
  const mwSpine=[
    [45,120,95,16,-18,0.95],[160,85,78,17,-6,0.95],[255,84,75,16,7,0.5],
  ];
  const mwEll=(list,grad)=>list.map(([cx,cy,rx,ry,rot,op])=>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${grad})" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})"/>`).join('');
  return `<defs>
    <!-- 天空：多段冷色纵深，顶部墨蓝压暗，靠地平线略回暖 -->
    <linearGradient id="ntSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0c2029"/>
      <stop offset="0.30" stop-color="#173540"/>
      <stop offset="0.60" stop-color="#123039"/>
      <stop offset="0.82" stop-color="#0e2730"/>
      <stop offset="1" stop-color="#0a1c24"/>
    </linearGradient>
    <!-- 顶部压暗渐晕，增加纵深/庄重 -->
    <linearGradient id="ntVignTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#05121a" stop-opacity="0.55"/>
      <stop offset="0.4" stop-color="#05121a" stop-opacity="0"/>
    </linearGradient>
    <!-- 地平线冷暖光晕（月光把远天照亮一点） -->
    <radialGradient id="ntHorizon" cx="72%" cy="88%" r="70%">
      <stop offset="0" stop-color="#3a5c6b" stop-opacity="0.42"/>
      <stop offset="0.5" stop-color="#22404c" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#22404c" stop-opacity="0"/>
    </radialGradient>
    <!-- 银河：宽柔底层 / 收紧亮脊层（纯径向渐变自带羽化，零 filter，防低分糊雾与滤镜盒硬边） -->
    <radialGradient id="ntMwSoft" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#cfdaf0" stop-opacity="0.13"/>
      <stop offset="0.55" stop-color="#b9a8d8" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#b9a8d8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ntMwSpine" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#e4ebf8" stop-opacity="0.12"/>
      <stop offset="0.5" stop-color="#cbd6ee" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#cbd6ee" stop-opacity="0"/>
    </radialGradient>
    <!-- 月面：柔和明暗（左上受光、右下阴影，做体积） -->
    <radialGradient id="ntMoon" cx="38%" cy="34%" r="72%">
      <stop offset="0" stop-color="#fefcf2"/>
      <stop offset="0.55" stop-color="#f3ead0"/>
      <stop offset="0.85" stop-color="#e2d3a8"/>
      <stop offset="1" stop-color="#cdbb8e"/>
    </radialGradient>
    <!-- 月晕：三段柔光 -->
    <radialGradient id="ntMoonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#f3efd6" stop-opacity="0.5"/>
      <stop offset="0.4" stop-color="#e6e2c8" stop-opacity="0.22"/>
      <stop offset="0.7" stop-color="#cfe0e6" stop-opacity="0.1"/>
      <stop offset="1" stop-color="#cfe0e6" stop-opacity="0"/>
    </radialGradient>
    <!-- 星的柔光晕 -->
    <radialGradient id="ntStarHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#e9f1ff" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="#cfe0ff" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/>
    </radialGradient>
    <!-- 月牙镂空 -->
    <mask id="ntCres"><circle cx="300" cy="108" r="30" fill="#fff"/><circle cx="316" cy="99" r="27" fill="#000"/></mask>
    <!-- 山体：三层色阶拉开（远山偏蓝灰泛月光、近山最深但不落纯黑） -->
    <linearGradient id="ntHillFar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#173d4b"/>
      <stop offset="0.4" stop-color="#0e2833"/>
      <stop offset="1" stop-color="#091c25"/>
    </linearGradient>
    <linearGradient id="ntHillMid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0f2934"/>
      <stop offset="1" stop-color="#071720"/>
    </linearGradient>
    <linearGradient id="ntHillNear" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#091b25"/>
      <stop offset="1" stop-color="#030c14"/>
    </linearGradient>
    <!-- 山脊月光渐隐：贴各层山脊的一抹侧受光，往山脚淡出（userSpaceOnUse 跟随脊线高度） -->
    <linearGradient id="ntRidgeFar" gradientUnits="userSpaceOnUse" x1="0" y1="224" x2="0" y2="282">
      <stop offset="0" stop-color="#7fa6ba" stop-opacity="0.20"/>
      <stop offset="0.5" stop-color="#7fa6ba" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#7fa6ba" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="ntRidgeMid" gradientUnits="userSpaceOnUse" x1="0" y1="280" x2="0" y2="334">
      <stop offset="0" stop-color="#6d94a8" stop-opacity="0.12"/>
      <stop offset="0.5" stop-color="#6d94a8" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#6d94a8" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="ntRidgeNear" gradientUnits="userSpaceOnUse" x1="0" y1="314" x2="0" y2="376">
      <stop offset="0" stop-color="#5d8296" stop-opacity="0.10"/>
      <stop offset="0.5" stop-color="#5d8296" stop-opacity="0.03"/>
      <stop offset="1" stop-color="#5d8296" stop-opacity="0"/>
    </linearGradient>
    <!-- 月侧光洗：月亮(300,108)一侧的山肩被照得略亮，往左往下淡出 -->
    <radialGradient id="ntLitFar" gradientUnits="userSpaceOnUse" cx="305" cy="242" r="180">
      <stop offset="0" stop-color="#9dc3d4" stop-opacity="0.13"/>
      <stop offset="0.5" stop-color="#9dc3d4" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#9dc3d4" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ntLitMid" gradientUnits="userSpaceOnUse" cx="310" cy="296" r="160">
      <stop offset="0" stop-color="#86aec2" stop-opacity="0.10"/>
      <stop offset="0.5" stop-color="#86aec2" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#86aec2" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ntLitNear" gradientUnits="userSpaceOnUse" cx="312" cy="332" r="150">
      <stop offset="0" stop-color="#7196ab" stop-opacity="0.07"/>
      <stop offset="0.55" stop-color="#7196ab" stop-opacity="0.03"/>
      <stop offset="1" stop-color="#7196ab" stop-opacity="0"/>
    </radialGradient>
    <!-- 夜雾：贴着山脊的一层浅雾 -->
    <linearGradient id="ntMist" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a6a78" stop-opacity="0"/>
      <stop offset="0.55" stop-color="#4a6a78" stop-opacity="0.20"/>
      <stop offset="1" stop-color="#4a6a78" stop-opacity="0"/>
    </linearGradient>
    <!-- 细颗粒纹理（打破纯色块的塑料感） -->
    <filter id="ntGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0"/></filter>
    <filter id="ntSoft2" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.5"/></filter>
  </defs>

  <rect width="400" height="400" fill="url(#ntSky)"/>
  <rect width="400" height="400" fill="url(#ntVignTop)"/>
  <rect width="400" height="400" fill="url(#ntHorizon)"/>

  <!-- 银河：宽柔底层 + 收紧亮脊层（旋转椭圆链，形态收紧、无 blur） + 密布微尘星 -->
  <g opacity="0.82">
    ${mwEll(mwSoft,'ntMwSoft')}
    ${mwEll(mwSpine,'ntMwSpine')}
  </g>
  ${(function(){let s='';for(let i=0;i<90;i++){
    const t=(i+0.5)/90;
    const bx=-30+t*470+(ntH(i*12.9898+78.233)-0.5)*16;
    const spread=0.55+0.5*Math.sin(t*Math.PI);
    const off=ntH(i*26.651+37.3)+ntH(i*7.9898+13.7)-1;
    const by=ntSpine(t)+off*30*spread;
    const rr=(0.32+ntH(i*4.7+91.1)*0.5).toFixed(2);
    const fade=t>0.62?Math.max(0.22,1-(t-0.62)*2.4):1;
    const op=((0.12+ntH(i*17.23+5.9)*0.16)*fade).toFixed(2);
    s+=`<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${rr}" fill="#e6edff" opacity="${op}"/>`;
  }return s;})()}

  <!-- 星 -->
  ${_ntStars(stars)}

  <!-- 月：柔光晕 + 有明暗体积的月牙 -->
  <g class="sc-moon">
    <circle cx="300" cy="108" r="60" fill="url(#ntMoonGlow)"/>
    <circle cx="300" cy="108" r="40" fill="url(#ntMoonGlow)"/>
    <g mask="url(#ntCres)">
      <circle cx="300" cy="108" r="30" fill="url(#ntMoon)"/>
      <!-- 明暗交界线：右下角一抹阴影，给月牙体积 -->
      <circle cx="309" cy="116" r="30" fill="#0c2029" opacity="0.16" filter="url(#ntSoft2)"/>
      <!-- 受光侧高光边 -->
      <circle cx="292" cy="100" r="30" fill="#fffdf5" opacity="0.22" filter="url(#ntSoft2)"/>
    </g>
  </g>

  <!-- 远山（山脊月光渐隐 + 月侧光洗） + 夜雾 -->
  <path d="M0 250 Q 130 214 260 244 Q 340 262 400 240 L400 300 L0 300 Z" fill="url(#ntHillFar)"/>
  <path d="M0 250 Q 130 214 260 244 Q 340 262 400 240 L400 300 L0 300 Z" fill="url(#ntRidgeFar)"/>
  <path d="M0 250 Q 130 214 260 244 Q 340 262 400 240 L400 300 L0 300 Z" fill="url(#ntLitFar)"/>
  <path d="M0 250 Q 130 214 260 244 Q 340 262 400 240" fill="none" stroke="#38586a" stroke-width="1.1" opacity="0.35"/>
  <path d="M-20 262 Q 130 232 260 258 Q 340 272 420 254 L420 300 L-20 300 Z" fill="url(#ntMist)" opacity="0.6" filter="url(#ntSoft2)"/>

  <!-- 中山（同样受一点月光） -->
  <path d="M0 300 Q 130 270 260 296 Q 340 312 400 292 L400 400 L0 400 Z" fill="url(#ntHillMid)"/>
  <path d="M0 300 Q 130 270 260 296 Q 340 312 400 292 L400 400 L0 400 Z" fill="url(#ntRidgeMid)"/>
  <path d="M0 300 Q 130 270 260 296 Q 340 312 400 292 L400 400 L0 400 Z" fill="url(#ntLitMid)"/>
  <path d="M0 300 Q 130 270 260 296 Q 340 312 400 292" fill="none" stroke="#2a4653" stroke-width="1" opacity="0.28"/>
  <path d="M-20 308 Q 130 282 260 304 Q 340 318 420 300 L420 340 L-20 340 Z" fill="url(#ntMist)" opacity="0.45" filter="url(#ntSoft2)"/>

  <!-- 中山与近山之间的薄夜雾（贴近山山脊，近山从雾里长出来） -->
  <path d="M-20 332 Q 160 302 300 328 Q 360 338 420 324 L420 368 L-20 368 Z" fill="url(#ntMist)" opacity="0.45" filter="url(#ntSoft2)"/>

  <!-- 近山（最深一层，但不落纯黑；山脊一线极淡月光收住轮廓） -->
  <path d="M0 336 Q 160 306 300 332 Q 360 342 400 328 L400 400 L0 400 Z" fill="url(#ntHillNear)"/>
  <path d="M0 336 Q 160 306 300 332 Q 360 342 400 328 L400 400 L0 400 Z" fill="url(#ntRidgeNear)"/>
  <path d="M0 336 Q 160 306 300 332 Q 360 342 400 328 L400 400 L0 400 Z" fill="url(#ntLitNear)"/>

  <!-- 全局细颗粒（极低透明，破塑料感） -->
  <rect width="400" height="400" filter="url(#ntGrain)" opacity="0.05"/>`;
}
// ===== rain(专业化打磨版) =====
// 保留原构图：乌云在上、雨顺风斜落(rotate 12)、地面在下、涟漪在下部。
// 加：体积云(核阴影→受光腹→羽化边)、雨帘分层视差、薄雾雾团、湿地天光反射带、远山景深、
//     显眼的透视涟漪(近大远小)+ 溅起水花皇冠。
// gradient/mask id 一律 rn_ 前缀防冲突。动画沿用 rn-far/mid/near + rn-ripple；新增 rn-splash（无缝）。

// —— 体积感乌云：核阴影 + 受光腹 + 羽化外缘（多椭圆叠加模拟软边）——


// —— 雨层：竖直雨丝在旋转坐标系里下落；渐变描边两端淡出成"雨丝"质感 ——


// —— 显眼涟漪 + 溅起水花：透视排布(y 越小=越远=越小越淡)，双扩散环 + 水花皇冠 ——


function _scene_rain(){
  // —— 局部副本：共享 _driftX（内容复制一份 translate(400,0) 做无缝漂移）——
  function _driftX(inner, cls){ return `<g class="${cls}"><g>${inner}</g><g transform="translate(400,0)">${inner}</g></g>`; }

  // —— 体积感乌云：核阴影 + 受光腹 + 羽化外缘（多椭圆叠加模拟软边）——
  function _rnCloud(x, y, s, opacity){
    // 云下柔和落影（雨柱阴影，托起体积感/浮起来）
    const shadow = `<ellipse cx="${x}" cy="${y+s*0.5}" rx="${s*1.05}" ry="${s*0.3}" fill="url(#rn_cloudshadow)" opacity="${(opacity*0.6).toFixed(2)}"/>`;
    // 底层软羽化外缘（大而淡）
    const halo = `<g fill="url(#rn_cloudsoft)" opacity="${(opacity*0.9).toFixed(2)}">`
      + `<ellipse cx="${x}" cy="${y}" rx="${s*1.18}" ry="${s*0.62}"/>`
      + `<ellipse cx="${x-s*0.5}" cy="${y+s*0.14}" rx="${s*0.72}" ry="${s*0.46}"/>`
      + `<ellipse cx="${x+s*0.55}" cy="${y+s*0.12}" rx="${s*0.66}" ry="${s*0.42}"/></g>`;
    // 云体（暗核）
    const body = `<g fill="url(#rn_cloudbody)" opacity="${opacity}">`
      + `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s*0.44}"/>`
      + `<ellipse cx="${x-s*0.55}" cy="${y+s*0.14}" rx="${s*0.58}" ry="${s*0.34}"/>`
      + `<ellipse cx="${x+s*0.6}" cy="${y+s*0.12}" rx="${s*0.52}" ry="${s*0.32}"/>`
      + `<ellipse cx="${x-s*0.12}" cy="${y-s*0.2}" rx="${s*0.52}" ry="${s*0.34}"/></g>`;
    // 顶缘微受光（天空最亮处在云上方偏后，给云顶一点冷高光，塑体积——用 clip 只落在云内）
    const top = `<g fill="url(#rn_cloudtop)" opacity="${(opacity*0.5).toFixed(2)}">`
      + `<ellipse cx="${x-s*0.15}" cy="${y-s*0.16}" rx="${s*0.7}" ry="${s*0.26}"/></g>`;
    return shadow + halo + body + top;
  }

  // —— 雨层：竖直雨丝在旋转坐标系里下落；渐变描边两端淡出成"雨丝"质感 ——
  // 种子抖动用 sin 散列（确定性、跨行列无周期），纵向仍按 per 平铺 → 循环无缝
  function _rnRainLayer(cls, cols, rows, len, sw, op, per, grad){
    const X0=-160, X1=560, W=X1-X0; let seeds=[];
    const h=n=>{ const v=Math.sin(n*12.9898+78.233)*43758.5453; return v-Math.floor(v); };
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const jx=(h(r*311.7+c*127.1)-0.5)*0.92, jy=(h(r*183.3+c*269.5)-0.5)*0.92;
      seeds.push([ (X0+(c+0.5+jx)*(W/cols)).toFixed(1), ((r+0.5+jy)*(per/rows)).toFixed(1) ]);
    }
    let s=''; const kmax=Math.ceil(760/per)+2;
    for(let k=-2;k<=kmax;k++){ const oy=k*per-160;
      for(const [x,y] of seeds){ const y1=(+y+oy).toFixed(1);
        s+=`<line x1="${x}" y1="${y1}" x2="${(+x+1.2).toFixed(1)}" y2="${(+y1+len).toFixed(1)}"/>`; } }
    return `<g class="${cls}" stroke="url(#${grad})" stroke-width="${sw}" stroke-linecap="round" opacity="${op}">${s}</g>`;
  }

  // —— 积水洼：不规则岸线 + 天光反射渐变 + 远岸受光细边 + 近岸暗影 + 洼内碎反光 ——
  function _rnPuddles(){
    // [基底路径, 远岸高光路径(上缘), 近岸暗影路径(下缘内侧), 反光椭圆(cx,cy,rx,ry)]
    const P=[
      [ 'M46 362 C52 356.6 70 353.4 88 353 C100 352.7 108 354.2 114 354.6 C122 355.1 126 356.4 130 358.2 C137 360.8 138.5 364.2 132.5 367.4 C126 371.8 116 373 106 372.2 C96 371.4 90 374.8 80 374 C64 373.2 50 369.8 46.5 366.2 C44.8 364.8 44.8 363.4 46 362 Z',
        'M50 361.2 C58 356.6 72 353.8 88 353.5 C104 353.2 120 355.2 129 358.6',
        'M129 366.4 C122 370.8 110 372 104 371.4 C95 370.6 88 373.6 80 373 C66 372.2 53 369 48.5 365.8',
        [88, 362, 34, 5.5] ],
      [ 'M152 371 C158 365.4 178 361.6 200 361.2 C222 360.9 244 363.6 254 367.6 C261 370.4 261.5 374.4 252 377.8 C243 381 228 382.4 214 382.6 C204 382.7 198 381 190 381.6 C177 382.4 156 378.4 151.5 374.6 C149.8 373.2 150.4 372.4 152 371 Z',
        'M156 369.4 C164 364.6 181 361.9 200 361.7 C220 361.4 241 364 252 368.2',
        'M251 375.2 C242 379.4 227 381 213 381.2 C203 381.3 197 379.6 189 380.2 C177 381 160 377.6 154 374.4',
        [203, 371, 44, 6.5] ],
      [ 'M276 359.5 C282 354.8 296 352.2 310 352.2 C326 352.2 342 354.2 350 357.4 C356 359.8 355.6 363.4 348 365.8 C340 368.4 328 369.6 316 369.4 C309 369.3 305 367.8 299 368.2 C290 368.6 278 365 276 362.6 C274.9 361.4 275 360.6 276 359.5 Z',
        'M280 358.4 C287 354.6 298 352.6 310 352.6 C325 352.6 340 354.6 349 358',
        'M347 363.8 C339 366.8 328 368.2 316 368 C309 367.9 305 366.4 299 366.8 C291 367.2 281 364.2 278 362',
        [312, 360, 32, 4.8] ],
      // 两处小水洼（远离大涟漪，作地面质感；压暗融进前景暗地，避免像贴上去的亮"药丸"）
      [ 'M46 381 C50 378.4 60 377.2 68 378 C74 378.6 75.5 380.6 72 382.2 C66 384.6 52 384.8 47.5 382.8 C45.8 382 45.2 381.9 46 381 Z',
        'M48 380.4 C52 378.4 60 377.6 67 378.3',
        '', null, 0.55 ],
      [ 'M328 378 C332 375.8 342 375 349 375.8 C354 376.4 355 378.2 351.5 379.8 C345 382.4 333 382.4 329.5 380.6 C327.8 379.7 327.3 379 328 378 Z',
        'M330 377.4 C334 375.6 342 375.2 348 375.9',
        '', null, 0.55 ],
    ];
    let out='';
    for(const [base, bank, dark, shine, gop] of P){
      let one = `<path d="${base}" fill="url(#rn_puddle)"/>`;
      if(bank) one += `<path d="${bank}" fill="none" stroke="url(#rn_bank)" stroke-width="0.8" stroke-linecap="round"/>`;
      if(dark) one += `<path d="${dark}" fill="none" stroke="url(#rn_bankd)" stroke-width="1.1" stroke-linecap="round"/>`;
      if(shine) one += `<ellipse cx="${shine[0]}" cy="${shine[1]}" rx="${shine[2]}" ry="${shine[3]}" fill="url(#rn_pshine)"/>`;
      out += (gop && gop<1) ? `<g opacity="${gop}">${one}</g>` : one;
    }
    // 洼内碎反光：短横细线当被雨点打碎的天光倒影（两档粗细/透明度、长短参差，避免整齐划一）
    out += `<path d="M66 361 h20 M174 369 h18 M294 358 h20" stroke="#cfe2f2" stroke-width="0.9" opacity="0.22" stroke-linecap="round"/>`;
    out += `<path d="M94 366 h13 M206 374 h22 M234 368 h11 M320 363 h12" stroke="#cfe2f2" stroke-width="0.7" opacity="0.13" stroke-linecap="round"/>`;
    return out;
  }

  // —— 显眼涟漪 + 溅起水花：透视排布(y 越小=越远=越小越淡)，柔化双环 + 水花皇冠 ——
  function _rnRipplesAndSplash(){
    // [cx, cy, baseR, scale]  scale 综合近大远小：近(下)大而清晰，远(上)小而淡
    const R=[
      [ 96,362,30,1.00],[300,356,27,0.96],[190,372,34,1.05],
      [ 58,344,18,0.72],[250,346,20,0.76],[350,364,24,0.88],
      [140,340,15,0.64],[214,352,22,0.82],[330,338,14,0.60],
      [ 40,370,20,0.80],[168,336,12,0.55],[286,338,13,0.58],
    ];
    const ripples = R.map(([x,y,rx,sc],i)=>{
      const d=(((i*0.31)%1)*2.6).toFixed(2), dur=(2.1+(i%4)*0.4).toFixed(2);
      const rrx=(rx*sc).toFixed(1), rry=(rx*sc*0.30).toFixed(1);
      const irx=(rx*sc*0.5).toFixed(1), iry=(rx*sc*0.5*0.30).toFixed(1);
      const op=(0.28+sc*0.30).toFixed(2), iop=(0.22+sc*0.24).toFixed(2);
      const wOut=(0.75+sc*0.5).toFixed(2), wIn=(0.55+sc*0.35).toFixed(2);
      // 外环：宽而淡的软衬垫底(羽化边) + 渐变描边主环(远淡近亮)；内环：更细更淡
      return `<g class="rn-ripple" style="animation-delay:-${d}s;animation-duration:${dur}s">`
        + `<ellipse cx="${x}" cy="${y}" rx="${rrx}" ry="${rry}" fill="none" stroke="url(#rn_ripSoft)" stroke-width="${(wOut*2.6).toFixed(2)}" opacity="${(op*0.45).toFixed(2)}"/>`
        + `<ellipse cx="${x}" cy="${y}" rx="${rrx}" ry="${rry}" fill="none" stroke="url(#rn_rip)" stroke-width="${wOut}" opacity="${op}"/>`
        + `<ellipse cx="${x}" cy="${y}" rx="${irx}" ry="${iry}" fill="none" stroke="url(#rn_ripIn)" stroke-width="${wIn}" opacity="${iop}"/></g>`;
    }).join('');
    // 水花皇冠：每个溅点=一小簇细droplet(中间一柱+两侧弧珠)在原地跃起再落下(rn-splash 无缝循环)
    const S=[
      [ 96,362,1.00],[190,372,1.05],[300,356,0.96],[350,364,0.88],
      [ 40,370,0.80],[214,352,0.82],[250,346,0.76],[140,340,0.64],
    ];
    const splashes = S.map(([x,y,sc],i)=>{
      const d=(((i*0.43)%1)*1.4).toFixed(2), dur=(1.3+(i%3)*0.35).toFixed(2);
      const h=(6+sc*4.5).toFixed(1);  // 跃起高度（收敛，不做长天线）
      const w=(3.4+sc*2.8).toFixed(1);// 张开宽度
      // 溅起水花皇冠：中心一颗略高的水珠 + 两侧外抛小水珠，整体扁矮呈"冠"形
      return `<g class="rn-splash" style="animation-delay:-${d}s;animation-duration:${dur}s;transform-origin:${x}px ${y}px">`
        + `<circle cx="${x}" cy="${(y-(+h)).toFixed(1)}" r="${(1.0+sc*0.7).toFixed(2)}" fill="#e6f2fd"/>`
        + `<circle cx="${(x-(+w)).toFixed(1)}" cy="${(y-(+h)*0.55).toFixed(1)}" r="${(0.8+sc*0.5).toFixed(2)}" fill="#d2e7f8"/>`
        + `<circle cx="${(+x+(+w)).toFixed(1)}" cy="${(y-(+h)*0.55).toFixed(1)}" r="${(0.8+sc*0.5).toFixed(2)}" fill="#d2e7f8"/>`
        + `<circle cx="${(x-(+w)*0.5).toFixed(1)}" cy="${(y-(+h)*0.88).toFixed(1)}" r="${(0.6+sc*0.35).toFixed(2)}" fill="#dcecfa"/>`
        + `<circle cx="${(+x+(+w)*0.5).toFixed(1)}" cy="${(y-(+h)*0.88).toFixed(1)}" r="${(0.6+sc*0.35).toFixed(2)}" fill="#dcecfa"/></g>`;
    }).join('');
    return ripples + splashes;
  }

  // 云布局沿用原位置（100,70 / 298,58 / 206,104），只是换成体积云
  const clouds = _rnCloud(100,72,54,0.96) + _rnCloud(300,60,60,0.96) + _rnCloud(206,106,46,0.92);
  return `<defs>
    <!-- 更有层次、阴郁的天空：顶更暗(压出穹顶重量)，往地平线略提亮成雨雾灰 -->
    <linearGradient id="rn_sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2e3d4e"/><stop offset="0.34" stop-color="#3c4b5d"/>
      <stop offset="0.62" stop-color="#4a5a6c"/><stop offset="0.82" stop-color="#59697b"/>
      <stop offset="1" stop-color="#4d5b6b"/></linearGradient>
    <!-- 顶部/四周暗角，压出景深与穹顶重量 -->
    <radialGradient id="rn_vig" cx="50%" cy="30%" r="85%">
      <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#141c26" stop-opacity="0.5"/></radialGradient>
    <!-- 云：暗核、羽化外缘、受光腹 -->
    <radialGradient id="rn_cloudbody" cx="50%" cy="40%" r="65%">
      <stop offset="0" stop-color="#39485a"/><stop offset="0.6" stop-color="#2b3746"/>
      <stop offset="1" stop-color="#222d3a"/></radialGradient>
    <radialGradient id="rn_cloudsoft" cx="50%" cy="45%" r="60%">
      <stop offset="0" stop-color="#3d4b5d" stop-opacity="0.85"/>
      <stop offset="0.7" stop-color="#3a4757" stop-opacity="0.1"/>
      <stop offset="1" stop-color="#3a4757" stop-opacity="0"/></radialGradient>
    <!-- 云下落影 -->
    <radialGradient id="rn_cloudshadow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#1a232e" stop-opacity="0.5"/>
      <stop offset="0.7" stop-color="#1a232e" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#1a232e" stop-opacity="0"/></radialGradient>
    <!-- 云顶冷高光：上亮下透，塑体积不外溢 -->
    <linearGradient id="rn_cloudtop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5c6e81" stop-opacity="0.85"/>
      <stop offset="0.6" stop-color="#4a5a6c" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#4a5a6c" stop-opacity="0"/></linearGradient>
    <!-- 薄雾雾团：柔和软边（低不透明，横铺成雾带用）-->
    <radialGradient id="rn_mist" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#c3d3e3" stop-opacity="0.26"/>
      <stop offset="0.65" stop-color="#c3d3e3" stop-opacity="0.09"/>
      <stop offset="1" stop-color="#c3d3e3" stop-opacity="0"/></radialGradient>
    <!-- 中景雨帘：均匀横向薄雾，靠地平线略提亮 -->
    <linearGradient id="rn_veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b9cadb" stop-opacity="0"/>
      <stop offset="0.55" stop-color="#b9cadb" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#b9cadb" stop-opacity="0.05"/></linearGradient>
    <!-- 雨丝：三档亮度（远淡/中/近亮）——两端淡出 -->
    <linearGradient id="rn_streakFar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#cdd9e6" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#cdd9e6" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#cdd9e6" stop-opacity="0"/></linearGradient>
    <linearGradient id="rn_streakMid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e4eefb" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#e4eefb" stop-opacity="1"/>
      <stop offset="1" stop-color="#e4eefb" stop-opacity="0"/></linearGradient>
    <linearGradient id="rn_streakNear" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2f8ff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#f2f8ff" stop-opacity="1"/>
      <stop offset="1" stop-color="#f2f8ff" stop-opacity="0"/></linearGradient>
    <!-- 湿地：天光反射带在上缘（越靠观者/前景越暗）-->
    <linearGradient id="rn_ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#556878"/><stop offset="0.14" stop-color="#33414f"/>
      <stop offset="0.5" stop-color="#232f3b"/><stop offset="1" stop-color="#141d26"/></linearGradient>
    <linearGradient id="rn_wetsheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fa6ba" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#8fa6ba" stop-opacity="0"/></linearGradient>
    <!-- 积水洼：天光反射(上亮下暗) + 远岸受光/近岸暗影的横向淡出 + 洼内柔反光 -->
    <linearGradient id="rn_puddle" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7e94a9" stop-opacity="0.95"/>
      <stop offset="0.55" stop-color="#5c6f82" stop-opacity="0.92"/>
      <stop offset="1" stop-color="#3e5063" stop-opacity="0.9"/></linearGradient>
    <linearGradient id="rn_bank" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a9c0d5" stop-opacity="0"/>
      <stop offset="0.25" stop-color="#a9c0d5" stop-opacity="0.5"/>
      <stop offset="0.75" stop-color="#a9c0d5" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#a9c0d5" stop-opacity="0"/></linearGradient>
    <linearGradient id="rn_bankd" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0d1620" stop-opacity="0"/>
      <stop offset="0.25" stop-color="#0d1620" stop-opacity="0.35"/>
      <stop offset="0.75" stop-color="#0d1620" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#0d1620" stop-opacity="0"/></linearGradient>
    <radialGradient id="rn_pshine" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#b8cce0" stop-opacity="0.26"/>
      <stop offset="0.7" stop-color="#b8cce0" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#b8cce0" stop-opacity="0"/></radialGradient>
    <!-- 涟漪环：渐变描边(远淡近亮) + 软衬羽化边 -->
    <linearGradient id="rn_rip" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9fbcd8" stop-opacity="0.25"/>
      <stop offset="0.6" stop-color="#bcd6ec" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#dcedfb" stop-opacity="0.95"/></linearGradient>
    <linearGradient id="rn_ripIn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c2dcf0" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#e2f1fd" stop-opacity="0.85"/></linearGradient>
    <linearGradient id="rn_ripSoft" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9fbcd8" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#c8e0f2" stop-opacity="0.5"/></linearGradient>
    <!-- 细颗粒纹理（与其他主题一致的 grain，暗景用白噪声）-->
    <filter id="rn_grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0"/></filter>
  </defs>

  <!-- 天空 -->
  <rect width="400" height="400" fill="url(#rn_sky)"/>

  <!-- 远山（雨雾中若隐若现，低对比撑景深）-->
  <path d="M0 214 Q 90 176 176 206 Q 230 224 300 198 Q 350 180 400 202 L400 300 L0 300 Z" fill="#495868" opacity="0.55"/>
  <path d="M0 236 Q 120 208 236 234 Q 320 252 400 228 L400 320 L0 320 Z" fill="#41505f" opacity="0.6"/>

  <!-- 薄雾雾团：横铺成低平雾带，缠在远山腰，柔化山与地的接缝（避免中央聚成光斑）-->
  <g>
    <ellipse cx="90"  cy="232" rx="230" ry="30" fill="url(#rn_mist)"/>
    <ellipse cx="330" cy="244" rx="240" ry="28" fill="url(#rn_mist)"/>
    <ellipse cx="210" cy="270" rx="300" ry="26" fill="url(#rn_mist)"/>
  </g>

  <!-- 乌云（漂移，体积感）-->
  ${_driftX(clouds,'sc-drift-rain')}

  <!-- 远层雨幕：细密淡（撑满天空营造雨帘空气感；周期 44 与共享 @keyframes rnFar 一致→无缝）-->
  <g transform="rotate(12 200 200)">${_rnRainLayer('rn-far',30,7,8,0.7,0.22,44,'rn_streakFar')}</g>

  <!-- 中景一层薄雾雨帘（自上而下淡入，横向柔化雨的空气感，不聚成光斑）-->
  <rect x="0" y="150" width="400" height="210" fill="url(#rn_veil)"/>

  <!-- 中层雨 -->
  <g transform="rotate(12 200 200)">${_rnRainLayer('rn-mid',20,5,16,1.15,0.42,52,'rn_streakMid')}</g>

  <!-- 湿地地面（天光反射带 + 湿润高光 + 天光在水面的柔和倒影）-->
  <path d="M0 344 Q 120 330 260 344 Q 340 352 400 340 L400 400 L0 400 Z" fill="url(#rn_ground)"/>
  <!-- 天光在湿地上的倒影（把地平线亮雾"镜"下来一点，卖湿润反光）-->
  <ellipse cx="220" cy="360" rx="260" ry="20" fill="url(#rn_mist)" opacity="0.7"/>
  <path d="M0 344 Q 120 330 260 344 Q 340 352 400 340 L400 358 Q 260 348 120 344 Q 40 342 0 350 Z" fill="url(#rn_wetsheen)" opacity="0.6"/>
  <path d="M0 344 Q 120 330 260 344 Q 340 352 400 340" fill="none" stroke="#8296a8" stroke-width="1.1" opacity="0.55"/>

  <!-- 积水洼（3 大 2 小，不规则岸线 + 天光反光，大涟漪正落在洼里）-->
  ${_rnPuddles()}

  <!-- 显眼涟漪 + 溅起水花（在地面上方一点，透视近大远小）-->
  ${_rnRipplesAndSplash()}

  <!-- 近层雨（最长最亮，压在最前）-->
  <g transform="rotate(12 200 200)">${_rnRainLayer('rn-near',12,4,25,1.65,0.55,64,'rn_streakNear')}</g>

  <!-- 全局暗角，收拢景深 -->
  <rect width="400" height="400" fill="url(#rn_vig)"/>
  <!-- 极淡颗粒质感（与其他主题一致）-->
  <rect width="400" height="400" filter="url(#rn_grain)" opacity="0.05"/>`;
}
// ===== bubbles(专业化打磨版) =====
// 保留原构图：蓝色水体上暗下深、顶部体积光柱(sc-rays摇曳)、气泡自下而上(bub/bubw)。
// 精修加入：焦散(caustics)光斑、羽化的体积光、通透玻璃气泡(折射高光+边缘光+内部微光)、
//           悬浮微粒、水体景深渐变与柔和暗角。gradient/id 一律 bub 前缀，避免与其它主题冲突。

// 通透玻璃气泡：径向渐变体(上亮下暗) + 高光弧 + 亮点折射 + 描边边缘光
function _bubGlass(x, y, r, op){
  const rim = (r>11?1.5:1.1).toFixed(1);
  const hlR = (r*0.30).toFixed(1);
  const hx = (x - r*0.34).toFixed(1), hy = (y - r*0.34).toFixed(1);
  // 高光弧：偏上方的一段亮环，模拟玻璃折射
  const arcR = (r*0.66).toFixed(1);
  return `<g class="bubw" style="animation-duration:var(--wob)">`
    // 通透球体（内部渐变：受光侧亮、背光侧暗）
    + `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#bubBody)"/>`
    // 边缘光（双描边：外圈更亮细边 + 主边）
    + `<circle cx="${x}" cy="${y}" r="${(r-0.3).toFixed(1)}" fill="none" stroke="url(#bubRim)" stroke-width="${(rim*1.25).toFixed(1)}" opacity="${Math.min(1,op+0.25).toFixed(2)}"/>`
    // 高光弧（左上，短弧）
    + `<path d="M ${(x-arcR*0.72).toFixed(1)} ${(y-arcR*0.55).toFixed(1)} A ${arcR} ${arcR} 0 0 1 ${(x+arcR*0.2).toFixed(1)} ${(y-arcR*0.82).toFixed(1)}" fill="none" stroke="#f2fbff" stroke-width="${(rim*0.8).toFixed(1)}" stroke-linecap="round" opacity="${(op*0.85).toFixed(2)}"/>`
    // 折射亮点
    + `<circle cx="${hx}" cy="${hy}" r="${hlR}" fill="#ffffff" opacity="${(op*0.9).toFixed(2)}"/>`
    // 底部一小点透光（背光侧的次级高光，压淡避免像第二个亮斑）
    + `<circle cx="${(x+r*0.30).toFixed(1)}" cy="${(y+r*0.44).toFixed(1)}" r="${(r*0.12).toFixed(1)}" fill="#dff2fb" opacity="${(op*0.32).toFixed(2)}"/>`
    + `</g>`;
}

function _scene_bubbles(){
  const bubs=[
    {x:60,cy:392,r:12,dur:11,wob:3.4,dl:0,op:0.60},{x:120,cy:320,r:7,dur:14.5,wob:2.8,dl:5,op:0.52},
    {x:182,cy:398,r:14,dur:9.5,wob:3.9,dl:2,op:0.60},{x:232,cy:352,r:6,dur:15.5,wob:2.6,dl:8,op:0.48},
    {x:292,cy:378,r:10,dur:12,wob:3.2,dl:3,op:0.58},{x:342,cy:336,r:8,dur:13.5,wob:3.0,dl:6.5,op:0.52},
    {x:92,cy:308,r:5,dur:16.5,wob:2.4,dl:10,op:0.46},{x:206,cy:366,r:9,dur:12.8,wob:3.1,dl:12.5,op:0.55},
    {x:314,cy:300,r:6,dur:14.8,wob:2.7,dl:1.5,op:0.50},{x:150,cy:346,r:11,dur:10.5,wob:3.6,dl:7.5,op:0.58},
  ];
  const bubbles=bubs.map(b=>
    `<g class="bub" style="animation-duration:${b.dur}s;animation-delay:-${b.dl}s;--op:${b.op};--wob:${b.wob}s">`
    + _bubGlass(b.x, b.cy, b.r, b.op)
    + `</g>`).join('');

  // 悬浮微粒：细小的浮尘/浮游物，缓慢上浮，随机分布，加"水感"。
  // 后 6 颗是本轮往中下部（含海床上方贴地悬沙）补的，更小更淡。
  const motes=[
    [48,300,1.4,0.30,17,-1.2],[110,260,1.1,0.24,21,3],[172,290,1.6,0.32,15,-2.5],
    [244,250,1.0,0.20,23,2],[300,282,1.5,0.28,18,-3],[352,258,1.2,0.22,20,1.5],
    [80,340,1.3,0.26,19,-2],[214,318,1.1,0.20,22,2.5],[330,330,1.4,0.28,16,-1.8],
    [140,296,0.9,0.18,24,3.2],[268,340,1.2,0.24,18,-2.2],[36,270,1.0,0.20,21,2.8],
    [64,372,1.1,0.16,22,2.4],[188,344,0.9,0.14,25,-2],[262,368,1.2,0.15,20,1.8],
    [338,376,1.0,0.14,23,-2.6],[118,386,1.3,0.16,19,2.2],[290,318,0.9,0.13,24,-1.5],
  ];
  const dust = motes.map(([x,y,r,op,dur,drift],i)=>{
    const dl=((i*1.7)%dur).toFixed(1);
    return `<g class="bub-mote" style="animation-duration:${dur}s;animation-delay:-${dl}s;--mx:${drift}px">`
      + `<circle cx="${x}" cy="${y}" r="${r}" fill="#dbeef8" opacity="${op}"/></g>`;
  }).join('');

  // 焦散光斑：水面折射投进水里的柔和光网。用大而极淡、参差错落的软斑（非整齐横条），
  // 每斑透明度低、边缘全羽化 → 是"氛围光斑"而不是漂浮的灰色药丸。慢速漂移。
  // 末 5 枚是本轮往中下部延伸的：更大、更扁、更淡（衰减的余光）。
  const cst=[
    [96,60,60,26,-9,0.9],[232,44,78,30,6,0.85],[340,92,52,22,-7,0.8],
    [158,104,46,20,8,0.7],[292,150,42,19,-5,0.65],[54,142,34,16,10,0.6],
    [200,88,40,18,3,0.55],[120,178,50,20,-6,0.4],[318,196,44,18,5,0.38],
    [140,238,54,19,-6,0.30],[268,262,58,20,7,0.26],[76,288,46,16,5,0.22],
    [332,246,42,15,-8,0.24],[204,306,50,16,4,0.18],
  ];
  const caustics = `<g class="bub-caust">`
    + cst.map(([x,y,rx,ry,rot,op])=>
        `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="url(#bubCaustDot)" opacity="${op}"/>`).join('')
    + `</g>`;

  // —— 海床 —— 沙面渐变 + 湿沙内缘光 + 沙纹 + 海草 + 礁石/贝壳
  const bedPath='M0 350 Q 120 322 260 348 Q 340 360 400 344 L400 400 L0 400 Z';
  const crest='M0 350 Q 120 322 260 348 Q 340 360 400 344';

  // 一根海草叶：底部在(bx,by)，两条三次曲线在叶尖收拢成尖，向 lean 侧弯。
  // 叶身近底竖直、上段才弯向 lean 侧（三次曲线做出的"先立后弯"），避免读成直刺。
  // CSS 旋转(bub-weed)在 path 上、位移在外层 g 上，避免 CSS transform 覆盖平移。
  const blade=(bx,by,h,lean,w,fill,op,dur,dl)=>{
    const c1lx=(lean*0.04-w).toFixed(1),        c1ly=(-h*0.46).toFixed(1);
    const c2lx=(lean*0.45-w*0.45).toFixed(1),   c2ly=(-h*0.88).toFixed(1);
    const c1rx=(lean*0.58+w*0.35).toFixed(1),   c1ry=(-h*0.70).toFixed(1);
    const c2rx=(w*1.05+lean*0.06).toFixed(1),   c2ry=(-h*0.28).toFixed(1);
    return `<g transform="translate(${bx} ${by})">`
    + `<path class="bub-weed" style="animation-duration:${dur}s;animation-delay:-${dl}s" d="M ${-w} 0 C ${c1lx} ${c1ly} ${c2lx} ${c2ly} ${lean} ${-h} C ${c1rx} ${c1ry} ${c2rx} ${c2ry} ${w} 0 Z" fill="${fill}" opacity="${op}"/>`
    + `</g>`;
  };
  // 4 丛：左大(56)、左中小(152)、右中小(272)、右(338)，全部低饱和蓝青，高度≤38 不进画面中部
  const weeds =
    // 丛A（左，最丰）
      blade(52,341,30,-8,2.2,'#0b3348',0.92,6.6,1.2)
    + blade(56,341.5,38,4,2.6,'#14506b',0.88,7.4,3.8)
    + blade(60,342,24,10,1.9,'#1a5c6b',0.85,5.8,0.4)
    + blade(57,341,33,-3,2.2,'#0e3b53',0.90,6.9,5.1)
    // 丛C（左中，小）
    + blade(149,337,16,-5,1.6,'#0d3850',0.88,5.6,2.6)
    + blade(152,337.5,21,4,1.9,'#14506b',0.85,6.4,0.9)
    + blade(156,338,12,8,1.4,'#1a5c6b',0.80,5.2,4.4)
    // 丛D（右中，3叶小tuft：中间补一短叶收拢，免得两叶呈"八"字散开）
    + blade(270,350,13,-4,1.4,'#0d3850',0.85,5.9,1.7)
    + blade(272,350.2,9,1,1.1,'#0f4258',0.80,5.4,3.6)
    + blade(274,350.5,17,5,1.6,'#165672',0.82,6.7,4.9)
    // 丛B（右）
    + blade(335,353,22,-6,1.9,'#0c3549',0.90,6.2,3.3)
    + blade(339,353.5,29,5,2.3,'#155371',0.85,7.1,0.6)
    + blade(343,354,17,9,1.6,'#1a5c6b',0.82,5.5,2.1);

  // 沙纹涟漪：顺坡向的短弧，极淡 + 轻微糊边（放大不见硬线）
  const rippleArcs=[
    ['M22 366 q 30 -4.5 58 -0.5',0.13],['M118 372 q 36 -5 70 -0.5',0.14],
    ['M232 370 q 32 -4 62 1',0.12],['M312 380 q 28 -3.5 56 0',0.12],
    ['M64 388 q 40 -5 78 -0.5',0.10],['M188 390 q 44 -4.5 86 0.5',0.10],
    ['M338 362 q 22 -3 44 -0.5',0.11],['M96 380 q 26 -3.5 50 0',0.09],
  ].map(([d,o])=>`<path d="${d}" opacity="${o}"/>`).join('');
  // 沙面细碎亮屑（贴地那点闪的碎沙）
  const grit=[[46,378,1.0,0.13],[142,384,0.8,0.11],[226,380,1.1,0.12],[302,388,0.9,0.11],[366,372,0.8,0.12],[86,368,0.7,0.10]]
    .map(([x,y,r,o])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#7fa9c0" opacity="${o}"/>`).join('');

  // 礁石（不规则圆钝blob，非椭圆）+ 顶缘受光弧；卵石一颗；扇贝一枚
  const rocks =
      `<path d="M66 348 Q 67 340 75 338.5 Q 84 337.5 87 343 Q 88.5 347 86 349 Q 76 352 66 348 Z" fill="url(#bubRockG)"/>`
    + `<path d="M69.5 342 Q 74.5 339.5 81 340.5" fill="none" stroke="#71a3ba" stroke-width="1" stroke-linecap="round" opacity="0.32"/>`
    + `<path d="M300 356 Q 302 350 309 349.5 Q 315 349.5 317 354 Q 317.5 357 314 358 Q 305 359.5 300 356 Z" fill="url(#bubRockG)"/>`
    + `<path d="M303.5 352.4 Q 308 350.6 312.6 351.6" fill="none" stroke="#71a3ba" stroke-width="0.9" stroke-linecap="round" opacity="0.30"/>`
    + `<path d="M214 346 Q 215 342.5 219 342.5 Q 222.5 343 222.5 345.5 Q 221 347.5 217 347.3 Q 214.5 347 214 346 Z" fill="url(#bubRockG)" opacity="0.9"/>`
    // 扇贝：铰点在下的扇形 + 两道浅色放射贝纹（低对比，放大不读成深色箭头）
    + `<g opacity="0.6">`
    + `<path d="M246.3 353.8 L242.2 349.6 A 5.6 5.6 0 0 1 250.4 349.6 Z" fill="#5d8ba3"/>`
    + `<path d="M246.3 353.8 L244.3 349.1 M246.3 353.8 L248.3 349.1" stroke="#a8cbdc" stroke-width="0.5" stroke-linecap="round" opacity="0.55"/>`
    + `<circle cx="246.3" cy="353.6" r="0.85" fill="#44708a"/>`
    + `</g>`;

  const seabed =
      `<path d="${bedPath}" fill="url(#bubSand)"/>`
    // 湿沙内缘光：一条宽而糊的亮带贴着坡顶内侧（clip 进海床，不溢进水体）
    + `<g clip-path="url(#bubBedClip)">`
    +   `<path d="${crest}" fill="none" stroke="#6ba3bd" stroke-width="7" opacity="0.16" filter="url(#bubEdgeF)"/>`
    +   `<g filter="url(#bubRipF)" stroke="#4c86a6" stroke-width="1.1" stroke-linecap="round" fill="none">${rippleArcs}</g>`
    +   grit
    + `</g>`
    // 坡顶沿线微光（原描边保留，加一点点糊防放大成硬线）
    + `<path d="${crest}" fill="none" stroke="#3f9ac0" stroke-width="1.4" opacity="0.35" filter="url(#bubRimF)"/>`
    + rocks
    + weeds;

  return `<defs>
    <!-- 水体：顶部亮(受光)→中深→底暗 -->
    <linearGradient id="bubWater" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a9ac4"/>
      <stop offset="0.28" stop-color="#2d7aa8"/>
      <stop offset="0.62" stop-color="#12558a"/>
      <stop offset="1" stop-color="#062a49"/>
    </linearGradient>
    <!-- 顶部受光辉光（水面透进来的漫射光） -->
    <radialGradient id="bubTopGlow" cx="50%" cy="-8%" r="78%">
      <stop offset="0" stop-color="#a7ddef" stop-opacity="0.55"/>
      <stop offset="0.45" stop-color="#79c4e2" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#79c4e2" stop-opacity="0"/>
    </radialGradient>
    <!-- 柔和暗角：四周压暗做景深 -->
    <radialGradient id="bubVign" cx="50%" cy="42%" r="72%">
      <stop offset="0" stop-color="#000000" stop-opacity="0"/>
      <stop offset="0.7" stop-color="#00121f" stop-opacity="0"/>
      <stop offset="1" stop-color="#00121f" stop-opacity="0.45"/>
    </radialGradient>
    <!-- 体积光：沿光柱纵向亮→淡；横向羽化靠 bubRayF 高斯糊 -->
    <linearGradient id="bubRayV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eaf7ff" stop-opacity="0.42"/>
      <stop offset="0.45" stop-color="#cfeaf5" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#cfeaf5" stop-opacity="0"/>
    </linearGradient>
    <!-- 气泡体：受光渐变（左上亮、右下暗，透出背后水色），中部更空以显通透 -->
    <radialGradient id="bubBody" cx="35%" cy="33%" r="75%">
      <stop offset="0" stop-color="#eafaff" stop-opacity="0.72"/>
      <stop offset="0.28" stop-color="#b7e4f4" stop-opacity="0.28"/>
      <stop offset="0.6" stop-color="#6fb6d8" stop-opacity="0.08"/>
      <stop offset="0.86" stop-color="#3a86ad" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#5fb0d6" stop-opacity="0.42"/>
    </radialGradient>
    <!-- 气泡边缘光：上亮(受光)→侧淡→下亮(透射光) -->
    <linearGradient id="bubRim" x1="0.25" y1="0" x2="0.75" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="0.4" stop-color="#cdeef9" stop-opacity="0.5"/>
      <stop offset="0.72" stop-color="#a9def2" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#f2fcff" stop-opacity="1"/>
    </linearGradient>
    <!-- 焦散亮斑（软径向） -->
    <radialGradient id="bubCaustDot" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#d6f1fc" stop-opacity="0.28"/>
      <stop offset="0.45" stop-color="#9fd8ef" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#9fd8ef" stop-opacity="0"/>
    </radialGradient>
    <!-- 海床沙面：坡顶受光的青沙 → 深处压暗（userSpace 锚在 333-400，与坡形吻合） -->
    <linearGradient id="bubSand" x1="0" y1="333" x2="0" y2="400" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#33698a"/>
      <stop offset="0.3" stop-color="#1e5273"/>
      <stop offset="0.62" stop-color="#0f3a57"/>
      <stop offset="1" stop-color="#08243e"/>
    </linearGradient>
    <!-- 礁石体：顶亮底暗 -->
    <linearGradient id="bubRockG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2c6484"/>
      <stop offset="1" stop-color="#0d3049"/>
    </linearGradient>
    <clipPath id="bubBedClip"><path d="${bedPath}"/></clipPath>
    <!-- 光柱横向羽化 -->
    <filter id="bubRayF" x="-30%" y="-6%" width="160%" height="112%"><feGaussianBlur stdDeviation="4.5"/></filter>
    <!-- 湿沙内缘光的宽糊 -->
    <filter id="bubEdgeF" x="-4%" y="-90%" width="108%" height="280%"><feGaussianBlur stdDeviation="2.6"/></filter>
    <!-- 坡顶沿线微光的轻糊 -->
    <filter id="bubRimF" x="-3%" y="-160%" width="106%" height="420%"><feGaussianBlur stdDeviation="0.6"/></filter>
    <!-- 沙纹的轻糊 -->
    <filter id="bubRipF" x="-6%" y="-40%" width="112%" height="180%"><feGaussianBlur stdDeviation="0.5"/></filter>
    <!-- 细颗粒纹理，去塑料感 -->
    <filter id="bubGrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0"/></filter>
  </defs>

  <!-- 水体基底 -->
  <rect width="400" height="400" fill="url(#bubWater)"/>
  <!-- 顶部受光辉光 -->
  <rect width="400" height="400" fill="url(#bubTopGlow)"/>
  <!-- 焦散：上部亮斑 + 中下部衰减余光，同组漂移 -->
  ${caustics}

  <!-- 体积光柱：斜梯形填纵向渐变(bubRayV, 顶亮→水底淡出)，整组包 bubRayF 高斯糊做横向羽化，sc-rays 保留摇曳 -->
  <g class="sc-rays"><g filter="url(#bubRayF)">
    <path d="M112 -30 L52 420 L128 420 L172 -30 Z" fill="url(#bubRayV)" opacity="0.9"/>
    <path d="M244 -30 L306 420 L346 420 L292 -30 Z" fill="url(#bubRayV)" opacity="0.8"/>
    <path d="M180 -30 L198 420 L216 420 L212 -30 Z" fill="url(#bubRayV)" opacity="0.7"/>
    <path d="M330 -30 L392 420 L420 420 L376 -30 Z" fill="url(#bubRayV)" opacity="0.55"/>
  </g></g>

  <!-- 悬浮微粒（在光柱之后，气泡之前，营造景深） -->
  ${dust}

  <!-- 气泡 -->
  ${bubbles}

  <!-- 海床：沙面渐变 + 湿沙内缘 + 沙纹 + 礁石贝壳 + 海草剪影 -->
  ${seabed}

  <!-- 暗角景深（最上层，压四周） -->
  <rect width="400" height="400" fill="url(#bubVign)"/>
  <!-- 极细颗粒去塑料感 -->
  <rect width="400" height="400" filter="url(#bubGrain)" opacity="0.05"/>`;
}

function _themeScene(name){ const f={default:_scene_default,night:_scene_night,bubbles:_scene_bubbles,sunrise:_scene_sunrise,rain:_scene_rain}[name]||_scene_default; return f(); }
  // —— 选择器专用缩略图(突出主角) ——
  function _st(list){ return list.map(([x,y,r,br])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${br||0.9}"/>`).join(''); }
  
  function _themeThumb(name){
    if(name==='night') return `<defs>
      <linearGradient id="tn-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3b46"/><stop offset="0.55" stop-color="#122731"/><stop offset="1" stop-color="#0a141a"/></linearGradient>
      <radialGradient id="tn-m" cx="42%" cy="40%" r="62%"><stop offset="0" stop-color="#fdfbef"/><stop offset="0.7" stop-color="#efe6c6"/><stop offset="1" stop-color="#e4d7ad"/></radialGradient>
      <radialGradient id="tn-g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#e8e6c8" stop-opacity="0.4"/><stop offset="1" stop-color="#e8e6c8" stop-opacity="0"/></radialGradient>
      <mask id="tn-c"><circle cx="205" cy="195" r="86" fill="#fff"/><circle cx="246" cy="171" r="78" fill="#000"/></mask></defs>
      <rect width="400" height="400" fill="url(#tn-s)"/>
      ${_st([[70,80,3,0.9],[120,300,2.4,0.8],[330,120,3,0.9],[300,320,2.2,0.75],[90,180,2,0.7],[360,260,2.4,0.8]])}
      <circle cx="205" cy="195" r="120" fill="url(#tn-g)"/>
      <circle cx="205" cy="195" r="86" fill="url(#tn-m)" mask="url(#tn-c)"/>
      <circle cx="182" cy="168" r="8" fill="#e3d6ac" opacity="0.45"/><circle cx="190" cy="210" r="6" fill="#e3d6ac" opacity="0.4"/><circle cx="170" cy="196" r="5" fill="#e3d6ac" opacity="0.4"/>`;
    if(name==='sunrise') return `<defs>
      <linearGradient id="tr-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c24d2c"/><stop offset="0.45" stop-color="#e6813f"/><stop offset="1" stop-color="#fcd98d"/></linearGradient>
      <radialGradient id="tr-sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff8e0"/><stop offset="0.5" stop-color="#ffe6a6"/><stop offset="1" stop-color="#ffe6a6" stop-opacity="0"/></radialGradient></defs>
      <rect width="400" height="400" fill="url(#tr-s)"/>
      <circle cx="200" cy="232" r="150" fill="url(#tr-sun)"/>
      <circle cx="200" cy="232" r="78" fill="#fff6d8"/>
      <path d="M0 300 Q 140 286 260 300 Q 340 310 400 298 L400 400 L0 400 Z" fill="#c86a44" opacity="0.9"/>`;
    if(name==='default') return `<defs>
      <linearGradient id="td-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9c8df"/><stop offset="0.5" stop-color="#d3e2e8"/><stop offset="1" stop-color="#eef0e2"/></linearGradient>
      <radialGradient id="td-g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6df" stop-opacity="0.95"/><stop offset="1" stop-color="#fff6df" stop-opacity="0"/></radialGradient></defs>
      <rect width="400" height="400" fill="url(#td-s)"/>
      <circle cx="238" cy="150" r="135" fill="url(#td-g)"/><circle cx="238" cy="150" r="52" fill="#fff8ea"/>
      <g fill="#ffffff" opacity="0.95"><ellipse cx="140" cy="250" rx="66" ry="27"/><ellipse cx="96" cy="262" rx="34" ry="20"/><ellipse cx="184" cy="260" rx="30" ry="18"/><ellipse cx="132" cy="234" rx="30" ry="19"/></g>
      <path d="M0 320 Q 150 300 300 320 Q 360 328 400 318 L400 400 L0 400 Z" fill="#c2d0a6"/>`;
    if(name==='rain') return `<defs>
      <linearGradient id="tp-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4a5c"/><stop offset="0.6" stop-color="#4f6072"/><stop offset="1" stop-color="#44525f"/></linearGradient>
      <linearGradient id="tp-st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf3ff" stop-opacity="0"/><stop offset="0.5" stop-color="#eaf3ff" stop-opacity="1"/><stop offset="1" stop-color="#eaf3ff" stop-opacity="0"/></linearGradient>
      <linearGradient id="tp-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c3844"/><stop offset="1" stop-color="#18222c"/></linearGradient></defs>
      <rect width="400" height="400" fill="url(#tp-s)"/>
      <g transform="rotate(12 200 200)"><g stroke="url(#tp-st)" stroke-width="2.4" stroke-linecap="round" opacity="0.6">${(()=>{let s='';for(let r=0;r<7;r++)for(let c=0;c<7;c++){const x=20+c*58+((r%2)?28:0),y=60+r*44;s+=`<line x1="${x}" y1="${y}" x2="${x+1.4}" y2="${y+26}"/>`;}return s;})()}</g></g>
      <g fill="#28323e"><ellipse cx="200" cy="96" rx="96" ry="40"/><ellipse cx="140" cy="112" rx="50" ry="28"/><ellipse cx="262" cy="110" rx="46" ry="26"/></g>
      <path d="M0 330 Q 150 316 300 330 Q 360 338 400 328 L400 400 L0 400 Z" fill="url(#tp-g)"/>
      <g fill="none" stroke="#9fc0dd"><ellipse cx="150" cy="368" rx="40" ry="12" stroke-width="2"/><ellipse cx="150" cy="368" rx="20" ry="6" stroke-width="1.6" opacity="0.7"/><ellipse cx="285" cy="360" rx="30" ry="9" stroke-width="1.8" opacity="0.8"/></g>`;
    // bubbles —— 突出大气泡(不是光束)
    return `<defs>
      <linearGradient id="tb-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3282ad"/><stop offset="0.5" stop-color="#195a83"/><stop offset="1" stop-color="#0a2f4d"/></linearGradient>
      <linearGradient id="tb-ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfeaf5" stop-opacity="0.18"/><stop offset="1" stop-color="#cfeaf5" stop-opacity="0"/></linearGradient></defs>
      <rect width="400" height="400" fill="url(#tb-s)"/>
      <g fill="url(#tb-ray)"><path d="M150 0 L110 400 L160 400 L200 0 Z"/><path d="M260 0 L300 400 L330 400 L295 0 Z"/></g>
      ${[[150,250,46],[258,168,34],[120,120,24],[300,300,28],[210,330,20],[196,208,16]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#e2f2fb" stroke-width="${r>30?3:2.2}" opacity="0.8"/><circle cx="${x-r*0.34}" cy="${y-r*0.34}" r="${r*0.24}" fill="#f0f9fd" opacity="0.9"/>`).join('')}`;
  }

  // ============ 生长树 v3（明确光照 + 树干纹理 + 草地 + 装饰阶梯；绘于计时舞台与全屏遮罩）============
  const _tn = x => Math.round(x * 10) / 10;
  const _tPAL = {
    oak:    { base:'#3d6b30', mid:'#568740', light:'#74a855', rim:'#93c270' },
    sakura: { base:'#db88a6', mid:'#eeacc0', light:'#f7cddb', rim:'#ffe6ef' },
  };
  const _BARKD = '#57411f';
  function _tGround(cx, gy, spread, type) {
  const g = x => _tn(x);
  const base = `<ellipse class="tree-ground" cx="${g(cx)}" cy="${g(gy+9)}" rx="${g(spread)}" ry="${g(spread*0.15)}" opacity="0.42"/>`
    + `<ellipse cx="${g(cx-spread*0.15)}" cy="${g(gy+8)}" rx="${g(spread*0.5)}" ry="${g(spread*0.09)}" fill="#000" opacity="0.06"/>`;
  if (type === 'cactus' || type === 'palm') {
    const sand = type === 'cactus' ? '#cfa963' : '#e3c98d';
    const sandHi = type === 'cactus' ? '#e2c07c' : '#f2e0ae';
    // 沙色罩层与地面底椭圆完全同心同尺寸（不产生第二圈轮廓）；提亮层压极低透明度防「可辨椭圆圈」
    let s = base
      + `<ellipse cx="${g(cx)}" cy="${g(gy+9)}" rx="${g(spread)}" ry="${g(spread*0.15)}" fill="${sand}" opacity="0.32"/>`
      + `<ellipse cx="${g(cx-spread*0.15)}" cy="${g(gy+8)}" rx="${g(spread*0.5)}" ry="${g(spread*0.09)}" fill="${sandHi}" opacity="0.14"/>`;
    if (type === 'cactus') {
      // 小石子（带受光点），替代绿草
      const st=(x,y,r,rot)=>`<g transform="rotate(${rot} ${g(x)} ${g(y)})">`
        + `<ellipse cx="${g(x)}" cy="${g(y+r*0.55)}" rx="${g(r*0.9)}" ry="${g(r*0.28)}" fill="#000" opacity="0.10"/>`
        + `<ellipse cx="${g(x)}" cy="${g(y)}" rx="${g(r)}" ry="${g(r*0.72)}" fill="#9c8563"/>`
        + `<ellipse cx="${g(x-r*0.28)}" cy="${g(y-r*0.26)}" rx="${g(r*0.46)}" ry="${g(r*0.3)}" fill="#bda87f" opacity="0.9"/></g>`;
      s += st(cx-spread*0.52, gy+6.6, 2.6, -8) + st(cx-spread*0.38, gy+8, 1.6, 14) + st(cx+spread*0.47, gy+7, 2.2, 6);
    } else {
      // 沙滩干草：沿用原草簇笔画形状，换成枯黄沙草色
      s += `<g stroke="#b39a5a" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.9">`
        + `<path d="M${g(cx-spread*0.55)} ${g(gy+7)} q -1 -5 -3 -7"/><path d="M${g(cx-spread*0.45)} ${g(gy+7)} q 1 -4 2 -6"/>`
        + `<path d="M${g(cx+spread*0.5)} ${g(gy+7)} q 1 -5 3 -7"/><path d="M${g(cx+spread*0.4)} ${g(gy+7)} q -1 -4 -2 -6"/></g>`;
    }
    return s;
  }
  return base
    + `<g stroke="#5c9145" stroke-width="1.6" stroke-linecap="round" fill="none">`
    + `<path d="M${g(cx-spread*0.55)} ${g(gy+7)} q -1 -5 -3 -7"/><path d="M${g(cx-spread*0.45)} ${g(gy+7)} q 1 -4 2 -6"/>`
    + `<path d="M${g(cx+spread*0.5)} ${g(gy+7)} q 1 -5 3 -7"/><path d="M${g(cx+spread*0.4)} ${g(gy+7)} q -1 -4 -2 -6"/></g>`;
}
  // 微锥弧形树干（主体 class=tree-trunk 供遮罩暖色化）+ 右暗 / 左亮 / 根部张开
  function _tTrunk(cx, baseY, topY, wB, wT) {
  const bl=cx-wB/2, br=cx+wB/2, tl=cx-wT/2, tr=cx+wT/2, m=(baseY+topY)/2;
  const body=`<path class="tree-trunk" d="M${_tn(bl)} ${_tn(baseY)} C ${_tn(bl+wB*0.1)} ${_tn(m)} ${_tn(tl-0.5)} ${_tn(topY+3)} ${_tn(tl)} ${_tn(topY)} L ${_tn(tr)} ${_tn(topY)} C ${_tn(tr+0.5)} ${_tn(topY+3)} ${_tn(br-wB*0.1)} ${_tn(m)} ${_tn(br)} ${_tn(baseY)} Z"/>`;
  const flare=`<path class="tree-trunk" d="M${_tn(bl)} ${_tn(baseY)} q -3.5 -0.5 -5 2 q 3 -1 5 -0.6 Z"/><path class="tree-trunk" d="M${_tn(br)} ${_tn(baseY)} q 3.5 -0.5 5 2 q -3 -1 -5 -0.6 Z"/>`;
  const shade=`<path d="M${_tn(cx)} ${_tn(topY)} C ${_tn(cx+0.5)} ${_tn(topY+3)} ${_tn(br-wB*0.1)} ${_tn(m)} ${_tn(br)} ${_tn(baseY)} L ${_tn(cx)} ${_tn(baseY)} Z" fill="#000" opacity="0.16"/>`;
  const lit=`<path d="M${_tn(bl+0.9)} ${_tn(baseY-1)} C ${_tn(bl+wB*0.1+0.9)} ${_tn(m)} ${_tn(tl+0.5)} ${_tn(topY+3)} ${_tn(tl+1)} ${_tn(topY+0.5)}" fill="none" stroke="#ffe3b0" stroke-width="1.1" stroke-linecap="round" opacity="0.32"/>`;
  return flare+body+shade+lit;
}
  // 有明确光照的圆润树冠（左上受光、右下暗部），阔叶/樱花共用
  function _tCrown(cx, cy, R, pal) {
  const c=(x,y,r,f,o)=>`<circle class="tree-canopy" cx="${_tn(x)}" cy="${_tn(y)}" r="${_tn(Math.max(1.5,r))}" fill="${f}"${o?` opacity="${o}"`:''}/>`;
  // 同色双层软边：内核沿光向偏心（dx,dy），避免同心圆在放大时读成一圈圈 banding
  const soft=(x,y,r,f,eo,co,dx,dy)=>c(x,y,r,f,eo)+c(x+r*dx,y+r*dy,r*0.66,f,co);
  let s='';
  [[cx,cy,R],[cx-R*0.6,cy+R*0.05,R*0.62],[cx+R*0.6,cy+R*0.02,R*0.6],
   [cx-R*0.3,cy-R*0.55,R*0.5],[cx+R*0.32,cy-R*0.52,R*0.46],[cx,cy-R*0.72,R*0.4],
   [cx-R*0.02,cy+R*0.52,R*0.6]].forEach(b=>s+=c(b[0],b[1],b[2],pal.mid));
  s+=soft(cx+R*0.34,cy+R*0.4,R*0.46,pal.base,'0.6','0.85',0.1,0.12)+soft(cx-R*0.3,cy+R*0.5,R*0.38,pal.base,'0.6','0.85',0.06,0.13)+soft(cx+R*0.58,cy+R*0.12,R*0.34,pal.base,'0.55','0.8',0.12,0.08);
  s+=soft(cx-R*0.32,cy-R*0.34,R*0.46,pal.light,'0.62','0.85',-0.1,-0.11)+soft(cx-R*0.02,cy-R*0.54,R*0.32,pal.light,'0.6','0.8',-0.07,-0.12)+soft(cx-R*0.58,cy-R*0.02,R*0.26,pal.light,'0.6','0.8',-0.12,-0.06);
  s+=c(cx-R*0.3,cy-R*0.42,R*0.22,pal.rim,'0.9');
  return s;
}
  function _tSprout(cx, gy, p) {
    const H = 12 + p*46;
    return `<path d="M${cx} ${_tn(gy-2)} L${cx} ${_tn(gy-H)}" stroke="#5c9145" stroke-width="3.2" stroke-linecap="round"/>`
      + `<path class="tree-canopy" fill="#6ba053" d="M${cx} ${_tn(gy-H+6)} C ${_tn(cx-11)} ${_tn(gy-H+4)} ${_tn(cx-15)} ${_tn(gy-H-4)} ${_tn(cx-14)} ${_tn(gy-H-11)} C ${_tn(cx-5)} ${_tn(gy-H-11)} ${cx} ${_tn(gy-H-3)} ${cx} ${_tn(gy-H+6)} Z"/>`
      + `<path class="tree-canopy" fill="#5c9245" d="M${cx} ${_tn(gy-H+3)} C ${_tn(cx+11)} ${_tn(gy-H+1)} ${_tn(cx+16)} ${_tn(gy-H-7)} ${_tn(cx+15)} ${_tn(gy-H-14)} C ${_tn(cx+6)} ${_tn(gy-H-14)} ${cx} ${_tn(gy-H-6)} ${cx} ${_tn(gy-H+3)} Z"/>`;
  }
  function _tBroad(cx, gy, p, pal) {
    const h=34+p*98, topY=gy-h, R=22+p*47, cy=topY-R*0.14;
    return _tTrunk(cx, gy, topY, 7+p*9, 4+p*4) + _tCrown(cx, cy, R, pal);
  }
  function _tPine(cx, gy, p) {
  const trunkH=14+p*10, trunk=_tTrunk(cx, gy, gy-trunkH, 6+p*4, 4+p*2);
  const totalH=44+p*96, topY=gy-totalH, tiers=Math.max(2, Math.round(2+p*3));
  const startY=gy-trunkH*0.55, step=(startY-topY)/tiers, maxW=46+p*74;
  let s='';
  for (let i=0;i<tiers;i++){ const ly=startY-i*step, w=maxW*(0.40 + 0.60*Math.pow(1-i/tiers,0.78)), tipY=ly-step*1.62, L=cx-w/2, Rr=cx+w/2;
    const skirt=step*0.42;
    if (i>0){ // 层间极淡落影（投在下一层锥面内，宽度收在 0.44w 以免越出下层轮廓）
      // 上缘曲线抬到裙摆之上，被本层身体盖掉 → 阴影紧贴裙摆下缘，不悬空
      const sl=cx-w*0.22, sr=cx+w*0.22;
      s+=`<path d="M${_tn(sl)} ${_tn(ly-0.5)} Q ${_tn(cx)} ${_tn(ly+skirt+1)} ${_tn(sr)} ${_tn(ly-0.5)} Q ${_tn(cx)} ${_tn(ly+skirt+6.5)} ${_tn(sl)} ${_tn(ly-0.5)} Z" fill="#1c3a20" opacity="0.16"/>`;
    }
    s+=`<path class="tree-canopy" d="M${_tn(L)} ${_tn(ly)} Q ${_tn(cx)} ${_tn(ly+skirt)} ${_tn(Rr)} ${_tn(ly)} L ${_tn(cx)} ${_tn(tipY)} Z" fill="#477942"/>`;
    // 裙摆二次曲线上取点 + 子曲线控制点（精确细分，分面底边严格贴合裙摆）
    const qx=t=>L+w*t, qy=t=>ly+2*t*(1-t)*skirt;
    const c1x=t=>(1-t)*cx+t*Rr, c1y=t=>(1-t)*(ly+skirt)+t*ly;
    const facet=(t0,endX,endY,op)=>`<path class="tree-canopy" d="M${_tn(qx(t0))} ${_tn(qy(t0))} Q ${_tn(c1x(t0))} ${_tn(c1y(t0))} ${_tn(Rr)} ${_tn(ly)} L ${_tn(endX)} ${_tn(endY)} Z" fill="#356331" opacity="${op}"/>`;
    s+=facet(0.38,cx,tipY,'0.30')+facet(0.55,cx,tipY,'0.38');
    const eU=0.74, ex=Rr+(cx-Rr)*eU, ey=ly+(tipY-ly)*eU;
    s+=facet(0.74,ex,ey,'0.55');
    s+=`<path d="M${_tn(L)} ${_tn(ly)} L ${_tn(cx)} ${_tn(tipY)}" stroke="#6aa35e" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
  }
  return trunk+s;
}
  function _tPalm(cx, gy, p) {
  const h=40+p*112, lean=4+p*6, topX=cx+lean, topY=gy-h;
  const wB=8+p*5, wT=4.5+p*2.5, midX=cx+lean*0.4, midY=(gy+topY)/2;
  const P=t=>[ (1-t)*(1-t)*cx+2*(1-t)*t*midX+t*t*topX, (1-t)*(1-t)*gy+2*(1-t)*t*midY+t*t*topY ];
  const trunk=`<path class="tree-trunk" d="M${_tn(cx-wB/2)} ${_tn(gy)} Q ${_tn(midX-wT/2-2)} ${_tn(midY)} ${_tn(topX-wT/2)} ${_tn(topY)} L ${_tn(topX+wT/2)} ${_tn(topY)} Q ${_tn(midX+wT/2+2)} ${_tn(midY)} ${_tn(cx+wB/2)} ${_tn(gy)} Z"/>`;
  let rings='';
  for (let i=1;i<=5;i++){ const t=i/6, pt=P(t), w=(wB*(1-t)+wT*t);
    rings+=`<path d="M${_tn(pt[0]-w/2-0.5)} ${_tn(pt[1])} q ${_tn(w/2+0.5)} 2.4 ${_tn(w+1)} 0" stroke="${_BARKD}" stroke-width="1" fill="none" opacity="0.5"/>`; }
  const L=30+p*40, wid=7+p*4;
  const qp=(x0,y0,x1,y1,x2,y2,t)=>[(1-t)*(1-t)*x0+2*(1-t)*t*x1+t*t*x2,(1-t)*(1-t)*y0+2*(1-t)*t*y1+t*t*y2];
  const frond=(a,col,rib)=>{ const rad=a*Math.PI/180;
    const ex=topX+Math.cos(rad)*L, ey=topY-Math.sin(rad)*L*0.7, c1=topX+Math.cos(rad)*L*0.5, cy1=topY-Math.sin(rad)*L*0.5-(9+p*6);
    let f=`<path class="tree-canopy" fill="${col}" d="M${_tn(topX)} ${_tn(topY)} Q ${_tn(c1)} ${_tn(cy1)} ${_tn(ex)} ${_tn(ey)} Q ${_tn(c1)} ${_tn(cy1+wid)} ${_tn(topX)} ${_tn(topY+4)} Z"/>`;
    // 侧羽：叶身中部→下缘的短细纹，随叶弯曲取样，克制 3 道
    const pin=col==='#4a9a52' ? '#2f6636' : '#28542e';
    let pf='';
    [0.4,0.58,0.76].forEach(t=>{
      const U=qp(topX,topY,c1,cy1,ex,ey,t), Lo=qp(topX,topY+4,c1,cy1+wid,ex,ey,t), Lo2=qp(topX,topY+4,c1,cy1+wid,ex,ey,Math.min(1,t+0.09));
      const ax=U[0]+(Lo[0]-U[0])*0.35, ay=U[1]+(Lo[1]-U[1])*0.35;
      pf+=`<path d="M${_tn(ax)} ${_tn(ay)} Q ${_tn((ax+Lo2[0])/2)} ${_tn((ay+Lo2[1])/2+0.6)} ${_tn(Lo2[0])} ${_tn(Lo2[1])}" stroke="${pin}" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.45"/>`;
    });
    f+=pf;
    if (rib) f+=`<path d="M${_tn(topX)} ${_tn(topY+1)} Q ${_tn(c1)} ${_tn(cy1+wid*0.4)} ${_tn(ex)} ${_tn(ey)}" stroke="#2f6636" stroke-width="0.8" fill="none" opacity="0.6"/>`;
    return f; };
  let fr='';
  [205,158,-25,22].forEach(a=>fr+=frond(a,'#37793f',false));
  [120,90,60].forEach(a=>fr+=frond(a,'#4a9a52',true));
  fr+=`<circle fill="${_BARKD}" cx="${_tn(topX)}" cy="${_tn(topY)}" r="${_tn(4+p*2)}"/>`;
  if (p>0.55) fr+=`<g fill="#6b4a2b"><circle cx="${_tn(topX-4)}" cy="${_tn(topY+3)}" r="2.6"/><circle cx="${_tn(topX+4)}" cy="${_tn(topY+4)}" r="2.4"/><circle cx="${_tn(topX)}" cy="${_tn(topY+5.5)}" r="2.3"/></g>`;
  return trunk+rings+fr;
}
  function _tCactus(cx, gy, p) {
  const h=40+p*108, w=22+p*15, top=gy-h, col='#5aa15c', lit='#6db06d', dk='#4b8a4e';
  const rr=(x,y,ww,hh)=>`<rect class="tree-canopy" x="${_tn(x)}" y="${_tn(y)}" width="${_tn(ww)}" height="${_tn(hh)}" rx="${_tn(ww/2)}" fill="${col}"/>`
    + `<rect x="${_tn(x)}" y="${_tn(y)}" width="${_tn(ww*0.46)}" height="${_tn(hh)}" rx="${_tn(ww*0.23)}" fill="${lit}" opacity="0.5"/>`
    + `<rect x="${_tn(x)}" y="${_tn(y)}" width="${_tn(ww*0.3)}" height="${_tn(hh)}" rx="${_tn(ww*0.15)}" fill="${lit}" opacity="0.55"/>`
    + `<rect x="${_tn(x+ww*0.64)}" y="${_tn(y)}" width="${_tn(ww*0.36)}" height="${_tn(hh)}" rx="${_tn(ww*0.18)}" fill="${dk}" opacity="0.35"/>`
    + `<rect x="${_tn(x+ww*0.78)}" y="${_tn(y)}" width="${_tn(ww*0.22)}" height="${_tn(hh)}" rx="${_tn(ww*0.11)}" fill="${dk}" opacity="0.5"/>`;
  // 臂根下内角：圆弧填角（沿竖直边 dy 方向与水平边 dx 方向各退 r，曲线经角点鼓成圆肘）
  // 填色按所贴表面取受光/背光混合色，避免在明暗带上出现突兀色块
  const litMix='#69ac69', dkMix='#509252';
  const fil=(cxn,cyn,dx,dy,r,f)=>`<path d="M${_tn(cxn)} ${_tn(cyn+dy*r)} Q ${_tn(cxn)} ${_tn(cyn)} ${_tn(cxn+dx*r)} ${_tn(cyn)} L ${_tn(cxn)} ${_tn(cyn)} Z" fill="${f}"/>`;
  // 竖段与柱之间窄缝的底部：单块「弯月膜」两侧相切收口（缝宽<2px，两个独立填角会交叉成星芒，故用一整块）
  const men=(xa,xb,ay,rm,f)=>{ const mid=(xa+xb)/2;
    return `<path d="M${_tn(xa)} ${_tn(ay-rm)} Q ${_tn(xa)} ${_tn(ay)} ${_tn(mid)} ${_tn(ay)} Q ${_tn(xb)} ${_tn(ay)} ${_tn(xb)} ${_tn(ay-rm)} L ${_tn(xb)} ${_tn(ay+3)} L ${_tn(xa)} ${_tn(ay+3)} Z" fill="${f}"/>`; };
  let s=rr(cx-w/2,top,w,h);
  if (p>0.42){ const aw=w*0.5, reach=w*0.62, ay=top+h*0.36, up=30+p*36, hx=cx-w/2-reach+3;
    s+=rr(hx,ay,reach,aw)+rr(hx,ay-up,aw,up+aw);
    const colL=cx-w/2;
    s+=fil(colL,ay+aw,-1,1,aw*0.5,litMix)      // 臂根下内角（柱左缘=受光侧 × 臂下缘）
      +men(hx+aw,colL,ay,aw*0.7,col);          // 竖段×柱窄缝底部弯月膜
  }
  if (p>0.72){ const aw=w*0.44, reach=w*0.55, ay=top+h*0.54, up=24+p*30, hx=cx+w/2-3, vx=hx+reach-aw;
    s+=rr(hx,ay,reach,aw)+rr(vx,ay-up,aw,up+aw);
    const colR=cx+w/2;
    s+=fil(colR,ay+aw,1,1,aw*0.5,dkMix)        // 臂根下内角（柱右缘=背光侧 × 臂下缘）
      +men(colR,vx,ay,aw*0.7,col);             // 柱×竖段窄缝底部弯月膜
  }
  for (let i=0;i<3;i++){ const xx=cx-w*0.22+i*w*0.22; s+=`<line x1="${_tn(xx)}" y1="${_tn(top+w*0.4)}" x2="${_tn(xx)}" y2="${_tn(gy-6)}" stroke="#3f7642" stroke-width="0.8" opacity="0.5"/>`; }
  if (p>0.8) s+=`<g><circle cx="${_tn(cx)}" cy="${_tn(top-1)}" r="3.4" fill="#ec7fb0"/><circle cx="${_tn(cx)}" cy="${_tn(top-1)}" r="1.5" fill="#ffd76a"/></g>`;
  return s;
}
  // —— 装饰阶梯：树价值越高越华丽（果实/地花/灯串/小鸟/蝴蝶/落瓣，逐级叠加；实心装点，无光晕光环）——
  function _decoLevel(v){ return v>=220?4 : v>=130?3 : v>=70?2 : v>=40?1 : 0; }
  function _gradeName(v){ return v>=220?'神木' : v>=130?'参天' : v>=70?'巨树' : v>=40?'大树' : v>=20?'成树' : '幼苗'; }
  function _canopyCenter(type, p){
    const gy=214;
    if (type==='pine'){ const H=42+p*120; return {cx:160, cy:gy-H*0.5, R:(34+p*46)*0.6}; }
    if (type==='palm'||type==='cactus'){ const h=type==='palm'?40+p*112:40+p*108; return {cx:160, cy:gy-h*0.75, R:28+p*26}; }
    const h=34+p*98, topY=gy-h, R=22+p*47; return {cx:160, cy:topY-R*0.14, R};
  }
  // species 果实/花
  // —— 五树种专属装饰：各自 IIFE 隔离，避免独立设计的同名助手冲突 ——
  const deco_oak = (function(){
// ===== 橡树(oak) 专属华贵语汇 =====
// 铁律：不复用任何跨物种「弯弧灯串」母题。所有装饰锚定橡树真实几何：
//   粗树干(节疤/板根) · 一根可见横枝 · 树冠体(cx,cy,R) · 地面 gy
// 专属意象 = 「古老庭院里的大橡树」：
//   • 成串下垂的金橡果(带杯壳，橡树真果，两两成对挂枝)
//   • 从一根真实横枝上垂下的木秋千(双绳+木板)
//   • 树干上的节疤/树皮纹理 + 外张板根(buttress roots)
//   • 真正停在横枝上的鸣禽 / 枝杈里的树枝鸟窝(含蛋)
//   • 树冠内的林间光斑(暖金透光)
//   • 落地的橡果与叶(不是通用小花)
//
// 阶梯（逐级叠加，越高越华丽）：
//   1 大树：板根 + 树干节疤 + 几串金橡果 + 落地橡果
//   2 巨树：+ 横枝伸出 + 木秋千垂挂 + 更多橡果串 + 冠内光斑
//   3 参天：+ 横枝上停一只鸣禽 + 更密橡果 + 落叶
//   4 神木：+ 枝杈里树枝鸟窝(含蛋) + 秋千更精致(木纹) + 满树橡果 + 更多光斑落叶
//
// 依赖外部已存在的 _tn(四舍五入)。若宿主未提供则挂到 globalThis 兜底（不用 var 声明，避免 eval 作用域下与外层 const 冲突）。
if (typeof globalThis._tn === 'undefined' && typeof _tn === 'undefined') { globalThis._tn = x => Math.round(x*10)/10; }

// —— 橡树几何锚点（与 broadleaf3 完全一致）——
function _oakGeom(p){
  const cx=160, gy=214;
  const h=34+p*98, topY=gy-h, R=22+p*47, cy=topY-R*0.14;
  const wB=7+p*9, wT=4+p*4;          // 树干基宽/顶宽
  // 冠下缘（圆簇最低点大致处）
  const crownBottom = cy + R*0.92;
  // 一根可见的低横枝：从树干长出，伸向左侧「开阔天空」——落在冠体之外下方，
  // 这样秋千/小鸟都贴浅色背景，大图小图都读得出（橡树标志性的横展粗枝）。
  const branchY = crownBottom - R*0.02;   // 枝根在冠下缘略上，出冠即入开阔区
  const branchRootX = cx - wB*0.35;       // 从树干左侧长出
  const branchTipX = cx - R*1.12;         // 伸到冠左外缘之外
  const branchTipY = branchY + R*0.1;     // 略下垂
  return {cx,gy,topY,R,cy,wB,wT,crownBottom,branchY,branchRootX,branchTipX,branchTipY};
}

// —— 成串金橡果：从一点垂下两颗，带杯壳纹与小柄（橡树真果）——
function _oakAcornCluster(x, y, s){
  x=_tn(x); y=_tn(y); s=s||1;
  const acorn=(ax,ay,tilt)=>{
    ax=_tn(ax); ay=_tn(ay);
    const bodyR=2.2*s, capW=2.7*s;
    return `<g transform="rotate(${_tn(tilt)} ${ax} ${ay})">`
      // 果柄
      +`<path d="M${ax} ${_tn(ay-capW-2.2*s)} l0 ${_tn(2*s)}" stroke="#7a5a30" stroke-width="${_tn(0.9*s)}" stroke-linecap="round"/>`
      // 坚果体（暖金）
      +`<ellipse cx="${ax}" cy="${_tn(ay+bodyR*0.5)}" rx="${_tn(bodyR)}" ry="${_tn(bodyR*1.35)}" fill="#d9a441"/>`
      +`<ellipse cx="${_tn(ax-bodyR*0.35)}" cy="${_tn(ay+bodyR*0.2)}" rx="${_tn(bodyR*0.42)}" ry="${_tn(bodyR*0.7)}" fill="#f0cd82" opacity="0.85"/>`
      // 杯壳（深棕，格纹）
      +`<path d="M${_tn(ax-capW)} ${_tn(ay-capW*0.3)} a${_tn(capW)} ${_tn(capW*0.75)} 0 0 1 ${_tn(capW*2)} 0 Z" fill="#8a6a3a"/>`
      +`<path d="M${_tn(ax-capW*0.9)} ${_tn(ay-capW*0.55)} a${_tn(capW*0.9)} ${_tn(capW*0.55)} 0 0 1 ${_tn(capW*1.8)} 0" fill="none" stroke="#6b5028" stroke-width="${_tn(0.7*s)}"/>`
      // 杯壳小凸尖
      +`<circle cx="${ax}" cy="${_tn(ay-capW*0.72)}" r="${_tn(0.8*s)}" fill="#6b5028"/>`
      +`</g>`;
  };
  // 短枝：从锚点分叉出两条果柄
  let g=`<path d="M${x} ${y} q ${_tn(-2.5*s)} ${_tn(4*s)} ${_tn(-4*s)} ${_tn(6*s)} M${x} ${y} q ${_tn(2.5*s)} ${_tn(4*s)} ${_tn(4.5*s)} ${_tn(5*s)}" stroke="#6f5334" stroke-width="${_tn(1*s)}" fill="none" stroke-linecap="round"/>`;
  g+=acorn(x-4*s, y+6*s, -14);
  g+=acorn(x+4.5*s, y+5*s, 12);
  return g;
}

// —— 树干节疤（同心椭圆眼状纹）——
function _oakKnot(x, y, s){
  x=_tn(x); y=_tn(y); s=s||1;
  return `<g>`
    +`<ellipse cx="${x}" cy="${y}" rx="${_tn(3.2*s)}" ry="${_tn(4*s)}" fill="#5b431f"/>`
    +`<ellipse cx="${x}" cy="${y}" rx="${_tn(2*s)}" ry="${_tn(2.6*s)}" fill="none" stroke="#4a3618" stroke-width="${_tn(0.9*s)}"/>`
    +`<ellipse cx="${x}" cy="${y}" rx="${_tn(0.9*s)}" ry="${_tn(1.3*s)}" fill="#3d2c13"/>`
    +`<ellipse cx="${_tn(x-0.9*s)}" cy="${_tn(y-1*s)}" rx="${_tn(2*s)}" ry="${_tn(2.6*s)}" fill="none" stroke="#7a5c30" stroke-width="${_tn(0.6*s)}" opacity="0.6"/>`
    +`</g>`;
}

// —— 外张板根（trunk 基部两侧的三角外撑）——
function _oakButtress(cx, gy, wB){
  const L=cx-wB/2, Rr=cx+wB/2;
  const reach=wB*0.7+3, rise=6;
  // 左板根（受光，浅）
  let g=`<path d="M${_tn(L+0.5)} ${_tn(gy-rise-3)} C ${_tn(L-1)} ${_tn(gy-rise*0.4)} ${_tn(L-reach)} ${_tn(gy-1)} ${_tn(L-reach)} ${_tn(gy+1)} L ${_tn(L+1.5)} ${_tn(gy+1)} Z" fill="#84663f"/>`;
  // 右板根（暗）
  g+=`<path d="M${_tn(Rr-0.5)} ${_tn(gy-rise-3)} C ${_tn(Rr+1)} ${_tn(gy-rise*0.4)} ${_tn(Rr+reach)} ${_tn(gy-1)} ${_tn(Rr+reach)} ${_tn(gy+1)} L ${_tn(Rr-1.5)} ${_tn(gy+1)} Z" fill="#57411f"/>`;
  // 板根之间根隙暗线
  g+=`<path d="M${_tn(L-reach*0.55)} ${_tn(gy+1)} q 1 -3 2.5 -4.5 M${_tn(Rr+reach*0.55)} ${_tn(gy+1)} q -1 -3 -2.5 -4.5" stroke="#4a3618" stroke-width="0.9" fill="none" opacity="0.6"/>`;
  return g;
}

// —— 可见横枝（从树干伸出的粗枝，锥形，带上缘受光）——
function _oakBranch(g){
  const {branchRootX, branchY, branchTipX, branchTipY} = g;
  const rx=branchRootX, ry=branchY;
  const tx=branchTipX, ty=branchTipY;
  const wRoot=4.2, wTip=1.6;
  // 枝身（下垂弧）
  const midX=(rx+tx)/2, midY=(ry+ty)/2 - 2;
  let s=`<path d="M${_tn(rx)} ${_tn(ry-wRoot/2)} Q ${_tn(midX)} ${_tn(midY-wTip)} ${_tn(tx)} ${_tn(ty-wTip/2)} L ${_tn(tx)} ${_tn(ty+wTip/2)} Q ${_tn(midX)} ${_tn(midY+wRoot*0.3)} ${_tn(rx)} ${_tn(ry+wRoot/2)} Z" fill="#6f5334"/>`;
  // 上缘受光
  s+=`<path d="M${_tn(rx)} ${_tn(ry-wRoot/2+0.6)} Q ${_tn(midX)} ${_tn(midY-wTip+0.6)} ${_tn(tx)} ${_tn(ty-wTip/2+0.5)}" stroke="#84663f" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  // 枝端小分叉
  s+=`<path d="M${_tn(tx)} ${_tn(ty)} l -3 -2 M${_tn(tx)} ${_tn(ty)} l -2.5 2.5" stroke="#6f5334" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  return s;
}

// —— 木秋千（双绳 + 木板，挂在横枝端）——
function _oakSwing(g, detailed){
  const {branchTipX, branchTipY} = g;
  // 挂点略靠枝内一点，避免落在最细的枝端
  const hx=_tn(branchTipX+4), hy=_tn(branchTipY+1);
  const dropL=18, seatW=13;
  const seatY=_tn(hy+dropL), sl=_tn(hx-seatW/2), sr=_tn(hx+seatW/2);
  // 两根绳
  let s=`<path d="M${_tn(hx-1.5)} ${hy} L ${sl+1.5} ${seatY}" stroke="#5a4526" stroke-width="1.3" stroke-linecap="round"/>`
    +`<path d="M${_tn(hx+1.5)} ${hy} L ${sr-1.5} ${seatY}" stroke="#5a4526" stroke-width="1.3" stroke-linecap="round"/>`;
  // 挂点绳结
  s+=`<circle cx="${hx}" cy="${hy}" r="1.6" fill="#5a4526"/>`;
  // 木板座（暖木色，左受光）
  s+=`<rect x="${sl}" y="${seatY}" width="${_tn(seatW)}" height="3.6" rx="1.4" fill="#a9793f"/>`;
  s+=`<rect x="${sl}" y="${seatY}" width="${_tn(seatW)}" height="1.5" rx="0.8" fill="#c4934f"/>`;
  s+=`<rect x="${sl}" y="${_tn(seatY+2.4)}" width="${_tn(seatW)}" height="1.2" rx="0.6" fill="#7d5629"/>`;
  if (detailed){ // 木纹
    s+=`<line x1="${_tn(sl+2)}" y1="${_tn(seatY+1.8)}" x2="${_tn(sr-2)}" y2="${_tn(seatY+1.8)}" stroke="#8a6534" stroke-width="0.5" opacity="0.6"/>`;
    // 绳上缠结
    s+=`<circle cx="${_tn(hx-3.4)}" cy="${_tn(hy+dropL*0.5)}" r="0.9" fill="#4a3820"/>`;
    s+=`<circle cx="${_tn(hx+3.4)}" cy="${_tn(hy+dropL*0.5)}" r="0.9" fill="#4a3820"/>`;
  }
  return s;
}

// —— 停在横枝上的鸣禽（暖胸小鸟，脚立枝上）——
function _oakBird(g){
  // 停在横枝「外段开阔处」（贴浅背景才读得出），朝树心（右）
  const t=0.72;
  const bx=_tn(g.branchRootX + (g.branchTipX-g.branchRootX)*t);
  const by=_tn(g.branchY + (g.branchTipY-g.branchY)*t - 5.5); // 立在枝上方
  const d=1; // 朝右
  let s=`<g>`;
  // 脚
  s+=`<path d="M${bx} ${_tn(by+4)} l0 2 M${_tn(bx+2)} ${_tn(by+4)} l0 2" stroke="#3a2a18" stroke-width="0.9" stroke-linecap="round"/>`;
  // 身（橄榄棕背，圆胖）
  s+=`<ellipse cx="${bx}" cy="${by}" rx="5.4" ry="4.2" fill="#6b7a4a" transform="rotate(14 ${bx} ${by})"/>`;
  // 尾
  s+=`<path d="M${_tn(bx-4.6)} ${_tn(by+1)} l -5.5 1 l 1.2 2 Z" fill="#5a683d"/>`;
  // 暖胸腹
  s+=`<ellipse cx="${_tn(bx+1.4)}" cy="${_tn(by+1.6)}" rx="3" ry="2.7" fill="#e0a24a"/>`;
  // 头
  s+=`<circle cx="${_tn(bx+4.4)}" cy="${_tn(by-2.6)}" r="3" fill="#5a683d"/>`;
  // 喙
  s+=`<path d="M${_tn(bx+7.1)} ${_tn(by-2.8)} l 2.8 0.6 l -2.2 1.4 Z" fill="#d69434"/>`;
  // 眼
  s+=`<circle cx="${_tn(bx+5)}" cy="${_tn(by-3.1)}" r="0.85" fill="#17130c"/>`;
  s+=`<circle cx="${_tn(bx+4.7)}" cy="${_tn(by-3.4)}" r="0.3" fill="#fff" opacity="0.8"/>`;
  // 翼
  s+=`<path d="M${_tn(bx+0.5)} ${_tn(by-1)} q -4.5 -1 -6.8 2.2 q 3.6 1.1 6.2 -0.6 Z" fill="#4e5c34"/>`;
  s+=`</g>`;
  return s;
}

// —— 枝杈里的树枝鸟窝（含两枚蛋）——
function _oakNest(g){
  // 放在冠右上「亮侧边缘」的一处枝杈：贴较浅底色，读得出；比原来更大。
  const nx=_tn(g.cx + g.R*0.62), ny=_tn(g.cy - g.R*0.44);
  const W=10, H=9; // 窝体：更宽更深的碗
  const rim=_tn(ny-2);     // 碗口高度
  let s=`<g>`;
  // 支撑小枝杈（让窝像坐在分叉上）：只一条斜向后的托枝，短，避免像「腿」
  s+=`<path d="M${_tn(nx+W*0.5)} ${_tn(ny+H*0.5)} q 3 1.5 5.5 1" stroke="#5b431f" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  s+=`<path d="M${_tn(nx-W*0.5)} ${_tn(ny+H*0.5)} q -2 1 -3.5 0.6" stroke="#5b431f" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  // 深碗（先画整只碗，深棕），碗口在 rim
  s+=`<path d="M${_tn(nx-W)} ${rim} Q ${nx} ${_tn(rim+H+2)} ${_tn(nx+W)} ${rim} Z" fill="#6b4f2a"/>`;
  // 蛋（藏在碗里，只露上半，暖奶油色带一点斑）——先画蛋，再用碗前缘盖住下半
  const egg=(ex,ey,f)=>`<ellipse cx="${_tn(ex)}" cy="${_tn(ey)}" rx="2.6" ry="3.2" fill="${f}"/>`
    +`<ellipse cx="${_tn(ex-0.8)}" cy="${_tn(ey-1)}" rx="0.8" ry="1.1" fill="#fbf6ea" opacity="0.85"/>`
    +`<circle cx="${_tn(ex+0.7)}" cy="${_tn(ey+0.4)}" r="0.4" fill="#b9a06f" opacity="0.7"/>`;
  s+=egg(nx-3.6, rim-0.6, '#e4d9bc');
  s+=egg(nx+0.2, rim-1.4, '#eee3c8');
  s+=egg(nx+3.8, rim-0.4, '#dccfae');
  // 碗前缘（编织的树枝碗壁，盖住蛋下半，形成「蛋窝里」的层次）
  s+=`<path d="M${_tn(nx-W)} ${rim} Q ${nx} ${_tn(rim+H)} ${_tn(nx+W)} ${rim} Q ${_tn(nx+W*0.72)} ${_tn(rim-2.6)} ${nx} ${_tn(rim-1.8)} Q ${_tn(nx-W*0.72)} ${_tn(rim-2.6)} ${_tn(nx-W)} ${rim} Z" fill="#7a5a30"/>`;
  // 编织纹（碗壁横向短弧）
  for(let i=-2;i<=2;i++){ const wx=nx+i*3.4;
    s+=`<path d="M${_tn(wx-2.2)} ${_tn(rim+2.2)} q 2.2 2 4.4 0" stroke="#a9793f" stroke-width="0.8" fill="none" opacity="0.75"/>`; }
  // 碗口内沿受光
  s+=`<path d="M${_tn(nx-W*0.78)} ${_tn(rim-0.6)} Q ${nx} ${_tn(rim+2)} ${_tn(nx+W*0.78)} ${_tn(rim-0.6)}" fill="none" stroke="#5b431f" stroke-width="1" opacity="0.6"/>`;
  s+=`</g>`;
  return s;
}

// —— 冠内林间光斑（暖金透光的柔和斑块）——
function _oakDapple(x, y, r){
  x=_tn(x); y=_tn(y); r=_tn(r);
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#f4e2a0" opacity="0.5"/>`
    +`<circle cx="${_tn(x-r*0.3)}" cy="${_tn(y-r*0.3)}" r="${_tn(r*0.5)}" fill="#fbf1c8" opacity="0.55"/>`;
}

// —— 落地橡果（比果串小、躺地）——
function _oakGroundAcorn(x, gy){
  x=_tn(x); const y=_tn(gy-1.5);
  return `<g>`
    +`<ellipse cx="${x}" cy="${y}" rx="2.4" ry="3" fill="#d9a441" transform="rotate(72 ${x} ${y})"/>`
    +`<path d="M${_tn(x-1)} ${_tn(y-2.6)} a2.6 2 0 0 1 3.4 1.4 Z" fill="#8a6a3a"/>`
    +`</g>`;
}

// —— 落叶（简洁的橡树裂叶剪影：一条中脉 + 两侧对称的圆浅裂，整体像叶不像虫）——
function _oakLeaf(x, y, rot, col){
  x=_tn(x); y=_tn(y);
  // 实心叶片：细长椭圆状主体，左右各三个圆浅裂
  return `<g transform="rotate(${_tn(rot)} ${x} ${y})">`
    +`<path d="M${x} ${_tn(y-4.5)} `
      +`C ${_tn(x+2.6)} ${_tn(y-3.2)} ${_tn(x+2.4)} ${_tn(y-1.6)} ${_tn(x+1.4)} ${_tn(y-0.8)} `   // 右上裂
      +`C ${_tn(x+3)} ${_tn(y-0.2)} ${_tn(x+2.8)} ${_tn(y+1.4)} ${_tn(x+1.4)} ${_tn(y+2)} `        // 右中裂
      +`C ${_tn(x+2.2)} ${_tn(y+3)} ${_tn(x+1.2)} ${_tn(y+3.8)} ${x} ${_tn(y+4.5)} `               // 右下收尖
      +`C ${_tn(x-1.2)} ${_tn(y+3.8)} ${_tn(x-2.2)} ${_tn(y+3)} ${_tn(x-1.4)} ${_tn(y+2)} `        // 左下裂
      +`C ${_tn(x-2.8)} ${_tn(y+1.4)} ${_tn(x-3)} ${_tn(y-0.2)} ${_tn(x-1.4)} ${_tn(y-0.8)} `      // 左中裂
      +`C ${_tn(x-2.4)} ${_tn(y-1.6)} ${_tn(x-2.6)} ${_tn(y-3.2)} ${x} ${_tn(y-4.5)} Z" fill="${col}"/>` // 左上裂回顶
    +`<line x1="${x}" y1="${_tn(y-3.6)}" x2="${x}" y2="${_tn(y+3.8)}" stroke="#3d6b30" stroke-width="0.6" opacity="0.55"/>`
    +`</g>`;
}

function _decorate(type, p, level){
  if (type!=='oak') return {behind:'', front:''};
  if (level<=0) return {behind:'', front:''};
  const g=_oakGeom(p);
  const {cx,gy,topY,R,cy,wB,branchY,branchRootX,branchTipX} = g;
  let behind='', front='';

  // ——【lv1】板根 · 树干节疤 · 金橡果串 · 落地橡果 ——
  // 板根（在树身之前画一点点、多数其实要贴着 trunk 基部，放 front 更稳）
  behind += _oakButtress(cx, gy, wB);
  // 树干节疤（1~2 个，锚在树干中下段）
  front += _oakKnot(cx - wB*0.12, gy - (34+p*98)*0.42, 0.9);
  if (level>=2) front += _oakKnot(cx + wB*0.05, gy - (34+p*98)*0.66, 0.75);

  // 金橡果串：挂在冠「下缘」处，果串向下垂进开阔区 —— 贴浅背景，两个尺度都读得出。
  // （橡树真果，取代通用小花/灯串；避免埋进冠体深处被吞掉）
  const acPts = [
    [cx + R*0.5,  cy + R*0.82, 1.1],   // 右下缘
    [cx + R*0.82, cy + R*0.5,  1.0],   // 右侧缘
    [cx - R*0.05, cy + R*0.98, 1.05],  // 正下缘
    [cx + R*0.24, cy + R*0.92, 1.0],   // 右下
    [cx - R*0.42, cy + R*0.86, 1.0],   // 左下缘（秋千枝那侧上方）
    [cx + R*0.62, cy + R*0.72, 0.95],
  ];
  const nAc = level>=4 ? 6 : level>=3 ? 5 : level>=2 ? 4 : 3;
  for(let i=0;i<nAc;i++) front += _oakAcornCluster(acPts[i][0], acPts[i][1], acPts[i][2]);

  // 落地橡果
  const gAcN = level>=4 ? 5 : level>=3 ? 4 : level>=2 ? 3 : 2;
  const gAcX = [cx-R*0.7, cx+R*0.6, cx-R*0.28, cx+R*0.34, cx-R*1.0];
  for(let i=0;i<gAcN;i++) front += _oakGroundAcorn(gAcX[i], gy + (i%2?1:0));

  // ——【lv2】横枝 + 木秋千 + 冠内光斑 ——
  if (level>=2){
    front += _oakBranch(g);
    front += _oakSwing(g, level>=4);
    // 冠内光斑（左上受光侧）
    behind += _oakDapple(cx - R*0.34, cy - R*0.36, 6.5);
    behind += _oakDapple(cx - R*0.02, cy - R*0.55, 4.5);
  }

  // ——【lv3】横枝上鸣禽 + 落叶 ——
  if (level>=3){
    front += _oakBird(g);
    const lvPts = [[cx-R*0.85, cy+R*0.85, 18, '#5c9145'], [cx+R*0.9, cy+R*0.55, -40, '#6ea24d'], [cx-R*0.2, cy+R*1.05, 55, '#4f8a3e']];
    for(const q of lvPts) front += _oakLeaf(q[0], q[1], q[2], q[3]);
  }

  // ——【lv4】枝杈鸟窝(含蛋) + 更多光斑落叶 ——
  if (level>=4){
    front += _oakNest(g);
    behind += _oakDapple(cx + R*0.3, cy - R*0.28, 5);
    behind += _oakDapple(cx - R*0.55, cy + R*0.02, 4);
    const lv2 = [[cx+R*1.05, cy+R*0.9, -25, '#6ea24d'], [cx-R*1.0, cy+R*0.55, 35, '#5c9145'], [cx+R*0.5, cy+R*1.2, -10, '#4f8a3e'], [cx+R*0.05, cy+R*1.35, 70, '#6ea24d']];
    for(const q of lv2) front += _oakLeaf(q[0], q[1], q[2], q[3]);
  }

  return {behind, front};
}

// 交付契约要求的具名函数：deco_oak(p, level) -> {behind, front}
function deco_oak(p, level){ return _decorate('oak', p, level); }
return deco_oak;
})();
  const deco_sakura = (function(){
// deco_sakura(p, level) → {behind, front}
// 樱花专属华贵语汇：盛放繁花 + 空中花瓣雨 + 地面落瓣毯 + 盛放花枝
// 锚定 broadleaf3(160,214,p)：h=34+p*98, topY=gy-h, R=22+p*47, cy=topY-R*0.14
function _tn(x){ return Math.round(x*10)/10; }

function deco_sakura(p, level){
  const cx=160, gy=214;
  const h=34+p*98, topY=gy-h, R=22+p*47, cy=topY-R*0.14;
  // 樱花色板（与树身 PAL.sakura 呼应 + 站点暖金点缀）
  const PINK='#f4a9c2', PINKL='#ffd3e2', PINKD='#e087a5', WHITE='#fff4f8';
  const CORE='#f6c14e';        // 花心：暖金
  const GOLD='#e8b24a', GOLDD='#caa53c';
  const BRANCH='#5a4326', BRANCHL='#775836';
  let behind='', front='';

  // —— 单朵五瓣樱花（带缺刻的花瓣感，实心，缩小仍成团）——
  // r 为整朵半径；瓣用圆近似（≥约4px 时安全）
  function blossom(x,y,r,face){
    // face: 正面(五瓣+金心) / 侧背(简化团)
    let s='';
    if(face){
      // 花瓣底盘（略深粉），让白瓣有描边感、从冠面跳出
      s+=`<circle cx="${_tn(x)}" cy="${_tn(y)}" r="${_tn(r*1.02)}" fill="${PINKD}" opacity="0.9"/>`;
      // 五瓣，绕心 72°，左上受光 —— 亮白粉，明显跳出
      for(let k=0;k<5;k++){
        const a=(-90+k*72)*Math.PI/180;
        const px=x+Math.cos(a)*r*0.6, py=y+Math.sin(a)*r*0.6;
        const lit=(k===4||k===0);         // 左上两瓣最亮
        s+=`<circle cx="${_tn(px)}" cy="${_tn(py)}" r="${_tn(r*0.52)}" fill="${lit?WHITE:PINKL}"/>`;
      }
      // 花心暖金
      s+=`<circle cx="${_tn(x)}" cy="${_tn(y)}" r="${_tn(r*0.34)}" fill="${CORE}"/>`;
      s+=`<circle cx="${_tn(x-r*0.1)}" cy="${_tn(y-r*0.1)}" r="${_tn(r*0.16)}" fill="#fff0c0"/>`;
    } else {
      // 侧团（更暗，作阴影层的花团）
      s+=`<circle cx="${_tn(x)}" cy="${_tn(y)}" r="${_tn(r*0.9)}" fill="${PINKD}"/>`;
      s+=`<circle cx="${_tn(x-r*0.35)}" cy="${_tn(y-r*0.3)}" r="${_tn(r*0.5)}" fill="${PINK}"/>`;
    }
    return s;
  }

  // —— 单片飘落花瓣（水滴+缺刻，斜向）——
  function petal(x,y,s2,rot,col){
    const c=Math.cos(rot), sn=Math.sin(rot);
    // 花瓣：一个略长的椭圆样式，用 path
    const w=s2, l=s2*1.35;
    return `<g transform="translate(${_tn(x)} ${_tn(y)}) rotate(${_tn(rot*180/Math.PI)})">`
      +`<path d="M0 ${_tn(-l)} C ${_tn(w*0.9)} ${_tn(-l*0.4)} ${_tn(w*0.7)} ${_tn(l*0.5)} 0 ${_tn(l)} C ${_tn(-w*0.7)} ${_tn(l*0.5)} ${_tn(-w*0.9)} ${_tn(-l*0.4)} 0 ${_tn(-l)} Z" fill="${col}"/>`
      // 缺刻（顶端小 V）
      +`<path d="M ${_tn(-w*0.28)} ${_tn(-l*0.92)} L 0 ${_tn(-l*0.66)} L ${_tn(w*0.28)} ${_tn(-l*0.92)}" fill="${WHITE}" opacity="0.55"/>`
      +`</g>`;
  }

  // 伪随机（确定性），用于花瓣雨/落毯的分布
  function rnd(i){ const s=Math.sin(i*127.1+43.7)*43758.5; return s-Math.floor(s); }

  // ============ LEVEL 1: 繁花加密 —— 在树冠上撒专属的一层「盛放正面花簇」 ============
  // 锚定树冠：沿冠面均匀分布，突出「比橡树更密更满」的花
  // 花团锚在树冠半径内，避免飘在空中
  {
    // 前景繁花团（正面五瓣）——分布在冠面朝观者一侧
    const spots=[
      [cx-R*0.42, cy-R*0.30, R*0.16],
      [cx+R*0.30, cy-R*0.44, R*0.15],
      [cx-R*0.08, cy-R*0.58, R*0.14],
      [cx+R*0.52, cy-R*0.06, R*0.15],
      [cx-R*0.58, cy+R*0.06, R*0.14],
      [cx+R*0.12, cy+R*0.02, R*0.15],
      [cx-R*0.26, cy+R*0.30, R*0.15],
      [cx+R*0.36, cy+R*0.34, R*0.14],
      [cx-R*0.02, cy-R*0.14, R*0.16],
      [cx-R*0.44, cy+R*0.42, R*0.13],
    ];
    // 背后暗花团（衬托深度，放 behind 之后其实要在树前——统一放 front，靠色分层）
    spots.forEach((s,i)=>{
      front+=blossom(s[0], s[1], s[2], true);
    });
  }

  // ============ LEVEL 2: 空中飘落的花瓣改为「持续落樱」动画(_sakuraFall)，
  //   不再画静止的半空花瓣(用户:动效里不能有停在半空中的静止花瓣)。此处留空。============

  // ============ LEVEL 3: 地面落瓣毯 —— 树下一圈铺满的落樱 ============
  if(level>=3){
    // 落瓣毯：在地面椭圆区域内平铺一层花瓣（behind：让树/草压在其上更自然？
    // 落瓣在地面上，应盖过草——放 front 底部，但在飘落花瓣之下先画）
    const spread = 26+p*54;
    let carpet='';
    // 粉色底晕（毯的整体粉调）
    carpet += `<ellipse cx="${_tn(cx)}" cy="${_tn(gy+7)}" rx="${_tn(spread*1.02)}" ry="${_tn(spread*0.2)}" fill="${PINKL}" opacity="0.5"/>`;
    carpet += `<ellipse cx="${_tn(cx-spread*0.08)}" cy="${_tn(gy+6)}" rx="${_tn(spread*0.78)}" ry="${_tn(spread*0.15)}" fill="${PINK}" opacity="0.45"/>`;
    // 铺散的单瓣（贴地，扁平角度）
    const M=26;
    for(let i=0;i<M;i++){
      const ang = rnd(i)*Math.PI*2;
      const rad = Math.sqrt(rnd(i+9)) * spread*0.95;
      const px = cx + Math.cos(ang)*rad;
      const py = gy+2 + Math.sin(ang)*rad*0.18 + rnd(i+17)*4;  // 压扁到地面带
      const sz = 2.2 + rnd(i+5)*1.5;
      const rot = rnd(i+13)*Math.PI;
      const col = (i%3===0)?PINKL:(i%3===1?PINK:PINKD);
      // 贴地花瓣稍压扁
      carpet += `<g transform="translate(${_tn(px)} ${_tn(py)}) scale(1,0.55)">`+petal(0,0,sz,rot,col)+`</g>`;
    }
    // 落瓣毯放在飘落雨之前（视觉在下），插到 front 头部
    front = carpet + front;
  }

  // ============ LEVEL 4: 神木 —— 盛放花枝挑出 + 花瓣雨加浓 + 暖金流苏点缀 ============
  if(level>=4){
    // 从冠中伸出几枝「盛放花枝」——真实樱枝：细褐枝挑出冠外，末端一串正面繁花
    function bloomBranch(x0,y0,ang,len,n0){
      const rad=ang*Math.PI/180;
      const ex=x0+Math.cos(rad)*len, ey=y0-Math.sin(rad)*len*0.9;
      const mx=x0+Math.cos(rad)*len*0.5 - 3, my=y0-Math.sin(rad)*len*0.5-8; // 上拱
      let s=`<path d="M${_tn(x0)} ${_tn(y0)} Q ${_tn(mx)} ${_tn(my)} ${_tn(ex)} ${_tn(ey)}" stroke="${BRANCH}" stroke-width="${_tn(2.2)}" fill="none" stroke-linecap="round"/>`;
      s+=`<path d="M${_tn(x0)} ${_tn(y0-0.6)} Q ${_tn(mx)} ${_tn(my-0.6)} ${_tn(ex)} ${_tn(ey-0.6)}" stroke="${BRANCHL}" stroke-width="0.9" fill="none" stroke-linecap="round" opacity="0.7"/>`;
      // 沿枝末端一串花
      for(let k=0;k<n0;k++){
        const tt=0.55+0.45*(k/(n0-1||1));
        const bx=x0+(ex-x0)*tt, by=y0+(ey-y0)*tt;
        s+=blossom(bx, by, 4.2+ (k===n0-1?1.4:0), true);
      }
      // 枝端花苞（暖金点）
      s+=`<circle cx="${_tn(ex)}" cy="${_tn(ey)}" r="1.8" fill="${GOLD}"/>`;
      return s;
    }
    let br='';
    // 三枝：左上、右上、右侧下垂——挑出冠外
    br += bloomBranch(cx-R*0.5, cy-R*0.2, 152, R*0.62, 3);
    br += bloomBranch(cx+R*0.5, cy-R*0.35, 34, R*0.6, 3);
    br += bloomBranch(cx+R*0.62, cy+R*0.2, -8, R*0.55, 3);
    front += br;

    // 冠顶暖金花苞冠冕（一排立起的金苞，作神木徽记，锚在冠顶弧线）
    let crown='';
    const CN=7;
    for(let i=0;i<CN;i++){
      const a=(-140 + i*(280/(CN-1)))*Math.PI/180;
      const bx=cx+Math.cos(a)*R*0.9, by=cy+Math.sin(a)*R*0.9;
      if(by>cy+R*0.2) continue; // 只上半冠
      crown+=`<circle cx="${_tn(bx)}" cy="${_tn(by)}" r="2.4" fill="${GOLD}"/>`;
      crown+=`<circle cx="${_tn(bx-0.5)}" cy="${_tn(by-0.6)}" r="1.0" fill="#ffe9a8"/>`;
    }
    front += crown;

    // （神木不再加静止的空中花瓣雨——改由 _sakuraFall 持续飘落）

    // 地面落瓣毯加金：几点暖金落蕊
    const spread = 26+p*54;
    for(let i=0;i<7;i++){
      const ang=rnd(i+101)*Math.PI*2, rad=Math.sqrt(rnd(i+111))*spread*0.85;
      const px=cx+Math.cos(ang)*rad, py=gy+2+Math.sin(ang)*rad*0.18;
      front += `<circle cx="${_tn(px)}" cy="${_tn(py)}" r="1.5" fill="${GOLD}"/>`;
    }
  }

  return {behind, front};
}
return deco_sakura;
})();
  const deco_pine = (function(){
// deco_pine —— 针叶林「野林生趣」专属语汇（重构：抛弃「越高级堆越多雪」）
// ─────────────────────────────────────────────────────────────────────
// 递进逻辑与橡树对齐 = 「越老的古松，越多野林生灵把它当家」：
//   越往高等级，越多针叶林特有的野生生命聚集到这棵树上。
//   与橡树区分：橡树是「人来亲近」(秋千/树屋/庭院鸣禽)；松树是「野林栖居」。
//
//   L1 大树   ：松果（松树自己的果实，老树才多结）——垂挂在下层枝缝
//   L2 巨树   ：+ 一只【红松鼠】抱着松果攀在树干上（针叶林标志居民）+ 更多松果
//   L3 参天   ：+ 一个【藏在层间的鸟巢（带蛋）】——雀鸟选中这棵树安家 + 更密松果
//   L4 神木   ：+ 一只【猫头鹰】栖于树冠 + 一只小雀鸟 + 第二只松鼠 —— 住满野林生灵的雄伟古松
//
// 雪：不作为等级信号。四级都一样的「极轻薄恒定薄雪」——只在最高一层锥尖挂一抹
//     常青高山薄霜，四级完全相同，纯氛围。
//
// 依赖外部 _tn(四舍五入)；宿主未提供则兜底（不用 var，避免 eval 作用域冲突）。
if (typeof globalThis._tn === 'undefined' && typeof _tn === 'undefined') { globalThis._tn = x => Math.round(x*10)/10; }

// —— 松树几何锚点（与 pine3_fuller 逐字一致）——
function _pineGeom(p){
  const cx=160, gy=214;
  const trunkH=14+p*10, totalH=44+p*96, topY=gy-totalH;
  const tiers=Math.max(2,Math.round(2+p*3));
  const startY=gy-trunkH*0.55, step=(startY-topY)/tiers, maxW=46+p*74;
  const T=[];
  for(let i=0;i<tiers;i++){
    const ly=startY-i*step;
    const w=maxW*(0.40 + 0.60*Math.pow(1 - i/tiers, 0.78));
    const tipY=ly-step*1.62;
    T.push({ly,w,tipY,L:cx-w/2,R:cx+w/2});
  }
  return {cx,gy,trunkH,totalH,topY,tiers,startY,step,maxW,T};
}

// —— 站点色 + 自然色板 ——
const _CONE='#9c6f38', _CONED='#6e4a1e', _CONEL='#caa05c';   // 松果（暖棕→暖金高光）
const _CONESTEM='#5c421f';
const _SQ='#c05a26', _SQD='#9a4318', _SQL='#e08a4c';          // 红松鼠（锈红/腹白）
const _SQBELLY='#f4e6d2';
const _NAVY='#1e3a5f', _GOLD='#e8b04a', _CREAM='#f4ecda';     // 站点藏蓝/暖金/奶油
const _EGG='#e9dcc0', _EGGL='#f7efdc', _EGGSPOT='#b39a6a';
const _NESTD='#6b4f2a', _NEST='#7d5c30', _NESTL='#a9793f';    // 枝编鸟巢
const _OWL='#7b6a52', _OWLD='#5c4e3c', _OWLL='#a1907a';       // 猫头鹰（暖灰褐）
const _BIRD='#3f6b8c', _BIRDBELLY='#f4ecda';                  // 小雀鸟（青蓝背，锚站点蓝系）
const _SNOW='#f4f7fb', _SNOWLIT='#ffffff';                    // 恒定薄雪/薄霜
const _DARK='#241a10';

// ═════════════ 助手 ═════════════

// —— 松果：垂挂的纺锤形，带鳞片纹与左上受光。x,y=挂点顶端 ——
function _pinecone(x,y,sc){
  x=_tn(x); y=_tn(y); sc=sc||1;
  const w=3.5*sc, rows=5, rh=1.55*sc;    // 修长 + 逐行叠鳞
  const cy=y+1.3*sc;
  let s=`<line x1="${x}" y1="${_tn(y)}" x2="${x}" y2="${_tn(cy)}" stroke="${_CONESTEM}" stroke-width="${_tn(0.8*sc)}" stroke-linecap="round"/>`;
  // 底衬(整体棕色轮廓,填补鳞片间缝)
  s+=`<path d="M${x} ${_tn(cy)} Q ${_tn(x-w)} ${_tn(cy+rh*1.2)} ${_tn(x-w*0.55)} ${_tn(cy+rh*3)} Q ${_tn(x-w*0.25)} ${_tn(cy+rh*4.6)} ${x} ${_tn(cy+rh*5)} Q ${_tn(x+w*0.25)} ${_tn(cy+rh*4.6)} ${_tn(x+w*0.55)} ${_tn(cy+rh*3)} Q ${_tn(x+w)} ${_tn(cy+rh*1.2)} ${x} ${_tn(cy)} Z" fill="${_CONED}"/>`;
  // 鳞片:逐行(上宽下窄)交错的下弯扇贝,叠出凹凸松果肌理
  for(let i=0;i<rows;i++){
    const ry=cy+i*rh*0.94, rw=w*(1-i*0.15), scales=i<3?2:1;
    for(let j=0;j<scales;j++){
      const sx=scales===2?(x+(j?rw*0.42:-rw*0.42)):x, sw=rw*(scales===2?0.6:0.86);
      s+=`<path d="M${_tn(sx-sw)} ${_tn(ry)} Q ${_tn(sx)} ${_tn(ry+rh*1.7)} ${_tn(sx+sw)} ${_tn(ry)} Q ${_tn(sx)} ${_tn(ry+rh*0.5)} ${_tn(sx-sw)} ${_tn(ry)} Z" fill="${_CONE}"/>`;
      s+=`<path d="M${_tn(sx-sw)} ${_tn(ry)} Q ${_tn(sx)} ${_tn(ry+rh*1.7)} ${_tn(sx+sw)} ${_tn(ry)}" fill="none" stroke="${_CONED}" stroke-width="${_tn(0.4*sc)}" opacity="0.7"/>`;
    }
  }
  // 左上鳞片受光
  s+=`<path d="M${_tn(x-w*0.75)} ${_tn(cy+0.3)} Q ${_tn(x-w*0.1)} ${_tn(cy+rh*1.5)} ${_tn(x+w*0.15)} ${_tn(cy+0.3)} Q ${_tn(x-w*0.25)} ${_tn(cy+rh*0.5)} ${_tn(x-w*0.75)} ${_tn(cy+0.3)} Z" fill="${_CONEL}" opacity="0.75"/>`;
  return s;
}

// —— 红松鼠：攀在树干上、抱一颗松果、大尾巴上卷。cx0=树干中线, footY=脚所在高度 ——
// facing 右(1)/左(-1)。松鼠身体贴干侧，头朝上，标志性大蓬尾在背后上卷。
function _squirrel(cx0, footY, sc, facing){
  sc=sc||1; facing=facing||1; const f=facing;
  const bx=_tn(cx0), by=_tn(footY);         // 锚点（腹部贴树干处）
  const U=6.2*sc;                            // 体量单位
  let s=`<g>`;
  // 大蓬尾（在身后，先画→被身体压住根部）：从臀部起，向上卷回成 S
  s+=`<path d="M${_tn(bx - f*U*0.2)} ${_tn(by + U*0.15)} `
    +`C ${_tn(bx - f*U*1.2)} ${_tn(by + U*0.2)} ${_tn(bx - f*U*1.5)} ${_tn(by - U*0.9)} ${_tn(bx - f*U*0.9)} ${_tn(by - U*1.35)} `
    +`C ${_tn(bx - f*U*0.4)} ${_tn(by - U*1.7)} ${_tn(bx + f*U*0.05)} ${_tn(by - U*1.2)} ${_tn(bx - f*U*0.35)} ${_tn(by - U*0.95)} `
    +`C ${_tn(bx - f*U*0.75)} ${_tn(by - U*0.7)} ${_tn(bx - f*U*0.85)} ${_tn(by - U*0.05)} ${_tn(bx - f*U*0.2)} ${_tn(by + U*0.15)} Z" fill="${_SQD}"/>`;
  // 尾巴受光高光条
  s+=`<path d="M${_tn(bx - f*U*1.05)} ${_tn(by - U*0.5)} C ${_tn(bx - f*U*1.15)} ${_tn(by - U*0.95)} ${_tn(bx - f*U*0.8)} ${_tn(by - U*1.25)} ${_tn(bx - f*U*0.6)} ${_tn(by - U*1.1)}" stroke="${_SQL}" stroke-width="${_tn(1.3*sc)}" fill="none" stroke-linecap="round" opacity="0.8"/>`;
  // 身体（坐姿弓背，锈红）
  s+=`<path d="M${_tn(bx)} ${_tn(by)} `
    +`Q ${_tn(bx - f*U*0.55)} ${_tn(by - U*0.1)} ${_tn(bx - f*U*0.5)} ${_tn(by - U*0.75)} `
    +`Q ${_tn(bx - f*U*0.35)} ${_tn(by - U*1.35)} ${_tn(bx + f*U*0.15)} ${_tn(by - U*1.45)} `
    +`Q ${_tn(bx + f*U*0.6)} ${_tn(by - U*1.4)} ${_tn(bx + f*U*0.55)} ${_tn(by - U*0.7)} `
    +`Q ${_tn(bx + f*U*0.5)} ${_tn(by - U*0.05)} ${_tn(bx)} ${_tn(by)} Z" fill="${_SQ}"/>`;
  // 腹部（浅奶油，偏向朝外/受光侧）
  s+=`<path d="M${_tn(bx + f*U*0.18)} ${_tn(by - U*0.08)} `
    +`Q ${_tn(bx + f*U*0.5)} ${_tn(by - U*0.2)} ${_tn(bx + f*U*0.42)} ${_tn(by - U*0.75)} `
    +`Q ${_tn(bx + f*U*0.32)} ${_tn(by - U*1.1)} ${_tn(bx + f*U*0.05)} ${_tn(by - U*1.15)} `
    +`Q ${_tn(bx + f*U*0.1)} ${_tn(by - U*0.6)} ${_tn(bx + f*U*0.18)} ${_tn(by - U*0.08)} Z" fill="${_SQBELLY}"/>`;
  // 头（圆，在身体顶）
  const hx=bx + f*U*0.15, hy=by - U*1.55;
  s+=`<circle cx="${_tn(hx)}" cy="${_tn(hy)}" r="${_tn(U*0.5)}" fill="${_SQ}"/>`;
  // 头顶受光
  s+=`<path d="M${_tn(hx - U*0.35)} ${_tn(hy - U*0.15)} a${_tn(U*0.45)} ${_tn(U*0.45)} 0 0 1 ${_tn(U*0.55)} ${_tn(-U*0.2)}" stroke="${_SQL}" stroke-width="${_tn(1.1*sc)}" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  // 双耳（松鼠尖耳带簇）
  s+=`<path d="M${_tn(hx - U*0.32)} ${_tn(hy - U*0.35)} l ${_tn(-U*0.18)} ${_tn(-U*0.5)} l ${_tn(U*0.35)} ${_tn(U*0.15)} Z" fill="${_SQD}"/>`;
  s+=`<path d="M${_tn(hx + f*U*0.28)} ${_tn(hy - U*0.4)} l ${_tn(U*0.1)} ${_tn(-U*0.5)} l ${_tn(U*0.22)} ${_tn(U*0.3)} Z" fill="${_SQ}"/>`;
  // 眼 + 鼻
  s+=`<circle cx="${_tn(hx + f*U*0.22)}" cy="${_tn(hy - U*0.05)}" r="${_tn(U*0.13)}" fill="${_DARK}"/>`;
  s+=`<circle cx="${_tn(hx + f*U*0.5)}" cy="${_tn(hy + U*0.08)}" r="${_tn(U*0.08)}" fill="${_DARK}"/>`;
  // 抱着的小松果（在胸前）
  s+=_pinecone(hx + f*U*0.15, hy + U*0.5, 0.7*sc).replace(/<line[^>]*>/,''); // 抱着的果无挂柄
  // 前爪（抱住松果）
  s+=`<path d="M${_tn(hx - f*U*0.05)} ${_tn(hy + U*0.55)} q ${_tn(f*U*0.25)} ${_tn(U*0.2)} ${_tn(f*U*0.5)} ${_tn(U*0.05)}" stroke="${_SQD}" stroke-width="${_tn(1.4*sc)}" fill="none" stroke-linecap="round"/>`;
  s+=`</g>`;
  return s;
}

// —— 藏在层间的鸟巢（枝编碗+蛋），塞在某层三角下沿内侧 ——
function _nest(x, y, sc){
  x=_tn(x); y=_tn(y); sc=sc||1;
  const W=8.5*sc, H=6*sc, rim=_tn(y);
  let s=`<g>`;
  // 深碗
  s+=`<path d="M${_tn(x-W)} ${rim} Q ${x} ${_tn(rim+H+2)} ${_tn(x+W)} ${rim} Z" fill="${_NESTD}"/>`;
  // 蛋（露上半）
  const egg=(ex,ey,f)=>`<ellipse cx="${_tn(ex)}" cy="${_tn(ey)}" rx="${_tn(2.3*sc)}" ry="${_tn(2.9*sc)}" fill="${f}"/>`
    +`<ellipse cx="${_tn(ex-0.7*sc)}" cy="${_tn(ey-0.9*sc)}" rx="${_tn(0.7*sc)}" ry="${_tn(1*sc)}" fill="${_EGGL}" opacity="0.85"/>`
    +`<circle cx="${_tn(ex+0.6*sc)}" cy="${_tn(ey+0.3*sc)}" r="${_tn(0.35*sc)}" fill="${_EGGSPOT}" opacity="0.7"/>`;
  s+=egg(x-3.2*sc, rim-0.5*sc, _EGG);
  s+=egg(x+0.2*sc, rim-1.3*sc, _EGGL);
  s+=egg(x+3.3*sc, rim-0.3*sc, '#dccfae');
  // 碗前缘（枝编壁，盖蛋下半）
  s+=`<path d="M${_tn(x-W)} ${rim} Q ${x} ${_tn(rim+H)} ${_tn(x+W)} ${rim} Q ${_tn(x+W*0.72)} ${_tn(rim-2.4*sc)} ${x} ${_tn(rim-1.6*sc)} Q ${_tn(x-W*0.72)} ${_tn(rim-2.4*sc)} ${_tn(x-W)} ${rim} Z" fill="${_NEST}"/>`;
  // 编织纹
  for(let i=-2;i<=2;i++){ const wx=x+i*3*sc;
    s+=`<path d="M${_tn(wx-2*sc)} ${_tn(rim+2*sc)} q ${_tn(2*sc)} ${_tn(1.8*sc)} ${_tn(4*sc)} 0" stroke="${_NESTL}" stroke-width="${_tn(0.75*sc)}" fill="none" opacity="0.75"/>`; }
  s+=`</g>`;
  return s;
}

// —— 猫头鹰：栖于树冠，正面圆胖，大眼盘。x,y=身体中心 ——
function _owl(x, y, sc){
  x=_tn(x); y=_tn(y); sc=sc||1;
  const W=8*sc, H=10*sc;
  let s=`<g>`;
  // 栖枝小爪下的枝
  s+=`<path d="M${_tn(x-W*0.6)} ${_tn(y+H*0.62)} q ${_tn(W*0.6)} ${_tn(1.6*sc)} ${_tn(W*1.2)} 0" stroke="${_CONESTEM}" stroke-width="${_tn(1.4*sc)}" fill="none" stroke-linecap="round"/>`;
  // 身体（卵形，暖灰褐）
  s+=`<ellipse cx="${x}" cy="${y}" rx="${_tn(W)}" ry="${_tn(H)}" fill="${_OWL}"/>`;
  // 左受光
  s+=`<path d="M${_tn(x-W*0.2)} ${_tn(y-H*0.85)} Q ${_tn(x-W*0.95)} ${_tn(y-H*0.4)} ${_tn(x-W*0.75)} ${_tn(y+H*0.4)}" stroke="${_OWLL}" stroke-width="${_tn(1.4*sc)}" fill="none" stroke-linecap="round" opacity="0.7"/>`;
  // 胸腹斑纹（横向短弧几道）
  s+=`<g stroke="${_OWLD}" stroke-width="${_tn(0.6*sc)}" fill="none" opacity="0.55">`
    +`<path d="M${_tn(x-W*0.55)} ${_tn(y+H*0.05)} q ${_tn(W*0.55)} ${_tn(1.6*sc)} ${_tn(W*1.1)} 0"/>`
    +`<path d="M${_tn(x-W*0.5)} ${_tn(y+H*0.3)} q ${_tn(W*0.5)} ${_tn(1.4*sc)} ${_tn(W)} 0"/></g>`;
  // 双翼（收拢，两侧深色）
  s+=`<path d="M${_tn(x-W*0.75)} ${_tn(y-H*0.35)} Q ${_tn(x-W*1.05)} ${_tn(y+H*0.15)} ${_tn(x-W*0.6)} ${_tn(y+H*0.5)}" stroke="${_OWLD}" stroke-width="${_tn(2.4*sc)}" fill="none" stroke-linecap="round"/>`;
  s+=`<path d="M${_tn(x+W*0.75)} ${_tn(y-H*0.35)} Q ${_tn(x+W*1.05)} ${_tn(y+H*0.15)} ${_tn(x+W*0.6)} ${_tn(y+H*0.5)}" stroke="${_OWLD}" stroke-width="${_tn(2.4*sc)}" fill="none" stroke-linecap="round"/>`;
  // 头（与身体连成一体的圆顶）
  s+=`<circle cx="${x}" cy="${_tn(y-H*0.55)}" r="${_tn(W*0.92)}" fill="${_OWL}"/>`;
  // 两簇角羽（猫头鹰标志耳羽）
  s+=`<path d="M${_tn(x-W*0.6)} ${_tn(y-H*1.05)} l ${_tn(-W*0.15)} ${_tn(-H*0.45)} l ${_tn(W*0.5)} ${_tn(H*0.18)} Z" fill="${_OWL}"/>`;
  s+=`<path d="M${_tn(x+W*0.6)} ${_tn(y-H*1.05)} l ${_tn(W*0.15)} ${_tn(-H*0.45)} l ${_tn(-W*0.5)} ${_tn(H*0.18)} Z" fill="${_OWL}"/>`;
  // 面盘（浅色心形）
  s+=`<path d="M${x} ${_tn(y-H*0.02)} Q ${_tn(x-W*0.8)} ${_tn(y-H*0.25)} ${_tn(x-W*0.62)} ${_tn(y-H*0.75)} Q ${_tn(x-W*0.4)} ${_tn(y-H*1.15)} ${x} ${_tn(y-H*0.95)} Q ${_tn(x+W*0.4)} ${_tn(y-H*1.15)} ${_tn(x+W*0.62)} ${_tn(y-H*0.75)} Q ${_tn(x+W*0.8)} ${_tn(y-H*0.25)} ${x} ${_tn(y-H*0.02)} Z" fill="${_OWLL}"/>`;
  // 大眼盘（两只金环黑瞳）
  const eyeY=y-H*0.6, ex=W*0.42, er=W*0.34;
  s+=`<circle cx="${_tn(x-ex)}" cy="${_tn(eyeY)}" r="${_tn(er)}" fill="${_GOLD}"/>`;
  s+=`<circle cx="${_tn(x+ex)}" cy="${_tn(eyeY)}" r="${_tn(er)}" fill="${_GOLD}"/>`;
  s+=`<circle cx="${_tn(x-ex)}" cy="${_tn(eyeY)}" r="${_tn(er*0.55)}" fill="${_DARK}"/>`;
  s+=`<circle cx="${_tn(x+ex)}" cy="${_tn(eyeY)}" r="${_tn(er*0.55)}" fill="${_DARK}"/>`;
  s+=`<circle cx="${_tn(x-ex-er*0.2)}" cy="${_tn(eyeY-er*0.2)}" r="${_tn(er*0.2)}" fill="#fff" opacity="0.9"/>`;
  s+=`<circle cx="${_tn(x+ex-er*0.2)}" cy="${_tn(eyeY-er*0.2)}" r="${_tn(er*0.2)}" fill="#fff" opacity="0.9"/>`;
  // 喙（暖金小三角，两眼之间下方）
  s+=`<path d="M${x} ${_tn(eyeY+er*0.5)} l ${_tn(-1.5*sc)} ${_tn(2.2*sc)} l ${_tn(3*sc)} 0 Z" fill="${_GOLD}"/>`;
  s+=`</g>`;
  return s;
}

// —— 小雀鸟：栖在枝头，青蓝背+奶油腹，朝内。x,y=身体中心 ——
function _songbird(x, y, sc, facing){
  x=_tn(x); y=_tn(y); sc=sc||1; facing=facing||1; const f=facing;
  let s=`<g>`;
  const b=5*sc;
  // 脚
  s+=`<path d="M${_tn(x)} ${_tn(y+b*0.8)} l0 ${_tn(1.8*sc)} M${_tn(x+f*b*0.4)} ${_tn(y+b*0.8)} l0 ${_tn(1.8*sc)}" stroke="${_DARK}" stroke-width="${_tn(0.8*sc)}" stroke-linecap="round"/>`;
  // 尾
  s+=`<path d="M${_tn(x-f*b*0.9)} ${_tn(y+b*0.1)} l ${_tn(-f*b*1)} ${_tn(b*0.2)} l ${_tn(f*b*0.25)} ${_tn(b*0.5)} Z" fill="${_BIRD}"/>`;
  // 身（青蓝，圆胖）
  s+=`<ellipse cx="${x}" cy="${y}" rx="${_tn(b*1.05)}" ry="${_tn(b*0.85)}" fill="${_BIRD}" transform="rotate(${_tn(f*10)} ${x} ${y})"/>`;
  // 奶油腹
  s+=`<ellipse cx="${_tn(x+f*b*0.28)}" cy="${_tn(y+b*0.28)}" rx="${_tn(b*0.55)}" ry="${_tn(b*0.5)}" fill="${_BIRDBELLY}"/>`;
  // 头
  s+=`<circle cx="${_tn(x+f*b*0.85)}" cy="${_tn(y-b*0.5)}" r="${_tn(b*0.6)}" fill="${_BIRD}"/>`;
  // 喙（暖金）
  s+=`<path d="M${_tn(x+f*b*1.4)} ${_tn(y-b*0.55)} l ${_tn(f*b*0.55)} ${_tn(b*0.12)} l ${_tn(-f*b*0.4)} ${_tn(b*0.28)} Z" fill="${_GOLD}"/>`;
  // 眼
  s+=`<circle cx="${_tn(x+f*b*0.95)}" cy="${_tn(y-b*0.6)}" r="${_tn(b*0.16)}" fill="${_DARK}"/>`;
  // 翼
  s+=`<path d="M${_tn(x+f*b*0.1)} ${_tn(y-b*0.2)} q ${_tn(-f*b*0.9)} ${_tn(-b*0.2)} ${_tn(-f*b*1.3)} ${_tn(b*0.45)} q ${_tn(f*b*0.7)} ${_tn(b*0.22)} ${_tn(f*b*1.2)} ${_tn(-b*0.12)} Z" fill="#2f5570"/>`;
  s+=`</g>`;
  return s;
}

// —— 恒定极薄雪：只在最高一层锥尖挂一抹薄霜（四级完全相同，纯氛围）——
function _frostTip(T, tiers){
  const t=T[tiers-1];
  const {tipY}=t; const cx=160;
  let s='';
  // 尖端一小撮柔软薄雪：贴锥尖上两条斜边，很薄
  s+=`<path d="M${_tn(cx)} ${_tn(tipY-1)} `
    +`Q ${_tn(cx-5)} ${_tn(tipY+5)} ${_tn(cx-7)} ${_tn(tipY+9)} `
    +`Q ${_tn(cx-3)} ${_tn(tipY+7)} ${_tn(cx)} ${_tn(tipY+8)} `
    +`Q ${_tn(cx+3)} ${_tn(tipY+7)} ${_tn(cx+7)} ${_tn(tipY+9)} `
    +`Q ${_tn(cx+5)} ${_tn(tipY+5)} ${_tn(cx)} ${_tn(tipY-1)} Z" fill="${_SNOW}"/>`;
  // 高光
  s+=`<path d="M${_tn(cx)} ${_tn(tipY+0.5)} Q ${_tn(cx-3.5)} ${_tn(tipY+4)} ${_tn(cx-4)} ${_tn(tipY+7)} Q ${_tn(cx-1.5)} ${_tn(tipY+5)} ${_tn(cx)} ${_tn(tipY+5.5)} Z" fill="${_SNOWLIT}"/>`;
  return s;
}

// ═════════════ 逐级叠加 ═════════════
function deco_pine(p, level){
  if(level<=0) return {behind:'',front:''};
  const g=_pineGeom(p);
  const {cx,gy,tiers,T,maxW}=g;
  let behind='', front='';

  // （去掉了锥尖那抹薄霜——用户觉得没必要）

  // ——【L1 大树】松果：松树自己的果实，几颗垂挂在中下层枝缝 ——
  // 挂在各层三角下沿角内侧一点（贴较浅背景，读得出）。
  const conePts1 = [
    [T[0].R-5, T[0].ly-1.5, 1.0],
    [T[1].L+5, T[1].ly-1.5, 0.92],
    [T[0].L+7, T[0].ly-1.5, 0.95],
  ];
  conePts1.forEach(c=>{ front += _pinecone(c[0], c[1], c[2]); });

  // ——【L2 巨树】+ 红松鼠攀树干抱松果 + 更多松果 ——
  if(level>=2){
    // 松鼠攀在树干右侧（贴干、脚锚在下层高度），朝上，抱果
    front += _squirrel(cx + 4, gy - g.trunkH*0.4 - 2, 1.0, 1);
    // 更多松果
    front += _pinecone(T[1].R-5, T[1].ly-1.5, 0.9);
    front += _pinecone(T[2] ? T[2].R-5 : T[1].R-9, (T[2]?T[2].ly:T[1].ly)-1.5, 0.88);
  }

  // ——【L3 参天】+ 藏在层间的鸟巢(带蛋) + 更密松果 ——
  if(level>=3){
    // 鸟巢：塞在中上层三角下沿内侧（右侧、贴较浅背景）——放右让出左侧给 L4 猫头鹰
    const nt = T[Math.min(2, tiers-2)];
    front += _nest(nt.L + nt.w*0.66, nt.ly - 1.5, 0.92);
    // 更密松果（层缝左右交错）
    front += _pinecone(T[2] ? T[2].L+5 : T[1].L+9, (T[2]?T[2].ly:T[1].ly)-1.5, 0.88);
    front += _pinecone(T[3] ? T[3].R-4 : T[tiers-1].R-4, (T[3]?T[3].ly:T[tiers-1].ly)-1.5, 0.82);
    front += _pinecone(T[0].R-10, T[0].ly-1.5, 0.9);
  }

  // ——【L4 神木】+ 猫头鹰栖树冠 + 小雀鸟 + 第二只松鼠 —— 住满野林生灵 ——
  if(level>=4){
    // 猫头鹰：栖在较低一层的左侧枝头（左侧亮区、贴浅背景，最抢眼的居民；
    // 与右侧的鸟巢分居两侧、且在其下一层，避免叠压）
    const ot = T[Math.min(1, tiers-2)];
    front += _owl(ot.L + ot.w*0.30, ot.ly - 9, 1.0);
    // 小雀鸟：栖在上层枝头右侧，朝内
    const bt = T[Math.min(3, tiers-1)];
    front += _songbird(bt.R - 5, bt.ly - 6, 0.95, -1);
    // 第二只松鼠：不再挤在树干（会和 L2 那只叠成一坨），改让它蹲在
    // 中层三角的左外沿枝头、朝树心(右)，把「野林生灵」铺散到树身两侧。
    const st = T[Math.min(2, tiers-2)];
    front += _squirrel(st.L + 6, st.ly - 1.5, 0.8, 1);
    // 再添两颗松果，满树结实
    front += _pinecone(T[1].R-9, T[1].ly-1.5, 0.85);
    front += _pinecone(T[0].L+12, T[0].ly-1.5, 0.85);
  }

  return {behind, front};
}
return deco_pine;
})();
  const deco_palm = (function(){
// ===== 椰子树（palm）专属华贵装饰阶梯 =====
// 意象：热带海滨的丰饶与礼庆。全部锚定椰子树自身真实几何：
//   椰冠基部(topX,topY)、树干中线Bézier、椰叶放射方向、地面沙滩。
// 严禁：树干开花 / 跨物种通用弯弧灯串。
// 阶梯（逐级叠加，越高越华丽）：
//   1 大树：椰冠基部一挂「成串饱满椰子」(3~4颗，绳束挂枝) + 树干加深环纹一圈金线
//   2 巨树：+ 一支下垂「椰枣果穗」(米黄花轴+橙红浆果串) + 基部沙丘一枚贝壳
//   3 参天：+ 沿真实椰叶方向的「金亮叶尖」点缀 + 第二挂椰子 + 沙滩海星
//   4 神木：+ 椰叶基部停一只「热带鸟」(锚在上层叶柄) + 更饱满果穗 + 沙滩多贝壳/浪花点

function _tn(x){ return Math.round(x*10)/10; }

// —— 椰子树真实几何（与 tree3-render.js 的 palm3 完全对齐）——
function _palmGeo(p){
  const cx=160, gy=214;
  const h=40+p*112, lean=4+p*6, topX=cx+lean, topY=gy-h;
  const wB=8+p*5, wT=4.5+p*2.5, midX=cx+lean*0.4, midY=(gy+topY)/2;
  // 树干中线二次Bézier控制点：起(cx,gy) 控(midX,midY) 终(topX,topY)
  const P=(t)=>[ (1-t)*(1-t)*cx+2*(1-t)*t*midX+t*t*topX,
                 (1-t)*(1-t)*gy+2*(1-t)*t*midY+t*t*topY ];
  const W=(t)=> wB*(1-t)+wT*t;
  const L=30+p*40;               // 椰叶长度（palm3 同名）
  return {cx,gy,h,lean,topX,topY,wB,wT,midX,midY,P,W,L};
}

// —— 单颗椰子（左上受光的实心椭球，深棕壳+金反光+三点萌芽孔）——
function _coco(x,y,r){
  x=_tn(x); y=_tn(y); r=_tn(r);
  return `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${_tn(r*1.12)}" fill="#7a4a24"/>`
    +`<ellipse cx="${_tn(x-r*0.34)}" cy="${_tn(y-r*0.4)}" rx="${_tn(r*0.5)}" ry="${_tn(r*0.6)}" fill="#9a6636" opacity="0.85"/>`
    +`<ellipse cx="${_tn(x-r*0.5)}" cy="${_tn(y-r*0.55)}" rx="${_tn(r*0.22)}" ry="${_tn(r*0.3)}" fill="#c69152" opacity="0.7"/>`
    +`<ellipse cx="${_tn(x+r*0.4)}" cy="${_tn(y+r*0.45)}" rx="${_tn(r*0.4)}" ry="${_tn(r*0.5)}" fill="#5a3417" opacity="0.55"/>`;
}

// —— 一挂成串椰子：从枝点(ax,ay)垂下一束绳，3~4颗聚拢；金束带点缀 ——
function _cocoBunch(ax,ay,r,big){
  ax=_tn(ax); ay=_tn(ay);
  // 绳束
  let g=`<path d="M${ax} ${ay} q -1.5 ${_tn(r*1.2)} -0.5 ${_tn(r*2)}" stroke="#5a3d22" stroke-width="1.4" fill="none" stroke-linecap="round"/>`
       +`<path d="M${ax} ${ay} q 1.6 ${_tn(r*1.2)} 0.6 ${_tn(r*2)}" stroke="#5a3d22" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  const gy0=ay+r*1.9;
  // 聚拢的椰子（后排先画）
  g+=_coco(ax+r*0.05, gy0+r*0.7, r*1.02);
  g+=_coco(ax-r*0.95, gy0, r);
  g+=_coco(ax+r*0.95, gy0, r);
  if(big) g+=_coco(ax+r*0.02, gy0-r*0.15, r*1.05);
  // 共同暖金束带
  g+=`<path d="M${_tn(ax-r*1.3)} ${_tn(gy0-r*0.2)} q ${_tn(r*1.3)} ${_tn(r*0.7)} ${_tn(r*2.6)} 0" stroke="#e6b24d" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.9"/>`;
  return g;
}

// —— 椰枣果穗：从枝点垂下的米黄花轴 + 两侧密排橙红浆果 ——
function _dateSpadix(ax,ay,len,rich){
  ax=_tn(ax); ay=_tn(ay);
  const bx=ax+2, by=ay+len; // 微微外摆
  // 主花轴
  let g=`<path d="M${ax} ${ay} Q ${_tn(ax+1.5)} ${_tn(ay+len*0.5)} ${_tn(bx)} ${_tn(by)}" stroke="#e8dcae" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const cols=['#e0603f','#d24f30','#ec7a4a'];
  const N=rich?9:6;
  for(let i=0;i<N;i++){
    const t=(i+1)/(N+1);
    const px=ax+(bx-ax)*t + (1.5)*Math.sin(t*Math.PI); // 沿轴微鼓
    const py=ay+len*t;
    const side=(i%2)?1:-1;
    const r=1.8-0.3*Math.abs(t-0.5)*2;
    g+=`<circle cx="${_tn(px+side*2.4)}" cy="${_tn(py)}" r="${_tn(r)}" fill="${cols[i%3]}"/>`;
    g+=`<circle cx="${_tn(px-side*2.2)}" cy="${_tn(py+1.4)}" r="${_tn(r*0.9)}" fill="${cols[(i+1)%3]}"/>`;
    // 高光
    g+=`<circle cx="${_tn(px+side*2.4-0.7)}" cy="${_tn(py-0.7)}" r="0.5" fill="#ffcf9a" opacity="0.8"/>`;
  }
  return g;
}

// —— 沙丘（基部一小抹暖沙，前景）——
function _sandMound(cx,gy,w){
  cx=_tn(cx);
  return `<path d="M${_tn(cx-w)} ${_tn(gy+5)} Q ${cx} ${_tn(gy-4)} ${_tn(cx+w)} ${_tn(gy+5)} L ${_tn(cx+w)} ${_tn(gy+9)} L ${_tn(cx-w)} ${_tn(gy+9)} Z" fill="#ecd39a"/>`
    +`<path d="M${_tn(cx-w)} ${_tn(gy+5)} Q ${cx} ${_tn(gy-4)} ${_tn(cx+w)} ${_tn(gy+5)}" stroke="#f7ecc4" stroke-width="1.6" fill="none" opacity="0.95"/>`
    +`<path d="M${_tn(cx-w*0.2)} ${_tn(gy+1.5)} Q ${_tn(cx+w*0.3)} ${_tn(gy-0.5)} ${_tn(cx+w*0.7)} ${_tn(gy+2.5)}" stroke="#d4b878" stroke-width="0.9" fill="none" opacity="0.7"/>`;
}

// —— 贝壳（扇贝，金脊）——
function _shell(x,y,s,col){
  x=_tn(x); y=_tn(y); s=_tn(s);
  let g=`<path d="M${x} ${_tn(y+s*0.9)} A ${s} ${s} 0 0 1 ${_tn(x-s)} ${_tn(y-s*0.2)} A ${s} ${s} 0 0 1 ${_tn(x+s)} ${_tn(y-s*0.2)} A ${s} ${s} 0 0 1 ${x} ${_tn(y+s*0.9)} Z" fill="${col}"/>`;
  // 顶铰
  g+=`<circle cx="${x}" cy="${_tn(y-s*0.2)}" r="${_tn(s*0.28)}" fill="#c9945a"/>`;
  // 放射金脊
  for(let k=-2;k<=2;k++){ const a=(-Math.PI/2)+k*0.42;
    g+=`<path d="M${x} ${_tn(y-s*0.1)} L ${_tn(x+Math.cos(a)*s*0.85)} ${_tn(y-s*0.1+Math.sin(a)*s*0.85+s*0.55)}" stroke="#e6b24d" stroke-width="0.7" opacity="0.7"/>`; }
  return g;
}

// —— 海星 ——
function _starfish(x,y,s){
  x=_tn(x); y=_tn(y); s=_tn(s);
  let pts='';
  for(let k=0;k<10;k++){ const a=-Math.PI/2+k*Math.PI/5; const rr=(k%2? s*0.42 : s);
    pts+=`${_tn(x+Math.cos(a)*rr)},${_tn(y+Math.sin(a)*rr)} `; }
  return `<polygon points="${pts.trim()}" fill="#e8956b"/>`
    +`<polygon points="${pts.trim()}" fill="#f2b48c" opacity="0.5" transform="translate(-0.6 -0.6)"/>`
    +`<circle cx="${x}" cy="${y}" r="${_tn(s*0.18)}" fill="#c9704a"/>`;
}

// —— 金亮叶尖：严格沿 palm3 那条椰叶的中肋二次Bézier，在叶尖一段染暖金 ——
//    palm3: 端点 ex=topX+cos*L, ey=topY-sin*L*0.7；控制 cx1=topX+cos*L*0.5, cy1=topY-sin*L*0.5-(9+p*6)
function _frondTip(topX,topY,angDeg,L,p){
  const rad=angDeg*Math.PI/180;
  const ctrlX=topX+Math.cos(rad)*L*0.5, ctrlY=topY-Math.sin(rad)*L*0.5-(9+p*6);
  const ex=topX+Math.cos(rad)*L,        ey=topY-Math.sin(rad)*L*0.7;
  // 中肋点 B(t)=(1-t)^2*top + 2(1-t)t*ctrl + t^2*end
  const B=(t)=>[ (1-t)*(1-t)*topX+2*(1-t)*t*ctrlX+t*t*ex,
                 (1-t)*(1-t)*topY+2*(1-t)*t*ctrlY+t*t*ey ];
  // 叶面受光高光:沿中肋一条柔和亮绿(阳光扫过椰叶),从叶基到叶尖渐隐——不是金泡挂灯
  const [mx,my]=B(0.5);
  return `<path d="M${_tn(topX)} ${_tn(topY)} Q ${_tn(mx)} ${_tn(my)} ${_tn(ex)} ${_tn(ey)}" stroke="#9ccf72" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.55"/>`;
}

// —— 热带鸟：停在上层叶柄基部（锚在椰冠附近的一条叶方向的近端）——
function _tropicBird(bx,by){
  bx=_tn(bx); by=_tn(by);
  // 身体（左上受光的青绿/暖腹）
  let g=`<ellipse cx="${bx}" cy="${by}" rx="5" ry="3.6" fill="#2f7d6b"/>`;
  g+=`<ellipse cx="${_tn(bx-1.3)}" cy="${_tn(by-1.1)}" rx="2.6" ry="1.9" fill="#4aa88f" opacity="0.9"/>`;
  g+=`<path d="M${_tn(bx-1)} ${_tn(by+1)} q 3 2 5.6 0.4 q -2.4 2.6 -6 1.2 Z" fill="#f0b24d"/>`; // 暖腹
  // 头
  g+=`<circle cx="${_tn(bx-4)}" cy="${_tn(by-2.4)}" r="2.7" fill="#2f7d6b"/>`;
  g+=`<circle cx="${_tn(bx-4.6)}" cy="${_tn(by-3)}" r="1.1" fill="#57b89e" opacity="0.9"/>`;
  // 喙（橙）
  g+=`<path d="M${_tn(bx-6.4)} ${_tn(by-2.6)} l -3.4 0.8 l 3.2 1.4 Z" fill="#f0902d"/>`;
  g+=`<circle cx="${_tn(bx-4.7)}" cy="${_tn(by-2.7)}" r="0.7" fill="#1c2b28"/>`; // 眼
  // 翼
  g+=`<path d="M${_tn(bx-0.5)} ${_tn(by-1.5)} q 5 -1 7.5 1.5 q -4 0.6 -7 0 Z" fill="#256a5a"/>`;
  // 长尾羽（往右下垂）
  g+=`<path d="M${_tn(bx+4)} ${_tn(by+0.5)} q 6 1 9 5 q -4 -0.5 -8.5 -3 Z" fill="#2f7d6b"/>`;
  g+=`<path d="M${_tn(bx+4)} ${_tn(by+1)} q 5 2 7 5.5" stroke="#f0b24d" stroke-width="1" fill="none" opacity="0.8"/>`;
  // 脚（勾住叶柄）
  g+=`<path d="M${_tn(bx-1)} ${_tn(by+3)} l 0 2.4 M${_tn(bx+1.5)} ${_tn(by+3)} l 0 2.2" stroke="#c97a2a" stroke-width="1" stroke-linecap="round"/>`;
  return g;
}

// ============ 主函数 ============
function deco_palm(p, level){
  const G=_palmGeo(p);
  const {cx,gy,topX,topY,P,W,L}=G;
  let behind='', front='';

  // 椰冠基部两个自然挂点（在冠心两侧下方一点，模拟叶鞘之间垂果）
  const hangL=[topX-6.5, topY+6];
  const hangR=[topX+7,   topY+7];
  // 果实半径随 p 略变，且保证 field(×0.42) 下仍≥~1.7px：这里取树坐标 r≈3.1~3.9
  const cr=3.1+p*0.8;

  // ---- Level ≥1：一挂成串椰子（挂在椰冠基部左侧）+ 树干金线强化 ----
  // 成串椰子挂点在冠基，属于「前景」（垂在树冠之前）
  front += _cocoBunch(hangL[0], hangL[1], cr, false);
  // 树干若干道加深环纹镶一线暖金（锚在树干中线Bézier；behind 让树干覆盖不必要处）
  {
    let rings='';
    for(let i=1;i<=4;i++){ const t=i/5; const [bx,by]=P(t); const w=W(t);
      rings+=`<path d="M${_tn(bx-w/2-0.4)} ${_tn(by)} q ${_tn(w/2+0.4)} 2.2 ${_tn(w+0.8)} 0" stroke="#e6b24d" stroke-width="0.9" fill="none" opacity="0.7"/>`;
    }
    front += rings;
  }

  if(level>=2){
    // ---- Level ≥2：一支下垂椰枣果穗（挂在冠基右侧）+ 基部沙丘 + 一枚贝壳 ----
    front += _dateSpadix(hangR[0], hangR[1], 18+p*10, false);
    // 沙滩气息（基部前景）
    front += _sandMound(cx, gy, 22+p*8);
    front += _shell(cx-14, gy+3, 3.4, '#f4c9d6');
  }

  if(level>=3){
    // ---- Level ≥3：金亮叶尖(锚在真实叶方向) + 第二挂椰子 + 海星 ----
    // 沿 palm3 四条舒展叶(205/158/22/-25)的叶尖点暖金，金尖真正骑在叶片上
    [205,158,22,-25].forEach(a=> { front += _frondTip(topX,topY,a,L,p); });
    // 第二挂椰子，稍靠右下（错位不撞第一挂）
    front += _cocoBunch(topX+2, topY+9, cr*0.92, false);
    // 海星卧沙
    front += _starfish(cx+15, gy+4, 4.2);
    // 果穗再加一颗贝壳（右侧）
    front += _shell(cx+3, gy+5, 3, '#fbe6b0');
  }

  if(level>=4){
    // ---- Level 4（神木）：热带鸟停上层叶柄 + 更饱满果穗 + 浪花沙滩点 ----
    // 鸟锚在左上层叶的中段（沿 120° 叶方向，落在绿叶上、避开深色冠心）
    const brad=124*Math.PI/180;
    const bx=topX+Math.cos(brad)*L*0.6, by=topY-Math.sin(brad)*L*0.7*0.6;
    front += _tropicBird(bx, by);
    // 更饱满的椰枣果穗替补一支（左下再垂一小穗）
    front += _dateSpadix(topX-8, topY+9, 15+p*8, true);
    // 沙滩浪花点 + 多贝壳
    front += _shell(cx+18, gy+2, 2.6, '#f4c9d6');
    front += `<g fill="#ffffff" opacity="0.85"><circle cx="${_tn(cx-24)}" cy="${_tn(gy+6)}" r="1.1"/><circle cx="${_tn(cx-20)}" cy="${_tn(gy+7)}" r="0.8"/><circle cx="${_tn(cx+26)}" cy="${_tn(gy+7)}" r="1"/></g>`;
    // 冠基第一挂椰子升级为更满一束（覆盖式再画一颗托）
    front += _coco(hangL[0]-cr*0.05, hangL[1]+cr*1.75, cr*1.06);
  }

  return {behind, front};
}

// 兼容旧渲染夹具（若被 eval 后用 _decorate 调度）
return deco_palm;
})();
  const deco_cactus = (function(){
// deco_cactus.js —— 沙漠巨人柱(saguaro)专属华贵语汇（重做版）
// 推翻旧「柱身树洞正脸猫头鹰」——那玩意读成一张诡异人脸，彻底删除。
// 现在的沙漠语汇：
//   · 白色沙漠花冠（植物学正确：只开在柱顶 apex 与臂尖 tip 的顶端）
//   · 明确是「鸟」的侧影——仙人掌鹪鹩(cactus wren)侧身停在【手臂顶端】，
//     有喙、有上翘的尾，一眼是鸟；绝不做成洞里正脸。
//   · 基部沙漠地面：暖沙 + 石子 + 小圆桶掌(golden barrel) + 一朵沙漠小花
//   · 暖沙漠余晖：柱身左缘一条暖金缘光 + 远处一点暖日晕
// 逐级(大树→巨树→参天→神木)越来越华丽舒展。
//
// 锚点全部来自 cactus3(160,214,p) 的真实几何：
//   柱身 top=214-(40+p*108), w=22+p*15;  柱顶(cx,top)
//   左臂 ay=top+h*0.36 reach=w*0.62 up=30+p*36 (p>0.42), 臂尖顶中心=(cx-w/2-reach+3+aw/2, ay-up)
//   右臂 ay=top+h*0.54 reach=w*0.55 up=24+p*30 (p>0.72), 臂尖顶中心=(cx+w/2-3+reach-aw/2, ay-up)
function deco_cactus(p, level){
  const _tn = x => Math.round(x*10)/10;
  const cx=160, gy=214;
  const h=40+p*108, w=22+p*15, top=gy-h;
  // —— 与树身函数一致的臂几何 ——
  const Law=w*0.5, Lreach=w*0.62, Lay=top+h*0.36, Lup=30+p*36;
  const LtipX=cx-w/2-Lreach+3 + Law/2, LtipY=Lay-Lup;        // 左臂竖段顶端中心
  const Raw=w*0.44, Rreach=w*0.55, Ray=top+h*0.54, Rup=24+p*30;
  const RtipX=cx+w/2-3+Rreach-Raw/2, RtipY=Ray-Rup;          // 右臂竖段顶端中心
  const apex={x:cx, y:top};                                   // 柱顶中心

  let behind='', front='';

  // ———————————————————————————————————————————————
  // 沙漠花冠：一圈白色花瓣 + 暖金花蕊。植物学正确——柱状仙人掌只在顶端/臂尖成环开花。
  // (bx,by) 花冠中心；r 花冠半径；petals 外圈花朵数。
  function crown(bx,by,r,petals){
    let g=`<g>`;
    // 深绿萼座：让花环像从仙人掌肉里长出而非漂浮
    g+=`<ellipse cx="${_tn(bx)}" cy="${_tn(by+r*0.18)}" rx="${_tn(r*0.92)}" ry="${_tn(r*0.5)}" fill="#3f7642" opacity="0.6"/>`;
    // 外圈每朵：白瓣（左半偏亮）
    for(let i=0;i<petals;i++){
      const a=(i/petals)*Math.PI*2 - Math.PI/2;
      const px=bx+Math.cos(a)*r, py=by+Math.sin(a)*r*0.62 - r*0.16;
      const lit = Math.cos(a)<0;
      const fr=r*0.44;
      g+=`<circle cx="${_tn(px)}" cy="${_tn(py)}" r="${_tn(fr)}" fill="${lit?'#fffef9':'#f3ecdd'}"/>`;
    }
    // 中央顶花：白瓣 + 暖金心
    g+=`<circle cx="${_tn(bx)}" cy="${_tn(by-r*0.16)}" r="${_tn(r*0.52)}" fill="#fffefb"/>`;
    g+=`<circle cx="${_tn(bx)}" cy="${_tn(by-r*0.16)}" r="${_tn(r*0.25)}" fill="#f0b43a"/>`;
    g+=`<circle cx="${_tn(bx-r*0.09)}" cy="${_tn(by-r*0.22)}" r="${_tn(r*0.1)}" fill="#f9d778"/>`;
    g+=`</g>`;
    return g;
  }

  // 单朵克制小花（低等级的顶/臂尖点缀）
  function bud(bx,by,r){
    return `<g><circle cx="${_tn(bx)}" cy="${_tn(by)}" r="${_tn(r)}" fill="#fffdf6"/>`
      +`<circle cx="${_tn(bx-r*0.28)}" cy="${_tn(by-r*0.3)}" r="${_tn(r*0.55)}" fill="#fffefb"/>`
      +`<circle cx="${_tn(bx)}" cy="${_tn(by)}" r="${_tn(r*0.4)}" fill="#f0b43a"/></g>`;
  }

  // ———————————————————————————————————————————————
  // 仙人掌鹪鹩（cactus wren）——纯侧影，站在【臂尖顶端】。
  // 一眼是鸟：短喙朝外、尾上翘、胸腹一抹亮、脚落在臂顶。不做任何正脸/双眼。
  // (footX,footY) = 立足点（臂尖花冠上沿）；dir=+1 朝右 / -1 朝左。
  function wren(footX,footY,dir,sc){
    const D=dir; // 朝向
    const bx=footX, by=footY - 5.4*sc;   // 身体中心高于立足点，给短腿留出落脚
    let g=`<g>`;
    // 尾：从身后上翘（鹪鹩标志性翘尾）
    const tx=bx - D*5.2*sc, ty=by + 0.4*sc;
    g+=`<path d="M${_tn(bx-D*2.6*sc)} ${_tn(by+1.2*sc)} `
       +`Q ${_tn(tx-D*1.5*sc)} ${_tn(ty-1*sc)} ${_tn(tx-D*1.2*sc)} ${_tn(ty-5.4*sc)} `
       +`L ${_tn(tx+D*1.4*sc)} ${_tn(ty-4.2*sc)} `
       +`Q ${_tn(bx-D*1.4*sc)} ${_tn(by-0.4*sc)} ${_tn(bx-D*1.2*sc)} ${_tn(by+1.6*sc)} Z" fill="#8a6a3f"/>`;
    // 身体（棕背，椭圆，略前倾）
    g+=`<ellipse cx="${_tn(bx)}" cy="${_tn(by)}" rx="${_tn(4.6*sc)}" ry="${_tn(3.5*sc)}" fill="#a07a44" transform="rotate(${_tn(-D*12)} ${_tn(bx)} ${_tn(by)})"/>`;
    // 胸腹一抹亮奶白（朝前下方）
    g+=`<ellipse cx="${_tn(bx+D*1.4*sc)}" cy="${_tn(by+1.4*sc)}" rx="${_tn(2.7*sc)}" ry="${_tn(2.4*sc)}" fill="#efe3c9"/>`;
    // 背部受光高光
    g+=`<ellipse cx="${_tn(bx-D*0.6*sc)}" cy="${_tn(by-1.6*sc)}" rx="${_tn(2.4*sc)}" ry="${_tn(1.5*sc)}" fill="#b89058" transform="rotate(${_tn(-D*12)} ${_tn(bx)} ${_tn(by)})"/>`;
    // 头（朝前上方）
    const hx=bx+D*4.4*sc, hy=by-2.4*sc;
    g+=`<circle cx="${_tn(hx)}" cy="${_tn(hy)}" r="${_tn(2.7*sc)}" fill="#9c743f"/>`;
    // 眉纹（鹪鹩白眉，一笔）
    g+=`<path d="M${_tn(hx-D*1.6*sc)} ${_tn(hy-1.3*sc)} q ${_tn(D*2.4*sc)} ${_tn(-0.8*sc)} ${_tn(D*3.4*sc)} ${_tn(0.3*sc)}" stroke="#f2ead6" stroke-width="${_tn(0.9*sc)}" fill="none" stroke-linecap="round"/>`;
    // 侧脸一只小眼（侧影只见一只，不构成正脸）
    g+=`<circle cx="${_tn(hx+D*0.6*sc)}" cy="${_tn(hy-0.2*sc)}" r="${_tn(0.8*sc)}" fill="#241a10"/>`;
    // 短喙（略下弯，明确朝外）
    g+=`<path d="M${_tn(hx+D*2.2*sc)} ${_tn(hy-0.2*sc)} l ${_tn(D*3.4*sc)} ${_tn(1.0*sc)} l ${_tn(-D*3.1*sc)} ${_tn(1.2*sc)} Z" fill="#3a2c18"/>`;
    // 两条短腿落在臂顶（腿别拖太长，站得稳）
    const legTop = by + 2.9*sc, legBot = Math.min(footY, legTop + 2.6*sc);
    g+=`<g stroke="#3a2c18" stroke-width="${_tn(0.9*sc)}" stroke-linecap="round">`
      +`<path d="M${_tn(bx+D*0.6*sc)} ${_tn(legTop)} L ${_tn(bx+D*0.8*sc)} ${_tn(legBot)}"/>`
      +`<path d="M${_tn(bx+D*1.9*sc)} ${_tn(legTop-0.3*sc)} L ${_tn(bx+D*2.1*sc)} ${_tn(legBot)}"/>`
      +`</g>`;
    g+=`</g>`;
    return g;
  }

  // ———————————————————————————————————————————————
  // 沙漠地面伴生：暖沙 + 石子 + 小圆桶掌(golden barrel) + 一朵沙漠小花
  function barrelCactus(bx,by,r){
    let g=`<g>`;
    g+=`<ellipse cx="${_tn(bx)}" cy="${_tn(by)}" rx="${_tn(r)}" ry="${_tn(r*0.9)}" fill="#5f9e57"/>`;
    g+=`<ellipse cx="${_tn(bx-r*0.32)}" cy="${_tn(by-r*0.28)}" rx="${_tn(r*0.42)}" ry="${_tn(r*0.5)}" fill="#74b466"/>`; // 左上受光
    g+=`<ellipse cx="${_tn(bx+r*0.42)}" cy="${_tn(by+r*0.1)}" rx="${_tn(r*0.3)}" ry="${_tn(r*0.55)}" fill="#4c8446" opacity="0.7"/>`;
    for(let i=-1;i<=1;i++){ const xx=bx+i*r*0.5;
      g+=`<line x1="${_tn(xx)}" y1="${_tn(by-r*0.7)}" x2="${_tn(xx)}" y2="${_tn(by+r*0.7)}" stroke="#3f7642" stroke-width="0.7" opacity="0.6"/>`;
    }
    // 顶一朵暖金小花（圆桶掌花开在顶）
    g+=`<circle cx="${_tn(bx)}" cy="${_tn(by-r*0.88)}" r="${_tn(r*0.34)}" fill="#f0b43a"/>`;
    g+=`<circle cx="${_tn(bx-r*0.12)}" cy="${_tn(by-r*0.95)}" r="${_tn(r*0.15)}" fill="#f9d778"/>`;
    g+=`</g>`;
    return g;
  }
  // 沙漠小花（茎+一朵）——扎在沙里
  function sandFlower(bx,gy2,col){
    const fy=gy2-7;
    let g=`<path d="M${_tn(bx)} ${_tn(gy2)} Q ${_tn(bx-1.4)} ${_tn(gy2-4)} ${_tn(bx)} ${_tn(fy+2)}" stroke="#5c9145" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
    for(let k=0;k<5;k++){ const a=k/5*Math.PI*2 - Math.PI/2;
      g+=`<circle cx="${_tn(bx+Math.cos(a)*2.4)}" cy="${_tn(fy+Math.sin(a)*2.4)}" r="1.9" fill="${col}"/>`; }
    return g+`<circle cx="${_tn(bx)}" cy="${_tn(fy)}" r="1.4" fill="#f0b43a"/>`;
  }
  function desertGround(){
    // 大一号暖沙丘底座（L4）
    return `<ellipse cx="${_tn(cx)}" cy="${_tn(gy+6)}" rx="${_tn(w*1.6+18)}" ry="10" fill="#e9d3a8" opacity="0.6"/>`;
  }

  // ———————————————————————————————————————————————
  // 暖沙漠余晖：柱身左缘一条暖金缘光 + 远日晕
  // （分散到 behind 层里逐级加，见下）

  // ============ 逐级叠加 ============
  // L1 大树 ：柱顶一朵小花 + 柱身左缘一抹暖金缘光 + 淡沙。极克制。
  // L2 巨树 ：柱顶小花冠 + 臂尖各一朵白花 + 基部一颗圆桶掌 + 石子 + 沙花一朵。
  // L3 参天 ：柱顶花冠 + 臂尖升花冠 + 一只鹪鹩停右臂尖 + 第二颗圆桶掌 + 远日晕。
  // L4 神木 ：柱顶满环大花冠 + 双臂尖花冠 + 两只鹪鹩(左右臂尖) + 三颗多肉 + 沙丘 + 沙花 + 全暖光。

  // —— 背景层（树身之前）：缘光 / 沙 / 日晕 ——
  // 柱身左缘暖金缘光（逐级更亮）
  const glowW = level>=4?2.4 : level>=3?2.0 : level>=2?1.7 : 1.4;
  const glowOp= level>=4?0.55: level>=3?0.5 : level>=2?0.42: 0.36;
  behind+=`<path d="M${_tn(cx-w*0.55)} ${_tn(top+w*0.5)} L ${_tn(cx-w*0.55)} ${_tn(gy-8)}" stroke="#f6e2a8" stroke-width="${glowW}" stroke-linecap="round" opacity="${glowOp}"/>`;
  // 地面淡沙一抹
  if(level<4){ behind+=`<ellipse cx="${_tn(cx)}" cy="${_tn(gy+6)}" rx="${_tn(w*1.15+8)}" ry="7" fill="#e9d3a8" opacity="${level>=2?0.5:0.4}"/>`; }
  else { behind+=desertGround(); }
  // 石子
  if(level>=2){ behind+=`<g fill="#c9a978"><ellipse cx="${_tn(cx-w*1.2-6)}" cy="${_tn(gy+7)}" rx="4.2" ry="2.4"/><ellipse cx="${_tn(cx+w*1.1+4)}" cy="${_tn(gy+8)}" rx="3.4" ry="2"/></g>`; }
  if(level>=4){ behind+=`<ellipse cx="${_tn(cx-w*1.2-6)}" cy="${_tn(gy+8)}" rx="4.2" ry="1.2" fill="#a98a5c" opacity="0.7"/><ellipse cx="${_tn(cx+w*0.6)}" cy="${_tn(gy+9)}" rx="3" ry="1.7" fill="#c9a978"/>`; }
  // 远处一点暖日晕
  if(level>=3){ behind+=`<circle cx="${_tn(cx-w*1.9)}" cy="${_tn(top+h*0.12)}" r="${level>=4?11:10}" fill="#f7d797" opacity="${level>=4?0.3:0.26}"/>`; }

  // —— 前景层（树身之后） ——
  // 柱顶花冠：逐级增大加瓣
  if(level>=1 && level<2){ front+=bud(apex.x, apex.y-2, 4.2); }   // 一朵
  if(level===2){ front+=crown(apex.x, apex.y, 8, 5); }            // 小花冠
  if(level===3){ front+=crown(apex.x, apex.y, 10, 6); }           // 花冠
  if(level>=4){ front+=crown(apex.x, apex.y-1, 12.5, 8); }        // 满环大花冠

  // 左臂尖花（p>0.42 才有臂）
  if(p>0.42){
    if(level===2){ front+=bud(LtipX, LtipY-1, 4); }
    if(level===3){ front+=crown(LtipX, LtipY+1, 8.5, 5); }
    if(level>=4){ front+=crown(LtipX, LtipY, 10, 6); }
  }
  // 右臂尖花（p>0.72 才有臂）
  if(p>0.72){
    if(level===2){ front+=bud(RtipX, RtipY-1, 3.6); }
    if(level===3){ front+=crown(RtipX, RtipY+1, 8, 5); }
    if(level>=4){ front+=crown(RtipX, RtipY, 9.5, 6); }
  }

  // 鹪鹩：L3 一只停右臂尖（朝左，回望柱身）；L4 再加一只停左臂尖（朝右）。
  // 若没有对应臂，退而停在柱顶花冠旁。
  if(level>=3){
    if(p>0.72){ front+=wren(RtipX, RtipY-6, -1, 1.0); }        // 站右臂尖花冠上沿
    else if(p>0.42){ front+=wren(LtipX, LtipY-6, +1, 1.0); }   // 无右臂→站左臂
    else { front+=wren(apex.x+w*0.4, apex.y-2, -1, 0.9); }     // 无臂→柱顶旁
  }
  if(level>=4 && p>0.42){ front+=wren(LtipX, LtipY-6.5, +1, 0.95); } // 左臂尖再来一只朝右

  // 基部伴生多肉：L2 一颗、L3 两颗、L4 三颗丛
  if(level>=2){ front+=barrelCactus(cx-w*1.15-4, gy-4, 6.5); }
  if(level>=3){ front+=barrelCactus(cx+w*1.05+2, gy-3, 5); }
  if(level>=4){ front+=barrelCactus(cx-w*0.7-2, gy-2, 4); }

  // 沙漠小花：L2 一朵、L4 再一朵
  if(level>=2){ front+=sandFlower(cx+w*1.25+6, gy-2, '#ec7fb0'); }
  if(level>=4){ front+=sandFlower(cx-w*1.5-4, gy-1, '#e0a24a'); }

  return {behind, front};
}
return deco_cactus;
})();
  function _sakuraFall(){
  const P=[[100,70,5.6,0],[130,58,6.6,1.6],[160,66,5.2,2.8],[190,60,7.2,0.9],[214,74,6.2,3.6],
           [112,92,7.6,2.1],[146,104,5.6,4.2],[178,96,6.9,1.2],[206,90,6.1,3.1],[126,116,7.1,5.2],[196,112,6.5,4.7]];
  return `<g>`+P.map(([x,y,dur,dl],i)=>{
    const sway=(2.6+(i%4)*0.45).toFixed(1), spin=(3.0+(i%5)*0.7).toFixed(1);
    const col=i%3===0?'#fbd6e4':(i%3===1?'#f4b6cf':'#ffe9f1');
    // 花瓣:小水滴/瓣形,画在原点,靠 pfr 自转
    return `<g class="pf" style="animation-duration:${dur}s;animation-delay:-${dl}s">`
      +`<g class="pfw" style="animation-duration:${sway}s">`
      +`<g class="pfr" style="animation-duration:${spin}s;animation-delay:-${(dl*0.7).toFixed(1)}s">`
      +`<path d="M${x} ${y-3.2} C ${x+3.4} ${y-1.6} ${x+2} ${y+3} ${x} ${y+3.4} C ${x-2} ${y+3} ${x-3.4} ${y-1.6} ${x} ${y-3.2} Z" fill="${col}"/>`
      +`<path d="M${x} ${y-3.2} C ${x+1.6} ${y-1} ${x+1} ${y+1.6} ${x} ${y+3.4}" fill="none" stroke="#e893b4" stroke-width="0.5" opacity="0.5"/>`
      +`</g></g></g>`;
  }).join('')+`</g>`;
}
  function _decorate(type, p, level){ if(level<=0) return {behind:'',front:''}; const f={oak:deco_oak,sakura:deco_sakura,pine:deco_pine,palm:deco_palm,cactus:deco_cactus}[type]; return f ? f(p,level) : {behind:'',front:''}; }

  function _treeBody(type, p){
    if (p < 0.10) return _tSprout(160, 214, p);
    if (type === 'pine') return _tPine(160, 214, p);
    if (type === 'sakura') return _tBroad(160, 214, p, _tPAL.sakura);
    if (type === 'palm') return _tPalm(160, 214, p);
    if (type === 'cactus') return _tCactus(160, 214, p);
    return _tBroad(160, 214, p, _tPAL.oak);
  }
  function buildTreeSvg(treeType, progress, value, noPetals) {
    progress = Math.max(0, Math.min(1, progress));
    const cx = 160, gy = 214, p = progress;
    const spread = 24 + p * 60;
    const body = _treeBody(treeType, p);
    // 装饰：value 决定等级；生长中(舞台)接近完成才整体淡入
    let deco = { behind:'', front:'' }, dop = 1;
    if (typeof value === 'number' && value > 0 && p >= 0.10) {
      const lvl = _decoLevel(value);
      dop = p >= 0.85 ? 1 : (p >= 0.6 ? (p-0.6)/0.25 : 0);
      if (lvl > 0 && dop > 0) deco = _decorate(treeType, p, lvl);
    }
    const wrapB = deco.behind && dop > 0 ? `<g opacity="${_tn(dop)}">${deco.behind}</g>` : '';
    const wrapF = deco.front && dop > 0 ? `<g opacity="${_tn(dop)}">${deco.front}</g>` : '';
    const petals = (!noPetals && treeType === 'sakura' && p >= 0.5) ? _sakuraFall() : '';
    return `<svg class="tree-svg" viewBox="0 0 320 240"><g class="tree-sway" style="animation-delay:-2.1s">${wrapB}${_tGround(cx, gy, spread, treeType)}${body}${wrapF}</g>${petals}</svg>`;
  }

  function durationToTier(min) {
    if (min < 20) return 1;       // 幼苗
    if (min < 40) return 2;       // 成树
    if (min < 70) return 3;       // 大树
    return 4;                     // 巨树（带装饰）
  }
  const TIER_NAME = { 1: '幼苗', 2: '成树', 3: '大树', 4: '巨树' };

  function buildFieldTreeSvg(type, tier, dead, value) {
    if (dead) {
      // 枯萎树：所有 tier 都画成枯枝形态
      return `<svg viewBox="0 0 100 100">
        <ellipse cx="50" cy="92" rx="20" ry="3.5" fill="#7a6248" opacity="0.35"/>
        <path d="M50 88 L50 60 M50 75 L42 65 M50 70 L57 60 M50 65 L45 55" stroke="#7a6248" stroke-width="2.2" stroke-linecap="round" fill="none"/>
        <circle cx="42" cy="64" r="1.5" fill="#7a6248"/>
        <circle cx="57" cy="59" r="1.5" fill="#7a6248"/>
      </svg>`;
    }

    // 复用生长树渲染器：tier → 生长进度，等比缩放进 100×100 田格，与舞台上的树同款
    const p = tier >= 4 ? 1.0 : tier === 3 ? 0.78 : tier === 2 ? 0.55 : 0.34;
    const cx = 160, gy = 214, s = 0.42, tx = 50 - cx * s, ty = 92 - gy * s;
    const body = _treeBody(type, p);
    const shadow = `<ellipse cx="${cx}" cy="${_tn(gy+7)}" rx="${_tn(30+p*40)}" ry="${_tn(6+p*4)}" fill="rgba(0,0,0,0.14)"/>`;
    const lvl = typeof value === 'number' ? _decoLevel(value) : 0;   // 高级树带装饰
    const deco = lvl > 0 ? _decorate(type, p, lvl) : { behind:'', front:'' };
    // 田地每棵按 value 派生错峰的微风轻摆(确定性→预览与线上一致)
    const _sv = (typeof value === 'number' && value > 0) ? value : (tier * 37 + 11);
    const swd = (5.2 + ((_sv * 7) % 30) / 30 * 2).toFixed(1);
    const swdl = ((_sv * 0.17) % 6).toFixed(1);
    return `<svg class="tree-svg" viewBox="0 0 100 100"><g transform="translate(${_tn(tx)} ${_tn(ty)}) scale(${s})"><g class="tree-sway" style="animation-duration:${swd}s;animation-delay:-${swdl}s">${deco.behind}${shadow}${body}${deco.front}</g></g></svg>`;
  }


  return Object.freeze({ _themeScene, _themeThumb, buildTreeSvg, durationToTier, buildFieldTreeSvg, _gradeName, _decoLevel });
});
