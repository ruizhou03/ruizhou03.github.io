const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

const source = readFileSync(require.resolve('../assets/js/auth/auth.js'), 'utf8');

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function loadAuth(fetchImpl) {
  const storage = new Map();
  const localStorage = {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); },
    removeItem(key) { storage.delete(key); },
  };
  const window = {};
  const context = {
    window,
    localStorage,
    fetch: fetchImpl,
    Response,
    setTimeout,
    clearTimeout,
    console,
  };
  runInNewContext(source, context, { filename: 'assets/js/auth/auth.js' });
  return { SiteAuth: window.SiteAuth, storage, context };
}

test('stores refresh token, rotates on 401, retries once, and revokes on logout', async () => {
  const calls = [];
  let protectedCount = 0;
  const { SiteAuth, storage } = loadAuth(async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith('/auth?action=verify-email-code')) {
      return jsonResponse(200, {
        ok: true, token: 'access-1', refreshToken: 'refresh-1',
        user: { accountId: 'a_test', email: 'test@example.com', nick: 'test' },
      });
    }
    if (url.endsWith('/auth?action=refresh')) {
      assert.deepEqual(JSON.parse(init.body), { refreshToken: 'refresh-1' });
      return jsonResponse(200, {
        ok: true, token: 'access-2', refreshToken: 'refresh-2',
        user: { accountId: 'a_test', email: 'test@example.com', nick: 'test' },
      });
    }
    if (url === 'https://zircon-comments.fly.dev/api/my-comments') {
      protectedCount++;
      if (protectedCount === 1) return jsonResponse(401, { error: 'session_invalid' });
      assert.equal(init.headers.Authorization, 'Bearer access-2');
      return jsonResponse(200, { ok: true, items: [] });
    }
    if (url.endsWith('/auth?action=logout')) {
      assert.equal(init.headers.Authorization, 'Bearer access-2');
      return jsonResponse(200, { ok: true });
    }
    throw new Error(`unexpected request ${url}`);
  });

  const login = await SiteAuth.verifyEmailCode('test@example.com', '12345678');
  assert.equal(login.ok, true);
  assert.equal(storage.get('site.auth.token.v1'), 'access-1');
  assert.equal(storage.get('site.auth.refresh.v1'), 'refresh-1');

  const protectedResponse = await SiteAuth.authedFetch('https://zircon-comments.fly.dev/api/my-comments');
  assert.equal(protectedResponse.status, 200);
  assert.equal(protectedCount, 2);
  assert.equal(storage.get('site.auth.token.v1'), 'access-2');
  assert.equal(storage.get('site.auth.refresh.v1'), 'refresh-2');

  await SiteAuth.logout();
  assert.equal(storage.has('site.auth.token.v1'), false);
  assert.equal(storage.has('site.auth.refresh.v1'), false);
  assert.equal(storage.has('site.auth.user.v1'), false);
  assert.equal(calls.filter((call) => call.url.endsWith('/auth?action=refresh')).length, 1);
});

test('definitively rejected refresh clears the whole local session', async () => {
  const { SiteAuth, storage } = loadAuth(async (url) => {
    if (url.endsWith('/auth?action=verify-email-code')) {
      return jsonResponse(200, {
        ok: true, token: 'access-dead', refreshToken: 'refresh-dead',
        user: { accountId: 'a_dead', email: 'dead@example.com' },
      });
    }
    if (url.endsWith('/auth?action=refresh')) return jsonResponse(401, { error: 'session_invalid' });
    if (url.endsWith('/auth?action=me')) return jsonResponse(401, { error: 'session_invalid' });
    throw new Error(`unexpected request ${url}`);
  });

  await SiteAuth.verifyEmailCode('dead@example.com', '12345678');
  assert.ok(SiteAuth.getRefreshToken());
  const user = await SiteAuth.refresh();
  assert.equal(user, null);
  assert.equal(storage.has('site.auth.token.v1'), false);
  assert.equal(storage.has('site.auth.refresh.v1'), false);
});
