import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '../..');
const backendArg = process.argv.indexOf('--backend');
if (backendArg < 0 || !process.argv[backendArg + 1]) {
  throw new Error('usage: node tools/doudizhu/sync-core.mjs --backend /absolute/backend/worktree');
}
const backend = resolve(process.argv[backendArg + 1]);
const sourcePath = resolve(root, 'assets/js/doudizhu/engine.js');
const contractPath = resolve(root, 'tools/doudizhu/core-contract.cjs');
const rootManifestPath = resolve(root, 'tools/doudizhu/core-manifest.json');
const source = await readFile(sourcePath);
const contract = await readFile(contractPath);
const manifest = JSON.parse(await readFile(rootManifestPath, 'utf8'));
manifest.sha256 = createHash('sha256').update(source).digest('hex');
const serialized = JSON.stringify(manifest, null, 2) + '\n';

await writeFile(rootManifestPath, serialized);
await writeFile(resolve(backend, 'lib/ddz-engine.cjs'), source);
await writeFile(resolve(backend, 'lib/ddz-core-contract.cjs'), contract);
await writeFile(resolve(backend, 'lib/ddz-core-manifest.json'), serialized);

console.log(JSON.stringify({
  coreVersion: manifest.coreVersion,
  sha256: manifest.sha256,
  backend,
}));
