import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 启动 ZCode-TPS-HUD (数据采集器 + 原生 WPF 悬浮窗)...');

const pollerPath = path.join(__dirname, 'poll-metrics.mjs');
const hudExePath = path.join(__dirname, 'ZCodeHud.exe');

// 1. 启动数据采集器
const poller = spawn('node', [pollerPath], {
  cwd: __dirname,
  stdio: 'inherit',
  detached: true
});
poller.unref();

console.log('📡 数据采集轮询器已在后台启动 (PID: ' + poller.pid + ')');

// 2. 启动原生 WPF HUD
if (fs.existsSync(hudExePath)) {
  const hud = spawn(hudExePath, [], {
    cwd: __dirname,
    stdio: 'ignore',
    detached: true
  });
  hud.unref();
  console.log('✨ 原生 WPF HUD 悬浮窗已启动 (PID: ' + hud.pid + ')');
} else {
  console.error('❌ 未找到 ZCodeHud.exe，请先执行 node compile.mjs 进行编译！');
}

console.log('🎉 启动流程完成！');
