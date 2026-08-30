import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// 1. Prepare simulated rich live metrics
const metricsFile = path.join(__dirname, 'live-metrics.json');
const settingsFile = path.join(__dirname, 'settings.json');

const testMetrics = {
  status: "running",
  sessionId: "sess_desktop_verified",
  sessionTitle: "ZCode TPS HUD 真实桌面端实测",
  modelName: "Gemini 3.7 Flash High",
  modelId: "gemini-3.7-flash-high",
  tps: 49.2,
  avgTps: 42.8,
  inputTokens: 26800,
  outputTokens: 4120,
  reasoningTokens: 2400,
  cacheReadTokens: 20100,
  cacheHitRate: 75.0,
  durationSec: 3.1,
  ttftMs: 210,
  costUsd: 0.0041,
  costCny: 0.0296,
  sessionInputTokens: 145000,
  sessionOutputTokens: 28900,
  sessionReasoningTokens: 16500,
  sessionCacheTokens: 105000,
  sessionCacheHitRate: 72.4,
  sessionCostUsd: 0.0289,
  sessionCostCny: 0.2089,
  sessionDurationSec: 42.5,
  turnsCount: 9,
  sparkline: [26.0, 34.0, 41.5, 48.0, 43.5, 49.2, 45.0, 48.2, 53.0, 49.2],
  quotaMode: false,
  totalQuota: 100.0,
  remainingQuota: 99.79,
  quotaPercent: 99.8,
  quotaCurrency: "CNY",
  quotaAlertLevel: "normal",
  updatedAt: Date.now()
};

fs.writeFileSync(metricsFile, JSON.stringify(testMetrics, null, 2), 'utf8');

// 2. Launch ZCodeHud.exe directly in background
const exePath = path.join(__dirname, 'ZCodeHud.exe');
console.log('🚀 Spawning native Windows EXE:', exePath);
const child = spawn(exePath, [], { detached: true, stdio: 'ignore' });
child.unref();

console.log('✅ Native ZCodeHud.exe started successfully with PID:', child.pid);
