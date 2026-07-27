import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../toolbox/guandan/index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../assets/css/guandan.css', import.meta.url), 'utf8');
const js = await readFile(new URL('../assets/js/games/guandan.js', import.meta.url), 'utf8');
const contract = await readFile(new URL('../assets/js/games/guandan-contract.js', import.meta.url), 'utf8');
const engine = await readFile(new URL('../assets/js/games/guandan-engine.js', import.meta.url), 'utf8');
const rulesFixture = JSON.parse(await readFile(
  new URL('../tests/fixtures/guandan-rules-golden.json', import.meta.url),
  'utf8',
));

assert.match(html, /class="gd-board-btn" id="gdBoardBtn"/, '榜单按钮应使用独立定位类');
assert.match(html, /class="gd-mute-btn" id="gdMuteBtn"/, '音效按钮应使用独立定位类');
assert.doesNotMatch(html, /class="gd-board-btn" id="gdMuteBtn"/, '音效按钮不得复用榜单定位类');
assert.match(css, /@media \(prefers-color-scheme: dark\)[\s\S]*--gd-felt-1:\s*#1c3933/,
  '系统自适应方案必须提供真正深色牌桌');
assert.match(html, /guandan\.min\.js\?v=20260727p7a/, '生产页面应使用阶段 7 压缩内容标记，避免旧 JS 缓存');
assert.match(html, /data-value="off"[^>]*class="[^"]*selected|class="[^"]*selected"[^>]*data-value="off"/,
  '同队进贡 UI 默认应关闭');

for (const view of ['setup', 'lobby', 'playing', 'tribute', 'settlement']) {
  assert.match(engine, new RegExp(`['"]${view}['"]`), `缺少显式导航状态 ${view}`);
}
assert.match(js, /pauseLocalGame\('settings'\)/, '设置盖层应暂停单机');
assert.match(js, /pauseLocalGame\('board'\)/, '榜单盖层应暂停单机');
assert.match(js, /联机对局由服务器继续计时/, '联机盖层应说明服务器仍在计时');
assert.match(js, /房间会话已保留，正在重试/, '临时重连失败应保留会话');
assert.match(js, /已从本机退出；服务器将自动托管离线座位/,
  '显式退出即使网络失败也必须清理本地状态并说明服务器托管');
assert.doesNotMatch(js, /sendBeacon\([\s\S]{0,180}action=leave/,
  '刷新或关闭页面不得主动 leave');
assert.match(js, /1\+2 或 1\+3[^]*1\+4 不能过 A/, '规则说明应与 A 级胜负引擎一致');
assert.match(contract, /gd-huaian-2025-site-v1/, '前端必须声明不可变 rulesVersion');
assert.match(contract, /guandan-protocol-v2/, '前端必须声明 protocolVersion');
assert.match(js, /migrateSessionSnapshot/, '旧存档必须经过显式 schema migration');
assert.match(js, /rulesVersion:\s*RULES_VERSION/, '单机和联机会话必须保存 rulesVersion');
assert.equal(rulesFixture.saveSchemaVersion, 3, 'golden fixture 必须跟随当前单机存档 schema');

console.log('guandan P0 contracts: ok');
