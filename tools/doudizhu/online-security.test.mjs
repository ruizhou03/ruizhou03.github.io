import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../../assets/js/doudizhu/ui.js', import.meta.url),
  'utf8',
);

assert.match(source, /resumeOnlineCredentials/);
assert.match(source, /navigator\.locks\.request/);
assert.match(source, /resumeRequestId/);
assert.match(source, /action=stream&code=' \+ encodeURIComponent\(sess\.code\)[\s\S]*?&ticket=/);
assert.match(source, /apiCall\('stream_ticket'/);
assert.match(source, /es\.addEventListener\('reconnect'/);
assert.match(source, /0\.75 \+ Math\.random\(\) \* 0\.5/);
assert.match(source, /Authorization: 'Bearer ' \+ opts\.token/);
assert.match(source, /invite=' \+ encodeURIComponent\(online\.inviteSecret\)/);
assert.match(source, /tool\.doudizhu\.sse/);
assert.match(source, /onlineAuthenticatedCall/);
assert.match(source, /function ddzSerialize\(\)[\s\S]*?state\.mode !== 'single'/);
assert.match(source, /if \(state\.mode === 'online'\)[\s\S]*?ddzSave\.start\(\)/);
assert.doesNotMatch(source, /action=stream[^;\n]*[?&]token=/);
assert.doesNotMatch(source, /qs: \{[^\n]*token:/);
assert.doesNotMatch(source, /beforeunload/);

console.log('斗地主联机安全契约：16 通过, 0 失败');
