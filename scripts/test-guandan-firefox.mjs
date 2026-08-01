#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const runner = fileURLToPath(new URL('./test-guandan-safari.mjs', import.meta.url));
const args = process.argv.slice(2);
if (!args.some((arg) => arg.startsWith('--browser='))) args.unshift('--browser=firefox');

const result = spawnSync(process.execPath, [runner, ...args], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
