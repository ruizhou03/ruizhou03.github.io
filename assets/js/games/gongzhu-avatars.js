/* 拱猪联机 · 头像库与昵称库（window.GongzhuAvatars）
 * 头像全是自绘矢量（不用 emoji：各系统长得不一样），64×64，圆形色底 + 扁平无渐变、不画细线，
 * 配色锚站点的藏蓝 / 暖金 / 奶油，再配几种柔和底色。玩家头像：动物 / 植物 / 表情（18 个；企鹅、四叶草用户嫌丑已删）；机器人头像：几种不同的机器人脸。
 * 昵称：真人不填就从 NICKS 里随机挑一个；机器人一律从 BOT_NICKS 随机起名（档位另用小标签标）。 */
(function () {
  'use strict';
  const INK = '#1d1b18', CREAM = '#fffaf0';
  const tile = (bg, body) => '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="' + bg + '"/>' + body + '</svg>';
  /* 统一画法（第二版，用户要求「做工更精良」）：头部都落在同一块区域（中心约 32,37、宽约 40），
   * 眼睛一律墨点 + 左上一颗白高光，脸颊一对腮红，部位分两三层上色（底色 / 深一档 / 浅一档），植物和天气也带小表情。 */
  const eye = (x, y, r) => { r = r || 3.2; return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + INK + '"/><circle cx="' + (x - r * 0.35) + '" cy="' + (y - r * 0.38) + '" r="' + (r * 0.38) + '" fill="#fff"/>'; };
  const eyes = (y, dx, r) => eye(32 - dx, y, r) + eye(32 + dx, y, r);
  const blush = (y, dx, c) => '<ellipse cx="' + (32 - dx) + '" cy="' + y + '" rx="3.8" ry="2.3" fill="' + (c || '#f2a0a0') + '" opacity=".75"/><ellipse cx="' + (32 + dx) + '" cy="' + y + '" rx="3.8" ry="2.3" fill="' + (c || '#f2a0a0') + '" opacity=".75"/>';
  const line = (d, w, c) => '<path d="' + d + '" stroke="' + (c || INK) + '" stroke-width="' + (w || 2.6) + '" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
  const catMouth = (y) => line('M28.5 ' + y + 'q1.75 1.8 3.5 0q1.75 1.8 3.5 0', 2.3);
  const ear = (d, c) => '<path d="' + d + '" fill="' + c + '" stroke="' + c + '" stroke-width="3" stroke-linejoin="round"/>';

  const HUMAN = [
    { id: 'cat', name: '猫', svg: tile('#f6e3c8',
      ear('M13 31 17 11 30 21Z', '#e58e46') + ear('M51 31 47 11 34 21Z', '#e58e46') + ear('M17 27 19 16 26 22Z', '#f6b9a6') + ear('M47 27 45 16 38 22Z', '#f6b9a6') +
      '<ellipse cx="32" cy="38" rx="20.5" ry="17" fill="#eea25a"/>' + line('M28.5 22.5v4.5M32 21.5v5.5M35.5 22.5v4.5', 2.6, '#d27a36') +
      '<ellipse cx="27.5" cy="44" rx="5.5" ry="4.2" fill="#fff4e3"/><ellipse cx="36.5" cy="44" rx="5.5" ry="4.2" fill="#fff4e3"/>' +
      eyes(36, 7.8) + '<path d="M30.2 40.5h3.6l-1.8 2.2Z" fill="#e06d78" stroke="#e06d78" stroke-width="1.4" stroke-linejoin="round"/>' + catMouth(43.5) + blush(42, 13.5)) },
    { id: 'dog', name: '柴犬', svg: tile('#e3ecd9',
      ear('M14 30 18 12 29 22Z', '#c46f34') + ear('M50 30 46 12 35 22Z', '#c46f34') + ear('M18 26 20 17 25 22Z', '#fbe3c6') + ear('M46 26 44 17 39 22Z', '#fbe3c6') +
      '<ellipse cx="32" cy="38" rx="20" ry="17" fill="#d98a48"/>' +
      '<path d="M15 41c2 9 9 13 17 13s15-4 17-13c-4 3-9 2-12-1-2 2-8 2-10 0-3 3-8 4-12 1Z" fill="#fff4e3"/>' +
      '<ellipse cx="25" cy="30" rx="2.6" ry="1.6" fill="#fff4e3"/><ellipse cx="39" cy="30" rx="2.6" ry="1.6" fill="#fff4e3"/>' +
      eyes(35, 7) + '<ellipse cx="32" cy="41.5" rx="3.6" ry="2.6" fill="' + INK + '"/><path d="M30 46.5h4v2.6a2 2 0 0 1-4 0Z" fill="#ec7f86"/>' + blush(44, 13)) },
    { id: 'rabbit', name: '兔', svg: tile('#f3dede',
      '<ellipse cx="24" cy="17" rx="5.6" ry="14" transform="rotate(-8 24 17)" fill="' + CREAM + '"/><ellipse cx="40" cy="17" rx="5.6" ry="14" transform="rotate(8 40 17)" fill="' + CREAM + '"/>' +
      '<ellipse cx="24" cy="18" rx="2.6" ry="9.5" transform="rotate(-8 24 18)" fill="#f4b6c0"/><ellipse cx="40" cy="18" rx="2.6" ry="9.5" transform="rotate(8 40 18)" fill="#f4b6c0"/>' +
      '<ellipse cx="32" cy="40" rx="19" ry="16" fill="' + CREAM + '"/>' + eyes(38.5, 7) +
      '<path d="M30.3 43h3.4l-1.7 2Z" fill="#e06d78" stroke="#e06d78" stroke-width="1.4" stroke-linejoin="round"/>' + line('M32 45v1.5M32 46.5q-2 2-3.5.5M32 46.5q2 2 3.5.5', 2) + blush(45, 12, '#f4a7b6')) },
    { id: 'panda', name: '熊猫', svg: tile('#dde6f2',
      '<circle cx="15.5" cy="22" r="7.5" fill="' + INK + '"/><circle cx="48.5" cy="22" r="7.5" fill="' + INK + '"/>' +
      '<ellipse cx="32" cy="38" rx="20.5" ry="17.5" fill="' + CREAM + '"/>' +
      '<ellipse cx="23.5" cy="36" rx="5.5" ry="7" transform="rotate(30 23.5 36)" fill="' + INK + '"/><ellipse cx="40.5" cy="36" rx="5.5" ry="7" transform="rotate(-30 40.5 36)" fill="' + INK + '"/>' +
      '<circle cx="24.5" cy="35.5" r="2.6" fill="#fff"/><circle cx="39.5" cy="35.5" r="2.6" fill="#fff"/><circle cx="25" cy="36" r="1.5" fill="' + INK + '"/><circle cx="39" cy="36" r="1.5" fill="' + INK + '"/>' +
      '<ellipse cx="32" cy="43" rx="3.4" ry="2.4" fill="' + INK + '"/>' + line('M32 45.5v1.5M32 47q-2 1.8-3.6.4M32 47q2 1.8 3.6.4', 2.1) + blush(46, 13)) },
    { id: 'fox', name: '狐狸', svg: tile('#f5ecc8',
      ear('M12 30 15 9 29 19Z', '#e46a2e') + ear('M52 30 49 9 35 19Z', '#e46a2e') + ear('M14 15 15 9 20 13Z', '#3a2a24') + ear('M50 15 49 9 44 13Z', '#3a2a24') + ear('M17 25 18 15 25 20Z', '#fbe3c6') + ear('M47 25 46 15 39 20Z', '#fbe3c6') +
      '<path d="M11 31c0-10 9-14 21-14s21 4 21 14c0 9-9 17-21 22-12-5-21-13-21-22Z" fill="#f07a38"/>' +
      '<path d="M11 31c4 7 12 9 17 8l4 14c-12-5-21-13-21-22Z M53 31c-4 7-12 9-17 8l-4 14c12-5 21-13 21-22Z" fill="#fff4e3"/>' +
      eyes(33, 8.5, 3) + '<ellipse cx="32" cy="48" rx="3.2" ry="2.3" fill="' + INK + '"/>' + blush(40, 14)) },
    { id: 'bear', name: '小熊', svg: tile('#ece4f3',
      '<circle cx="15.5" cy="21" r="7.5" fill="#a26f45"/><circle cx="48.5" cy="21" r="7.5" fill="#a26f45"/><circle cx="15.5" cy="21" r="3.8" fill="#e2b48a"/><circle cx="48.5" cy="21" r="3.8" fill="#e2b48a"/>' +
      '<ellipse cx="32" cy="38" rx="20.5" ry="17.5" fill="#b07a4c"/><ellipse cx="32" cy="44" rx="9.5" ry="7.5" fill="#ecd0ac"/>' +
      eyes(35, 8) + '<ellipse cx="32" cy="41" rx="3.6" ry="2.6" fill="' + INK + '"/>' + line('M32 43.5v1.6M32 45.1q-2.2 2-3.8.5M32 45.1q2.2 2 3.8.5', 2.1) + blush(44, 14, '#f0a08c')) },
    { id: 'owl', name: '猫头鹰', svg: tile('#e3ecd9',
      '<path d="M14 14l8 8h20l8-8-2 30c-1 9-8 13-16 13s-15-4-16-13Z" fill="#8f6646"/>' +
      '<path d="M16 36c0-8 7-13 16-13s16 5 16 13c0 7-7 11-16 11s-16-4-16-11Z" fill="#c9a07a"/>' +
      '<circle cx="24.5" cy="34" r="7.5" fill="' + CREAM + '"/><circle cx="39.5" cy="34" r="7.5" fill="' + CREAM + '"/><circle cx="24.5" cy="34" r="4.6" fill="#f0b43c"/><circle cx="39.5" cy="34" r="4.6" fill="#f0b43c"/>' +
      eye(24.5, 34, 2.8) + eye(39.5, 34, 2.8) + '<path d="M29.5 40h5l-2.5 4.5Z" fill="#e8823c" stroke="#e8823c" stroke-width="1.6" stroke-linejoin="round"/>' +
      line('M25 51q2-2 4 0q2-2 4 0q2-2 4 0', 2.3, '#c9a07a')) },
    { id: 'frog', name: '青蛙', svg: tile('#f5ecc8',
      '<circle cx="21.5" cy="24" r="8.5" fill="#6aac57"/><circle cx="42.5" cy="24" r="8.5" fill="#6aac57"/>' +
      '<ellipse cx="32" cy="40" rx="21" ry="15" fill="#78bb63"/><ellipse cx="32" cy="46" rx="13" ry="7" fill="#a6d48c"/>' +
      '<circle cx="21.5" cy="24" r="5.2" fill="#fff"/><circle cx="42.5" cy="24" r="5.2" fill="#fff"/>' + eye(21.5, 24.5, 2.8) + eye(42.5, 24.5, 2.8) +
      line('M22 40q10 8 20 0', 2.8) + blush(39, 15, '#f19c8c')) },
    { id: 'chick', name: '小鸡', svg: tile('#f3dede',
      '<path d="M29 18c-1-5 3-7 4-3 2-4 6-2 4 3" fill="#f1ac24"/>' +
      '<circle cx="32" cy="37" r="19" fill="#f8d248"/><path d="M14 40c-1 6 2 10 6 10 2-3 2-7 0-10Z" fill="#efbd2e"/><path d="M50 40c1 6-2 10-6 10-2-3-2-7 0-10Z" fill="#efbd2e"/>' +
      eyes(34, 7) + '<path d="M28.5 38.5h7l-3.5 4Z" fill="#ef7f33" stroke="#ef7f33" stroke-width="1.8" stroke-linejoin="round"/>' + blush(41, 12.5, '#f3a07a')) },
    { id: 'cactus', name: '仙人掌', svg: tile('#f6e3c8',
      '<path d="M25 18a7 7 0 0 1 14 0v28H25Z" fill="#5f9e5c"/><path d="M25 33h-5a5 5 0 0 1-5-5v-6a3.5 3.5 0 0 1 7 0v4h3Z M39 28h4v-5a3.5 3.5 0 0 1 7 0v7a5 5 0 0 1-5 5h-6Z" fill="#5f9e5c"/>' +
      line('M29 15v9M35 15v9M29 39v5M35 39v5', 2.2, '#7fb878') + eye(28.5, 31, 2.4) + eye(35.5, 31, 2.4) + line('M30 36q2 2 4 0', 2.2) +
      '<path d="M18 46h28l-3 12H21Z" fill="#cf6f43"/><rect x="16" y="43.5" width="32" height="5.5" rx="2.5" fill="#b85a33"/><circle cx="32" cy="12" r="3.6" fill="#f08fa8"/><circle cx="32" cy="12" r="1.4" fill="#f7d36a"/>') },
    { id: 'sunflower', name: '向日葵', svg: tile('#dde6f2',
      Array.from({ length: 12 }, (_, i) => '<ellipse cx="32" cy="13" rx="4.6" ry="8.5" transform="rotate(' + i * 30 + ' 32 29)" fill="' + (i % 2 ? '#f6c844' : '#f0b52a') + '"/>').join('') +
      '<circle cx="32" cy="29" r="10" fill="#8a5a33"/><circle cx="32" cy="29" r="7.6" fill="#6f4628"/>' + eye(28.5, 28, 1.9) + eye(35.5, 28, 1.9) + line('M29.5 32q2.5 2 5 0', 2, CREAM) +
      '<path d="M32 40v18" stroke="#5f9e5c" stroke-width="4" stroke-linecap="round"/><path d="M32 51c-6 0-11-3-12-8 6 0 10 3 12 8Z M32 47c5 0 9-2 10-6-5 0-8 2-10 6Z" fill="#5f9e5c"/>') },
    { id: 'mushroom', name: '蘑菇', svg: tile('#e3ecd9',
      '<path d="M9 34C9 20 19 12 32 12s23 8 23 22Z" fill="#d9483d"/><path d="M12 34h40c0 3-2 4-5 4H17c-3 0-5-1-5-4Z" fill="#f4e6cf"/>' +
      '<circle cx="21" cy="24" r="4.2" fill="' + CREAM + '"/><circle cx="35" cy="17.5" r="3.4" fill="' + CREAM + '"/><circle cx="44" cy="27" r="3.8" fill="' + CREAM + '"/><circle cx="29" cy="28" r="2.2" fill="' + CREAM + '"/>' +
      '<path d="M23 38h18v11c0 4-4 7-9 7s-9-3-9-7Z" fill="#fbf0dc"/>' + eye(28, 44, 2.3) + eye(36, 44, 2.3) + line('M30 48.5q2 1.8 4 0', 2.1) + blush(48, 7.5, '#f4a7b6')) },
    { id: 'blossom', name: '樱花', svg: tile('#f5ecc8',
      Array.from({ length: 5 }, (_, i) => '<path d="M32 31C23 24 22 13 29 9l3 3 3-3c7 4 6 15-3 22Z" transform="rotate(' + i * 72 + ' 32 32)" fill="#f4a6b8"/>' +
        '<path d="M32 29C27 24 27 17 30 14l2 2 2-2c3 3 3 10-2 15Z" transform="rotate(' + i * 72 + ' 32 32)" fill="#f9c8d3"/>').join('') +
      '<circle cx="32" cy="32" r="5.5" fill="#f6cf5c"/>' + Array.from({ length: 5 }, (_, i) => '<circle cx="32" cy="24.5" r="1.5" transform="rotate(' + (i * 72 + 36) + ' 32 32)" fill="#e0893c"/>').join('')) },
    { id: 'smile', name: '微笑', svg: tile('#dde6f2',
      '<circle cx="32" cy="33" r="21" fill="#f8d24c"/><path d="M13 37a19 19 0 0 0 38 0 21 21 0 0 1-38 0Z" fill="#efbd36"/>' +
      '<ellipse cx="25" cy="29" rx="2.8" ry="3.6" fill="' + INK + '"/><ellipse cx="39" cy="29" rx="2.8" ry="3.6" fill="' + INK + '"/><circle cx="24" cy="27.6" r="1.1" fill="#fff"/><circle cx="38" cy="27.6" r="1.1" fill="#fff"/>' +
      '<path d="M23 37q9 10 18 0Z" fill="' + INK + '"/><path d="M27.5 41q4.5 3 9 0q-4.5-2.5-9 0Z" fill="#ec7f86"/>' + blush(37, 13.5)) },
    { id: 'wink', name: '眨眼', svg: tile('#ece4f3',
      '<circle cx="32" cy="33" r="21" fill="#f8d24c"/><path d="M13 37a19 19 0 0 0 38 0 21 21 0 0 1-38 0Z" fill="#efbd36"/>' +
      '<ellipse cx="25" cy="29" rx="2.8" ry="3.6" fill="' + INK + '"/><circle cx="24" cy="27.6" r="1.1" fill="#fff"/>' + line('M35 30q4-4 8 0', 3) +
      line('M24 38q8 7 16 0', 3) + '<path d="M33 40.5h5v3a2.5 2.5 0 0 1-5 0Z" fill="#ec7f86"/>' + blush(37, 13.5)) },
    { id: 'cool', name: '墨镜', svg: tile('#e3ecd9',
      '<circle cx="32" cy="33" r="21" fill="#f8d24c"/><path d="M13 37a19 19 0 0 0 38 0 21 21 0 0 1-38 0Z" fill="#efbd36"/>' +
      '<path d="M13 26h38v3l-3 7a5 5 0 0 1-5 3h-4a5 5 0 0 1-5-4l-2-4-2 4a5 5 0 0 1-5 4h-4a5 5 0 0 1-5-3l-3-7Z" fill="' + INK + '"/>' +
      '<path d="M17 29h6l-4 4Z M37 29h6l-4 4Z" fill="#5d6f88"/>' + line('M26 45q7 3 12-2', 3)) },
    { id: 'cloud', name: '云朵', svg: tile('#f6e3c8',
      '<path d="M15 46a9 9 0 0 1 1-18 12 12 0 0 1 22-6 10 10 0 0 1 11 9 8 8 0 0 1-1 15Z" fill="#a9c9ea"/><path d="M15 46h33a8 8 0 0 0 7-6c-4 3-8 3-11 1-3 3-9 3-12 0-4 3-11 3-15 0-2 1-2 3-2 5Z" fill="#8fb4dc"/>' +
      eyes(35, 6.5, 2.6) + line('M29.5 40q2.5 2.4 5 0', 2.2) + blush(39.5, 12, '#f4a7b6')) },
    { id: 'moon', name: '月亮', svg: tile('#2f4766',
      '<path d="M41 11a21 21 0 1 0 13 30 17 17 0 1 1-13-30Z" fill="#f4d06c"/><path d="M41 11a21 21 0 0 0-23 31 19 19 0 0 1 23-31Z" fill="#f8de8e"/>' +
      eye(27, 33, 2.4) + line('M24.5 39.5q3 2.6 6 0', 2.2) + '<ellipse cx="22" cy="37" rx="2.8" ry="1.8" fill="#f2a0a0" opacity=".8"/>' +
      '<path d="M48 14l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2Z M17 13l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9Z M53 30l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8Z" fill="#f4d06c"/>') },
  ];

  // 机器人：圆角方头 + 天线，几种颜色和眼睛，方便同一桌两个机器人分得清
  const robot = (bg, head, eyesSvg) => tile(bg,
    '<path d="M32 8v8" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/><circle cx="32" cy="8" r="3.6" fill="#d6483c"/>' +
    '<rect x="13" y="16" width="38" height="32" rx="10" fill="' + head + '"/><rect x="8" y="27" width="5" height="10" rx="2" fill="' + head + '"/><rect x="51" y="27" width="5" height="10" rx="2" fill="' + head + '"/>' + eyesSvg);
  const ROBOT = [
    { id: 'bot-navy', name: '藏蓝机器人', svg: robot('#dde6f2', '#3d5878', '<circle cx="25" cy="30" r="4.5" fill="' + CREAM + '"/><circle cx="39" cy="30" r="4.5" fill="' + CREAM + '"/><rect x="24" y="39" width="16" height="3.5" rx="1.75" fill="' + CREAM + '"/>') },
    { id: 'bot-gold', name: '金色机器人', svg: robot('#f5ecc8', '#c9a14e', '<rect x="19" y="26" width="26" height="8" rx="4" fill="' + INK + '"/><circle cx="26" cy="30" r="2" fill="#7fd0e6"/><circle cx="38" cy="30" r="2" fill="#7fd0e6"/><path d="M26 41q6 4 12 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>') },
    { id: 'bot-mint', name: '薄荷机器人', svg: robot('#f3dede', '#7cbfa8', '<rect x="21" y="26" width="8" height="8" rx="2" fill="' + INK + '"/><rect x="35" y="26" width="8" height="8" rx="2" fill="' + INK + '"/><rect x="23" y="39" width="18" height="4" rx="2" fill="' + INK + '"/>') },
    { id: 'bot-coral', name: '珊瑚机器人', svg: robot('#e3ecd9', '#e07b62', '<path d="M21 31q4-5 8 0M35 31q4-5 8 0" stroke="' + CREAM + '" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M26 39q6 5 12 0" stroke="' + CREAM + '" stroke-width="3" fill="none" stroke-linecap="round"/>') },
  ];

  // 真人不填昵称时的随机昵称：两个字、好念、带点烟火气（吃的 / 自然 / 吉祥话），避开容易撞的真名
  const NICKS = ['小满', '阿福', '团子', '豆包', '汤圆', '年糕', '麻薯', '栗子', '橙子', '柚子', '青团', '桂花',
    '松果', '海盐', '奶茶', '布丁', '花卷', '烧麦', '锅巴', '元宝', '锦鲤', '喜鹊', '白鹭', '云朵',
    '晚风', '星河', '月饼', '春笋', '夏至', '秋分', '冬瓜', '芋圆', '酥饼', '橘猫', '米粒', '蒲公英',
    '小葵', '饭团', '杏仁', '可可'];
  // 机器人的名字：好听、带点科幻 / 星辰味（用户：要「阿尔法」「零一」这种，不要「铁蛋」「螺丝」那种生硬的）
  const BOT_NICKS = ['阿尔法', '贝塔', '伽马', '德尔塔', '西格玛', '欧米伽', '零一', '零七', '九号',
    '天枢', '天璇', '开阳', '摇光', '启明', '北辰', '星尘', '极光', '光年', '量子', '银河'];

  const byId = {};
  for (const a of HUMAN.concat(ROBOT)) byId[a.id] = a;
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  window.GongzhuAvatars = {
    HUMAN, ROBOT, NICKS, BOT_NICKS, byId,
    svg: (id) => (byId[id] ? byId[id].svg : ''),
    randomHuman: () => pick(HUMAN).id,
    randomNick: () => pick(NICKS),
  };
})();
