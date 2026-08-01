import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const version = '20260801g8a';
const own = path => ({ path, url: `/${path}?v=${version}` });
const raw = path => ({ path, url: `/${path}` });

const groups = {
  core: [
    own('assets/css/games-shell.css'),
    own('assets/css/doudizhu.css'),
    own('assets/js/games-shell/identity.js'),
    own('assets/js/games-shell/wins-leaderboard.js'),
    own('assets/js/games-shell/comments.js'),
    own('assets/js/games-shell/nick-prompt.js'),
    own('assets/js/games-shell/save-state.js'),
    own('assets/js/games-shell/settlement.js'),
    own('assets/js/doudizhu/engine.js'),
    own('assets/js/doudizhu/ai.js'),
    own('assets/js/doudizhu/policy.js'),
    own('assets/js/doudizhu/ai-runtime.js'),
    own('assets/js/doudizhu/storage.js'),
    own('assets/js/doudizhu/offline.js'),
    own('assets/js/doudizhu/extras.js'),
    own('assets/js/doudizhu/rules-content.js'),
    own('assets/js/doudizhu/ui.js'),
    raw('toolbox/doudizhu/manifest.json'),
    raw('assets/icons/doudizhu-icon-192.png'),
    raw('assets/icons/doudizhu-icon-512.png'),
    raw('assets/icons/doudizhu-icon-maskable-512.png'),
    raw('assets/icons/doudizhu-apple-touch-icon.png'),
  ],
  base: [],
  hard: [
    own('assets/js/doudizhu/ai-worker.js'),
    own('assets/js/doudizhu/net.js'),
    raw('assets/js/doudizhu/model-manifest.json'),
    ...['landlord', 'landlord_down', 'landlord_up'].flatMap(seat => [
      raw(`assets/js/doudizhu/weights/adp_${seat}.json`),
      raw(`assets/js/doudizhu/weights/adp_${seat}.qw`),
    ]),
  ],
  master: [
    own('assets/js/doudizhu/ai-worker.js'),
    own('assets/js/doudizhu/ai-eval-worker.js'),
    own('assets/js/doudizhu/net.js'),
    raw('assets/js/doudizhu/model-manifest.json'),
    ...['landlord', 'landlord_down', 'landlord_up'].flatMap(seat => [
      raw(`assets/js/doudizhu/weights/resnet_${seat}.json`),
      raw(`assets/js/doudizhu/weights/resnet_${seat}.qw`),
    ]),
  ],
};

async function entry(asset) {
  const bytes = await readFile(resolve(root, asset.path));
  return {
    url: asset.url,
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

const manifest = { version };
for (const [name, assets] of Object.entries(groups)) manifest[name] = await Promise.all(assets.map(entry));
await writeFile(
  resolve(root, 'toolbox/doudizhu/offline-assets.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
