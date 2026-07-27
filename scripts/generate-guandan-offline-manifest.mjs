import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const contractSource = await readFile(new URL('assets/js/games/guandan-contract.js', root), 'utf8');
const marker = /releaseMarker:\s*'([^']+)'/.exec(contractSource)?.[1];
const rulesVersion = /rulesVersion:\s*'([^']+)'/.exec(contractSource)?.[1];
if (!marker || !rulesVersion) throw new Error('guandan_contract_version_missing');

const modelSha256 = 'ca389e89e8db98d9968705b0e4495620e025c852cf4db4b4c2e66b086ae03da5';
const corePaths = [
  'assets/css/main.css',
  'assets/css/guandan.css',
  'assets/css/zircon-icons.css',
  'assets/css/games-shell.css',
  'assets/icons/zircon-ui.svg',
  'assets/icons/guandan-icon-192.png',
  'assets/icons/guandan-icon-512.png',
  'assets/icons/guandan-icon-maskable-512.png',
  'assets/icons/guandan-apple-touch-icon.png',
  'assets/js/games-shell/identity.js',
  'assets/js/zircon-icons.js',
  'assets/js/offline/offline.js',
  'assets/js/games/guandan-contract.js',
  'assets/js/games/guandan-storage.js',
  'assets/js/games/guandan-net.js',
  'assets/js/games/guandan-audio.js',
  'assets/js/games/guandan-rules.js',
  'assets/js/games/guandan-engine.js',
  'assets/js/games/guandan-ui.js',
  'assets/js/games/guandan-debug.js',
  'assets/js/games/guandan-ai-contract.js',
  'assets/js/games/guandan.min.js',
  'toolbox/guandan/manifest.json',
];
const hardPaths = [
  'assets/js/games/guandan-dmc-worker.js',
  'assets/js/games/guandan-dmc.js',
  'assets/js/games/guandan-dmc.bin',
];

function versionedUrl(path) {
  if (path === 'assets/js/games/guandan-ai-contract.js' ||
      path === 'assets/js/games/guandan-dmc-worker.js' ||
      path === 'assets/js/games/guandan-dmc.js') {
    return `/${path}?v=20260727ai5`;
  }
  if (path === 'assets/js/games/guandan-dmc.bin') {
    return `/${path}?v=${modelSha256.slice(0, 12)}`;
  }
  if (path.startsWith('assets/css/') || path.startsWith('assets/js/')) {
    return `/${path}?v=${marker}`;
  }
  return `/${path}`;
}

async function entry(path) {
  const bytes = await readFile(new URL(path, root));
  return {
    url: versionedUrl(path),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

const manifest = {
  version: marker,
  rulesVersion,
  modelSha256,
  core: await Promise.all(corePaths.map(entry)),
  hard: await Promise.all(hardPaths.map(entry)),
};
const destination = new URL('toolbox/guandan/offline-assets.json', root);
await writeFile(destination, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({
  ok: true,
  marker,
  coreAssets: manifest.core.length,
  hardAssets: manifest.hard.length,
}));
