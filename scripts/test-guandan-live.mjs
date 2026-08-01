import assert from 'node:assert/strict';

const wait = process.argv.includes('--wait');
const attempts = wait ? 40 : 1;
const delayMs = 15000;
const base = 'https://ruizhou03.com';
const marker = '20260801p7d';

async function probe() {
  const page = await fetch(`${base}/toolbox/guandan/`, { cache: 'no-store' });
  const html = await page.text();
  assert.equal(page.status, 200, '生产掼蛋页面必须返回 200');
  assert.match(html, new RegExp(`guandan\\.min\\.js\\?v=${marker}`), '生产 HTML 尚未出现当前 marker');
  for (const path of [
    `/assets/js/games/guandan.min.js?v=${marker}`,
    `/toolbox/guandan/offline-assets.json?v=${marker}`,
    '/toolbox/guandan/manifest.json',
  ]) {
    const response = await fetch(base + path, { cache: 'no-store' });
    assert.equal(response.status, 200, `${path} 必须返回 200`);
  }
  const readiness = await fetch('https://zircon-urge.fly.dev/health/ready', { cache: 'no-store' });
  assert.equal(readiness.status, 200, '后端 readiness 必须返回 200');
  const unknown = await fetch('https://zircon-urge.fly.dev/api/guandan?action=release_gate_unknown', {
    cache: 'no-store',
  });
  assert.notEqual(unknown.status, 500, 'unknown action 不得返回 500');
  return { page: page.status, readiness: readiness.status, unknown: unknown.status };
}

let lastError;
for (let attempt = 1; attempt <= attempts; attempt++) {
  try {
    const result = await probe();
    console.log(JSON.stringify({ ok: true, marker, attempt, ...result }));
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}
throw lastError;
