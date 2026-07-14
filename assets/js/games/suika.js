(function () {
  'use strict';
  if (typeof Matter === 'undefined') {
    document.getElementById('game-canvas').replaceWith(
      Object.assign(document.createElement('div'), {
        innerHTML: '<div style="padding:3rem;text-align:center;color:#b07c75;">⚠️ Matter.js 物理引擎加载失败，需要联网才能玩。</div>'
      })
    );
    return;
  }

  const HIGH_KEY = 'tool.suika.highscore.v1';
  const MELONS_KEY = 'tool.suika.melons.v1';
  const PHYSICS_KEY = 'tool.suika.physics.v1';
  const CHAIN_KEY = 'tool.suika.chain.v1';
  const NICK_KEY = 'tool.suika.nick.v1';
  const DEVICE_KEY = 'tool.suika.did.v1';
  const GAMEMODE_KEY = 'tool.suika.gameMode.v1';

  // ============ 物理常量（集中管理，调参入口） ============
  // 把散落在文件各处的物理魔法数集中到这里：以后想调手感（更弹、更滑、更慢落）
  // 只在这一个对象里改，不用 grep 全文。新增物理参数也优先放这里。
  const PC = {
    // Matter.js solver iterations
    positionIterations: 16,
    velocityIterations: 10,
    constraintIterations: 4,

    // 墙体
    wallThickness: 16,
    wallFriction: 0.4,

    // 生成 & 危险线
    spawnY: 50,
    dangerY: 100,
    spawnQueueLen: 5,

    // 水果刚体默认物理属性
    fruitFriction: 0.35,
    fruitFrictionStatic: 0.5,
    fruitFrictionAir: 0.008,
    fruitDensity: 0.0015,
    fruitSlop: 0.05,

    // 悬浮水果键盘操控
    hoverAccel: 0.0018,
    hoverMaxVx: 0.45,
    hoverFriction: 0.0040,
    hoverMargin: 4,

    // 速度钳制 & 静止检测（tick 内 sub-stepping 用）
    maxVel: 22,
    restVel: 0.15,
    restOmega: 0.02,
    supportMargin: 1.5,
    subStepTargetMs: 18,
    maxSubSteps: 4,

    // 合并物理
    mergePopVelBase: -3.5,
    mergePopVelPerLevel: 0.4,
    mergePushRangeMultiplier: 2.2,
    mergePushStrengthBase: 0.008,
    mergePushStrengthPerLevel: 0.0017,

    // 物理映射默认值（PHYSICS slider 的基底 + 量程）
    defaultRestitutionBase: 0.05,
    defaultRestitutionRange: 0.55,
    defaultExplosionBase: 0.5,
    defaultExplosionRange: 1.3,
    defaultGravityBase: 0.0008,
    defaultGravityRange: 0.0014,
    defaultMergeTolBase: 1.02,
    defaultMergeTolRange: 0.13,
    defaultTremorAmp: 0.014,
    defaultTremorShakeBase: 5,
    defaultTremorShakeRange: 13,

    // 喷泉 / 试玩
    fountainMaxMs: 5000,
    trialDrops: 10,
  };

  // ============ 游戏模式 ============
  // 竞技层（锁死物理、人人同参数、各自独立榜）：
  //   basic(经典)     - 标准物理 · 禁喷泉。主榜。
  //   fountain(喷泉)  - 标准物理 · 5s 长按 + 1s 冷却。
  //   earthquake(地震)- 标准物理 + 持续地震扰动。
  // 自由层（不排名）：
  //   free(自由)      - 随便调参 + 无限暗号 + 续局。只存本地个人最高分。
  // 竞技局中途输 unlimited 暗号 → unlimitedMode → 本局转自由（跳过限制、不计入竞技榜）。
  // 模式两层：竞技（锁死参数、各自独立榜、人人同物理）+ 自由（可调参、无限暗号、只存本地最高、不排名）。
  // 内部 id 保留 basic/fountain 以复用旧榜数据；earthquake 新增竞技榜；free 取代旧 unlimited（不再上传后端）。
  const VALID_GAME_MODES = ['basic', 'fountain', 'earthquake', 'free'];
  // 每个模式的规范定义。竞技模式 physics 写死、玩家改不了；free 的 physics=null → 用玩家自己存的可调参数。
  // mergeGapCapPx：合并「跨缝」的绝对像素上限（治大果幻影合并）；竞技锁 4px，自由不封顶（滑条完全生效）。
  const MODE_PRESETS = {
    basic:      { label: '经典', emoji: '🎯', ranked: true,  fountain: false, physics: { bounce: 0.5, explosion: 0.5, gravity: 0.5, stickiness: 0.5, tremor: 0   }, mergeGapCapPx: 4 },
    fountain:   { label: '喷泉', emoji: '🚿', ranked: true,  fountain: true,  physics: { bounce: 0.5, explosion: 0.5, gravity: 0.5, stickiness: 0.5, tremor: 0   }, mergeGapCapPx: 4 },
    earthquake: { label: '地震', emoji: '🌋', ranked: true,  fountain: false, physics: { bounce: 0.5, explosion: 0.5, gravity: 0.5, stickiness: 0.5, tremor: 0.5 }, mergeGapCapPx: 4 },
    free:       { label: '自由', emoji: '♾',  ranked: false, fountain: true,  physics: null, mergeGapCapPx: Infinity },
  };
  function loadGameMode() {
    let v = localStorage.getItem(GAMEMODE_KEY);
    if (v === 'unlimited') v = 'free';    // 旧「尽兴」偏好迁移到「自由」
    return VALID_GAME_MODES.includes(v) ? v : 'basic';
  }
  let gameMode = loadGameMode();
  function currentPreset() { return MODE_PRESETS[gameMode] || MODE_PRESETS.basic; }
  function isRankedMode() { return currentPreset().ranked; }

  // 排行榜后端（zircon-urge Vercel + Upstash Redis）。
  // 灭火开关：把 LEADERBOARD_ENABLED 改成 false 后 push，前端立即回到纯本地模式。
  const LEADERBOARD_API = 'https://zircon-urge.fly.dev/api/suika';
  const LEADERBOARD_ENABLED = true;
  // 后端 nick 校验：2-12 codepoint，正则与服务端保持一致。
  const NICK_REJECT_RE = /[<>&"'\/\\\x00-\x1F​-‏﻿‪-‮]/;

  // PHYSICS = 「自由模式」的可调参数（持久化到 localStorage）。竞技模式绝不改它。
  // shakeView（护眼）/ canvasSize（屏幕舒适）不算竞技公平项，任何模式都跟随 PHYSICS。
  const PHYSICS = { bounce: 0.5, explosion: 0.5, gravity: 0.5, stickiness: 0.5, tremor: 0, shakeView: true, canvasSize: 'medium' };
  // activePhysics = 本局真正生效的 5 个物理量。竞技模式=该模式写死的预设；自由模式=PHYSICS 的当前值。
  // mapPhysics 读它，所以切模式只需 syncActivePhysics() 一次，全局立即改用新参数。
  let activePhysics = { bounce: 0.5, explosion: 0.5, gravity: 0.5, stickiness: 0.5, tremor: 0 };
  function syncActivePhysics() {
    const p = currentPreset();
    const src = (p.ranked && p.physics) ? p.physics : PHYSICS;   // 竞技用预设，自由用玩家参数
    activePhysics = {
      bounce: src.bounce, explosion: src.explosion, gravity: src.gravity,
      stickiness: src.stickiness, tremor: src.tremor,
    };
  }
  function mapPhysics() {
    const A = activePhysics;
    return {
      // 回弹：0-1 → 0.05-0.60
      restitution: PC.defaultRestitutionBase + A.bounce * PC.defaultRestitutionRange,
      // 合并爆炸：0-1 → 0.5x-1.8x（基础推力的乘数）
      explosionMult: PC.defaultExplosionBase + A.explosion * PC.defaultExplosionRange,
      // 重力：0-1 → 0.0008-0.0022
      gravityScale: PC.defaultGravityBase + A.gravity * PC.defaultGravityRange,
      // 合并粘性：0-1 → 1.02-1.15（合并触发距离倍率，实际再受 mergeGapCapPx 封顶）
      mergeTolerance: PC.defaultMergeTolBase + A.stickiness * PC.defaultMergeTolRange,
      // 地震：tremor=0 关，tremor=1 平均每 500ms 触发一次大扰动
      tremorIntervalMs: A.tremor > 0 ? 500 / A.tremor : Infinity,
      tremorAmplitude: PC.defaultTremorAmp * A.tremor,
      tremorShakePx: PC.defaultTremorShakeBase + A.tremor * PC.defaultTremorShakeRange,
    };
  }
  function loadPhysics() {
    try {
      const raw = localStorage.getItem(PHYSICS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        ['bounce', 'explosion', 'gravity', 'stickiness', 'tremor'].forEach(k => {
          if (typeof p[k] === 'number') PHYSICS[k] = Math.max(0, Math.min(1, p[k]));
        });
        if (typeof p.shakeView === 'boolean') PHYSICS.shakeView = p.shakeView;
        if (typeof p.canvasSize === 'string' && CANVAS_SIZES[p.canvasSize]) {
          PHYSICS.canvasSize = p.canvasSize;
        }
      }
    } catch (e) {}
  }
  function savePhysics() {
    try { localStorage.setItem(PHYSICS_KEY, JSON.stringify(PHYSICS)); } catch (e) {}
  }
  // 改了参数立即应用：重力是 engine 全局；restitution 是 body 属性，每个已有水果都更新一遍
  function applyPhysicsLive() {
    if (!engine) return;
    const m = mapPhysics();
    // 重力：默认走 mapPhysics 的滑条值；gravity 暗号期间反转。
    // 注意：tick 里每帧也调一次 applyPhysicsLive（见后面），所以暗号过期能自动恢复。
    const reversed = performance.now() < gravityReversalUntil;
    engine.gravity.scale = reversed ? -m.gravityScale : m.gravityScale;
    Composite.allBodies(world).forEach(b => {
      if (b.fruitLevel) b.restitution = m.restitution;
    });
    // explosionMult 和 mergeTolerance 在 mergeFruits / checkProximityMerges 里 on-demand 读
  }

  function describeBounce(v) {
    if (v < 0.2) return '微弹';
    if (v < 0.4) return '弱弹';
    if (v < 0.6) return '中等';
    if (v < 0.8) return '强弹';
    return '跳跳球';
  }
  function describeExplosion(v) {
    if (v < 0.2) return '温柔';
    if (v < 0.4) return '轻爆';
    if (v < 0.6) return '中等';
    if (v < 0.8) return '强力';
    return '核爆';
  }
  function describeGravity(v) {
    if (v < 0.2) return '羽毛';
    if (v < 0.4) return '缓降';
    if (v < 0.6) return '中等';
    if (v < 0.8) return '快坠';
    return '重力炸弹';
  }
  function describeStickiness(v) {
    if (v < 0.2) return '极挑剔';
    if (v < 0.4) return '精准';
    if (v < 0.6) return '标准';
    if (v < 0.8) return '宽容';
    return '靠近就合';
  }
  function describeTremor(v) {
    if (v === 0) return '关闭';
    if (v < 0.2) return '微震';
    if (v < 0.4) return '小震';
    if (v < 0.6) return '中震';
    if (v < 0.8) return '强震';
    return '末日';
  }

  // ============ 水果定义（11 级） ============
  // codepoint 对应 Twemoji PNG 文件名（统一图源，跨平台一致）
  const FRUITS = [
    { lv: 1,  name: '樱桃',   emoji: '🍒', cp: '1f352', radius: 13, color: '#e84118', score: 1   },
    { lv: 2,  name: '草莓',   emoji: '🍓', cp: '1f353', radius: 17, color: '#ff7675', score: 4   },
    { lv: 3,  name: '葡萄',   emoji: '🍇', cp: '1f347', radius: 23, color: '#8e44ad', score: 9   },
    { lv: 4,  name: '橘子',   emoji: '🍊', cp: '1f34a', radius: 30, color: '#f39c12', score: 16  },
    { lv: 5,  name: '柿子',   emoji: '🍅', cp: '1f345', radius: 38, color: '#e67e22', score: 25  },
    { lv: 6,  name: '苹果',   emoji: '🍎', cp: '1f34e', radius: 47, color: '#e74c3c', score: 36  },
    { lv: 7,  name: '梨',     emoji: '🍐', cp: '1f350', radius: 56, color: '#7bed9f', score: 49  },
    { lv: 8,  name: '桃',     emoji: '🍑', cp: '1f351', radius: 65, color: '#fab1a0', score: 64  },
    { lv: 9,  name: '菠萝',   emoji: '🍍', cp: '1f34d', radius: 74, color: '#feca57', score: 81  },
    { lv: 10, name: '哈密瓜', emoji: '🍈', cp: '1f348', radius: 84, color: '#a8e6cf', score: 100 },
    { lv: 11, name: '西瓜',   emoji: '🍉', cp: '1f349', radius: 96, color: '#27ae60', score: 121 },
  ];

  // ============ 表情库（合成链可自定义替换） ============
  // 用户在调参面板里可以把任意 slot 换成下面任意一个表情；半径/分数不变，
  // 只换 emoji 字符 / 中文名 / 底色渐变。颜色是手挑的视觉近似，仅用于绘制
  // 圆背景 — 即使有 emoji 跟主体不太像也是可控的。
  const EMOJI_LIBRARY = [
    // 默认链中的水果
    { cp: '1f352', emoji: '🍒', name: '樱桃',     color: '#e84118' },
    { cp: '1f353', emoji: '🍓', name: '草莓',     color: '#ff7675' },
    { cp: '1f347', emoji: '🍇', name: '葡萄',     color: '#8e44ad' },
    { cp: '1f34a', emoji: '🍊', name: '橘子',     color: '#f39c12' },
    { cp: '1f345', emoji: '🍅', name: '柿子',     color: '#e67e22' },
    { cp: '1f34e', emoji: '🍎', name: '苹果',     color: '#e74c3c' },
    { cp: '1f350', emoji: '🍐', name: '梨',       color: '#7bed9f' },
    { cp: '1f351', emoji: '🍑', name: '桃',       color: '#fab1a0' },
    { cp: '1f34d', emoji: '🍍', name: '菠萝',     color: '#feca57' },
    { cp: '1f348', emoji: '🍈', name: '哈密瓜',   color: '#a8e6cf' },
    { cp: '1f349', emoji: '🍉', name: '西瓜',     color: '#27ae60' },
    // 其他水果
    { cp: '1f34f', emoji: '🍏', name: '青苹果',   color: '#52d97e' },
    { cp: '1f34c', emoji: '🍌', name: '香蕉',     color: '#f1c40f' },
    { cp: '1f95d', emoji: '🥝', name: '猕猴桃',   color: '#8c6e3a' },
    { cp: '1f96d', emoji: '🥭', name: '芒果',     color: '#ff9f43' },
    { cp: '1f965', emoji: '🥥', name: '椰子',     color: '#a87c5b' },
    { cp: '1f951', emoji: '🥑', name: '牛油果',   color: '#67762f' },
    { cp: '1f34b', emoji: '🍋', name: '柠檬',     color: '#f7d716' },
    // 蔬菜
    { cp: '1f955', emoji: '🥕', name: '胡萝卜',   color: '#e88f3a' },
    { cp: '1f33d', emoji: '🌽', name: '玉米',     color: '#f1c40f' },
    { cp: '1f346', emoji: '🍆', name: '茄子',     color: '#7d3c98' },
    { cp: '1f954', emoji: '🥔', name: '土豆',     color: '#b08968' },
    { cp: '1f952', emoji: '🥒', name: '黄瓜',     color: '#52b788' },
    { cp: '1f9c4', emoji: '🧄', name: '大蒜',     color: '#f3d2c1' },
    { cp: '1f9c5', emoji: '🧅', name: '洋葱',     color: '#d4a373' },
    // 甜点
    { cp: '1f369', emoji: '🍩', name: '甜甜圈',   color: '#deb887' },
    { cp: '1f9c1', emoji: '🧁', name: '杯子蛋糕', color: '#f4a6c5' },
    { cp: '1f370', emoji: '🍰', name: '蛋糕',     color: '#fec8d8' },
    { cp: '1f36a', emoji: '🍪', name: '饼干',     color: '#c69c6d' },
    { cp: '1f366', emoji: '🍦', name: '冰淇淋',   color: '#ffe4b5' },
    { cp: '1f36b', emoji: '🍫', name: '巧克力',   color: '#6b3e2e' },
    { cp: '1f36c', emoji: '🍬', name: '糖果',     color: '#ff6b9d' },
    { cp: '1f36d', emoji: '🍭', name: '棒棒糖',   color: '#ff85c1' },
    // 动物
    { cp: '1f436', emoji: '🐶', name: '小狗',     color: '#d4a373' },
    { cp: '1f431', emoji: '🐱', name: '小猫',     color: '#fcbf49' },
    { cp: '1f43b', emoji: '🐻', name: '熊',       color: '#8b5a2b' },
    { cp: '1f43c', emoji: '🐼', name: '熊猫',     color: '#e6e6e6' },
    { cp: '1f42f', emoji: '🐯', name: '虎',       color: '#f9a826' },
    { cp: '1f981', emoji: '🦁', name: '狮子',     color: '#e9b94a' },
    { cp: '1f438', emoji: '🐸', name: '青蛙',     color: '#52d97e' },
    { cp: '1f435', emoji: '🐵', name: '猴子',     color: '#a0522d' },
    { cp: '1f427', emoji: '🐧', name: '企鹅',     color: '#2c3e50' },
    { cp: '1f984', emoji: '🦄', name: '独角兽',   color: '#dda0dd' },
    // 球类 / 天体 / 节日
    { cp: '26bd',  emoji: '⚽', name: '足球',     color: '#2c3e50' },
    { cp: '1f3c0', emoji: '🏀', name: '篮球',     color: '#e67e22' },
    { cp: '26be',  emoji: '⚾', name: '棒球',     color: '#ecf0f1' },
    { cp: '1f3be', emoji: '🎾', name: '网球',     color: '#c0fa3b' },
    { cp: '1f315', emoji: '🌕', name: '满月',     color: '#f1c40f' },
    { cp: '2b50',  emoji: '⭐', name: '星星',     color: '#f1c40f' },
    { cp: '1f31f', emoji: '🌟', name: '亮星',     color: '#f9d71c' },
    { cp: '1f383', emoji: '🎃', name: '南瓜灯',   color: '#e67e22' },
    // 人脸表情（按用户提供的顺序，跳过 ZWJ 序列：🙂‍↕️ 🙂‍↔️ 😶‍🌫️）
    { cp: '1f600', emoji: '😀', name: '咧嘴笑',     color: '#fbc02d' },
    { cp: '1f979', emoji: '🥹', name: '感动',       color: '#fbc02d' },
    { cp: '263a',  emoji: '☺️', name: '微笑',       color: '#fbc02d' },
    { cp: '1f609', emoji: '😉', name: '眨眼',       color: '#fbc02d' },
    { cp: '1f617', emoji: '😗', name: '亲',         color: '#f4a6c5' },
    { cp: '1f61d', emoji: '😝', name: '挑衅',       color: '#fbc02d' },
    { cp: '1f913', emoji: '🤓', name: '书呆子',     color: '#fbc02d' },
    { cp: '1f60f', emoji: '😏', name: '坏笑',       color: '#fbc02d' },
    { cp: '1f60e', emoji: '😎', name: '酷',         color: '#fbc02d' },
    { cp: '1f61c', emoji: '😜', name: '调皮',       color: '#fbc02d' },
    { cp: '1f619', emoji: '😙', name: '微笑亲',     color: '#f4a6c5' },
    { cp: '1f60c', emoji: '😌', name: '心满意足',   color: '#fbc02d' },
    { cp: '1f60a', emoji: '😊', name: '害羞笑',     color: '#fbc02d' },
    { cp: '1f605', emoji: '😅', name: '尴尬笑',     color: '#fbc02d' },
    { cp: '1f603', emoji: '😃', name: '张嘴笑',     color: '#fbc02d' },
    { cp: '1f604', emoji: '😄', name: '眯眼笑',     color: '#fbc02d' },
    { cp: '1f602', emoji: '😂', name: '笑哭',       color: '#fbc02d' },
    { cp: '1f607', emoji: '😇', name: '天使',       color: '#fbc02d' },
    { cp: '1f60d', emoji: '😍', name: '爱心眼',     color: '#ff6b9d' },
    { cp: '1f61a', emoji: '😚', name: '闭眼亲',     color: '#f4a6c5' },
    { cp: '1f92a', emoji: '🤪', name: '疯癫',       color: '#fbc02d' },
    { cp: '1f978', emoji: '🥸', name: '伪装',       color: '#fbc02d' },
    { cp: '1f612', emoji: '😒', name: '无语',       color: '#fbc02d' },
    { cp: '1f61e', emoji: '😞', name: '失落',       color: '#fbc02d' },
    { cp: '1f973', emoji: '🥳', name: '派对',       color: '#fbc02d' },
    { cp: '1f929', emoji: '🤩', name: '星星眼',     color: '#f9d71c' },
    { cp: '1f928', emoji: '🤨', name: '挑眉',       color: '#fbc02d' },
    { cp: '1f9d0', emoji: '🧐', name: '单片镜',     color: '#fbc02d' },
    { cp: '1f60b', emoji: '😋', name: '美味',       color: '#fbc02d' },
    { cp: '1f61b', emoji: '😛', name: '吐舌头',     color: '#fbc02d' },
    { cp: '1f970', emoji: '🥰', name: '爱心脸',     color: '#f4a6c5' },
    { cp: '1f618', emoji: '😘', name: '飞吻',       color: '#f4a6c5' },
    { cp: '1f642', emoji: '🙂', name: '微微笑',     color: '#fbc02d' },
    { cp: '1f643', emoji: '🙃', name: '倒脸',       color: '#fbc02d' },
    { cp: '1f923', emoji: '🤣', name: '笑翻',       color: '#fbc02d' },
    { cp: '1f972', emoji: '🥲', name: '含泪笑',     color: '#fbc02d' },
    { cp: '1f601', emoji: '😁', name: '咧嘴',       color: '#fbc02d' },
    { cp: '1f606', emoji: '😆', name: '哈哈笑',     color: '#fbc02d' },
    { cp: '1f614', emoji: '😔', name: '沉思',       color: '#fbc02d' },
    { cp: '1f623', emoji: '😣', name: '坚持',       color: '#fbc02d' },
    { cp: '1f622', emoji: '😢', name: '哭',         color: '#5dade2' },
    { cp: '1f92c', emoji: '🤬', name: '骂人',       color: '#e74c3c' },
    { cp: '1f613', emoji: '😓', name: '出汗',       color: '#fbc02d' },
    { cp: '1f917', emoji: '🤗', name: '拥抱',       color: '#fbc02d' },
    { cp: '1f631', emoji: '😱', name: '尖叫',       color: '#fbc02d' },
    { cp: '1f92f', emoji: '🤯', name: '炸头',       color: '#fbc02d' },
    { cp: '1f62d', emoji: '😭', name: '大哭',       color: '#5dade2' },
    { cp: '1f616', emoji: '😖', name: '困苦',       color: '#fbc02d' },
    { cp: '1f61f', emoji: '😟', name: '担忧',       color: '#fbc02d' },
    { cp: '1f615', emoji: '😕', name: '困惑',       color: '#fbc02d' },
    { cp: '1f62b', emoji: '😫', name: '疲惫',       color: '#fbc02d' },
    { cp: '1f624', emoji: '😤', name: '哼',         color: '#fbc02d' },
    { cp: '1f633', emoji: '😳', name: '脸红',       color: '#fbc02d' },
    { cp: '1f628', emoji: '😨', name: '害怕',       color: '#fbc02d' },
    { cp: '1f914', emoji: '🤔', name: '思考',       color: '#fbc02d' },
    { cp: '1fae3', emoji: '🫣', name: '偷看',       color: '#fbc02d' },
    { cp: '1f630', emoji: '😰', name: '焦虑',       color: '#fbc02d' },
    { cp: '1f975', emoji: '🥵', name: '热',         color: '#e74c3c' },
    { cp: '1f620', emoji: '😠', name: '生气',       color: '#e74c3c' },
    { cp: '1f629', emoji: '😩', name: '难受',       color: '#fbc02d' },
    { cp: '1f641', emoji: '🙁', name: '微皱眉',     color: '#fbc02d' },
    { cp: '1f97a', emoji: '🥺', name: '泫然欲泣',   color: '#fbc02d' },
    { cp: '1f621', emoji: '😡', name: '怒',         color: '#e74c3c' },
    { cp: '1f976', emoji: '🥶', name: '冷',         color: '#5dade2' },
    { cp: '1f625', emoji: '😥', name: '失望',       color: '#fbc02d' },
    { cp: '1f92d', emoji: '🤭', name: '捂嘴笑',     color: '#fbc02d' },
  ];

  // 默认 cp 序列（用于 reset）
  const DEFAULT_CHAIN_CPS = FRUITS.map(f => f.cp);
  // 当前 chain 序列（11 个 cp）—— load 后可被覆盖；后续修改都改这里再 apply
  let chainCps = [...DEFAULT_CHAIN_CPS];
  // 调参面板中当前选中的 slot level（null = 没选中，picker 不显示）
  let selectedSlotLevel = null;

  function loadChain() {
    try {
      const raw = localStorage.getItem(CHAIN_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length !== FRUITS.length) return;
      // 校验：每个元素必须是库里有的 cp
      const validCps = new Set(EMOJI_LIBRARY.map(e => e.cp));
      const cleaned = arr.map((cp, i) =>
        (typeof cp === 'string' && validCps.has(cp)) ? cp : DEFAULT_CHAIN_CPS[i]
      );
      chainCps = cleaned;
    } catch (e) {}
  }
  function saveChain() {
    try { localStorage.setItem(CHAIN_KEY, JSON.stringify(chainCps)); } catch (e) {}
  }
  // 把 chainCps 应用到 FRUITS：只改 emoji/name/color/cp，不加载图片（避免和
  // loadFruitImages 竞态——之前 bug：两批 async 请求竞争，葡萄 PNG 后到就把
  // 已经被自定义为 face emoji 的 fruitImages[3] 覆盖回葡萄。
  // 返回有变化的 level 列表，调用方按需 reloadFruitImage()。
  function applyChainCps() {
    const changedLevels = [];
    chainCps.forEach((cp, i) => {
      const lib = EMOJI_LIBRARY.find(e => e.cp === cp);
      if (!lib) return;
      const f = FRUITS[i];
      if (f.cp === lib.cp) return;
      f.cp = lib.cp;
      f.emoji = lib.emoji;
      f.name = lib.name;
      f.color = lib.color;
      changedLevels.push(f.lv);
    });
    return changedLevels;
  }

  // ============ Twemoji 图片预加载 ============
  // Canvas 在 iOS Safari 上 fillText emoji 不可靠（即使指定 Apple Color Emoji
  // 也常常静默失败画空白）。改用 Twemoji PNG → drawImage，跨平台稳定。
  const fruitImages = {};
  function reloadFruitImage(lv) {
    const f = FRUITS[lv - 1];
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { fruitImages[lv] = img; };
    img.onerror = () => { console.warn('[suika] 水果图加载失败 lv=' + lv + ' cp=' + f.cp); };
    img.src = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${f.cp}.png`;
  }
  function loadFruitImages() {
    FRUITS.forEach(f => reloadFruitImage(f.lv));
  }
  // 注意：loadFruitImages() 不在脚本顶层调用 —— 必须等 loadChain + applyChainCps
  // 把 FRUITS 改成最终状态后再调用。在 init 段统一调度。

  // 1-5 加权概率（小水果概率高）
  const SPAWN_WEIGHTS = [35, 28, 20, 12, 5];

  // ============ Konami code 彩蛋 + 开发者暗号 ============
  // 上上下下左右左右 BABA → 天降一颗西瓜
  // 输入 full → 天降 6 颗西瓜，强制游戏结束（开发者测试结算流程用）
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  const SECRET_FULL = ['f', 'u', 'l', 'l'];
  let konamiBuf = [];
  let secretFullBuf = [];
  function pushKonami(key) {
    // 在 input/textarea 里不触发暗号（昵称表单 / waline 评论框等）
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
    const k = key.length === 1 ? key.toLowerCase() : key;
    // Konami code
    konamiBuf.push(k);
    if (konamiBuf.length > KONAMI.length) konamiBuf.shift();
    if (konamiBuf.length === KONAMI.length && konamiBuf.every((kk, i) => kk === KONAMI[i])) {
      konamiBuf = [];
      triggerKonami();
    }
    // FULL 开发者暗号
    secretFullBuf.push(k);
    if (secretFullBuf.length > SECRET_FULL.length) secretFullBuf.shift();
    if (secretFullBuf.length === SECRET_FULL.length && secretFullBuf.every((kk, i) => kk === SECRET_FULL[i])) {
      secretFullBuf = [];
      triggerFull();
    }
  }
  function triggerKonami() {
    if (isOver || !world || !gameStarted) return;
    // 限每局 3 次：Konami 天降西瓜 = +100 分/次，不加 budget 可反复刷高分（与 full 暗号同理）。
    if (!checkAndConsumeCheatBudget('konami', 3)) return;
    // 在画面中部丢一颗西瓜：西瓜 r=96，从 y=110 出发 top edge=14 仍在 canvas 内、
    // 且刚好在 DANGER_Y=100 下方，避免一出现就触发 game over。
    const watermelon = createFruitBody(11, $canvas.width / 2, 110);
    World.add(world, watermelon);
    melonsCount++;
    // 注意：不更新 runMelons / runMaxLevel —— 暗号是彩蛋，不算本局合成成就。
    // 这两个变量是给排行榜服务端校验用的（要求 maxLevel==11 ⇔ melons≥1），
    // 如果只 ++runMelons 不动 runMaxLevel 会让 score+0 颗 + maxLevel 7 + melons 1
    // 的不一致 body 被服务端拒收（reason: maxlevel_melons_mismatch）。
    score += FRUITS[10].score;
    try { localStorage.setItem(MELONS_KEY, String(melonsCount)); } catch (e) {}
    updateScoreUI();
    showKonamiToast();
  }
  function showKonamiToast() {
    const el = document.createElement('div');
    el.textContent = '🍉 BABA！天降西瓜';
    el.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(20,25,30,0.92);color:#ffd700;padding:1rem 2rem;border-radius:14px;font-size:1.4rem;font-weight:600;z-index:2000;box-shadow:0 8px 28px rgba(0,0,0,0.45);font-family:var(--font-display);animation:konamiPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  // FULL 暗号：天降 6 颗西瓜错开 x + 错开 150ms 落下，必然撑满到危险线
  // 触发 game over。开发者测试结算流程用。
  function triggerFull() {
    if (isOver || !world || !gameStarted) return;
    // 限 1 次/局：防 full（+726 分 × 6 颗西瓜）+ gravity（拖延 game over）反复刷分。
    if (!checkAndConsumeCheatBudget('full', 1)) return;
    const positions = [0.18, 0.5, 0.82, 0.32, 0.68, 0.5];
    positions.forEach((px, i) => {
      setTimeout(() => {
        if (isOver) return;
        const w = createFruitBody(11, $canvas.width * px, 110);
        World.add(world, w);
        melonsCount++;
        // 跟 Konami 一致：暗号彩蛋不计入本局 runMelons / runMaxLevel，避免
        // 排行榜服务端的 maxLevel/melons 一致性校验拒收。
        score += FRUITS[10].score;
        try { localStorage.setItem(MELONS_KEY, String(melonsCount)); } catch (e) {}
        updateScoreUI();
      }, i * 150);
    });
    showFullToast();
  }
  function showFullToast() {
    const el = document.createElement('div');
    el.textContent = '🍉🍉🍉 FULL！强制结算';
    el.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(20,25,30,0.92);color:#ffd700;padding:1rem 2rem;border-radius:14px;font-size:1.4rem;font-weight:600;z-index:2000;box-shadow:0 8px 28px rgba(0,0,0,0.45);font-family:var(--font-display);animation:konamiPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  // ============ 打字暗号系统 ============
  // 缓冲单字符按键，命中预设词触发对应函数。在 input/textarea/contentEditable
  // 内自动跳过；不调 preventDefault（不影响其他键监听）。
  let typedBuf = '';
  let gravityReversalUntil = 0;   // 重力反转截止 ms（0 = 关）
  let _gravityWasReversed = false; // tick 里检测变化用
  let discoModeUntil = 0;         // disco 模式截止 ms（0 = 关）

  // 暗号 budget（每个暗号每局上限 3 次；unlimitedMode 跳过）
  const CHEAT_PER_RUN_LIMIT = 3;
  let runCheatUsage = {};         // { clean: 2, fuck: 1, ... }
  let unlimitedMode = false;      // 触发 unlimited / 菜单选尽兴 → true：跳过所有 budget；本局仍上传，但去 unlimited 榜单。

  // 长按空格"喷泉"限制（仅 fountain 模式生效；basic 完全禁、unlimited 不限）
  let spaceHeldSince = null;      // ms：当前按下空格的起始时间（null = 未按）
  let fountainCooldownUntil = 0;  // ms：当前喷泉冷却截止
  const FOUNTAIN_MAX_MS = PC.fountainMaxMs;   // fountain 模式：单次长按最长 5s
  const FOUNTAIN_COOLDOWN_MS = 1000; // 满 5s 后冷却 1s

  // limit 可选；不传走全局默认 CHEAT_PER_RUN_LIMIT。给 full 这种特别危险的暗号
  // 用 limit=1（防 full+gravity 反复刷分漏洞）。
  function checkAndConsumeCheatBudget(name, limit) {
    if (unlimitedMode) return true;
    const max = (typeof limit === 'number' && limit > 0) ? limit : CHEAT_PER_RUN_LIMIT;
    const used = runCheatUsage[name] || 0;
    if (used >= max) {
      showCheatToast(`${name}: 本局已用满 ${max} 次`, '#9aa0a6');
      return false;
    }
    runCheatUsage[name] = used + 1;
    return true;
  }

  // 应用暗号惩罚分（unlimited 模式 0 惩罚）。带 floor 0 + 视觉反馈。
  function applyCheatPenalty(amount, label) {
    if (!amount || unlimitedMode) return 0;
    const before = score;
    score = Math.max(0, score - amount);
    const real = before - score;
    updateScoreUI();
    return real;
  }

  function pushTypedSecret(key) {
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
    if (typeof key !== 'string') return;
    // Enter / Space 清空 buffer 防"跨词连接"（aclean → clean，但 a clean → 没匹配）
    if (key === ' ' || key === 'Spacebar' || key === 'Enter') { typedBuf = ''; return; }
    // 只缓冲单字符键 + ?
    if (key.length !== 1) return;
    typedBuf += key.toLowerCase();
    // 滑动窗口：保留最长暗号长度（'gravity' 7）
    const maxLen = 12;
    if (typedBuf.length > maxLen) typedBuf = typedBuf.slice(-maxLen);
    for (const [secret, handler] of Object.entries(TYPED_SECRETS)) {
      if (typedBuf.endsWith(secret)) {
        typedBuf = '';
        handler();
        break;
      }
    }
  }

  function showCheatToast(text, color) {
    const el = document.createElement('div');
    el.textContent = text;
    const fg = color || '#9ee6a3';
    el.style.cssText = `position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(20,25,30,0.92);color:${fg};padding:0.8rem 1.6rem;border-radius:12px;font-size:1.05rem;font-weight:600;z-index:2000;box-shadow:0 8px 28px rgba(0,0,0,0.45);font-family:var(--font-display);animation:konamiPop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);max-width:88vw;text-align:center;line-height:1.5;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  // —— 7 个暗号 trigger ——
  // 每个暗号都先 checkAndConsumeCheatBudget（unlimitedMode 跳过）；
  // 触发成功后 applyCheatPenalty 扣分（unlimitedMode 跳过）；
  // 状态守卫（gameStarted、isOver 等）放在 budget 之前 — 不在游戏中根本不消耗 budget。

  function triggerClean() {
    if (isOver || !world || !gameStarted) return;
    const targets = Composite.allBodies(world).filter(b => b.fruitLevel === 1);
    if (!targets.length) { showCheatToast('clean: 没有樱桃可清', '#9aa0a6'); return; }
    if (!checkAndConsumeCheatBudget('clean')) return;
    World.remove(world, targets);
    // 惩罚：N × lv3.score = N × 9
    const penalty = targets.length * FRUITS[2].score;
    const real = applyCheatPenalty(penalty);
    const tail = unlimitedMode ? '（unlimited 不扣分）' : (real > 0 ? ` · -${real} 分` : '');
    showCheatToast(`✨ clean: 蒸发 ${targets.length} 颗樱桃${tail}`, '#9ee6a3');
  }

  function triggerFuck() {
    if (isOver || !world || !gameStarted) return;
    const allFruits = Composite.allBodies(world).filter(b => b.fruitLevel >= 1);
    if (!allFruits.length) { showCheatToast('fuck: 画面是空的', '#9aa0a6'); return; }
    const small = allFruits.filter(b => b.fruitLevel <= 3);
    const maxLv = Math.max.apply(null, allFruits.map(b => b.fruitLevel));
    const biggest = allFruits.find(b => b.fruitLevel === maxLv && maxLv > 3);
    const removeList = small.slice();
    if (biggest) removeList.push(biggest);
    if (!removeList.length) { showCheatToast('fuck: 没有可清的目标', '#9aa0a6'); return; }
    if (!checkAndConsumeCheatBudget('fuck')) return;
    World.remove(world, removeList);
    // 惩罚：所有被清水果分数之和
    const penalty = removeList.reduce((s, b) => s + (FRUITS[b.fruitLevel - 1].score || 0), 0);
    const real = applyCheatPenalty(penalty);
    const tail = unlimitedMode ? '（unlimited 不扣分）' : ` · -${real} 分`;
    if (biggest) {
      showCheatToast(`💥 fuck: 清 ${small.length} 个小果，失去 lv ${maxLv} ${FRUITS[maxLv - 1].name}${tail}`, '#ff8a80');
    } else {
      showCheatToast(`💥 fuck: 清 ${small.length} 个小果${tail}`, '#ff8a80');
    }
  }

  function triggerPeek() {
    // 与其余 6 个暗号一致的状态守卫：菜单态/结算态敲 peek 直接 no-op，
    // 既不消耗本局预算，也不在开局前 ensureQueueFilled 定格未来 5 个掉落（堵住开局前偷看）。
    if (isOver || !world || !gameStarted) return;
    if (!checkAndConsumeCheatBudget('peek')) return;
    ensureQueueFilled();
    const preview = nextLevelQueue.slice(0, 5);
    const lines = preview.map((lv, i) => `${i + 1}. ${FRUITS[lv - 1].emoji} ${FRUITS[lv - 1].name}`).join('  ');
    const real = applyCheatPenalty(25);
    const tail = unlimitedMode ? '（unlimited 不扣分）' : (real > 0 ? `  -${real} 分` : '');
    showCheatToast(`🔮 接下来 5 个：  ${lines}${tail}`, '#bcd9ff');
  }

  function triggerGravity() {
    if (isOver || !world || !gameStarted || isPaused) return;
    if (!checkAndConsumeCheatBudget('gravity')) return;
    gravityReversalUntil = performance.now() + 3000;
    applyPhysicsLive();          // 立即生效一次
    const real = applyCheatPenalty(150);
    const tail = unlimitedMode ? '（unlimited 不扣分）' : ` · -${real} 分`;
    showCheatToast(`🌌 gravity: 重力反转 3 秒${tail}`, '#d4a3ff');
  }

  function triggerDisco() {
    if (isOver || !world || !gameStarted) return;
    // disco 不影响 gameplay，无次数上限
    discoModeUntil = performance.now() + 5000;
    showCheatToast('🌈 disco: 彩虹 5 秒（无惩罚）', '#ffb3d9');
  }

  async function triggerScoreQuery() {
    // ?score 是纯查询，无次数上限
    // 自由玩法（自由模式 / unlimited 暗号转自由）不上传，查询没意义，给特殊提示
    if (unlimitedMode) {
      showCheatToast('♾ 自由玩法 · 本局不计入排名', '#d4a3ff');
      return;
    }
    const nick = getNick();
    if (!nick) { showCheatToast('?score: 先起个昵称才能查排名', '#9aa0a6'); return; }
    showCheatToast('?score: 查询中…', '#bcd9ff');
    const r = await callBackend(LEADERBOARD_API + '?action=me&nick=' + encodeURIComponent(nick), {}, 5000);
    if (!r.ok || !r.data) { showCheatToast('?score: 查询失败', '#ff8a80'); return; }
    const { best, rank, total } = r.data;
    if (rank == null) {
      showCheatToast(`?score: ${nick} 还没上榜（总 ${total || 0} 人）`, '#bcd9ff');
    } else {
      showCheatToast(`🏆 ${nick} 历史最高 ${best || 0} · 第 ${rank} 名 / 共 ${total} 人`, '#f0c674');
    }
  }

  // unlimited 暗号：把当前这一局「转自由」——跳过所有 budget + 喷泉限制。
  // 代价：本局不再计入竞技榜（严格竞技局中途解限，归到自由玩法只当娱乐、只存本地最高）。
  function triggerUnlimited() {
    if (isOver) return;
    if (unlimitedMode) {
      showCheatToast('♾ 已经是自由玩法 · 本局不计入排名', '#d4a3ff');
      return;
    }
    unlimitedMode = true;
    showCheatToast('♾ 本局转自由 · 跳过所有限制 · 不计入排名', '#d4a3ff');
  }

  // 暗号映射表（注意：长前缀放后面，避免短前缀截胡 — 这里 7 个互不重叠，无所谓）
  const TYPED_SECRETS = {
    'clean':     triggerClean,
    'fuck':      triggerFuck,
    'peek':      triggerPeek,
    'gravity':   triggerGravity,
    'disco':     triggerDisco,
    '?score':    triggerScoreQuery,
    'unlimited': triggerUnlimited,
  };

  function pickSpawnLevel() {
    const total = SPAWN_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < SPAWN_WEIGHTS.length; i++) {
      r -= SPAWN_WEIGHTS[i];
      if (r <= 0) return i + 1;
    }
    return 1;
  }

  // ============ 游戏尺寸 ============
  const $canvas = document.getElementById('game-canvas');
  const ctx = $canvas.getContext('2d');
  const $gameZone = document.getElementById('game-zone');
  const $overlay = document.getElementById('game-overlay');
  const $ovScore = document.getElementById('ov-score');
  const $ovBest = document.getElementById('ov-best');
  const $ovMessage = document.getElementById('ov-message');
  const $ovTitle = document.getElementById('ov-title');
  const $ovRestart = document.getElementById('ov-restart');
  const $ovSnapshot = document.getElementById('ov-snapshot');
  const $ovRank = document.getElementById('ov-rank');
  const $ovEvoSummary = document.getElementById('ov-evo-summary');
  const $ovScreenshotBtn = document.getElementById('ov-screenshot-btn');
  const $ovNickForm = document.getElementById('ov-nick-form');
  const $ovNickInput = document.getElementById('ov-nick-input');
  const $ovNickError = document.getElementById('ov-nick-error');
  const $ovNickSubmit = document.getElementById('ov-nick-submit');
  const $ovNickSkip = document.getElementById('ov-nick-skip');
  const $ovNickPrompt = document.getElementById('ov-nick-prompt');
  const $ovNickTag = document.getElementById('ov-nick-tag');
  const $ovNickCurrent = document.getElementById('ov-nick-current');
  const $ovNickChange = document.getElementById('ov-nick-change');
  const $restartBtn = document.getElementById('restart-btn');
  const $pauseBtn = document.getElementById('pause-btn');
  const $curScore = document.getElementById('cur-score');
  const $highScore = document.getElementById('high-score');
  const $nextFruit = document.getElementById('next-fruit');
  const $melonCount = document.getElementById('melon-count');
  const $melonEmoji = document.getElementById('melon-emoji');
  const $evoChain = document.getElementById('evo-chain');
  const $evoChainWrap = document.getElementById('evo-chain-wrap');
  const $startOverlay = document.getElementById('start-overlay');
  const $startBtn = document.getElementById('start-btn');
  const $startBest = document.getElementById('start-best');

  let W = 380, H = 540;     // 画布尺寸
  const WALL = PC.wallThickness;          // 墙厚（保持薄墙的手感；穿墙的极端情况由 sanity cleanup 兜底）
  const SPAWN_Y = PC.spawnY;       // 悬浮水果 y
  const DANGER_Y = PC.dangerY;     // 危险线 y

  // 画幅 preset：(maxW, aspect) 决定画布尺寸。实际 W 还会被父容器宽度兜住。
  // 只留两档：太小不容易合到大水果。
  const CANVAS_SIZES = {
    medium: { maxW: 430, aspect: 1.45, label: '中' },
    large:  { maxW: 480, aspect: 1.55, label: '大' },
  };

  // 自适应尺寸
  function fitCanvas() {
    // 量 sk-wrap 实际 content 宽度（自动适应 default layout 的 main padding +
    // sk-wrap 自己的 padding）。之前用 window.innerWidth - 32 只减了 32，漏了
    // main 的 2rem padding，手机端 canvas 算成 361 实际容器只有 297，被 margin
    // auto 在过约束下推去左边 → 视觉没居中、画幅也撑出去看不全。
    const parent = $gameZone.parentElement;
    let parentInnerW = 0;
    if (parent) {
      const cs = getComputedStyle(parent);
      parentInnerW = parent.clientWidth
        - parseFloat(cs.paddingLeft || 0)
        - parseFloat(cs.paddingRight || 0);
    }
    const preset = CANVAS_SIZES[PHYSICS.canvasSize] || CANVAS_SIZES.medium;
    const containerWidth = Math.min(preset.maxW,
      parentInnerW > 0 ? parentInnerW : (window.innerWidth - 32)
    );
    W = containerWidth;
    H = Math.round(W * preset.aspect);
    $canvas.width = W;
    $canvas.height = H;
    $canvas.style.width = W + 'px';
    $canvas.style.height = H + 'px';
    $gameZone.style.width = W + 'px';
    $gameZone.style.margin = '0 auto';
  }
  fitCanvas();

  // ============ Matter.js 初始化 ============
  const { Engine, World, Bodies, Body, Events, Composite } = Matter;

  let engine, world;
  let walls = [];
  // 预生成的 spawn 队列（5 长）。peek 暗号要看未来 5 个 → 必须预生成才能"承诺"。
  // nextLevel 沿用变量名作为接口（指向 queue[0]），避免改 UI / 历史代码。
  const SPAWN_QUEUE_LEN = PC.spawnQueueLen;
  let nextLevelQueue = [];
  function ensureQueueFilled() {
    while (nextLevelQueue.length < SPAWN_QUEUE_LEN) nextLevelQueue.push(pickSpawnLevel());
  }
  ensureQueueFilled();
  let nextLevel = nextLevelQueue[0];   // 排队中的下一个（对外接口；实际从 queue 出）
  let hoverFruit = null;              // 当前悬浮的水果（纯数据，不是 Matter body）
  let score = 0;
  let highScore = parseInt(localStorage.getItem(HIGH_KEY) || '0', 10);
  let melonsCount = parseInt(localStorage.getItem(MELONS_KEY) || '0', 10);
  let isOver = false;
  let isPaused = false;
  let dangerSince = null;
  let lastInDangerTime = 0;
  let nextTremorAt = 0;       // 下一次地震时间戳，0 = 还没初始化
  let lastTremorTime = -10000;       // 最近一次地震发生时刻（用于 camera shake 衰减）
  let tremorShakeAmpX = 0;           // 本次地震的 x 方向 camera shake 振幅
  let tremorShakeAmpY = 0;           // 本次地震的 y 方向 camera shake 振幅
  let lastTick = performance.now();
  const recentMerges = new Set();   // 防止同一次碰撞触发多次合并
  let gameStarted = false;          // 用户是否点过「开始游戏」（决定是否要 spawn hover）
  let gameFocused = false;          // 当前是否捕获键盘（点击 game-zone = true，点别处 = false）
  let trialMode = false;            // 是否在「试一试」试玩模式
  let trialDropsLeft = 0;
  // 试玩用一串 setTimeout（撒果 / spawn hover / 到数收尾），中途离开试玩时它们可能还
  // 在途。每次进/出试玩就 ++trialToken，让在途回调用 myToken !== trialToken 自我作废，
  // 避免（如进调参后）后台定时器把玩家正看的视图切走、或凭空 spawn/删果。
  let trialToken = 0;
  const TRIAL_DROPS = PC.trialDrops;

  // —— 排行榜状态 ——
  let runMaxLevel = 0;          // 本局合到的最高水果级别（用于结算高亮）
  let runMelons = 0;            // 本局合到的西瓜数（不是累计，给服务端 score>=melons*121 校验用）
  let runStartedAt = 0;         // 本局开始时间戳（用于服务端 durationMs）
  let currentRunNonce = '';     // 本局唯一 nonce（防重放，整局不变）
  let nicknameMem = '';         // localStorage 禁用时的内存兜底
  let pendingSubmitForRun = false; // 标记已经为本局提交过分（防止用户连点）

  function newRunNonce() {
    if (window.crypto && crypto.randomUUID) return 'r-' + crypto.randomUUID();
    return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function getNick() {
    try { return localStorage.getItem(NICK_KEY) || nicknameMem || ''; }
    catch (_) { return nicknameMem || ''; }
  }
  function setNick(nick) {
    nicknameMem = nick;
    try { localStorage.setItem(NICK_KEY, nick); } catch (_) {}
  }
  function clearNick() {
    nicknameMem = '';
    try { localStorage.removeItem(NICK_KEY); } catch (_) {}
  }
  // 设备 ID：每台浏览器一个 UUID，跨昵称追踪历史最高分。首次访问时生成。
  // localStorage 禁用时退化到内存 — 关页面就丢，但当前会话仍能用。
  let deviceIdMem = '';
  function getDeviceId() {
    if (deviceIdMem) return deviceIdMem;
    try {
      let did = localStorage.getItem(DEVICE_KEY);
      if (!did) {
        did = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'd-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
        localStorage.setItem(DEVICE_KEY, did);
      }
      deviceIdMem = did;
      return did;
    } catch (_) {
      if (!deviceIdMem) deviceIdMem = 'mem-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
      return deviceIdMem;
    }
  }
  // 前端校验（与后端一致）：2-12 codepoint，剔除危险字符。
  function validateNick(raw) {
    if (typeof raw !== 'string') return { ok: false, msg: '请输入昵称' };
    const nick = raw.trim();
    if (!nick) return { ok: false, msg: '昵称不能为空' };
    if (NICK_REJECT_RE.test(nick)) return { ok: false, msg: '不能包含 < > & " \' / \\ 等特殊字符' };
    const len = [...nick].length;
    if (len < 2) return { ok: false, msg: '昵称太短（≥2 字）' };
    if (len > 12) return { ok: false, msg: '昵称太长（≤12 字）' };
    return { ok: true, nick };
  }

  // 通用 fetch 包装：5s timeout、cache:no-store、错误归一化。
  async function callBackend(url, opts, timeoutMs) {
    if (!LEADERBOARD_ENABLED) return { ok: false, error: 'disabled' };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 5000);
    try {
      const res = await fetch(url, Object.assign({}, opts || {}, {
        signal: ctrl.signal,
        cache: 'no-store',
      }));
      let data = null;
      try { data = await res.json(); } catch (_) {}
      if (!res.ok) return { ok: false, status: res.status, data };
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    } finally {
      clearTimeout(timer);
    }
  }

  // ============ 进度保存 / 恢复（中途离开能回来续局） ============
  const SAVESTATE_KEY = 'tool.suika.savestate.v1';
  const SAVE_EXPIRY_MS = 48 * 3600 * 1000;     // 48h 后存档过期，silent 丢
  const SAVE_INTERVAL_MS = 5000;               // 5s 自动存一次

  function serializeState() {
    if (!engine || !world) return null;
    const fruits = [];
    Composite.allBodies(world).forEach(b => {
      if (!b.fruitLevel) return;
      fruits.push({
        lv: b.fruitLevel,
        x: b.position.x, y: b.position.y,
        vx: b.velocity.x, vy: b.velocity.y,
        a: b.angle, av: b.angularVelocity,
      });
    });
    return {
      v: 1,
      savedAt: Date.now(),
      score, melonsCount,
      runMaxLevel, runMelons,
      runStartedAt,
      currentRunNonce,
      runCheatUsage: { ...runCheatUsage },
      unlimitedMode,
      gameMode,
      nextLevelQueue: [...nextLevelQueue],
      fruits,
      hover: hoverFruit ? { level: hoverFruit.level, x: hoverFruit.x } : null,
    };
  }

  function saveCurrentState() {
    if (!gameStarted || isOver || trialMode) return;
    try {
      const data = serializeState();
      if (!data) return;
      localStorage.setItem(SAVESTATE_KEY, JSON.stringify(data));
    } catch (_) { /* quota or 隐私模式禁用，silent 失败 */ }
  }

  function clearSaveState() {
    try { localStorage.removeItem(SAVESTATE_KEY); } catch (_) {}
  }

  function loadSaveState() {
    try {
      const raw = localStorage.getItem(SAVESTATE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.v !== 1) { clearSaveState(); return null; }
      if (Date.now() - (data.savedAt || 0) > SAVE_EXPIRY_MS) {
        clearSaveState();
        return null;
      }
      return data;
    } catch (_) { return null; }
  }

  // 把存档贴回内存：清旧 world、setupWorld、恢复每个 body、恢复 run 变量
  function applySavedState(save) {
    if (!save) return;
    if (engine) {
      World.clear(world, false);
      Engine.clear(engine);
    }
    setupWorld();

    score = Number(save.score) || 0;
    if (Number.isFinite(save.melonsCount)) melonsCount = save.melonsCount;
    runMaxLevel = Number(save.runMaxLevel) || 0;
    runMelons = Number(save.runMelons) || 0;
    runStartedAt = Number(save.runStartedAt) || Date.now();
    currentRunNonce = String(save.currentRunNonce || newRunNonce());
    runCheatUsage = (save.runCheatUsage && typeof save.runCheatUsage === 'object') ? { ...save.runCheatUsage } : {};
    unlimitedMode = !!save.unlimitedMode;
    let savedMode = save.gameMode;
    if (savedMode === 'unlimited') savedMode = 'free';   // 旧存档迁移
    if (VALID_GAME_MODES.includes(savedMode)) {
      gameMode = savedMode;
      // 不写 localStorage：菜单偏好保留用户最后一次主动选择，不被存档恢复污染
    }
    syncActivePhysics();   // 按恢复后的模式定下生效物理

    nextLevelQueue = Array.isArray(save.nextLevelQueue) ? save.nextLevelQueue.slice() : [];
    ensureQueueFilled();
    nextLevel = nextLevelQueue[0];

    if (Array.isArray(save.fruits)) {
      save.fruits.forEach(f => {
        if (!f || !Number.isInteger(f.lv) || f.lv < 1 || f.lv > FRUITS.length) return;
        const x = Number.isFinite(f.x) ? f.x : $canvas.width / 2;
        const y = Number.isFinite(f.y) ? f.y : 100;
        const body = createFruitBody(f.lv, x, y);
        Body.setVelocity(body, { x: Number(f.vx) || 0, y: Number(f.vy) || 0 });
        Body.setAngle(body, Number(f.a) || 0);
        Body.setAngularVelocity(body, Number(f.av) || 0);
        World.add(world, body);
      });
    }

    if (save.hover && Number.isInteger(save.hover.level) && save.hover.level >= 1) {
      hoverFruit = {
        level: save.hover.level,
        x: Number.isFinite(save.hover.x) ? save.hover.x : $canvas.width / 2,
      };
    } else {
      hoverFruit = null;
      spawnHoveringFruit();
    }

    isOver = false;
    isPaused = false;
    pendingSubmitForRun = false;
    spaceHeldSince = null;
    fountainCooldownUntil = 0;
    clearHoverRespawn();
    dangerSince = null;
    lastInDangerTime = 0;

    $overlay.classList.remove('open');
    $gameZone.classList.remove('over');
    $startOverlay.classList.remove('open');
    $pauseBtn.textContent = '⏸ 暂停';
    gameStarted = true;
    setGameChromeVisible(true);
    setFocus(true);
    highlightEvoChain(runMaxLevel);
    updateScoreUI();
    updateNextFruitUI();
  }

  // —— 自动保存触发 ——
  setInterval(saveCurrentState, SAVE_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveCurrentState();
  });
  window.addEventListener('beforeunload', saveCurrentState);

  // —— 随机昵称（auto-settle 没昵称时用，不写 localStorage） ——
  function generateRandomNick() {
    return '路人' + Math.floor(1000 + Math.random() * 9000);
  }

  function setupWorld() {
    const m = mapPhysics();
    engine = Engine.create({
      gravity: { x: 0, y: 1, scale: m.gravityScale },
      // 不能开 sleeping：sleeping body 跳过积分包括重力，合并爆炸把新水果向上
      // 推到抛物线顶点 (v≈0) 时一旦被标 sleeping，就永远卡在空中——Matter 必须
      // 等另一个 body 撞上来才会唤醒，但合并已经把附近水果都吃掉了。
      // 自激弹起改用 tick 里的"主动归零有支撑的低速水果"治本（见 tick 里 dampen）。
      enableSleeping: false,
    });
    engine.constraintIterations = PC.constraintIterations;
    // 提高 position/velocity 迭代次数：密堆叠（特别是 lv 7+ 大水果合并产生
    // 更大新水果挤进周围）下，原本 10/8 不收敛 → 视觉嵌入。16/10 解决堆叠
    // 嵌入，CPU 几乎无感。
    engine.positionIterations = PC.positionIterations;
    engine.velocityIterations = PC.velocityIterations;
    world = engine.world;

    walls = [
      Bodies.rectangle(W / 2, H + WALL / 2, W, WALL, { isStatic: true, friction: PC.wallFriction }),  // floor
      Bodies.rectangle(-WALL / 2, H / 2, WALL, H * 2, { isStatic: true, friction: PC.wallFriction }),  // left
      Bodies.rectangle(W + WALL / 2, H / 2, WALL, H * 2, { isStatic: true, friction: PC.wallFriction }), // right
    ];
    World.add(world, walls);
  }

  function mergeFruits(a, b) {
    const level = a.fruitLevel;
    const newLevel = level + 1;
    let x = (a.position.x + b.position.x) / 2;
    let y = (a.position.y + b.position.y) / 2;

    // 关键：合成位置必须夹紧到墙体内，否则新水果（半径变大）可能直接嵌进底面 —
    // Matter 的 slop 只有 0.05 px，大幅穿模 + 合并爆炸 popVel 一推就直接穿出去消失。
    // 葡萄（r=23）→ 橘子（r=30）正好踩这个坑：两葡萄贴底面 y≈517，midpoint 还是 ≈517，
    // 但橘子下边缘 =547 > 地面顶 540 = 嵌进 7 px，Matter 处理不了 → 水果"消失"。
    const newRadius = FRUITS[newLevel - 1].radius;
    x = Math.max(newRadius + 1, Math.min(W - newRadius - 1, x));
    y = Math.min(H - newRadius - 1, y);

    World.remove(world, [a, b]);
    const merged = createFruitBody(newLevel, x, y);
    World.add(world, merged);

    // 合并爆炸：受用户的「合并爆炸」滑条调节
    const m = mapPhysics();
    const expMult = m.explosionMult;

    const popVel = (PC.mergePopVelBase - newLevel * PC.mergePopVelPerLevel) * expMult;
    Body.setVelocity(merged, { x: (Math.random() - 0.5) * 1.2 * expMult, y: popVel });

    const pushRange = newRadius * PC.mergePushRangeMultiplier;
    // pushStrength 系数缩到 1/3：Matter.js 的 applyForce 实际注入速度是
    // (force/mass) × dt²（dt=16ms 时 dt²=256），这里 force=factor×mass 所以
    // Δv = factor × 256。原系数下 lv 4 橘子合并能给邻居注入 13 px/step、
    // lv 11 能注入 24 px/step，邻居直接被踹飞——表现就是"莫名弹起"
    // （加 cap 前甚至直接飞出画布消失）。缩到 1/3 后最高也只 12 px/step。
    const pushStrength = (PC.mergePushStrengthBase + newLevel * PC.mergePushStrengthPerLevel) * expMult;
    Composite.allBodies(world).forEach(other => {
      if (other === merged || !other.fruitLevel) return;
      const dx = other.position.x - x;
      const dy = other.position.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.1 && dist < pushRange) {
        const factor = pushStrength * (1 - dist / pushRange);
        Body.applyForce(other, other.position, {
          x: (dx / dist) * factor * other.mass,
          y: (dy / dist) * factor * other.mass,
        });
      }
    });

    if (!trialMode) {
      score += FRUITS[newLevel - 1].score;
      if (newLevel > runMaxLevel) {
        runMaxLevel = newLevel;
        highlightEvoChain(runMaxLevel);   // 实时 halo：合到新最高级立刻高亮
      }
      if (newLevel === 11) {
        melonsCount++;
        runMelons++;
        try { localStorage.setItem(MELONS_KEY, String(melonsCount)); } catch (e) {}
      }
    }
    updateScoreUI();
  }

  function createFruitBody(level, x, y, opts = {}) {
    const fruit = FRUITS[level - 1];
    const m = mapPhysics();
    const body = Bodies.circle(x, y, fruit.radius, {
      restitution: m.restitution,    // 用户可调
      friction: PC.fruitFriction,
      frictionStatic: PC.fruitFrictionStatic,
      frictionAir: PC.fruitFrictionAir,
      density: PC.fruitDensity,
      slop: PC.fruitSlop,
      ...opts,
    });
    body.fruitLevel = level;
    body.spawnedAt = performance.now();
    return body;
  }

  // ============ 悬浮水果 + 投放 ============
  // 关键设计：悬浮水果 *不是* Matter body。它只是 {level, x} 数据 + canvas 直接画。
  // 投放时才把它转成一个真正的 dynamic Matter body 加入 world。
  // 这样彻底避开 Matter 的 isStatic/collisionFilter/mass-restoration 等坑。
  let hoverX = W / 2;

  // 键盘左右控制 = 给水果一个力，速度随时间累积（按住越久越快）
  // ACCEL 加速度、MAX_VX 限速、FRICTION 松手摩擦减速；都按 px / ms（与 Matter dt 一致）
  let hoverVx = 0;
  const HOVER_ACCEL    = PC.hoverAccel;
  const HOVER_MAX_VX   = PC.hoverMaxVx;
  const HOVER_FRICTION = PC.hoverFriction;

  function clampHoverX(x, radius) {
    return Math.max(radius + PC.hoverMargin, Math.min(W - radius - PC.hoverMargin, x));
  }

  function spawnHoveringFruit() {
    if (isOver) return;
    ensureQueueFilled();
    const lv = nextLevelQueue.shift();
    hoverFruit = { level: lv, x: hoverX };
    ensureQueueFilled();              // 拿走一个立刻补到 5
    nextLevel = nextLevelQueue[0];    // 维持对外接口
    updateNextFruitUI();
  }

  function moveHover(x) {
    if (!hoverFruit || isOver || isPaused) return;
    hoverX = x;
    hoverFruit.x = x;
  }

  // 基础版防"鼠标狂点 = 喷泉"：放下水果后等 X ms 才 spawn 下一颗 hover。
  // 视觉上"光标位置没水果可放" → 自然就压住了狂点；hover 出来再点。
  // fountain / unlimited 不延迟（fountain 自己有 5s+1s 节流，unlimited 全开）。
  const BASIC_RESPAWN_MS = 300;
  let hoverRespawnTimer = null;
  function clearHoverRespawn() {
    if (hoverRespawnTimer) {
      clearTimeout(hoverRespawnTimer);
      hoverRespawnTimer = null;
    }
  }

  function dropCurrent() {
    if (!hoverFruit || isOver || isPaused) return;
    const fruit = FRUITS[hoverFruit.level - 1];
    const x = clampHoverX(hoverFruit.x, fruit.radius);
    // 直接创建 dynamic body — 不走 isStatic/collisionFilter 那一套
    const body = createFruitBody(hoverFruit.level, x, SPAWN_Y);
    World.add(world, body);
    hoverFruit = null;
    hoverVx = 0;             // 下个水果从静止开始，方向键速度不残留

    // 试玩模式：每扔一次减 1，到 0 后等 1.5 秒结束试玩
    if (trialMode) {
      trialDropsLeft--;
      if (trialDropsLeft <= 0) {
        const t = trialToken;
        setTimeout(() => { if (t === trialToken) endTrial(); }, 1500);
        return;
      }
    }

    // 无喷泉的竞技模式（经典/地震）：延迟 spawn hover 防鼠标狂点当喷泉；喷泉/自由立刻 spawn。
    clearHoverRespawn();
    if (!currentPreset().fountain && !unlimitedMode) {
      hoverRespawnTimer = setTimeout(() => {
        hoverRespawnTimer = null;
        if (!isOver && gameStarted) spawnHoveringFruit();
      }, BASIC_RESPAWN_MS);
    } else {
      spawnHoveringFruit();
    }
  }

  // ============ 输入：鼠标 / 触屏 / 键盘 ============
  function getCanvasX(e) {
    const rect = $canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return ((clientX - rect.left) / rect.width) * W;
  }

  // 鼠标 / 触屏直接定位水果时清零键盘累积速度，避免松开方向键后还在漂
  $canvas.addEventListener('mousemove', e => {
    moveHover(getCanvasX(e));
    hoverVx = 0;
  });
  $canvas.addEventListener('click', e => {
    moveHover(getCanvasX(e));
    hoverVx = 0;
    dropCurrent();
  });

  let touchActive = false;
  $canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    // 多指防误触：已有活跃触点时忽略后续手指，不重置 hover 位置（否则第二指落下会跳位）
    if (touchActive) return;
    touchActive = true;
    moveHover(getCanvasX(e));
    hoverVx = 0;
  }, { passive: false });
  $canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (touchActive) { moveHover(getCanvasX(e)); hoverVx = 0; }
  }, { passive: false });
  $canvas.addEventListener('touchend', e => {
    e.preventDefault();
    // 还有别的手指按着 → 不投放、不清 touchActive；只有最后一根手指抬起才落子
    if (e.touches.length > 0) return;
    if (touchActive) dropCurrent();
    touchActive = false;
  }, { passive: false });

  // 按键状态（持续按住时每帧平滑移动）
  const keyState = { left: false, right: false };
  document.addEventListener('keydown', e => {
    // konami 全程接收（无论是否聚焦），方便用户随时玩彩蛋
    pushKonami(e.key);
    pushTypedSecret(e.key);   // 打字暗号（clean/fuck/peek/gravity/disco/?score）
    // 没聚焦游戏 → 让浏览器自然处理（上下滚动等）
    if (!gameFocused) return;
    if (isOver || isPaused) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (hoverFruit) keyState.left = true;
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (hoverFruit) keyState.right = true;
    } else if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      const now = performance.now();
      // 第一次按下（非 autorepeat）记录起始时间
      if (!e.repeat) spaceHeldSince = now;
      if (!unlimitedMode) {
        if (!currentPreset().fountain) {
          // 无喷泉的竞技模式（经典 / 地震）：完全禁喷泉。autorepeat（按住空格连发）
          // 一律拦截，只让首次 keydown 落一颗。
          if (e.repeat) return;
        } else {
          // 喷泉模式：5s 长按 + 1s 冷却。
          if (now < fountainCooldownUntil) return;
          // 刚出冷却 + 按键按着没松：重新开 5s 窗
          if (fountainCooldownUntil > 0 && spaceHeldSince === null) {
            spaceHeldSince = now;
            fountainCooldownUntil = 0;
          }
          // 这一次连按已经超 5s？触发 1s 冷却
          if (spaceHeldSince !== null && now - spaceHeldSince >= FOUNTAIN_MAX_MS) {
            fountainCooldownUntil = now + FOUNTAIN_COOLDOWN_MS;
            spaceHeldSince = null;
            showCheatToast(`🚿 喷泉冷却 ${FOUNTAIN_COOLDOWN_MS / 1000} 秒`, '#ffb380');
            return;
          }
        }
        // 自由模式走 unlimitedMode 分支（上面的 !unlimitedMode 直接跳过），无限投放。
      }
      dropCurrent();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // 配合 konami：阻止页面上下滚动
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', e => {
    if (!gameFocused) return;
    if (e.key === 'ArrowLeft') keyState.left = false;
    else if (e.key === 'ArrowRight') keyState.right = false;
    else if (e.key === ' ' || e.key === 'Spacebar') spaceHeldSince = null;
  });

  // 焦点跟踪：点游戏区内 → 接管键盘；点游戏外 → 释放键盘
  function setFocus(focused) {
    gameFocused = focused;
    $gameZone.classList.toggle('focused', focused);
    // 释放焦点时清掉持续按键状态
    if (!focused) {
      keyState.left = false;
      keyState.right = false;
    }
  }
  document.addEventListener('click', (e) => {
    if ($gameZone.contains(e.target)) {
      setFocus(true);
    } else {
      setFocus(false);
    }
  });

  // ============ 游戏循环 ============
  function tick(now) {
    if (!engine) return;
    try {
      // 重力暗号到期自动恢复：每帧检查一次，如果状态变了就 sync 一下 engine.gravity.
      // 用本地标志比较，避免每帧都 setBaseScale 一遍 engine（其实代价微薄，但显式更清晰）
      const wantReversed = performance.now() < gravityReversalUntil;
      if (wantReversed !== _gravityWasReversed) {
        applyPhysicsLive();
        _gravityWasReversed = wantReversed;
      }
      if (!isPaused && !isOver) {
        // 真实 dt：手机端 touchstart preventDefault 会占用主线程几十 ms，
        // 下一帧 RAF 回来时 now - lastTick 可能 > 30 ms。cap 到 64 ms 防止
        // tab 切换长时间冻结后的回弹积累。
        const realDt = Math.min(64, now - lastTick);
        // 持续按键 → 给水果一个加速度，velocity 随时间累积（按住越久越快）
        // 松手时摩擦让 velocity 衰减回 0，撞墙立刻清零（不残留方向积压）
        if (hoverFruit) {
          const dir = (keyState.right ? 1 : 0) - (keyState.left ? 1 : 0);
          if (dir !== 0) {
            hoverVx += dir * HOVER_ACCEL * realDt;
            if (hoverVx >  HOVER_MAX_VX) hoverVx =  HOVER_MAX_VX;
            if (hoverVx < -HOVER_MAX_VX) hoverVx = -HOVER_MAX_VX;
          } else if (hoverVx !== 0) {
            const decay = HOVER_FRICTION * realDt;
            if (hoverVx > 0) hoverVx = Math.max(0, hoverVx - decay);
            else             hoverVx = Math.min(0, hoverVx + decay);
          }
          if (hoverVx !== 0) {
            const fruit = FRUITS[hoverFruit.level - 1];
            const newX = hoverFruit.x + hoverVx * realDt;
            const clampedX = clampHoverX(newX, fruit.radius);
            if (clampedX !== newX) hoverVx = 0;     // 撞墙 → 速度清零
            moveHover(clampedX);
          }
        }
        // ============ 物理积分：固定子步长 ============
        // Matter.js 的位置积分是 verlet：accel × dt² 进入加速度。dt=33ms 的 dt²
        // 比正常 dt=16ms 的大 4 倍多，会把堆叠水果的微小穿入一次性 resolve、
        // restitution 反弹放大——表现就是手机端 touchstart 后下一帧"瞬间炸开"。
        // 修复：把 realDt 拆成 N 个 ~16ms 子步，每步独立 Engine.update + 速度
        // 校准，物理永远是稳定的小步长。realDt 60ms 时跑 4 步，每步 15ms。
        const subSteps = Math.max(1, Math.min(PC.maxSubSteps, Math.ceil(realDt / PC.subStepTargetMs)));
        const stepDt = realDt / subSteps;
        // MAX_VEL 22：墙半厚 8 + 樱桃半径 13 + 1 安全边距。配合 sub-stepping
        // 后单步真实位移 ≤ 22 × stepDt/16 ≈ 22，仍小于穿墙阈值。提到 22 是
        // 因为 14 太低——frictionAir 终端速度 48 永远达不到，14 直接锁死下落
        // 后半段，看起来像"明显减速"。22 仍能保证安全又给下落留自然加速感。
        const MAX_VEL = PC.maxVel;
        // REST_VEL 0.15：原本 0.4 太高，正常摇晃也被冻住，缺自然 jitter。
        // 0.15 只冻"几乎完全静止"的水果，保留自然抖动。
        const REST_VEL = PC.restVel;
        const REST_OMEGA = PC.restOmega;
        const SUPPORT_MARGIN = PC.supportMargin;

        for (let step = 0; step < subSteps; step++) {
          const fruits = Composite.allBodies(world).filter(b => b.fruitLevel);
          fruits.forEach(b => {
            const vx = b.velocity.x, vy = b.velocity.y;
            if (Math.abs(vx) > MAX_VEL || Math.abs(vy) > MAX_VEL) {
              Body.setVelocity(b, {
                x: Math.max(-MAX_VEL, Math.min(MAX_VEL, vx)),
                y: Math.max(-MAX_VEL, Math.min(MAX_VEL, vy)),
              });
            }
            // 主动归零：替代 enableSleeping。检查每颗水果，如果速度极低且
            // 下方有支撑（地面 / 其他水果），就把 v 和 ω 强制清零——既消掉
            // verlet 误差累积导致的"莫名弹起"，又不会冻结空中水果（抛物线
            // 顶点不会有支撑）。
            const speed = Math.hypot(b.velocity.x, b.velocity.y);
            if (speed > REST_VEL || Math.abs(b.angularVelocity) > REST_OMEGA) return;
            let supported = false;
            if (b.position.y + b.circleRadius >= H - WALL / 2 - SUPPORT_MARGIN) supported = true;
            if (!supported) {
              for (let i = 0; i < fruits.length; i++) {
                const o = fruits[i];
                if (o === b) continue;
                const dx = b.position.x - o.position.x;
                const dy = b.position.y - o.position.y;
                const dist = Math.hypot(dx, dy);
                const touchDist = b.circleRadius + o.circleRadius + SUPPORT_MARGIN;
                // 严格化 support：o 必须明确在 b 下方（b 高于 o 至少 b.r*0.2），
                // 不能只是同高度邻居。原本 dy <= b.r*0.5 太松，让 slow 水果被
                // 邻居"误判为支撑"过早冻住，看起来僵硬。
                if (dist < touchDist && dy < -b.circleRadius * 0.2) {
                  supported = true;
                  break;
                }
              }
            }
            if (supported) {
              Body.setVelocity(b, { x: 0, y: 0 });
              Body.setAngularVelocity(b, 0);
            }
          });
          Engine.update(engine, stepDt);
        }
        // Sanity cleanup：出界即 remove（NaN 也删）。
        // 之前的 teleport 方案会把出界水果硬塞回墙边，往往落在已有水果上，
        // dampen 又立刻把它冻在嵌入状态——这是上次"水果嵌入"bug 的源头。
        // 简单 delete 即可：refitCanvas active-play 跳过已经治了 iOS Safari
        // URL 栏 bug；其余冲量出界场景极少。
        Composite.allBodies(world).forEach(b => {
          if (!b.fruitLevel) return;
          const x = b.position.x, y = b.position.y;
          if (!Number.isFinite(x) || !Number.isFinite(y) ||
              y > H + 50 || x < -50 || x > W + 50) {
            World.remove(world, b);
          }
        });
        checkProximityMerges();   // 接触合并（替代 collisionStart）
        maybeTriggerTremor(now);  // 地震 feature：定时给所有水果随机扰动
        checkDanger(now);
        recentMerges.clear();
      }
      lastTick = now;
      drawScene();
    } catch (err) {
      console.error('[suika] tick error:', err);
    }
    requestAnimationFrame(tick);
  }

  // 每帧扫一次：所有同 level 水果对，距离 ≤ 半径和 × 用户设置粘性 → 合并
  function checkProximityMerges() {
    const tolerance = mapPhysics().mergeTolerance;
    // 幻影合并修复：合并「跨缝」= (容差-1)×半径和，随半径线性放大，大果的缝可达 ~14px（看着没挨上就合了）。
    // 改成对这条缝封顶 gapCap 像素：小果的缝本来就 <cap，维持原样（不会变得更容易）；只削大果那条夸张的缝。
    // 自由模式 gapCap=Infinity → 完全等于旧行为，「合并粘性」滑条照样能玩出「靠近就合」。
    const gapCap = currentPreset().mergeGapCapPx;
    const byLv = {};
    Composite.allBodies(world).forEach(b => {
      if (!b.fruitLevel) return;
      if (b.fruitLevel >= 11) return;
      if (!byLv[b.fruitLevel]) byLv[b.fruitLevel] = [];
      byLv[b.fruitLevel].push(b);
    });
    Object.values(byLv).forEach(arr => {
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i];
        if (recentMerges.has(a.id)) continue;
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j];
          if (recentMerges.has(a.id) || recentMerges.has(b.id)) continue;
          const dx = a.position.x - b.position.x;
          const dy = a.position.y - b.position.y;
          const dist = Math.hypot(dx, dy);
          const sum = a.circleRadius + b.circleRadius;
          const touchDist = sum + Math.min((tolerance - 1) * sum, gapCap);
          if (dist < touchDist) {
            recentMerges.add(a.id);
            recentMerges.add(b.id);
            mergeFruits(a, b);
          }
        }
      }
    });
  }

  // 地震：每隔 tremorIntervalMs（带 ±30% 噪声）给所有「已落定」水果一个随机
  // 方向的微小冲击。同时设置 camera shake 状态，让 drawScene 给整个画幅加
  // 一个临时 translate 偏移——视觉上是"画面在抖"。
  // 关键：跳过仍在自由下落的水果（spawnedAt 1.5s 缓冲 + |vy| 阈值），让下落
  // 物体保持惯性参考系——地面在动但空中物体保持原本竖直轨迹，符合物理直觉。
  function triggerTremor() {
    const m = mapPhysics();
    const baseAmp = m.tremorAmplitude;
    const now = performance.now();
    Composite.allBodies(world).forEach(b => {
      if (!b.fruitLevel || b.isStatic) return;
      if (now - (b.spawnedAt || 0) < 1500) return;       // 刚落下的不抖
      if (Math.abs(b.velocity.y) > 1.5) return;          // 仍在显著下落的不抖
      const ampl = baseAmp * (0.7 + Math.random() * 0.6);
      const angle = Math.random() * Math.PI * 2;
      Body.applyForce(b, b.position, {
        x: Math.cos(angle) * ampl * b.mass,
        y: Math.sin(angle) * ampl * b.mass,              // y 方向不再减半，全方位震
      });
    });
    // Camera shake（可被 PHYSICS.shakeView 关掉，护眼）：
    // 关闭时只跑物理扰动，不触发画面位移
    if (PHYSICS.shakeView) {
      lastTremorTime = now;
      const shakeBase = m.tremorShakePx;
      const shakeAngle = Math.random() * Math.PI * 2;
      tremorShakeAmpX = Math.cos(shakeAngle) * shakeBase * (0.7 + Math.random() * 0.6);
      tremorShakeAmpY = Math.sin(shakeAngle) * shakeBase * (0.7 + Math.random() * 0.6);
    }
  }
  // 当前帧 camera shake 偏移：振荡频率 ~16Hz、指数衰减、~600ms 后归零
  function getShakeOffset(now) {
    const dt = now - lastTremorTime;
    if (dt < 0 || dt > 600) return { x: 0, y: 0 };
    const decay = Math.exp(-dt / 130);
    const phase = dt * 0.1;     // 0.1 cycle/ms ≈ 16 Hz
    return {
      x: tremorShakeAmpX * Math.sin(phase * 2 * Math.PI) * decay,
      y: tremorShakeAmpY * Math.sin(phase * 2 * Math.PI + Math.PI / 3) * decay,
    };
  }
  function maybeTriggerTremor(now) {
    if (activePhysics.tremor <= 0) return;
    if (isPaused || isOver) return;
    // 试玩模式也允许触发，方便用户调参时立刻感受效果
    if (!gameStarted && !trialMode) return;
    if (nextTremorAt === 0) {
      // 第一次：随机延迟，避免开局就抖
      nextTremorAt = now + 1000 + Math.random() * 1500;
      return;
    }
    if (now >= nextTremorAt) {
      triggerTremor();
      const m = mapPhysics();
      const interval = m.tremorIntervalMs * (0.7 + Math.random() * 0.6);
      nextTremorAt = now + interval;
    }
  }

  function checkDanger(now) {
    if (!gameStarted) return;  // 试一试 / 开始幕未关闭时不判 game over
    // gravity 暗号期间 + 6s 缓冲跳过危险检测。3s 反转水果加速到 MAX_VEL 飞出顶部，
    // 重力恢复后还要：减速到停（~1-2s）+ 从画面外（高至 -数百 px）落回（~1-2s）+
    // 触底反弹合并稳定（~1-2s）。整个 6s 是保守覆盖最不利情况，避免误杀。
    if (now < gravityReversalUntil + 6000) {
      dangerSince = null;
      lastInDangerTime = 0;
      return;
    }
    let inDanger = false;
    Composite.allBodies(world).forEach(b => {
      if (!b.fruitLevel) return;
      // 跳过静态 body（包括顶部悬浮的水果——它本来就在危险线上方但不算）
      if (b.isStatic) return;
      // 给水果生成后的 1.5 秒缓冲，避免刚下落瞬间被判
      if (now - (b.spawnedAt || 0) < 1500) return;
      // 顶端越过危险线就算（不再加 speed 阈值——堆叠的水果常因新水果撞击有
      // 微小晃动 speed > 0.3，原来的"且 speed < 0.3"几乎永远不成立，导致水果
      // 堆超过危险线很久也不被判败）
      if (b.position.y - b.circleRadius < DANGER_Y) {
        inDanger = true;
      }
    });
    if (inDanger) {
      lastInDangerTime = now;
      if (!dangerSince) dangerSince = now;
      if (now - dangerSince > 2000) gameOver();
    } else if (dangerSince) {
      // 800ms grace：短暂离开危险区（合并爆炸把堆顶水果推开瞬间）不立即
      // reset 倒计时，否则反复 reset 永远凑不满 2 秒
      if (now - lastInDangerTime > 800) {
        dangerSince = null;
      }
    }
  }

  function drawScene() {
    ctx.clearRect(0, 0, W, H);

    // Camera shake：所有 draw 操作都跟着 translate 一起偏移，视觉上"画面在抖"
    const shake = getShakeOffset(performance.now());
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // 危险线 — 画到 canvas 实际宽度（避免 W 跟 canvas.width 之间任何不同步导致截短）
    const cw = $canvas.width;
    const dangerProgress = dangerSince ? Math.min(1, (performance.now() - dangerSince) / 2000) : 0;
    ctx.strokeStyle = `rgba(231, 76, 60, ${0.5 + dangerProgress * 0.5})`;
    ctx.lineWidth = dangerProgress > 0 ? 2.5 : 1.5;
    ctx.setLineDash([8, 6]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, DANGER_Y);
    ctx.lineTo(cw, DANGER_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';

    // 投放预测线（点划线）
    if (hoverFruit && !isOver && !isPaused) {
      const fruit = FRUITS[hoverFruit.level - 1];
      const x = clampHoverX(hoverFruit.x, fruit.radius);
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(x, SPAWN_Y);
      ctx.lineTo(x, H - WALL);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 所有已投放的水果（在 Matter 里）
    Composite.allBodies(world).forEach(b => {
      if (!b.fruitLevel) return;
      drawFruitAt(FRUITS[b.fruitLevel - 1], b.position.x, b.position.y, b.circleRadius, b.angle);
    });

    // 悬浮水果（不在 Matter 里，最后画在最上层）
    if (hoverFruit && !isOver && !isPaused) {
      const fruit = FRUITS[hoverFruit.level - 1];
      const x = clampHoverX(hoverFruit.x, fruit.radius);
      drawFruitAt(fruit, x, SPAWN_Y, fruit.radius, 0);
    }

    ctx.restore();   // 结束 camera shake translate

    // 暂停遮罩在 shake 之外，不跟着抖
    if (isPaused) {
      ctx.fillStyle = 'rgba(20, 25, 30, 0.65)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏸ 暂停', W / 2, H / 2);
    }
  }

  // 简洁方案：彩色渐变圆 + Twemoji PNG 居中（统一图源，跨平台一致，物理也是真的圆）
  function drawFruitAt(fruit, x, y, r, angle) {
    // 计算 fillColor / lightColor / darkColor。
    // 默认走 fruit.color (hex)，配 lightenColor / darkenColor。
    // disco 暗号期间改成 HSL，hue 由 level + 时间漂移（lighten/darken 直接调 HSL lightness）。
    let fillColor, lightColor, darkColor;
    const now = performance.now();
    if (now < discoModeUntil) {
      const hue = (fruit.lv * 50 + now / 8) % 360;
      const h = (hue + 360) % 360;
      fillColor  = `hsl(${h.toFixed(0)}, 78%, 55%)`;
      lightColor = `hsl(${h.toFixed(0)}, 80%, 75%)`;
      darkColor  = `hsl(${h.toFixed(0)}, 70%, 38%)`;
    } else {
      fillColor  = fruit.color;
      lightColor = lightenColor(fruit.color, 30);
      darkColor  = darkenColor(fruit.color, 20);
    }
    // 彩色渐变圆（高光在左上）
    const grad = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.3, r * 0.1,
      x, y, r
    );
    grad.addColorStop(0, lightColor);
    grad.addColorStop(1, fillColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();

    // 边框（跟随当前色加深）
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 中央水果（Twemoji PNG，跟着物理 angle 旋转）
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const drawSize = r * 1.65;   // 略大于圆内接，让水果撑出可见范围
    const img = fruitImages[fruit.lv];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    } else {
      // 兜底：图还没加载完时用 emoji 字符（iOS 可能画不出，但加载完成后就切换）
      ctx.font = `${r * 1.55}px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fruit.emoji, 0, r * 0.06);
    }
    ctx.restore();
  }

  function lightenColor(hex, amt) {
    const c = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((c >> 16) & 255) + amt);
    const g = Math.min(255, ((c >> 8) & 255) + amt);
    const b = Math.min(255, (c & 255) + amt);
    return `rgb(${r},${g},${b})`;
  }
  function darkenColor(hex, amt) {
    const c = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((c >> 16) & 255) - amt);
    const g = Math.max(0, ((c >> 8) & 255) - amt);
    const b = Math.max(0, (c & 255) - amt);
    return `rgb(${r},${g},${b})`;
  }

  // ============ UI 更新 ============
  function updateScoreUI() {
    $curScore.textContent = score;
    if (score > highScore) {
      highScore = score;
      try { localStorage.setItem(HIGH_KEY, String(highScore)); } catch (e) {}
    }
    $highScore.textContent = highScore;
    $melonCount.textContent = melonsCount;
    $melonEmoji.textContent = FRUITS[FRUITS.length - 1].emoji;   // 跟随用户自定义最高级
  }

  function updateNextFruitUI() {
    $nextFruit.textContent = FRUITS[nextLevel - 1].emoji;
  }

  // 主游戏 evo-chain：单行 + 箭头，溢出横向滚动（窄屏可滑动看完）
  function buildEvoChain() {
    $evoChain.innerHTML = FRUITS.map((f, i) => {
      const arrow = i < FRUITS.length - 1 ? '<span class="evo-arrow">→</span>' : '';
      return `<span class="evo-emoji" data-lv="${i + 1}" title="lv ${i + 1}：${f.name}">${f.emoji}</span>${arrow}`;
    }).join('');
    // 重建 DOM 后 .reached class 会丢，重新涂一遍
    if (typeof runMaxLevel !== 'undefined' && runMaxLevel > 0) {
      highlightEvoChain(runMaxLevel);
    }
    updateEvoScrollHint();
  }
  // 溢出（窄屏放不下 11 级）时给 wrapper 加 .is-scrollable → 右缘渐隐提示可滑动。
  function updateEvoScrollHint() {
    if (!$evoChainWrap) return;
    const scrollable = $evoChain.scrollWidth > $evoChain.clientWidth + 2;
    $evoChainWrap.classList.toggle('is-scrollable', scrollable);
  }
  // 给本局合到的最高级水果在进化链里加 .reached 高亮。
  function highlightEvoChain(maxLv) {
    $evoChain.querySelectorAll('span.reached').forEach(s => s.classList.remove('reached'));
    if (!maxLv || maxLv < 1) return;
    const target = $evoChain.querySelector(`span[data-lv="${maxLv}"]`);
    if (target) target.classList.add('reached');
  }

  // ============ 调参面板：合成链表情自定义 ============
  // 23 列错位 S 型 + 行内箭头 + SVG 弯曲连接：
  // - row 1: lv 1-6 各占 3 cols，箭头 → 占 1 col 中间
  // - row 2: lv 11..7 各占 3 cols（HTML 顺序），箭头 ← 占 1 col 中间，
  //          整体相对 row 1 偏移 2 cols，让 row 2 各 slot 真正插在 row 1 两 slot 之间下方
  // - 弯曲 SVG 跨 row 1-2 cols 21-23，从 slot 6（右上）弯到 slot 7（左下）
  function renderChainEditor() {
    const $disp = document.getElementById('custom-chain-display');
    if (!$disp) return;
    const html = [];

    // Row 1: slot 1-6 + 5 个 → 箭头
    for (let lv = 1; lv <= 6; lv++) {
      const cp = chainCps[lv - 1];
      const lib = EMOJI_LIBRARY.find(e => e.cp === cp) || { emoji: '?', name: '?' };
      const sel = selectedSlotLevel === lv ? ' selected' : '';
      const slotStartCol = (lv - 1) * 4 + 1;   // 1, 5, 9, 13, 17, 21
      html.push(
        `<div class="custom-chain-cell" style="grid-row: 1; grid-column: ${slotStartCol} / span 3">`
        + `<span class="custom-chain-slot${sel}" data-level="${lv}" title="lv ${lv}：${lib.name}">${lib.emoji}</span>`
        + `<span class="custom-chain-lv">${lv}</span>`
        + `</div>`
      );
      if (lv < 6) {
        const arrowCol = slotStartCol + 3;     // 4, 8, 12, 16, 20
        html.push(`<span class="custom-chain-arrow-inline" style="grid-row: 1; grid-column: ${arrowCol}">→</span>`);
      }
    }

    // Bend：unicode ⤶「向下然后向左弯」，和其他 → ← 同款字符箭头，跨 row 1-2
    // 居中显示在 cols 22-23 区域。比内联箭头略大，但风格一致。
    html.push(
      `<span class="custom-chain-bend" style="grid-row: 1 / span 2; grid-column: 22 / span 2" aria-hidden="true">⤶</span>`
    );

    // Row 2: HTML 顺序 slot 11, 10, 9, 8, 7 + 4 个 ← 箭头
    for (let i = 0; i < 5; i++) {
      const lv = 11 - i;
      const cp = chainCps[lv - 1];
      const lib = EMOJI_LIBRARY.find(e => e.cp === cp) || { emoji: '?', name: '?' };
      const sel = selectedSlotLevel === lv ? ' selected' : '';
      const slotStartCol = i * 4 + 3;          // 3, 7, 11, 15, 19
      html.push(
        `<div class="custom-chain-cell" style="grid-row: 2; grid-column: ${slotStartCol} / span 3">`
        + `<span class="custom-chain-slot${sel}" data-level="${lv}" title="lv ${lv}：${lib.name}">${lib.emoji}</span>`
        + `<span class="custom-chain-lv">${lv}</span>`
        + `</div>`
      );
      if (i < 4) {
        const arrowCol = slotStartCol + 3;     // 6, 10, 14, 18
        html.push(`<span class="custom-chain-arrow-inline" style="grid-row: 2; grid-column: ${arrowCol}">←</span>`);
      }
    }

    $disp.innerHTML = html.join('');
    $disp.querySelectorAll('.custom-chain-slot').forEach(el => {
      el.addEventListener('click', () => onChainSlotClick(parseInt(el.dataset.level, 10)));
    });
    renderEmojiPicker();
  }

  function renderEmojiPicker() {
    const $picker = document.getElementById('custom-chain-picker');
    const $grid = document.getElementById('custom-chain-picker-grid');
    const $hint = document.getElementById('custom-chain-picker-hint');
    if (!$picker || !$grid) return;
    if (selectedSlotLevel === null) {
      $picker.style.display = 'none';
      return;
    }
    $picker.style.display = '';
    const currentLib = EMOJI_LIBRARY.find(e => e.cp === chainCps[selectedSlotLevel - 1]);
    if ($hint) {
      $hint.innerHTML = `选中 <strong>lv ${selectedSlotLevel}（当前 ${currentLib?.emoji || '?'}）</strong>。点下方任意表情替换；或点合成链上另一格交换位置；再次点当前格取消。`;
    }
    // 排除已在链上的 cp（含当前 slot）—— 想用链上的就走"点链上另一格"路径
    const usedSet = new Set(chainCps);
    const candidates = EMOJI_LIBRARY.filter(e => !usedSet.has(e.cp));
    $grid.innerHTML = candidates.map(e =>
      `<span class="custom-chain-picker-item" data-cp="${e.cp}" title="${e.name}">${e.emoji}</span>`
    ).join('');
    $grid.querySelectorAll('.custom-chain-picker-item').forEach(el => {
      el.addEventListener('click', () => {
        setChainSlot(selectedSlotLevel, el.dataset.cp);
        selectedSlotLevel = null;
        renderChainEditor();
      });
    });
  }

  function onChainSlotClick(level) {
    if (selectedSlotLevel === null) {
      selectedSlotLevel = level;
    } else if (selectedSlotLevel === level) {
      selectedSlotLevel = null;     // 再次点当前 → 取消
    } else {
      swapChainSlots(selectedSlotLevel, level);
      selectedSlotLevel = null;
    }
    renderChainEditor();
  }

  function setChainSlot(level, cp) {
    chainCps[level - 1] = cp;
    const changed = applyChainCps();
    changed.forEach(reloadFruitImage);
    saveChain();
    buildEvoChain();
    updateNextFruitUI();           // 下一个水果显示也可能受影响
    updateScoreUI();               // melon-emoji 也跟着最高级表情刷新
  }

  function swapChainSlots(la, lb) {
    const tmp = chainCps[la - 1];
    chainCps[la - 1] = chainCps[lb - 1];
    chainCps[lb - 1] = tmp;
    const changed = applyChainCps();
    changed.forEach(reloadFruitImage);
    saveChain();
    buildEvoChain();
    updateNextFruitUI();
    updateScoreUI();              // melon-emoji 也跟着最高级表情刷新
  }

  function resetChain() {
    chainCps = [...DEFAULT_CHAIN_CPS];
    const changed = applyChainCps();
    changed.forEach(reloadFruitImage);
    saveChain();
    selectedSlotLevel = null;
    renderChainEditor();
    buildEvoChain();
    updateNextFruitUI();
    updateScoreUI();              // melon-emoji 也跟着最高级表情刷新
  }

  // ============ 游戏控制 ============
  function gameOver() {
    if (isOver) return;
    isOver = true;
    hoverFruit = null;  // 清掉悬浮（纯数据，不需要 World.remove）
    clearHoverRespawn(); // 也清掉等待 spawn 的 timer，免得 game-over 后冒出 hover
    hoverVx = 0;
    clearSaveState();   // 局已结束，存档没意义了
    $ovTitle.textContent = '游戏结束';
    $ovScore.textContent = score;
    $ovBest.style.display = (score >= highScore && score > 0) ? '' : 'none';
    const topEmoji = FRUITS[FRUITS.length - 1].emoji;
    $ovMessage.textContent = score === 0 ? '一个表情都没合？再试一次。' :
      melonsCount === 0 ? `本局得 ${score} 分，离 ${topEmoji} 还差点。` :
      `本局得 ${score} 分，累计 ${melonsCount} 个 ${topEmoji}，继续！`;

    // 截图：composeSnapshot 把游戏画面 + 标题/分数/进化总结合成一张分享卡。
    // 这里 rankInfo=null 表示「排名还在 loading」，submitToLeaderboard 完成后会再 compose 一次。
    refreshSnapshot(null);

    // 进化链高亮 + 结算 summary
    highlightEvoChain(runMaxLevel);
    if (runMaxLevel > 0) {
      const f = FRUITS[runMaxLevel - 1];
      $ovEvoSummary.innerHTML =
        `本局合到 <strong>lv ${runMaxLevel}</strong> ` +
        `<span class="reached-emoji">${f.emoji}</span> ${f.name}` +
        ` · 累计 <strong>${melonsCount}</strong> 颗 🍉`;
    } else {
      $ovEvoSummary.textContent = '一颗水果都没合，下一局加油。';
    }

    // 若结算前正开着调参幕（游戏中打开 settings 后点结算），先关掉它并清 inGameSettings，
    // 否则起始幕与结束幕两个 inset:0 overlay 会叠加，且 inGameSettings 残留 true 会污染
    // 下次打开设置的暂停还原逻辑。gameOver 是所有结算路径的唯一终点，放这里覆盖最全。
    $startOverlay.classList.remove('open');
    inGameSettings = false;
    $overlay.classList.add('open');
    $gameZone.classList.add('over');

    // 异步提交分数到排行榜（不阻塞 overlay 显示）
    setupNicknameUI();
    submitToLeaderboard();
  }

  // 清掉「跨局残留」的瞬态物理/暗号状态：重力反转、disco 彩虹、地震排程。
  // restart / startGame / 回主菜单 都调它——避免上一局临结束触发的 gravity/disco 暗号
  // 或地震排程渗进新一局（表现：新局开局瞬间抖动、彩虹串场、checkDanger 被静默跳过数秒）。
  function resetTransientRunState() {
    gravityReversalUntil = 0;
    discoModeUntil = 0;
    _gravityWasReversed = false;
    nextTremorAt = 0;
  }

  // 控制栏 / 预览条只在开局后出现：未开局时藏起来，避免「重开」绕过模式选择器直接开局。
  const $controlsRow = document.getElementById('controls-row');
  const $previewRow = document.getElementById('preview-row');
  function setGameChromeVisible(show) {
    if ($controlsRow) $controlsRow.hidden = !show;
    if ($previewRow) $previewRow.hidden = !show;
  }

  function restart() {
    if (engine) {
      World.clear(world, false);
      Engine.clear(engine);
    }
    resetTransientRunState();
    isOver = false;
    isPaused = false;
    score = 0;
    dangerSince = null;
    lastInDangerTime = 0;
    nextTremorAt = 0;
    hoverFruit = null;
    hoverVx = 0;
    runMaxLevel = 0;
    runMelons = 0;
    runCheatUsage = {};
    // 重开时 gameMode 沿用上局菜单选择；自由模式重开仍是自由。
    syncActivePhysics();
    unlimitedMode = (gameMode === 'free');
    spaceHeldSince = null;
    fountainCooldownUntil = 0;
    clearHoverRespawn();
    runStartedAt = Date.now();
    currentRunNonce = newRunNonce();
    pendingSubmitForRun = false;
    nextLevelQueue = [];
    ensureQueueFilled();
    nextLevel = nextLevelQueue[0];
    $overlay.classList.remove('open');
    $gameZone.classList.remove('over');
    $pauseBtn.textContent = '⏸ 暂停';
    // 清结算面板的 leaderboard 子组件，避免下次 game over 前看到旧数据闪现
    $ovSnapshot.style.display = 'none';
    $ovSnapshot.removeAttribute('src');
    $ovRank.className = 'ov-rank-row';
    $ovRank.innerHTML = '';
    $ovEvoSummary.innerHTML = '';
    $ovNickForm.style.display = 'none';
    $ovNickTag.style.display = 'none';
    highlightEvoChain(0);
    fitCanvas();   // 把上局期间被跳过的 viewport 变化（如手机屏旋转）补上
    setupWorld();
    spawnHoveringFruit();
    updateScoreUI();
    updateNextFruitUI();
    gameStarted = true;
    setGameChromeVisible(true);
    setFocus(true);
  }

  function startGame() {
    // 试玩状态清干净
    ++trialToken;         // 作废在途试玩定时器（含已排程的 endTrial），防其回来切视图/删果
    trialMode = false;
    // 清掉「试一试」可能留下的水果
    const lingering = Composite.allBodies(world).filter(b => b.fruitLevel);
    if (lingering.length) World.remove(world, lingering);
    resetTransientRunState();   // 新局不继承上局暗号/地震残留
    $startOverlay.classList.remove('open');
    gameStarted = true;
    setGameChromeVisible(true);
    setFocus(true);
    // 开局重置 leaderboard 相关本局状态（restart 也走这个分支）
    runMaxLevel = 0;
    runMelons = 0;
    runCheatUsage = {};
    // 菜单选了自由模式 → 立即进 unlimitedMode（跳过暗号 budget、无限投放）；本局不上传排名。
    syncActivePhysics();
    unlimitedMode = (gameMode === 'free');
    spaceHeldSince = null;
    fountainCooldownUntil = 0;
    clearHoverRespawn();
    runStartedAt = Date.now();
    currentRunNonce = newRunNonce();
    pendingSubmitForRun = false;
    spawnHoveringFruit();
  }
  $startBtn.addEventListener('click', startGame);
  document.getElementById('start-from-settings-btn').addEventListener('click', startGame);

  // 回主菜单：清掉游戏结束幕 + 重置 run state + 打开 start-overlay 主视图
  // 让玩家在结算后能换模式/换链/换调参，不必刷新整页。
  // 回主菜单：结算页「回主菜单」+ 局中调参「放弃本局回主菜单」共用。
  // 清干净一局状态、隐藏控制栏、收回持久模式偏好、显示主视图。
  function backToMainMenu() {
    if (engine) {
      World.clear(world, false);
      Engine.clear(engine);
    }
    setupWorld();
    resetTransientRunState();   // 回主菜单也清干净暗号/地震残留
    ++trialToken;               // 作废任何在途试玩定时器
    trialMode = false;
    isOver = false;
    isPaused = false;
    inGameSettings = false;
    score = 0;
    runMaxLevel = 0;
    runMelons = 0;
    runCheatUsage = {};
    unlimitedMode = false;
    gameStarted = false;
    hoverFruit = null;
    hoverVx = 0;
    spaceHeldSince = null;
    fountainCooldownUntil = 0;
    clearHoverRespawn();
    pendingSubmitForRun = false;
    nextLevelQueue = [];
    ensureQueueFilled();
    nextLevel = nextLevelQueue[0];
    // 收回持久模式偏好：续局曾把内存 gameMode 改成存档模式而不落盘，回菜单时对齐持久值。
    gameMode = loadGameMode();
    syncActivePhysics();
    setGameChromeVisible(false);
    $overlay.classList.remove('open');
    $gameZone.classList.remove('over');
    $pauseBtn.textContent = '⏸ 暂停';
    $startOverlay.classList.add('open');
    showOverlayView('main');
    setFocus(false);
    updateScoreUI();
    updateNextFruitUI();
    highlightEvoChain(0);
    applyModeSelection();      // 反映当前 gameMode
    refreshSettingsActions();  // 面板锁定状态跟随模式
  }
  document.getElementById('ov-to-menu').addEventListener('click', backToMainMenu);

  // ============ 模式选择器（segmented control）============
  const MODE_DESC_TEXT = {
    basic:      '🎯 标准物理 · 禁喷泉 · 计入经典榜',
    fountain:   '🚿 标准物理 · 长按空格喷 5s 冷却 1s · 计入喷泉榜',
    earthquake: '🌋 标准物理 + 持续地震扰动 · 计入地震榜',
    free:       '♾ 随便调参 · 无限暗号 · 可续局 · 只存本地最高（不排名）',
  };
  const $modePicker = document.getElementById('mode-picker');
  const $modeDesc = document.getElementById('mode-desc');
  const $modeTabs = $modePicker ? Array.from($modePicker.querySelectorAll('.mode-tab')) : [];
  function applyModeSelection() {
    $modeTabs.forEach(t => {
      const sel = t.dataset.mode === gameMode;
      t.classList.toggle('selected', sel);
      t.setAttribute('aria-checked', String(sel));
    });
    if ($modeDesc) $modeDesc.textContent = MODE_DESC_TEXT[gameMode] || '';
  }
  $modeTabs.forEach(t => {
    t.addEventListener('click', () => {
      const m = t.dataset.mode;
      if (!VALID_GAME_MODES.includes(m)) return;
      if (m === gameMode) return;
      gameMode = m;
      try { localStorage.setItem(GAMEMODE_KEY, m); } catch (_) {}
      syncActivePhysics();   // 切模式立即改用该模式的物理（竞技=预设，自由=玩家参数）
      applyPhysicsLive();
      applyModeSelection();
      // 竞技模式：同步右侧排行榜到即将玩的这个榜；自由模式没有公开榜，保持当前视图。
      if (MODE_PRESETS[m] && MODE_PRESETS[m].ranked) setLbViewMode(m, true);
    });
  });
  applyModeSelection();

  // ============ 排行榜面板：拉 top + 渲染 ============
  const $lbPanel = document.getElementById('sk-leaderboard');
  const $lbList = document.getElementById('sk-lb-list');
  const $lbTotal = document.getElementById('sk-lb-total');
  const $lbFooter = document.getElementById('sk-lb-footer');
  const $lbRefresh = document.getElementById('sk-lb-refresh');
  const $lbMine = document.getElementById('sk-lb-mine');
  const $lbExpand = document.getElementById('sk-lb-expand');
  const $lbPager = document.getElementById('sk-lb-pager');
  const $lbPrev = document.getElementById('sk-lb-prev');
  const $lbNext = document.getElementById('sk-lb-next');
  const $lbPginfo = document.getElementById('sk-lb-pginfo');
  const $lbTabs = document.getElementById('sk-lb-tabs');
  let lbLastFetch = 0;
  let lbInflight = false;
  let lbReqSeq = 0;   // 榜单请求自增序号，落地时按它丢弃过期请求（防切 tab / 翻页错位渲染）
  let lbExpanded = false;
  let lbPage = 1;             // 1-based
  const LB_LIMIT = 5;
  const LB_PAGE_SIZE = 10;    // 展开模式每页条数
  const LB_MEDALS = ['🥇', '🥈', '🥉'];
  // 当前看的是哪个竞技榜（独立于 gameMode：可以一边玩经典一边看地震榜）。
  // 初始 mirror gameMode；自由模式没有公开榜，初始退回经典榜。点榜单 tab 只切 lbViewMode 不动 gameMode。
  let lbViewMode = isRankedMode() ? gameMode : 'basic';
  let mineLastByMode = { basic: null, fountain: null, earthquake: null };
  // 也缓存 lb 拉到的 entries/total，以便在 loadMyRank 后续回来时拿到 nicks 集合
  // 重新渲染一次（淡色高亮"过去用过的名字"）；切 tab 也能立刻显示已缓存的榜。
  let lbLastByMode = { basic: null, fountain: null, earthquake: null };

  function paintCurrentLeaderboard() {
    const cached = lbLastByMode[lbViewMode];
    if (!cached) return;
    const mine = mineLastByMode[lbViewMode];
    const pastNicks = mine && Array.isArray(mine.nicks) && mine.nicks.length
      ? new Set(mine.nicks)
      : null;
    renderLeaderboard(cached.entries, cached.total, getNick(), pastNicks);
  }

  function applyLbTabUI() {
    if (!$lbTabs) return;
    Array.from($lbTabs.querySelectorAll('.sk-lb-tab')).forEach(t => {
      const sel = t.dataset.mode === lbViewMode;
      t.classList.toggle('is-active', sel);
      t.setAttribute('aria-selected', String(sel));
    });
  }

  // 切换到指定 mode 的榜：更新 UI、清缓存、可选立刻重拉。只接受竞技榜（自由模式无公开榜）。
  function setLbViewMode(mode, refetch) {
    if (!MODE_PRESETS[mode] || !MODE_PRESETS[mode].ranked) return;
    if (lbViewMode === mode && !refetch) return;
    lbViewMode = mode;
    lbPage = 1;        // 切榜时回第一页，避免跨榜页码越界
    lbLastFetch = 0;   // 失效缓存窗口，下次 loadLeaderboard 一定重拉
    // 注意 race：上一次切 tab 触发的 loadLeaderboard 可能还 in-flight。把
    // lbInflight 强制清掉，让新 tab 的 fetch 不被开头的 "if (lbInflight) return;"
    // 拦掉；旧请求落地后会被 fetchMode !== lbViewMode 的 race guard 丢弃。
    lbInflight = false;
    applyLbTabUI();
    // 切榜时立刻反映已缓存的"我的最高" + 已缓存的 lb 列表（即使没 refetch
    // 也能换显示，体感更顺）
    renderMyRank(mineLastByMode[mode]);
    paintCurrentLeaderboard();
    if (refetch !== false) {
      loadLeaderboard(true);
      loadMyRank();
    }
  }

  function relTime(ts) {
    if (!ts || !Number.isFinite(ts)) return '';
    const dt = (Date.now() - ts) / 1000;
    if (dt < 60) return '刚刚';
    if (dt < 3600) return `${Math.floor(dt / 60)} 分钟前`;
    if (dt < 86400) return `${Math.floor(dt / 3600)} 小时前`;
    if (dt < 30 * 86400) return `${Math.floor(dt / 86400)} 天前`;
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function renderLeaderboard(entries, total, currentNick, pastNicks) {
    while ($lbList.firstChild) $lbList.removeChild($lbList.firstChild);
    if (!entries || !entries.length) {
      const li = document.createElement('li');
      li.className = 'sk-lb-empty';
      li.textContent = '榜单还空着，第一个上榜的就是你 ~';
      $lbList.appendChild(li);
      $lbTotal.textContent = '';
      return;
    }
    entries.forEach(e => {
      const li = document.createElement('li');
      if (currentNick && e.nick === currentNick) {
        li.classList.add('is-self');
      } else if (pastNicks && pastNicks.has(e.nick)) {
        // 这台设备过去用过的昵称（改名前的成绩）：浅色高亮
        li.classList.add('is-self-past');
      }
      const rk = document.createElement('span');
      rk.className = 'sk-lb-rank';
      // 前三名颁发奖章 emoji，其余维持 #N
      rk.textContent = e.rank <= 3 ? LB_MEDALS[e.rank - 1] : '#' + e.rank;
      const nk = document.createElement('span');
      nk.className = 'sk-lb-nick';
      nk.textContent = e.nick;       // textContent — 防 XSS
      nk.title = e.nick;
      const sc = document.createElement('span');
      sc.className = 'sk-lb-score';
      sc.textContent = e.score;
      const tm = document.createElement('span');
      tm.className = 'sk-lb-time';
      tm.textContent = relTime(e.ts);
      li.append(rk, nk, sc, tm);
      $lbList.appendChild(li);
    });
    $lbTotal.textContent = `共 ${total} 位玩家`;
  }

  async function loadLeaderboard(force) {
    if (lbInflight) return;
    if (!force && Date.now() - lbLastFetch < 10000) return; // 10s 内不重复打
    lbInflight = true;
    const mySeq = ++lbReqSeq;   // 自增序号：任何被后发请求取代的旧请求一律丢弃（含 setLbViewMode 强清 inflight 后的并发）
    $lbRefresh.classList.add('spinning');
    // 折叠：top 5；展开：第 N 页 LB_PAGE_SIZE 条
    const limit = lbExpanded ? LB_PAGE_SIZE : LB_LIMIT;
    const offset = lbExpanded ? (lbPage - 1) * LB_PAGE_SIZE : 0;
    const fetchMode = lbViewMode;   // 闭包冻住，落地时按它归桶
    const url = `${LEADERBOARD_API}?action=top&mode=${encodeURIComponent(fetchMode)}&limit=${limit}&offset=${offset}`;
    const r = await callBackend(url, {}, 5000);
    if (mySeq !== lbReqSeq) {
      // 已有更晚的请求发出（切 tab / 翻页 / 刷新）→ 丢弃本次，避免错位渲染 + 污染 10s 缓存窗。
      // 不动 lbInflight / spinner：那由最新那个请求负责收尾。
      return;
    }
    $lbRefresh.classList.remove('spinning');
    lbInflight = false;
    if (r.ok && r.data && Array.isArray(r.data.entries)) {
      lbLastFetch = Date.now();
      lbLastByMode[fetchMode] = { entries: r.data.entries, total: r.data.total };
      paintCurrentLeaderboard();
      $lbFooter.textContent = `更新于 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
      updatePagerUI(r.data.total);
    } else {
      if (!lbLastFetch) {
        while ($lbList.firstChild) $lbList.removeChild($lbList.firstChild);
        const li = document.createElement('li');
        li.className = 'sk-lb-empty';
        li.textContent = '榜单暂时拉不到，稍后再试';
        $lbList.appendChild(li);
      }
      $lbFooter.textContent = '更新失败，下次再试';
    }
  }

  function updatePagerUI(total) {
    if (!lbExpanded) {
      $lbPager.style.display = 'none';
      $lbExpand.textContent = '展开完整榜 ↓';
      return;
    }
    const totalPages = Math.max(1, Math.ceil((total || 0) / LB_PAGE_SIZE));
    if (lbPage > totalPages) lbPage = totalPages;
    $lbPager.style.display = '';
    $lbExpand.textContent = '收起 ↑';
    $lbPginfo.textContent = `${lbPage} / ${totalPages}`;
    $lbPrev.disabled = lbPage <= 1;
    $lbNext.disabled = lbPage >= totalPages;
  }

  // —— 我的排名 widget（按 device id 跨昵称追踪，按当前 lbViewMode 查） ——
  async function loadMyRank() {
    const did = getDeviceId();
    if (!did) return;
    const fetchMode = lbViewMode;   // 冻住模式，防 in-flight 时切 tab 把结果错位
    const r = await callBackend(`${LEADERBOARD_API}?action=mine&mode=${encodeURIComponent(fetchMode)}&did=${encodeURIComponent(did)}`, {}, 5000);
    if (!r.ok || !r.data) {
      if (!mineLastByMode[fetchMode] && fetchMode === lbViewMode) renderMyRank(null);
      return;
    }
    mineLastByMode[fetchMode] = r.data;
    if (fetchMode === lbViewMode) {
      renderMyRank(r.data);
      // mine 拉回来后顺便重绘一次榜单，把"过去用过的名字"那条淡色高亮也铺上
      paintCurrentLeaderboard();
    }
  }
  function renderMyRank(data) {
    while ($lbMine.firstChild) $lbMine.removeChild($lbMine.firstChild);
    if (!data || !data.exists) {
      const span = document.createElement('span');
      span.className = 'sk-lb-mine-label';
      // 单一中性文案：不再用 plays>0 猜「玩过但没上传」——那条基本触发不到、且会误伤反复失败的玩家
      span.textContent = '还没上榜 — 来一局看看你的排名 ~';
      $lbMine.appendChild(span);
      return;
    }
    const lbl = document.createElement('span');
    lbl.className = 'sk-lb-mine-label';
    lbl.textContent = '我的最高';
    const line = document.createElement('span');
    line.className = 'sk-lb-mine-line';
    const sc = document.createElement('strong');
    sc.textContent = String(data.bestScore);
    line.appendChild(sc);
    line.appendChild(document.createTextNode(' 分 · 第 '));
    const rk = document.createElement('strong');
    rk.textContent = String(data.rank);
    line.appendChild(rk);
    line.appendChild(document.createTextNode(' 名 / 共 ' + (data.total || 0) + ' 人'));
    $lbMine.append(lbl, line);
    if (data.bestNick || data.plays || data.bestTs) {
      const meta = document.createElement('span');
      meta.className = 'sk-lb-mine-meta';
      const parts = [];
      if (data.bestNick) parts.push('昵称 ' + data.bestNick);
      if (data.plays) parts.push('玩了 ' + data.plays + ' 局');
      if (data.bestTs) parts.push(relTime(data.bestTs));
      meta.textContent = parts.join(' · ');
      $lbMine.appendChild(meta);
    }
  }

  // —— 展开 / 收起 / 翻页事件 ——
  $lbExpand.addEventListener('click', () => {
    lbExpanded = !lbExpanded;
    lbPage = 1;
    loadLeaderboard(true);
  });
  $lbPrev.addEventListener('click', () => {
    if (lbPage > 1) { lbPage--; loadLeaderboard(true); }
  });
  $lbNext.addEventListener('click', () => {
    lbPage++;
    loadLeaderboard(true);
  });

  $lbRefresh.addEventListener('click', () => { loadLeaderboard(true); loadMyRank(); });

  // 模式 tab 点击：切 lbViewMode + 重拉。
  if ($lbTabs) {
    Array.from($lbTabs.querySelectorAll('.sk-lb-tab')).forEach(t => {
      t.addEventListener('click', () => {
        const m = t.dataset.mode;
        if (!VALID_GAME_MODES.includes(m)) return;
        setLbViewMode(m, true);
      });
    });
    applyLbTabUI();
  }

  // 初次进页面就拉一次（榜单 + 自己）
  loadLeaderboard(true);
  loadMyRank();
  // 每 60s 自动刷新一次榜单 + 我的排名
  setInterval(() => { loadLeaderboard(false); loadMyRank(); }, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadLeaderboard(false);
      loadMyRank();
    }
  });

  // ============ 排行榜：上传 / 排名 / 截图 ============
  // 三态 UI：loading → success（"第 X 名 / 共 Y 人"）/ failed（"排行榜暂时不可用"）
  // 三个竞技榜的中文显示名（rank slot / 截图 / 排行榜 tab 通用）
  const MODE_LABEL = { basic: '经典榜', fountain: '喷泉榜', earthquake: '地震榜' };

  // 自由玩法（自由模式 / unlimited 暗号转自由）只存本地个人最高，不进任何公开榜。
  const FREEBEST_KEY = 'tool.suika.freebest.v1';
  function getFreeBest() { return parseInt(localStorage.getItem(FREEBEST_KEY) || '0', 10) || 0; }
  function updateFreeBest(s) {
    try { if (s > getFreeBest()) localStorage.setItem(FREEBEST_KEY, String(s)); } catch (_) {}
  }
  // 本局是不是「计入竞技榜」：竞技模式且没被 unlimited 暗号转自由。
  function isRunRanked() { return currentPreset().ranked && !unlimitedMode; }

  function renderRankSlot(state, data) {
    if (state === 'hidden') {
      $ovRank.className = 'ov-rank-row';
      $ovRank.innerHTML = '';
      return;
    }
    if (state === 'loading') {
      $ovRank.className = 'ov-rank-row loading';
      const modeName = data && data.mode ? MODE_LABEL[data.mode] : '排行榜';
      $ovRank.textContent = `提交到${modeName}…`;
      return;
    }
    if (state === 'success') {
      $ovRank.className = 'ov-rank-row';
      const rank = data && data.rank;
      const total = data && data.total;
      const modeName = data && data.mode ? MODE_LABEL[data.mode] : '';
      if (rank && total) {
        // textContent only — 后端校验过 nick，但前端也不用 innerHTML 拼用户数据
        $ovRank.innerHTML = '';
        const left = document.createTextNode('第 ');
        const rk = document.createElement('strong');
        rk.textContent = String(rank);
        const mid = document.createTextNode(' 名 · 共 ');
        const tot = document.createElement('strong');
        tot.textContent = String(total);
        const right = document.createTextNode(modeName ? ` 位 · ${modeName}` : ' 位玩家');
        $ovRank.append(left, rk, mid, tot, right);
      } else {
        $ovRank.textContent = modeName ? `已记录到${modeName}` : '已记录';
      }
      return;
    }
    if (state === 'failed') {
      $ovRank.className = 'ov-rank-row failed';
      $ovRank.textContent = '排行榜暂时不可用（不影响游戏）';
      return;
    }
    if (state === 'pending') {
      $ovRank.className = 'ov-rank-row failed';
      $ovRank.textContent = '想上排行榜？看下面的昵称表单 ↓';
      return;
    }
    if (state === 'free') {
      $ovRank.className = 'ov-rank-row';
      $ovRank.innerHTML = '';
      const a = document.createTextNode('♾ 自由玩法 · 不计入排名 · 你的最高 ');
      const b = document.createElement('strong');
      b.textContent = String(getFreeBest());
      $ovRank.append(a, b);
      return;
    }
  }

  function setupNicknameUI() {
    // 自由玩法不上榜 → 昵称表单/标签都不显示
    if (!isRunRanked()) {
      $ovNickForm.style.display = 'none';
      $ovNickTag.style.display = 'none';
      return;
    }
    const nick = getNick();
    if (nick) {
      $ovNickForm.style.display = 'none';
      $ovNickTag.style.display = '';
      $ovNickCurrent.textContent = nick;
    } else {
      $ovNickTag.style.display = 'none';
      // autoSettle 模式不弹昵称表单（submit 会用 generateRandomNick 兜底）
      if (settleAutoSettle) {
        $ovNickForm.style.display = 'none';
      } else if (score > 0) {
        $ovNickForm.style.display = '';
        $ovNickError.textContent = '';
        $ovNickInput.value = '';
      } else {
        $ovNickForm.style.display = 'none';
      }
    }
  }

  // 竞技局归到哪个榜：直接就是 gameMode（basic/fountain/earthquake）。自由局不走这里。
  function effectiveSubmitMode() {
    return gameMode;
  }

  // 把本局成绩 POST 到 /api/suika。失败时降级，不阻塞 UI。
  async function submitToLeaderboard() {
    if (!LEADERBOARD_ENABLED) return;
    if (pendingSubmitForRun) return;
    if (score <= 0) { renderRankSlot('hidden'); return; }
    // 自由玩法（自由模式 / unlimited 暗号转自由）：不上传，只更新并显示本地个人最高。
    if (!isRunRanked()) {
      updateFreeBest(score);
      renderRankSlot('free');
      refreshSnapshot({ free: true });
      return;
    }
    let nick = getNick();
    // autoSettle: "直接结算" 时没昵称就用随机的（不写 localStorage，下局还能起自己的）
    let nickIsAuto = false;
    if (!nick && settleAutoSettle) {
      nick = generateRandomNick();
      nickIsAuto = true;
    }
    if (!nick) {
      renderRankSlot('pending');
      refreshSnapshot({ pending: true });
      return;
    }
    pendingSubmitForRun = true;
    const submitMode = effectiveSubmitMode();
    renderRankSlot('loading', { mode: submitMode });

    const durationMs = Math.max(5000, Date.now() - (runStartedAt || Date.now()));
    const body = {
      nick, score,
      mode: submitMode,
      // 关键：送本局 runMelons，不是累计 melonsCount。服务端校验 score>=melons*121
      // 用累计西瓜数会把"本局没合西瓜但累计 20 颗"算成 score>=2420，必拒。
      melons: runMelons,
      maxLevel: Math.max(1, runMaxLevel),
      durationMs,
      clientNonce: currentRunNonce || newRunNonce(),
      did: getDeviceId(),                 // 跨昵称追踪，给"我的排名"用
    };
    // 一致性兜底（按顺序）：
    // (a) 暗号 fuck/clean 扣分后，score 可能 < melons*121。把 melons 调到 score 能支撑的范围。
    const maxMelonsByScore = Math.floor(body.score / 121);
    if (body.melons > maxMelonsByScore) body.melons = maxMelonsByScore;
    // (b) 服务端要求 maxLevel===11 ⟺ melons>=1。melons==0 时 maxLevel 必须 < 11
    if (body.maxLevel === 11 && body.melons < 1) body.maxLevel = 10;
    // (c) 反向：maxLevel<11 但 melons>0 → 把 melons 设 0（防 cheat 漏算）
    if (body.maxLevel < 11 && body.melons > 0) body.melons = 0;

    const r = await callBackend(LEADERBOARD_API + '?action=submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, 5000);

    if (r.ok && r.data && r.data.ok) {
      const rankInfo = { rank: r.data.rank, total: r.data.total, mode: submitMode };
      renderRankSlot('success', rankInfo);
      refreshSnapshot(rankInfo);   // 排名到了，重新合成截图把"第 X 名"也画进去
      // 自己上榜了，把右侧 leaderboard 切到本局对应的榜并刷一次
      setLbViewMode(submitMode, /*refetch=*/true);
      // 用了随机昵称就 toast 告诉一声
      if (nickIsAuto) {
        showCheatToast(`✅ 已用随机昵称 ${nick} 上传，下局可以起自己的`, '#9ee6a3');
      }
    } else if (r.data && r.data.reason === 'nick_taken') {
      // 昵称被别的设备占用——清掉本地，弹表单让用户换一个
      clearNick();
      pendingSubmitForRun = false;
      renderRankSlot('pending');
      $ovNickForm.style.display = '';
      $ovNickError.textContent = `"${nick}" 已被别的玩家占用，换一个吧`;
      $ovNickInput.value = '';
      $ovNickTag.style.display = 'none';
    } else {
      renderRankSlot('failed');
      refreshSnapshot({ failed: true });
      if (r.data && r.data.reason) console.warn('[suika] submit rejected:', r.data.reason);
      else console.warn('[suika] submit failed:', r);
    }
    settleAutoSettle = false; // 一次性 flag，submit 完就清
  }

  // 把 game canvas + 标题/分数/排名/进化总结合成一张分享卡。
  // rankInfo: { rank, total } 或 null。返回 dataURL 字符串；失败返回空串。
  function composeSnapshot(rankInfo) {
    try {
      const baseW = $canvas.width;
      const baseH = $canvas.height;
      const PAD = 18;
      const HEADER_H = 56;
      const FOOTER_H = 220;
      const W = baseW + PAD * 2;
      const H = HEADER_H + baseH + FOOTER_H;

      const off = document.createElement('canvas');
      off.width = W;
      off.height = H;
      const ctx = off.getContext('2d');

      // 主题色：判据必须与 game-zone 的 CSS 同源，否则「强制浅色 data-theme=light +
      // 系统深色」时游戏区是浅色、截图卡却出深色。CSS 规则=（系统深且非强制浅）或强制深。
      const de = document.documentElement.getAttribute('data-theme');
      const isDark = de === 'dark'
        || (de !== 'light' && typeof matchMedia === 'function'
            && matchMedia('(prefers-color-scheme: dark)').matches);
      const colors = isDark ? {
        bgTop: '#2a2418', bgBot: '#1f1a10',
        ink: '#e8d8b8', muted: '#9c8e72',
        accent: '#f0c674', divider: 'rgba(255,255,255,0.08)',
      } : {
        bgTop: '#fef6e4', bgBot: '#f9e8c4',
        ink: '#1e3a5f', muted: '#7d8a9c',
        accent: '#c4923f', divider: 'rgba(30,58,95,0.08)',
      };

      // 1. 背景渐变（贯穿整个图，与 game-zone 一致）
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, colors.bgTop);
      grad.addColorStop(1, colors.bgBot);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
      const SERIF_STACK = 'Georgia, "Times New Roman", "STSong", serif';

      // 2. Header 区
      // 西瓜图标（用 Twemoji，避免 iOS canvas fillText emoji 不可靠）
      const wmImg = fruitImages[11];
      if (wmImg && wmImg.complete) {
        ctx.drawImage(wmImg, PAD, (HEADER_H - 32) / 2, 32, 32);
      }
      ctx.fillStyle = colors.ink;
      ctx.font = `600 20px ${FONT_STACK}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('合成大西瓜', PAD + 38, HEADER_H / 2);

      // 玩家昵称（右上）
      const nick = getNick();
      if (nick) {
        ctx.fillStyle = colors.muted;
        ctx.font = `13px ${FONT_STACK}`;
        ctx.textAlign = 'right';
        ctx.fillText('玩家  ' + nick, W - PAD, HEADER_H / 2);
      }

      // header / game 间分隔线
      ctx.strokeStyle = colors.divider;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, HEADER_H - 0.5);
      ctx.lineTo(W - PAD, HEADER_H - 0.5);
      ctx.stroke();

      // 3. 游戏画面：圆角裁剪 + 内嵌阴影，避免水果贴边看起来"被切过"。
      //    跟 .game-zone 的 border-radius 一致（14px），视觉跟在线游戏一致。
      const RADIUS = 14;
      const gx = PAD, gy = HEADER_H, gw = baseW, gh = baseH;
      ctx.save();
      // 圆角矩形 path
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(gx, gy, gw, gh, RADIUS);
      } else {
        // fallback for older browsers
        const r = RADIUS;
        ctx.moveTo(gx + r, gy);
        ctx.arcTo(gx + gw, gy, gx + gw, gy + gh, r);
        ctx.arcTo(gx + gw, gy + gh, gx, gy + gh, r);
        ctx.arcTo(gx, gy + gh, gx, gy, r);
        ctx.arcTo(gx, gy, gx + gw, gy, r);
        ctx.closePath();
      }
      ctx.clip();
      ctx.drawImage($canvas, gx, gy);
      ctx.restore();

      // 给游戏区加一圈淡边框 + 微微阴影，更像"卡片"
      ctx.save();
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(gx + 0.5, gy + 0.5, gw - 1, gh - 1, RADIUS);
      } else {
        const r = RADIUS;
        ctx.moveTo(gx + r, gy);
        ctx.arcTo(gx + gw, gy, gx + gw, gy + gh, r);
        ctx.arcTo(gx + gw, gy + gh, gx, gy + gh, r);
        ctx.arcTo(gx, gy + gh, gx, gy, r);
        ctx.arcTo(gx, gy, gx + gw, gy, r);
        ctx.closePath();
      }
      ctx.strokeStyle = colors.divider;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // game / footer 间分隔线（继续保留，给 footer 视觉划分用）
      ctx.beginPath();
      ctx.moveTo(PAD, HEADER_H + baseH + 0.5);
      ctx.lineTo(W - PAD, HEADER_H + baseH + 0.5);
      ctx.stroke();

      // 4. Footer 区
      const footerTop = HEADER_H + baseH;
      let y = footerTop + 22;

      // 「本 局 得 分」小标签
      ctx.fillStyle = colors.muted;
      ctx.font = `11px ${FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('本 局 得 分', W / 2, y);
      y += 50;

      // 大分数
      ctx.fillStyle = colors.accent;
      ctx.font = `700 56px ${SERIF_STACK}`;
      ctx.fillText(String(score), W / 2, y);
      y += 36;

      // 排名行
      ctx.fillStyle = colors.ink;
      ctx.font = `14px ${FONT_STACK}`;
      let rankText;
      const modeLabel = rankInfo && rankInfo.mode ? MODE_LABEL[rankInfo.mode] : '';
      if (rankInfo && rankInfo.rank && rankInfo.total) {
        rankText = modeLabel
          ? `第 ${rankInfo.rank} 名 · 共 ${rankInfo.total} 位 · ${modeLabel}`
          : `第 ${rankInfo.rank} 名 · 共 ${rankInfo.total} 位玩家`;
      } else if (rankInfo && rankInfo.free) {
        rankText = '♾ 自由玩法 · 不计入排名';
      } else if (rankInfo && rankInfo.failed) {
        rankText = '排行榜暂时不可用';
      } else if (rankInfo && rankInfo.pending) {
        rankText = '本局未上传到排行榜';
      } else {
        rankText = '排名加载中…';
      }
      ctx.fillText(rankText, W / 2, y);
      y += 28;

      // 本局合到 lv X · 进化链 emoji
      if (runMaxLevel > 0) {
        const f = FRUITS[runMaxLevel - 1];
        const emojiImg = fruitImages[runMaxLevel];
        const labelText = `本局合到 lv ${runMaxLevel}    ${f.name}`;
        ctx.font = `13px ${FONT_STACK}`;
        ctx.fillStyle = colors.ink;
        const textW = ctx.measureText(labelText).width;
        const emojiSize = 18;
        const gap = 6;
        const totalW = (emojiImg && emojiImg.complete ? emojiSize + gap : 0) + textW;
        const startX = (W - totalW) / 2;
        if (emojiImg && emojiImg.complete) {
          ctx.drawImage(emojiImg, startX, y - emojiSize / 2, emojiSize, emojiSize);
          ctx.textAlign = 'left';
          ctx.fillText(labelText, startX + emojiSize + gap, y);
          ctx.textAlign = 'center';
        } else {
          ctx.fillText(labelText, W / 2, y);
        }
        y += 24;
      }

      // 历史最高 + 累计西瓜
      ctx.fillStyle = colors.muted;
      ctx.font = `12px ${FONT_STACK}`;
      const bestNow = Math.max(score, highScore);
      ctx.fillText(`历史最高 ${bestNow}    累计 ${melonsCount} 颗`, W / 2, y);
      y += 20;

      // 站点水印（最底）
      ctx.fillStyle = colors.muted;
      ctx.font = `10px ${FONT_STACK}`;
      ctx.fillText('ruizhou03.com/toolbox/suika', W / 2, H - 14);

      return off.toDataURL('image/png');
    } catch (e) {
      console.warn('[suika] composeSnapshot failed:', e);
      return '';
    }
  }

  // 把 composeSnapshot 的 dataURL 同时填到 <img> 预览和 dataset（供下载用）
  function refreshSnapshot(rankInfo) {
    if (score <= 0) {
      $ovSnapshot.style.display = 'none';
      delete $ovSnapshot.dataset.dataUrl;
      return;
    }
    const dataUrl = composeSnapshot(rankInfo);
    if (!dataUrl) {
      $ovSnapshot.style.display = 'none';
      return;
    }
    $ovSnapshot.src = dataUrl;
    $ovSnapshot.dataset.dataUrl = dataUrl;
    $ovSnapshot.style.display = '';
  }

  // 截图按钮：把面板里冻结的 dataURL 触发下载（iOS Safari 走打开新 tab）
  // dataURL → Blob（同步，避免 fetch 异步破坏 navigator.share 的用户手势要求）
  function dataURLToBlob(dataUrl) {
    const [head, b64] = dataUrl.split(',');
    const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/png';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  async function takeSnapshot() {
    const dataUrl = $ovSnapshot.dataset && $ovSnapshot.dataset.dataUrl;
    if (!dataUrl) return;
    const filename = `suika_${score}_${Date.now()}.png`;
    const ua = String(navigator.userAgent || '');
    const isIos = /iPhone|iPad|iPod/i.test(ua);
    const isStandalone = (typeof navigator.standalone === 'boolean' && navigator.standalone)
      || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
    // iOS / Android / 已安装 PWA：优先系统分享——standalone 下 window.open 常被拦、下载也不便，
    // 分享 PNG File 能直达「存储到照片」。桌面非 standalone 保持原下载逻辑。
    if (navigator.share && typeof File === 'function' && (isIos || isStandalone || /Android/i.test(ua))) {
      try {
        const file = new File([dataURLToBlob(dataUrl)], filename, { type: 'image/png' });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: '合成大西瓜', text: `我合成大西瓜得了 ${score} 分！` });
          return;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return;   // 用户取消分享，静默
        // 其它错误 → 落到下面的兜底路径
      }
    }
    if (isIos) {
      const w = window.open();
      if (w) {
        w.document.title = filename;
        w.document.body.style.cssText = 'margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;';
        const img = w.document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = 'max-width:100%;height:auto;';
        const tip = w.document.createElement('p');
        tip.textContent = '长按图片选择"存储到照片"';
        tip.style.cssText = 'color:#fff;text-align:center;font-family:var(--font-body);font-size:0.9rem;margin:1rem;';
        const wrap = w.document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
        wrap.appendChild(img); wrap.appendChild(tip);
        w.document.body.appendChild(wrap);
      } else {
        alert('请允许弹窗，或长按结算面板里的图片自行保存');
      }
      return;
    }
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // 昵称表单事件
  $ovNickSubmit.addEventListener('click', () => {
    const v = validateNick($ovNickInput.value);
    if (!v.ok) { $ovNickError.textContent = v.msg; return; }
    setNick(v.nick);
    $ovNickError.textContent = '';
    $ovNickForm.style.display = 'none';
    $ovNickTag.style.display = '';
    $ovNickCurrent.textContent = v.nick;
    pendingSubmitForRun = false;
    submitToLeaderboard();
  });
  $ovNickInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $ovNickSubmit.click();
  });
  $ovNickSkip.addEventListener('click', () => {
    $ovNickForm.style.display = 'none';
    renderRankSlot('hidden');
    refreshSnapshot({ pending: true });
  });
  $ovNickChange.addEventListener('click', () => {
    clearNick();
    $ovNickTag.style.display = 'none';
    $ovNickForm.style.display = '';
    $ovNickError.textContent = '';
    $ovNickInput.value = '';
    $ovNickInput.focus();
    pendingSubmitForRun = false;
  });
  $ovScreenshotBtn.addEventListener('click', takeSnapshot);

  // ============ 调参入口（起始幕 + 游戏中两条路径） ============
  let inGameSettings = false;          // settings overlay 是否从游戏中打开
  let wasPausedBeforeSettings = false; // 进 settings 前的 isPaused 状态（关 settings 时还原）
  const $settingsBtn = document.getElementById('settings-btn');
  const $resumeFromSettingsBtn = document.getElementById('resume-from-settings-btn');
  const $restartFromSettingsBtn = document.getElementById('restart-from-settings-btn');
  const $tryPhysicsBtn = document.getElementById('try-physics-btn');
  const $startFromSettingsBtn = document.getElementById('start-from-settings-btn');
  const $settingsToMenuBtn = document.getElementById('settings-to-menu-btn');
  const $resetPhysicsBtn = document.getElementById('reset-physics-btn');
  const $settingsAbandonBtn = document.getElementById('settings-abandon-btn');
  const $settingsLockNote = document.getElementById('settings-lock-note');
  // 竞技模式要锁死的物理调参控件（5 个滑条组，HTML 上标了 .settings-lockable）
  const lockableEls = Array.from(document.querySelectorAll('#view-settings .settings-lockable'));

  // 根据 inGameSettings + 是否竞技模式 切换设置面板控件显隐
  function refreshSettingsActions() {
    const inGame = inGameSettings;
    // 竞技模式（经典/喷泉/地震）锁死物理参数：隐藏 5 个滑条 + 试一试 + 默认(重置物理)，显示锁定提示。
    // 只有自由模式能调。合成链换表情 / 画幅 / 护眼抖动 属外观/舒适项，任何模式都保留。
    const ranked = isRankedMode();
    $tryPhysicsBtn.style.display        = (inGame || ranked) ? 'none' : '';
    $resetPhysicsBtn.style.display      = ranked ? 'none' : '';
    $startFromSettingsBtn.style.display = inGame ? 'none' : '';
    $resumeFromSettingsBtn.style.display = inGame ? '' : 'none';
    $restartFromSettingsBtn.style.display = inGame ? '' : 'none';
    // 「返回主菜单」只在非游戏中（开局前的调参）出现：游戏中要退出走 继续/重开，
    // 避免暂停中的对局被误跳回主菜单丢进度。（修复：调参/试玩进去后回不到模式选择器）
    $settingsToMenuBtn.style.display    = inGame ? 'none' : '';
    // 游戏中：给一条明确出口「放弃本局回主菜单」（带 confirm），方便局中换玩法模式
    $settingsAbandonBtn.style.display   = inGame ? '' : 'none';
    lockableEls.forEach(el => { el.style.display = ranked ? 'none' : ''; });
    if ($settingsLockNote) $settingsLockNote.style.display = ranked ? '' : 'none';
  }

  // 控制栏「⚙ 调参」按钮
  $settingsBtn.addEventListener('click', () => {
    if (gameStarted && !isOver && !trialMode) {
      // 游戏中：自动暂停 + inGameSettings 模式
      inGameSettings = true;
      wasPausedBeforeSettings = isPaused;
      isPaused = true;
      $pauseBtn.textContent = '▶ 继续';
    } else {
      inGameSettings = false;
      // 试玩进行中点调参：先干净地结束试玩（作废在途定时器 + 清残果 + 释放焦点），
      // 否则试玩的 spawnHover / endTrial 定时器会在调参幕开着时回来抢视图。
      if (trialMode) {
        ++trialToken;
        trialMode = false;
        trialDropsLeft = 0;
        hoverFruit = null;
        hoverVx = 0;
        setFocus(false);
        const tf = Composite.allBodies(world).filter(b => b.fruitLevel);
        if (tf.length) World.remove(world, tf);
      }
    }
    refreshSettingsActions();
    $startOverlay.classList.add('open');
    showOverlayView('settings');
  });

  $resumeFromSettingsBtn.addEventListener('click', () => {
    $startOverlay.classList.remove('open');
    isPaused = wasPausedBeforeSettings;
    $pauseBtn.textContent = isPaused ? '▶ 继续' : '⏸ 暂停';
    inGameSettings = false;
  });

  $restartFromSettingsBtn.addEventListener('click', () => {
    inGameSettings = false;
    restart();   // 已有函数：清 world + reset score + 关 overlay + 重新 setupWorld
  });

  // 「↶ 返回主菜单」：从（非游戏中的）调参幕切回主视图去换模式。只切视图，不动
  // world / run state（这条路径本就没在跑正式局）。
  $settingsToMenuBtn.addEventListener('click', () => {
    inGameSettings = false;
    showOverlayView('main');
    applyModeSelection();   // 保证模式 tab 高亮与 gameMode 一致（防御性）
  });

  // 局中调参幕「放弃本局回主菜单」：带确认，复用 backToMainMenu 清局 + 回主视图换模式。
  $settingsAbandonBtn.addEventListener('click', () => {
    if (score > 0 && !confirm('放弃本局回主菜单？当前分数会丢失。')) return;
    backToMainMenu();
  });

  // 视图切换
  const $viewMain = document.getElementById('view-main');
  const $viewSettings = document.getElementById('view-settings');
  document.getElementById('open-settings-btn').addEventListener('click', () => {
    inGameSettings = false;
    refreshSettingsActions();
    showOverlayView('settings');
  });

  // ============ 物理参数滑条 wiring ============
  const SLIDERS = [
    { key: 'bounce',     describe: describeBounce },
    { key: 'explosion',  describe: describeExplosion },
    { key: 'gravity',    describe: describeGravity },
    { key: 'stickiness', describe: describeStickiness },
    { key: 'tremor',     describe: describeTremor },
  ];
  const sliderEls = {};
  SLIDERS.forEach(({ key, describe }) => {
    const $slider = document.getElementById(key + '-slider');
    const $val = document.getElementById(key + '-val');
    const $desc = document.getElementById(key + '-desc');
    sliderEls[key] = { slider: $slider, val: $val, desc: $desc, describe };
    $slider.addEventListener('input', () => {
      PHYSICS[key] = parseFloat($slider.value);
      $val.textContent = PHYSICS[key].toFixed(2);
      $desc.textContent = describe(PHYSICS[key]);
      savePhysics();
      syncActivePhysics();   // 滑条只在自由模式可动 → 立即让 activePhysics 跟上
      applyPhysicsLive();
    });
  });
  function refreshSliderUI() {
    SLIDERS.forEach(({ key, describe }) => {
      const els = sliderEls[key];
      els.slider.value = PHYSICS[key];
      els.val.textContent = PHYSICS[key].toFixed(2);
      els.desc.textContent = describe(PHYSICS[key]);
    });
    $shakeViewCheck.checked = PHYSICS.shakeView;
  }

  // 画幅抖动开关
  const $shakeViewCheck = document.getElementById('shake-view-check');
  $shakeViewCheck.addEventListener('change', () => {
    PHYSICS.shakeView = $shakeViewCheck.checked;
    if (!PHYSICS.shakeView) {
      // 立刻清掉当前正在衰减的 shake
      lastTremorTime = -10000;
      tremorShakeAmpX = 0;
      tremorShakeAmpY = 0;
    }
    savePhysics();
  });

  // ============ 试玩模式 ============
  const $viewTrialEnd = document.getElementById('view-trial-end');
  const $viewResume = document.getElementById('view-resume');

  function showOverlayView(name) {
    $viewMain.style.display = name === 'main' ? '' : 'none';
    $viewSettings.style.display = name === 'settings' ? '' : 'none';
    $viewTrialEnd.style.display = name === 'trialEnd' ? '' : 'none';
    $viewResume.style.display = name === 'resume' ? '' : 'none';
  }

  function endTrial() {
    ++trialToken;         // 作废任何在途的试玩定时器（撒果 / spawn hover / 收尾）
    trialMode = false;
    hoverFruit = null;
    hoverVx = 0;
    setFocus(false);
    // 清水果
    const fruits = Composite.allBodies(world).filter(b => b.fruitLevel);
    if (fruits.length) World.remove(world, fruits);
    // 切到「试玩结束」视图
    showOverlayView('trialEnd');
    $startOverlay.classList.add('open');
  }

  document.getElementById('try-physics-btn').addEventListener('click', () => {
    if (trialMode) return;
    trialMode = true;
    trialDropsLeft = TRIAL_DROPS;
    const myToken = ++trialToken;   // 本次试玩的 token；离开试玩即失效在途定时器

    const old = Composite.allBodies(world).filter(b => b.fruitLevel);
    if (old.length) World.remove(world, old);

    $startOverlay.classList.remove('open');

    // 撒 6 颗 lv 1-3 水果到底部（错开时间）
    const positions = [0.15, 0.30, 0.45, 0.60, 0.75, 0.90];
    positions.forEach((px, i) => {
      setTimeout(() => {
        if (myToken !== trialToken) return;
        const lv = 1 + Math.floor(Math.random() * 3);
        const x = $canvas.width * px;
        World.add(world, createFruitBody(lv, x, 35 - (i % 3) * 12));
      }, i * 150);
    });

    // 1.2 秒后给玩家一个 hover fruit
    setTimeout(() => {
      if (myToken !== trialToken) return;
      setFocus(true);
      spawnHoveringFruit();
    }, 1200);
  });

  // 试玩结束视图的按钮
  document.getElementById('continue-tuning-btn').addEventListener('click', () => {
    inGameSettings = false;
    refreshSettingsActions();
    showOverlayView('settings');
  });
  document.getElementById('start-from-trial-btn').addEventListener('click', startGame);
  // 「↶ 返回主菜单」：试玩结束后回主视图换模式（试玩永远是非游戏中态，无需门控）。
  document.getElementById('trial-to-menu-btn').addEventListener('click', () => {
    inGameSettings = false;
    showOverlayView('main');
    applyModeSelection();
  });

  document.getElementById('reset-physics-btn').addEventListener('click', () => {
    PHYSICS.bounce = 0.5;
    PHYSICS.explosion = 0.5;
    PHYSICS.gravity = 0.5;
    PHYSICS.stickiness = 0.5;
    PHYSICS.tremor = 0;
    PHYSICS.shakeView = true;
    savePhysics();
    refreshSliderUI();
    syncActivePhysics();
    applyPhysicsLive();
  });
  document.getElementById('custom-chain-reset-btn').addEventListener('click', resetChain);

  $ovRestart.addEventListener('click', restart);
  $restartBtn.addEventListener('click', () => {
    if (!isOver && score > 0) {
      if (!confirm('确定重开？当前分数会丢失。')) return;
    }
    restart();
  });
  $pauseBtn.addEventListener('click', () => {
    if (isOver) return;
    isPaused = !isPaused;
    $pauseBtn.textContent = isPaused ? '▶ 继续' : '⏸ 暂停';
  });

  // ============ Init ============
  loadChain();           // 必须在 loadFruitImages / buildEvoChain / setupWorld 之前 —— FRUITS 要先被覆盖
  applyChainCps();
  loadFruitImages();     // 此时 FRUITS 已是最终状态（默认或自定义），所有图片只加载一次
  buildEvoChain();
  renderChainEditor();
  updateScoreUI();
  loadPhysics();
  syncActivePhysics();   // 按当前 gameMode 定下本会话生效物理（竞技=预设，自由=玩家参数）
  fitCanvas();           // 保存的 canvasSize preset 在这里才被应用（之前 fitCanvas 用的是默认 standard）
  refreshSliderUI();
  refreshSettingsActions();   // 初始化调参面板显隐（竞技模式先锁好物理滑条）
  setupWorld();
  // 不再立即 spawnHoveringFruit — 等用户点「开始游戏」
  $startBest.textContent = highScore;
  updateNextFruitUI();
  requestAnimationFrame(tick);

  // ============ 进度恢复入口 ============
  // 有 < 48h 的存档 → 显示「上次还没玩完」面板替代主菜单。
  (function maybeShowResume() {
    const save = loadSaveState();
    if (!save) return;
    // 摘要文案
    const $summary = document.getElementById('resume-summary');
    if ($summary) {
      const minsAgo = Math.max(1, Math.floor((Date.now() - save.savedAt) / 60000));
      const ago = minsAgo < 60
        ? `${minsAgo} 分钟前`
        : minsAgo < 1440
          ? `${Math.floor(minsAgo / 60)} 小时前`
          : `${Math.floor(minsAgo / 1440)} 天前`;
      const lvText = save.runMaxLevel ? `合到 lv ${save.runMaxLevel}` : '还没合到任何水果';
      $summary.innerHTML = `<strong>${save.score || 0}</strong> 分<br>${lvText}<span class="resume-meta">${ago}保存</span>`;
    }
    showOverlayView('resume');
  })();

  // —— 进度恢复按钮事件 ——
  document.getElementById('resume-continue-btn').addEventListener('click', () => {
    const save = loadSaveState();
    if (!save) {
      showOverlayView('main');
      return;
    }
    // 先把 modal 关掉再恢复状态：applySavedState 末尾本来也会移除 .open，
    // 但中间的 World.clear / setupWorld / createFruitBody 任一步抛异常都会
    // 让玩家困在 modal 里。先关 overlay 是双保险。
    showOverlayView('main');
    $startOverlay.classList.remove('open');
    try {
      applySavedState(save);
      // 续局后把右侧竞技榜切到本局模式（自由模式无公开榜，不切）
      if (isRankedMode()) setLbViewMode(gameMode, true);
      // 不清存档：玩家仍在玩，下次离开还是会自动 save 覆盖
    } catch (e) {
      console.error('[suika] applySavedState failed', e);
      clearSaveState();
      $startOverlay.classList.add('open');   // 恢复菜单态，让玩家能重开一局
    }
  });

  document.getElementById('resume-discard-btn').addEventListener('click', () => {
    clearSaveState();
    showOverlayView('main');
  });

  document.getElementById('resume-settle-btn').addEventListener('click', () => {
    const save = loadSaveState();
    if (!save) { showOverlayView('main'); return; }
    showOverlayView('main');
    $startOverlay.classList.remove('open');
    try {
      applySavedState(save);
    } catch (e) {
      console.error('[suika] applySavedState (settle) failed', e);
      // applySavedState 失败的话 score/runMaxLevel 没装回内存，但用户语义
      // 就是"直接结算"，把存档干掉走 gameOver 兜底（提交 0 分总比卡住强）。
    }
    clearSaveState();
    settleNow({ autoSettle: true });
  });

  // —— 「🏁 结算」按钮（mid-game 主动结算） ——
  document.getElementById('settle-btn').addEventListener('click', () => {
    if (isOver) return;
    if (!gameStarted) { showCheatToast('还没开局呢', '#9aa0a6'); return; }
    if (score > 0 && !confirm('确定结算本局？分数会上传排行榜。')) return;
    settleNow({ autoSettle: false });
  });

  // 通用结算入口：触发 gameOver 流程；可选 autoSettle 让 submit 用随机昵称兜底
  function settleNow(opts) {
    settleAutoSettle = !!(opts && opts.autoSettle);  // 给 submitToLeaderboard 看
    gameOver();
  }
  // 全局 flag：本次 gameOver 是不是 autoSettle 触发的
  // （声明用 var 是为了 hoisting 到 IIFE 顶部 — let 因为在使用前才声明会 TDZ 报错）
  var settleAutoSettle = false;

  // ============ Waline 评论区（直接 init，挂掉静默隐藏）============
  // 直接尝试 init，让 waline 自己处理网络问题，加载成功才显示 wrap。
  // （历史背景：vercel 冷启动 > 4s 时 reachable 探测会误判 unreachable，
  // 迁到 fly 后 min_machines_running=1 已不冷启动，但保留这套加载策略。）
  (function loadWaline() {
    import('https://unpkg.com/@waline/client@v2/dist/waline.mjs').then(({ init }) => {
      const wrap = document.getElementById('suika-waline-wrap');
      if (wrap) wrap.style.display = '';
      init({
        el: '#suika-waline',
        serverURL: 'https://zircon-comments.fly.dev',
        // 显式写死 path：waline 默认用 window.location.pathname，不同浏览器
        // 对 GitHub Pages 重定向后的规范化可能不一致，导致桌面 / 手机查不同
        // key（trailing slash 差异）。写死可消除该差异。
        path: '/toolbox/suika/',
        dark: 'auto',
        lang: 'zh-CN',
        emoji: ['//unpkg.com/@waline/emojis@1.1.0/tieba'],
        placeholder: '聊聊你的合成大西瓜心得 ~',
        pageview: true,
        comment: true,
        requiredMeta: [],
        locale: { reactionTitle: '', preview: '👀 开启 Markdown 预览', anonymous: '神秘玩家' },
      });
      const walineEl = document.getElementById('suika-waline');
      if (!walineEl) return;
      const metaFields = { nick: '昵称（可选）', mail: '邮箱（可选）', link: '网址（可选）' };
      const patchMeta = () => {
        Object.entries(metaFields).forEach(([name, ph]) => {
          const input = walineEl.querySelector(`input[name="${name}"]`);
          if (!input) return;
          if (input.placeholder !== ph) input.placeholder = ph;
          const w2 = input.closest('.wl-header-item') || input.parentElement;
          if (w2 && w2.dataset.walineField !== name) w2.dataset.walineField = name;
        });
      };
      new MutationObserver(patchMeta).observe(walineEl, { childList: true, subtree: true });
    }).catch(e => console.warn('[suika] waline load failed:', e));
  })();

  // 重新 fit canvas + 等比搬移现有水果 + 重建墙体（resize / 切换 preset 共用）
  function refitCanvas() {
    const oldW = W, oldH = H;
    fitCanvas();
    if (oldW === W && oldH === H) return;
    if (!world) return;

    // 关键安全：游戏进行中绝不 rescale 现有水果。把所有水果按 ratio 重新
    // setPosition 会让相邻水果距离按 ratio 缩短 → 互相挤压 → Matter 用强冲量
    // 分离 → 小水果（草莓 r=17）单步位移可达数百 px → sanity cleanup 删掉 →
    // 视觉上"消失"。
    // iOS Safari 在 URL 栏出现/隐藏时会自动 fire resize，必须在这里拦住，
    // 不然用户什么都没干就被炸局。canvas 保持原尺寸；下次 restart 时 fitCanvas
    // 会把新 viewport 应用上。
    if (gameStarted && !isOver) {
      W = oldW;
      H = oldH;
      $canvas.width = W;
      $canvas.height = H;
      $canvas.style.width = W + 'px';
      $canvas.style.height = H + 'px';
      $gameZone.style.width = W + 'px';
      return;
    }

    const ratio = W / oldW;
    Composite.allBodies(world).forEach(b => {
      if (!b.fruitLevel) return;
      Body.setPosition(b, {
        x: Math.max(b.circleRadius + 1, Math.min(W - b.circleRadius - 1, b.position.x * ratio)),
        y: Math.min(H - b.circleRadius - 1, b.position.y * (H / oldH)),
      });
      Body.setVelocity(b, { x: 0, y: 0 });
      Body.setAngularVelocity(b, 0);
    });
    hoverX = Math.max(20, Math.min(W - 20, hoverX * ratio));
    if (hoverFruit) hoverFruit.x = hoverX;
    walls.forEach(w => World.remove(world, w));
    walls = [
      Bodies.rectangle(W / 2, H + WALL / 2, W, WALL, { isStatic: true, friction: PC.wallFriction }),
      Bodies.rectangle(-WALL / 2, H / 2, WALL, H * 2, { isStatic: true, friction: PC.wallFriction }),
      Bodies.rectangle(W + WALL / 2, H / 2, WALL, H * 2, { isStatic: true, friction: PC.wallFriction }),
    ];
    World.add(world, walls);
  }

  // 窗口尺寸变化重设
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { refitCanvas(); updateEvoScrollHint(); }, 200);
  });

  // 画幅 preset 按钮
  const $canvasSizeRow = document.getElementById('canvas-size-row');
  const $canvasSizeDesc = document.getElementById('canvas-size-desc');
  function refreshCanvasSizeUI() {
    $canvasSizeRow.querySelectorAll('.canvas-size-btn').forEach(el => {
      el.classList.toggle('active', el.dataset.size === PHYSICS.canvasSize);
    });
    const preset = CANVAS_SIZES[PHYSICS.canvasSize] || CANVAS_SIZES.medium;
    $canvasSizeDesc.textContent = preset.label;
  }
  $canvasSizeRow.querySelectorAll('.canvas-size-btn').forEach(el => {
    el.addEventListener('click', () => {
      const newSize = el.dataset.size;
      if (newSize === PHYSICS.canvasSize) return;
      // 改画幅必须强制重启：mid-game refit 把现有水果 setVelocity(0,0) + 强行
      // 搬位置可能让水果叠在墙内，下一帧物理求解把它弹出去 → sanity cleanup
      // 删掉 → 视觉上"消失"。直接 restart 是干净路径。
      const inProgress = gameStarted && !isOver;
      if (inProgress) {
        const ok = confirm('修改画幅会重新开始当前局，分数会丢失。继续吗？');
        if (!ok) return;
      }
      PHYSICS.canvasSize = newSize;
      savePhysics();
      refreshCanvasSizeUI();
      fitCanvas();   // 立刻应用新尺寸
      if (inProgress) {
        // 关 settings overlay + restart（restart 内部会 setupWorld 用最新 W/H）
        $startOverlay.classList.remove('open');
        inGameSettings = false;
        restart();
      } else {
        // 起始幕 / 已结束：refit + 重建墙体（无水果或可安全 rescale）
        refitCanvas();
      }
    });
  });
  refreshCanvasSizeUI();
})();
