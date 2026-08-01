import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const html = await read('toolbox/guandan/index.html');
const css = await read('assets/css/guandan.css');
const presentation = `${html}\n${css}`;
const js = await read('assets/js/games/guandan.js');
const contract = await read('assets/js/games/guandan-contract.js');
const storageModule = await read('assets/js/games/guandan-storage.js');
const netModule = await read('assets/js/games/guandan-net.js');
const audioModule = await read('assets/js/games/guandan-audio.js');
const rulesModule = await read('assets/js/games/guandan-rules.js');
const engineModule = await read('assets/js/games/guandan-engine.js');
const uiModule = await read('assets/js/games/guandan-ui.js');
const debugModule = await read('assets/js/games/guandan-debug.js');
const simulator = await read('scripts/sim-guandan.js');
const safariAcceptance = await read('scripts/test-guandan-safari.mjs');
const firefoxAcceptance = await read('scripts/test-guandan-firefox.mjs');
const sw = await read('sw.js');
const offlineClient = await read('assets/js/offline/offline.js');
const pwa = JSON.parse(await read('toolbox/guandan/manifest.json'));
const offline = JSON.parse(await read('toolbox/guandan/offline-assets.json'));

assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/,
  'viewport 不得禁止 200% 缩放');
assert.doesNotMatch(html, /gesture(start|change)[\s\S]{0,100}preventDefault/,
  '不得拦截系统缩放手势');
assert.match(presentation, /prefers-color-scheme:\s*dark[\s\S]*--gd-felt-1:\s*#1c3933/,
  '必须实现系统自适应深色牌桌');
assert.match(presentation, /prefers-reduced-motion:\s*reduce/,
  '必须尊重 reduced motion');
assert.match(presentation, /min-block-size:\s*44px/,
  '非牌面触控目标必须至少 44px');
assert.match(css, /pointer:\s*fine\)[^\{]*max-width:\s*1100px[^\{]*max-height:\s*700px[\s\S]*header h1\s*\{\s*display:\s*none/,
  '桌面 200% zoom 必须进入以当前玩家为中心的紧凑牌桌');
assert.match(css, /pointer:\s*fine\)[^\{]*max-width:\s*1100px[^\{]*max-height:\s*700px[\s\S]*gd-hand::\-webkit-scrollbar\s*\{\s*display:\s*block/,
  '桌面紧凑牌桌必须给手牌提供可见横向滚动提示');
assert.match(html, /perf-test[\s\S]*PerformanceObserver[\s\S]*gdPerfProbe/,
  '必须保留仅本机可启用的 long task 与 INP 验收探针');

for (const id of ['gdResumeOverlay', 'gdBoardModal', 'gdConfirmExit', 'gdTributeOverlay', 'gdRoundOverlay', 'gdMatchOverlay']) {
  assert.match(html, new RegExp(`id="${id}"[^>]*role="dialog"[^>]*aria-modal="true"`),
    `${id} 必须暴露为模态 dialog`);
}
assert.match(html, /id="gdLiveRegion"[^>]*aria-live="polite"/,
  '必须提供读屏 live region');
assert.match(uiModule, /function activate\([\s\S]*sibling\.inert = true/,
  'dialog 必须隔离背景内容');
assert.match(uiModule, /returnFocus\s*=\s*returnTarget && returnTarget\.isConnected/,
  'dialog 必须允许显式记录 Safari 不自动聚焦的触发按钮');
assert.match(uiModule, /event\.key === 'Escape'/, '可关闭 dialog 必须支持 Escape');
assert.match(uiModule, /event\.key !== 'Tab'[\s\S]*focusables/, 'dialog 必须有焦点循环');
assert.match(js, /els\.hand\.addEventListener\('keydown'/, '手牌必须支持键盘导航');
assert.match(js, /aria-pressed/, '牌面选中状态必须向辅助技术公开');
assert.match(js, /function setSeatAvatarIcon[\s\S]*dataset\.avatarMarker[\s\S]*gd-avatar-icon[\s\S]*ZirconIcons\.hydrate/,
  '座位刷新必须维护唯一受控图标容器，不能在已 hydration 的 SVG 前重复插 marker');
assert.match(js, /function renderRevealedHand[\s\S]*rowCount = compact \? 3 : 2[\s\S]*fillRevealedHand/,
  '局终剩余手牌必须按普通/紧凑视口选择多行布局');
assert.match(js, /function fillRevealedHand[\s\S]*classList\.add\('gd-revealing'\)[\s\S]*gd-reveal-rows-/,
  '局终剩余手牌必须进入专用多行展开槽');
assert.match(css, /gd-played\.gd-revealing[\s\S]*overflow:\s*visible/,
  '局终剩余手牌槽不得继续使用普通出牌区的 overflow hidden');
assert.match(html, /id="gdRevealGallery"[^>]*aria-label="本局剩余手牌"/,
  '极窄 200% 视口必须提供有名称的局终余牌画廊');
assert.match(js, /function renderRevealGallery[\s\S]*rowCount = seats\.length >= 4 \? 4 : 3/,
  '紧凑局终画廊必须按未出完玩家数分配三至四行');
assert.match(css, /max-height:\s*400px[\s\S]*gd-showing-reveal[\s\S]*gd-reveal-gallery[\s\S]*grid-template-columns/,
  '极矮 200% 视口必须把余牌切换为互不覆盖的等宽画廊');

assert.match(html, /id="gdOrderBtn"[^>]*aria-expanded="false"/,
  '必须提供显式调整顺序模式');
assert.match(js, /function moveSelectedColumn/, '调整顺序必须实际移动牌列');
assert.doesNotMatch(js, /LONG_PRESS_MS|COL_DRAG/, '不得继续宣称不存在的长按排序');

assert.doesNotMatch(html, /games-shell\/qrcode\.js/,
  '生产掼蛋不得加载未使用的 QR 库');
assert.doesNotMatch(html, /games-shell\/(wins-leaderboard|comments|nick-prompt)\.js/,
  '榜单与交流不得首屏同步加载');
assert.match(js, /loadScriptOnce\('comments'/, '交流组件必须按需加载');
assert.match(js, /loadScriptOnce\('wins'/, '榜单必须按需加载');
assert.doesNotMatch(html, /guandan-dmc\.js/, '新手/普通首屏不得下载 DMC');
for (const module of ['contract', 'storage', 'net', 'audio', 'rules', 'engine', 'ui', 'debug']) {
  assert.match(html, new RegExp(`guandan-${module}\\.js\\?v=20260801p7j`),
    `${module} 模块必须在主程序前独立加载`);
}
assert.match(js, /const gdApi = NET\.api/, '主程序必须真实消费独立网络模块');
assert.match(js, /const toggleMute = AUDIO\.toggle/, '主程序必须真实消费独立音频模块');
assert.match(js, /STORAGE\.writeJson\(SESSION_KEY/, '主程序必须真实消费独立存储模块');
assert.match(contract, /Object\.freeze/, '版本与协议合同必须不可变');
assert.match(storageModule, /window\.GuandanStorage = Object\.freeze/, '存储 API 必须冻结');
assert.match(netModule, /credentials:\s*'omit'[\s\S]*referrerPolicy:\s*'no-referrer'/,
  '网络模块不得隐式携带站点凭证或 referrer');
assert.match(audioModule, /aria-pressed[\s\S]*aria-label/,
  '音效模块必须同步无障碍状态');
assert.match(rulesModule, /window\.GuandanRules = Object\.freeze/,
  '规则基础层必须以不可变 API 独立发布');
assert.match(engineModule, /createNavigationController[\s\S]*invalid_guandan_nav_view/,
  '引擎层必须拥有显式导航状态机');
assert.match(js, /bombStrengthN, isBombType, bombMultiplierFor[\s\S]*\} = RULES/,
  '主程序必须真实消费独立规则基础层');
assert.match(js, /ENGINE\.createNavigationController\(\)/,
  '主程序必须真实消费独立引擎状态机');
assert.match(js, /UI\.createDialogController\(\)/,
  '主程序必须真实消费独立 UI/dialog 模块');
assert.match(js, /openBoard\(event\.currentTarget\)/,
  '榜单 dialog 必须显式传递触发按钮，保证 Safari 焦点恢复');
assert.match(js, /DEBUG\.bindSecretChords\(/,
  '主程序必须真实消费独立 debug 模块');
assert.match(html, /guandan\.min\.js\?v=20260801p7j/,
  '生产页面必须加载经过门禁校验的压缩脚本');
assert.match(debugModule, /enabled = location\.hostname === 'localhost'/,
  '生产调试入口必须被本机环境门禁');

assert.equal(pwa.display, 'standalone');
assert.equal(pwa.scope, '/toolbox/guandan/');
assert.equal(pwa.theme_color, '#173a30');
assert.equal(offline.version, '20260801p7j');
assert.equal(offline.rulesVersion, 'gd-huaian-2025-site-v1');
assert.equal(offline.modelSha256, 'ca389e89e8db98d9968705b0e4495620e025c852cf4db4b4c2e66b086ae03da5');
assert.match(html, /asset_version:\s*"20260801p7j"/,
  '掼蛋 PWA 的全站依赖必须使用确定版本');
assert.ok(offline.core.length >= 5, '冷离线 core 清单不完整');
assert.ok(offline.hard.length >= 3, '高手离线清单不完整');
assert.ok(!offline.core.some(asset => asset.url.includes('guandan-dmc.bin')),
  'easy/normal 冷离线包不得包含模型');
assert.ok(offline.hard.some(asset => asset.url.includes('guandan-dmc.bin')),
  'hard 离线包必须包含模型');
assert.match(sw, /offline-assets\.json\?v=20260801p7j/,
  'SW 必须消费确定性离线清单');
assert.match(js, /offline_asset_hash_mismatch/,
  'hard 离线承诺前必须校验资源 hash');
assert.match(simulator, /const CORE = require\('\.\/load-guandan-authoritative-rules\.cjs'\)/,
  '模拟器必须直接消费浏览器权威规则核心');
assert.match(offlineClient, /localPwaTest[\s\S]*pwa-test/,
  '本地验收必须能显式启用 Service Worker，同时保留普通预览自清理');
assert.match(safariAcceptance, /driverPath[\s\S]*'\/usr\/bin\/safaridriver'[\s\S]*spawn\(driverPath/,
  '真实 Safari 验收必须驱动系统 Safari，而不是 WebKit 替身');
assert.doesNotMatch(safariAcceptance, /safaridriver[^\n]*--enable/,
  'Safari 验收不得擅自修改系统远程自动化设置');
assert.match(safariAcceptance, /request\(`\/session\/\$\{sessionId\}`[^]*method:\s*'DELETE'/,
  'Safari 验收必须销毁 WebDriver session');
assert.match(safariAcceptance, /driver\.kill\('SIGTERM'\)/,
  'Safari 验收必须停止临时 safaridriver');
assert.match(safariAcceptance, /checkOffline[\s\S]*http\.server[\s\S]*stopSourceServer/,
  'Safari 真实离线验收必须拥有并停止隔离源站');
assert.match(safariAcceptance, /sourceDown[\s\S]*normalHandCount[\s\S]*hardHandCount/,
  'Safari 真实离线验收必须证明断源、普通档 27 张牌与高手档不降级');
assert.match(safariAcceptance, /checkA11y[\s\S]*role, 'timer'[\s\S]*autopilotOn[\s\S]*settlement/,
  'Safari 无障碍验收必须覆盖倒计时、托管状态与结算 live region');
assert.match(safariAcceptance, /readSegmentSelections[\s\S]*aria-pressed[\s\S]*synchronized/,
  '真实浏览器验收必须验证设置分段按钮的选择状态与视觉同步');
assert.match(offlineClient, /navigator\.serviceWorker\.controller[\s\S]*controllerchange[\s\S]*return null/,
  '离线承诺必须等待当前页面真正被 Service Worker 接管');
assert.match(firefoxAcceptance, /--browser=firefox/,
  '真实 Firefox 必须有独立验收入口');
assert.match(safariAcceptance, /--allow-system-access[\s\S]*FullZoom\.setZoom\(2\.0\)/,
  'Firefox 200% 验收必须调用浏览器真实 FullZoom，不能只缩小窗口');
assert.match(safariAcceptance, /compactGallery[\s\S]*containedHorizontally[\s\S]*separatedFromNext/,
  'Firefox 紧凑局终画廊必须自动验证不裁切且不覆盖相邻玩家');
assert.match(safariAcceptance, /GuandanDebug\?\.enabled === true[\s\S]*localhost\/127\.0\.0\.1/,
  '局终伪造状态只能在明确启用调试模块的本机隔离站运行');
assert.match(safariAcceptance, /browserLabel.*未加载 release marker[\s\S]*browserLabel.*开局后没有 27 张手牌/s,
  '共享 Safari/Firefox runner 的错误必须标识真实浏览器');
assert.match(safariAcceptance, /serviceWorker\.controlled[\s\S]*performance\.timeOrigin[\s\S]*normalHandCount/,
  'Firefox 断源验收必须证明 controller、生效后的新文档导航和普通档开局');

for (const group of [offline.core, offline.hard]) {
  for (const asset of group) {
    const pathname = new URL(asset.url, 'https://ruizhou03.com').pathname.replace(/^\//, '');
    const data = await readFile(new URL(pathname, root));
    const digest = createHash('sha256').update(data).digest('hex');
    assert.equal(digest, asset.sha256, `离线资源 hash 漂移: ${asset.url}`);
  }
}

console.log(JSON.stringify({
  ok: true,
  releaseMarker: offline.version,
  coreAssets: offline.core.length,
  hardAssets: offline.hard.length,
}));
