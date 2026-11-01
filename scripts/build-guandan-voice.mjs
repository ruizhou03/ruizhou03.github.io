// 把逐条合成的掼蛋报牌语音（wav）打成一张语音精灵图，并把每条的 [起点, 时长] 写回 guandan-audio.js。
//   node scripts/build-guandan-voice.mjs <wav 目录>
// 每条：裁掉首尾静音 → 统一响度（-16 LUFS）→ 单声道 24 kHz；条与条之间垫 0.15 s 静音。
// 输出 assets/audio/guandan-voice.mp3（48 kbps）。需要本机 ffmpeg / ffprobe。
// 语音是周睿本人的录音：每条在选音页从「AI 合成 / 各版录音」候选里挑定（素材库与流程见 ~/guandan-voice/README.md）；
// 「不出」三句收两版录音（pass-1 / pass-1b …），游戏里洗牌轮换播放。scripts/synth-guandan-voice.py 保留作 AI 备用。
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const src = process.argv[2];
if (!src) throw new Error('usage: node scripts/build-guandan-voice.mjs <wav-dir>');
const ids = readdirSync(src).filter(f => f.endsWith('.wav')).map(f => f.slice(0, -4)).sort();
if (!ids.length) throw new Error('no wav clips in ' + src);

const work = mkdtempSync(path.join(tmpdir(), 'gd-voice-'));
const RATE = 24000;
const GAP = 0.15;
const ff = args => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const duration = file => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
  '-of', 'default=nw=1:nk=1', file]).toString());

ff(['-f', 'lavfi', '-i', `anullsrc=r=${RATE}:cl=mono`, '-t', String(GAP), '-c:a', 'pcm_s16le', path.join(work, 'gap.wav')]);
const map = {};
const parts = [];
let cursor = 0;
for (const id of ids) {
  const out = path.join(work, id + '.wav');
  ff(['-i', path.join(src, id + '.wav'), '-af',
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.02,' +
    'areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,' +
    'loudnorm=I=-16:TP=-1.5:LRA=7,afade=t=in:d=0.01',
    '-ar', String(RATE), '-ac', '1', '-c:a', 'pcm_s16le', out]);
  const d = duration(out);
  map[id] = [Math.round(cursor * 1000) / 1000, Math.round(d * 1000) / 1000];
  parts.push(out, path.join(work, 'gap.wav'));
  cursor += d + GAP;
}
const list = path.join(work, 'list.txt');
writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
const dest = path.join(root, 'assets/audio/guandan-voice.mp3');
ff(['-f', 'concat', '-safe', '0', '-i', list, '-ar', String(RATE), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '48k', dest]);
rmSync(work, { recursive: true, force: true });

const modulePath = path.join(root, 'assets/js/games/guandan-audio.js');
const source = readFileSync(modulePath, 'utf8');
const next = source.replace(/\/\* VOICE_MAP_START \*\/[\s\S]*?\/\* VOICE_MAP_END \*\//,
  '/* VOICE_MAP_START */ ' + JSON.stringify(map) + ' /* VOICE_MAP_END */');
if (next === source && !source.includes(JSON.stringify(map))) throw new Error('VOICE_MAP markers not found');
writeFileSync(modulePath, next);
console.log(JSON.stringify({ ok: true, clips: ids.length, seconds: Math.round(cursor * 10) / 10, out: 'assets/audio/guandan-voice.mp3' }));
