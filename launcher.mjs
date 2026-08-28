import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';

// 1. Build exe
console.log('1. Building ZCodeHud.exe...');
spawnSync(process.execPath, [path.resolve('zcode-tps-hud', 'build-exe.mjs')], { stdio: 'inherit' });

// 2. Start background poller
console.log('2. Starting poller...');
const poller = spawn(process.execPath, [path.resolve('zcode-tps-hud', 'poll-metrics.mjs')], {
  detached: true,
  stdio: 'ignore'
});
poller.unref();

// 3. Start ZCodeHud.exe
console.log('3. Launching ZCodeHud.exe...');
const hud = spawn(path.resolve('zcode-tps-hud', 'ZCodeHud.exe'), [], {
  detached: true,
  stdio: 'ignore'
});
hud.unref();

console.log('All started successfully.');
