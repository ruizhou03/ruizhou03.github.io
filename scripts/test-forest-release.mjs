#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = path.join(root, 'toolbox/forest/index.html');
const versionsPath = path.join(root, '_data/game_versions.json');
const update = process.argv.includes('--update');
const html = fs.readFileSync(pagePath, 'utf8');

assert.equal((html.match(/^<script(?:\s[^>]*)?>/gm) || []).filter((tag) => !/\ssrc=/.test(tag)).length, 0, 'Forest page must not contain inline scripts');
assert.equal((html.match(/^<style(?:\s[^>]*)?>/gm) || []).length, 0, 'Forest page must not contain inline styles');

const requiredAssets = [
  '/assets/css/forest.css',
  '/assets/js/forest/core.js',
  '/assets/js/forest/storage.js',
  '/assets/js/forest/scenes.js',
  '/assets/js/forest/app.js',
];
requiredAssets.forEach((asset) => assert.match(html, new RegExp(`(?:src|href)=["']${asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?"'])`), `Forest must directly reference ${asset}`));

const localAssets = new Set();
const assetPattern = /(?:src|href)\s*=\s*["'](\/assets\/[^"'?#]+)/gi;
let match;
while ((match = assetPattern.exec(html))) localAssets.add(match[1]);

const hash = crypto.createHash('sha1');
hash.update(html.replace(/\?v=\{\{[^}]*\}\}/g, '').replace(/\?v=\d+/g, ''));
[...localAssets].sort().forEach((relative) => {
  const absolute = path.join(root, relative.replace(/^\//, ''));
  assert.equal(fs.existsSync(absolute), true, `Missing Forest asset ${relative}`);
  hash.update(relative).update(fs.readFileSync(absolute));
});
const expected = hash.digest('hex').slice(0, 12);
const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));

if (update) {
  versions['/toolbox/forest/'] = expected;
  fs.writeFileSync(versionsPath, JSON.stringify(versions) + '\n');
  console.log(`Forest release marker updated: ${expected}`);
} else {
  assert.equal(versions['/toolbox/forest/'], expected, `Forest release marker is stale; run node scripts/test-forest-release.mjs --update`);
  console.log(`Forest release contract OK: ${expected} (${localAssets.size} direct assets)`);
}
