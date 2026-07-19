#!/usr/bin/env node
/* 生成 _data/game_versions.json —— 给每个 toolbox 工具/游戏页算一个「内容版本号」。
 *
 * 版本号 = sha1( 源码 HTML 本身  +  它引用的每个同源 /assets/ 文件的内容 ) 前 12 位。
 * 只有游戏自己的代码真的改了，版本号才变；每次部署（site.time 变）不会误报。
 * 前端拿 /offline-versions.json 里这个号跟「用户保存时记下的号」比对，判断有没有新版。
 *
 * 为什么只处理 toolbox：游戏页的 permalink 和 <script/link> 资源引用都明写在源码里，
 * 不用跑 Jekyll、不用猜网址。文章的版本走 front-matter 的 updated|date，由 Jekyll 直接渲染，
 * 不经过这个脚本。
 *
 * 用法：node scripts/offline/gen-game-versions.js   （改了游戏代码、部署前跑一次）
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOLBOX = path.join(ROOT, 'toolbox');

function sha1(buf) { return crypto.createHash('sha1').update(buf).digest('hex'); }

// 从一段 HTML 源码里抽出同源 /assets/ 资源路径（去掉 ?query）
function extractLocalAssets(html) {
  const out = new Set();
  const re = /(?:src|href)\s*=\s*["'](\/assets\/[^"'?#]+)/gi;
  let m;
  while ((m = re.exec(html))) out.add(m[1]);
  return [...out];
}

// 读 front-matter 里的 permalink
function readPermalink(html) {
  const fm = html.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const m = fm[1].match(/^\s*permalink:\s*["']?([^"'\n]+?)["']?\s*$/m);
  return m ? m[1].trim() : null;
}

function walkHtml(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walkHtml(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const versions = {};
let pages = 0, missing = 0;

for (const file of walkHtml(TOOLBOX)) {
  const html = fs.readFileSync(file, 'utf8');
  const permalink = readPermalink(html);
  if (!permalink) continue;               // 没 permalink 的（partial 等）跳过
  pages++;

  const h = crypto.createHash('sha1');
  // 源码 HTML 去掉每次部署都变的 ?v=... 版本戳，保证同内容不部署不变号
  h.update(html.replace(/\?v=\{\{[^}]*\}\}/g, '').replace(/\?v=\d+/g, ''));

  const assets = extractLocalAssets(html).sort();
  for (const rel of assets) {
    const abs = path.join(ROOT, rel.replace(/^\//, ''));
    if (fs.existsSync(abs)) h.update(rel).update(fs.readFileSync(abs));
    else missing++;                       // 引用了不存在的本地资源（可能是构建期生成/笔误）
  }
  versions[permalink] = h.digest('hex').slice(0, 12);
}

const outPath = path.join(ROOT, '_data', 'game_versions.json');
fs.writeFileSync(outPath, JSON.stringify(versions, null, 0) + '\n');
console.log(`game_versions: ${pages} 页 → ${outPath}` + (missing ? ` （${missing} 个资源引用未在本地找到，已跳过）` : ''));
