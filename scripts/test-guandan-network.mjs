import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../toolbox/guandan/index.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../assets/js/games/guandan.js', import.meta.url), 'utf8');
const net = await readFile(new URL('../assets/js/games/guandan-net.js', import.meta.url), 'utf8');
const runtime = `${net}\n${js}`;

assert.match(net, /headers\.Authorization\s*=\s*'Bearer '\s*\+\s*options\.token/,
  '受保护请求必须通过 Authorization bearer 发送 access token');
assert.match(net, /cache:\s*'no-store'/,
  '牌面请求必须显式禁用浏览器缓存');
assert.match(js, /gdApi\('stream_ticket',[\s\S]{0,180}token:\s*sess\.accessToken/,
  'SSE 必须先用 bearer token 换取短效 stream ticket');
assert.match(js, /new EventSource\([\s\S]{0,240}&ticket=/,
  'EventSource URL 只能携带短效 stream ticket');
assert.doesNotMatch(runtime, /[?&]token=/,
  '长期 access token 不得进入 URL');
assert.doesNotMatch(runtime, /qs:\s*\{[^}]*\btoken\b/s,
  '长期 access token 不得通过 query 参数发送');
assert.doesNotMatch(runtime, /body:\s*\{[^}]{0,300}\btoken\s*:/s,
  '长期 access token 不得放入请求体');

assert.match(js, /requestId,\s*\n\s*expectedVersion:/,
  '所有 mutation 必须携带 requestId 与 expectedVersion');
assert.match(js, /const previous = sess\._mutationTail/,
  '同一会话的 mutation 必须串行化');
assert.match(js, /凭证轮换不改变公开 room\.version[\s\S]{0,260}gdApi\(action/,
  '凭证轮换后必须保留原 requestId 与 expectedVersion 重试 mutation');
const terminalFailureFn = js.match(/function isTerminalOnlineFailure\(r\) \{[\s\S]*?\n  \}/)?.[0] || '';
assert.ok(terminalFailureFn, '必须定义会话终止错误分类器');
assert.doesNotMatch(terminalFailureFn, /r\.status === 403|r\.status === 404/,
  '普通权限或资源竞争错误不得被误判为会话撤销');
assert.match(terminalFailureFn, /room_version_unsupported/,
  '无法迁移的房间版本必须终止旧会话，避免无限重连');
assert.match(js, /shouldResumeOnlineFailure\(r\) && sess\.resumeSecret/,
  'mutation 只能在凭证错误时轮换 resume secret');
assert.match(js, /resumeSecret:\s*attemptedSecret/,
  'access token 过期后必须使用独立 resume secret 轮换凭证');
assert.match(js, /resumeRequestId:\s*sess\._resumeRequestId/,
  'resume requestId 必须在请求发出前持久化');
assert.match(js, /requestId:\s*sess\._resumeRequestId/,
  'resume 重试必须复用同一 requestId');
assert.match(js, /navigator\.locks\.request\(lockName,\s*execute\)/,
  '同源多标签页必须串行轮换 resume secret');
assert.match(js, /sessionSchemaVersion:\s*ONLINE_SESSION_SCHEMA_VERSION/,
  '本地联机会话必须带 schema 版本');
assert.match(js, /srv\.aiContractVersion === AI_CONTRACT_VERSION/,
  '联机必须拒绝 AI 合同不一致的服务器');
assert.match(js, /srv\.strategyIds\[difficulty\] === strategy\.id/,
  '联机必须逐档校验不可变 strategy ID');
assert.match(js, /aiContractVersion:\s*AI_CONTRACT_VERSION/,
  '建房、入房和联机会话必须声明 AI 合同版本');

assert.match(js, /inviteCode,\s*\n\s*nick:\s*'测试·'/,
  '四真人测试房必须使用安全邀请码加入');
assert.match(js, /testMutation\('sit'/,
  '测试模式 mutation 必须经过 CAS/幂等通道');
assert.match(js, /testMutation\('start'/,
  '测试模式开局必须经过 CAS/幂等通道');
assert.match(js, /testMutation\('leave'/,
  '测试模式解散必须经过 CAS/幂等通道');

assert.match(html, /id="gdOnlineCode"[\s\S]{0,180}placeholder="粘贴邀请码或邀请链接"/,
  '加入界面必须接收完整邀请码或邀请链接');
assert.doesNotMatch(html, /id="gdOnlineCode"[\s\S]{0,180}pattern="\\d\{4\}"/,
  '加入界面不得把输入限制为可枚举的四位房号');
assert.match(js, /searchParams\.set\('room',\s*onlineState\.inviteCode\)/,
  '分享链接必须包含完整安全邀请码');
assert.doesNotMatch(js, /\/\^\\d\{4\}\$\//,
  '严格协议前端不得接受可枚举的裸四位房号');
assert.match(js, /new URLSearchParams\(location\.search\)\.get\('room'\)/,
  '自动加入必须安全解析 URLSearchParams 中的完整邀请码');
assert.match(html, /guandan\.min\.js\?v=20260801p7d/,
  '生产页面必须引用本次安全协议压缩构建标记');

console.log('guandan network contracts: ok');
