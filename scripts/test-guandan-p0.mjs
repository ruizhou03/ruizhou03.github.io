import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../toolbox/guandan/index.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../assets/js/games/guandan.js', import.meta.url), 'utf8');

assert.match(html, /class="gd-board-btn" id="gdBoardBtn"/, '榜单按钮应使用独立定位类');
assert.match(html, /class="gd-mute-btn" id="gdMuteBtn"/, '音效按钮应使用独立定位类');
assert.doesNotMatch(html, /class="gd-board-btn" id="gdMuteBtn"/, '音效按钮不得复用榜单定位类');
assert.match(html, /--gd-ui-ink:\s*#1f2a3d/, '固定浅色牌桌应使用独立深色文字变量');
assert.match(html, /guandan\.js\?v=20260723p0/, '生产页面应使用本次 P0 内容标记，避免旧 JS 缓存');
assert.match(html, /data-value="off"[^>]*class="[^"]*selected|class="[^"]*selected"[^>]*data-value="off"/,
  '同队进贡 UI 默认应关闭');

for (const view of ['setup', 'lobby', 'playing', 'tribute', 'settlement']) {
  assert.match(js, new RegExp(`['"]${view}['"]`), `缺少显式导航状态 ${view}`);
}
assert.match(js, /pauseLocalGame\('settings'\)/, '设置盖层应暂停单机');
assert.match(js, /pauseLocalGame\('board'\)/, '榜单盖层应暂停单机');
assert.match(js, /联机对局由服务器继续计时/, '联机盖层应说明服务器仍在计时');
assert.match(js, /房间会话已保留，正在重试/, '临时重连失败应保留会话');
assert.match(js, /if \(!r\.ok && !isTerminalOnlineFailure\(r\)\)[\s\S]{0,300}return false;/,
  '临时离房失败应保留本地状态');
assert.doesNotMatch(js, /sendBeacon\([\s\S]{0,180}action=leave/,
  '刷新或关闭页面不得主动 leave');
assert.match(js, /1\+2 或 1\+3[^]*1\+4 不能过 A/, '规则说明应与 A 级胜负引擎一致');

console.log('guandan P0 contracts: ok');
