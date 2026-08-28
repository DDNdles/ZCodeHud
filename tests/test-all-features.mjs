import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// 1. Setup mock live-metrics.json
const metricsPath = path.join(__dirname, 'live-metrics.json');
const mockMetrics = {
  status: "running",
  sessionId: "sess_test_active",
  sessionTitle: "ZCode TPS HUD 视觉重构验收会话",
  modelName: "Gemini 3.7 Flash High",
  modelId: "gemini-3.7-flash-high",
  tps: 52.6,
  avgTps: 45.8,
  inputTokens: 18450,
  outputTokens: 3240,
  reasoningTokens: 1820,
  cacheReadTokens: 14200,
  cacheHitRate: 77.0,
  durationSec: 3.2,
  ttftMs: 240,
  costUsd: 0.00312,
  costCny: 0.0225,
  sessionInputTokens: 85200,
  sessionOutputTokens: 16800,
  sessionReasoningTokens: 9400,
  sessionCacheTokens: 62000,
  sessionCacheHitRate: 72.8,
  sessionCostUsd: 0.0158,
  sessionCostCny: 0.1142,
  sessionDurationSec: 24.6,
  turnsCount: 8,
  sparkline: [22.0, 31.5, 28.0, 42.0, 38.5, 46.8, 52.6, 45.2, 54.0, 52.6],
  quotaMode: false,
  totalQuota: 100.0,
  remainingQuota: 99.88,
  quotaPercent: 99.8,
  quotaCurrency: "CNY",
  quotaAlertLevel: "normal",
  sessions: [
    { id: "sess_active_1", title: "ZCode TPS HUD 前端重构", timeUpdated: Date.now() },
    { id: "sess_active_2", title: "Minecraft Mod 自动化开发", timeUpdated: Date.now() - 3600000 }
  ],
  updatedAt: Date.now()
};
fs.writeFileSync(metricsPath, JSON.stringify(mockMetrics, null, 2), 'utf8');

// 2. Start HTTP server serving hud-web.html
const htmlPath = path.join(__dirname, 'hud-web.html');
const server = http.createServer((req, res) => {
  const parsedUrl = req.url.split('?')[0];
  if (parsedUrl === '/live-metrics.json' || parsedUrl === '/api/metrics') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(metricsPath, 'utf8'));
    return;
  }
  if (parsedUrl === '/settings.json') {
    const sPath = path.join(__dirname, 'settings.json');
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(fs.existsSync(sPath) ? fs.readFileSync(sPath, 'utf8') : '{}');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(htmlPath, 'utf8'));
});

await new Promise((resolve) => server.listen(4899, resolve));
console.log('🚀 Test Server running at http://127.0.0.1:4899');

// 3. Launch browser and capture each curated theme & state
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 800, height: 650 } });
await page.goto('http://127.0.0.1:4899');
await page.waitForTimeout(600);

console.log('📸 Capturing 6 Curated Themes & Responsive Layouts...');

// Theme 1: Apple Glass
await page.evaluate(() => {
  applyTheme('AppleGlass');
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(screenshotsDir, '01-theme-apple-glass.png') });
console.log('✅ Captured: 01-theme-apple-glass.png');

// Theme 2: Google Material 3
await page.evaluate(() => {
  applyTheme('GoogleMaterial');
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(screenshotsDir, '02-theme-google-md3.png') });
console.log('✅ Captured: 02-theme-google-md3.png');

// Theme 3: Cyberpunk Neon
await page.evaluate(() => {
  applyTheme('CyberpunkNeon');
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(screenshotsDir, '03-theme-cyberpunk-neon.png') });
console.log('✅ Captured: 03-theme-cyberpunk-neon.png');

// Theme 4: Nordic Clean
await page.evaluate(() => {
  applyTheme('NordicClean');
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(screenshotsDir, '04-theme-nordic-clean.png') });
console.log('✅ Captured: 04-theme-nordic-clean.png');

// Theme 5: Vintage Newspaper
await page.evaluate(() => {
  applyTheme('Newspaper');
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(screenshotsDir, '05-theme-vintage-newspaper.png') });
console.log('✅ Captured: 05-theme-vintage-newspaper.png');

// Theme 6: Obsidian Pro
await page.evaluate(() => {
  applyTheme('ObsidianPro');
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(screenshotsDir, '06-theme-obsidian-pro.png') });
console.log('✅ Captured: 06-theme-obsidian-pro.png');

// State 7: Settings Drawer
await page.evaluate(() => {
  applyTheme('AppleGlass');
  document.getElementById('settings-drawer').classList.add('open');
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(screenshotsDir, '07-settings-drawer.png') });
console.log('✅ Captured: 07-settings-drawer.png');

// State 8: Quota Mode
await page.evaluate(() => {
  document.getElementById('settings-drawer').classList.remove('open');
  renderMetrics({
    status: "running",
    sessionTitle: "ZCode 额度监控模式运行中",
    modelName: "Gemini 3.7 Flash",
    tps: 64.2,
    avgTps: 58.4,
    quotaMode: true,
    totalQuota: 100.0,
    remainingQuota: 78.40,
    quotaPercent: 78.4,
    quotaCurrency: "CNY",
    quotaAlertLevel: "normal",
    inputTokens: 24500,
    outputTokens: 5120,
    reasoningTokens: 2600,
    cacheHitRate: 82.5,
    durationSec: 2.6,
    turnsCount: 14,
    sessionInputTokens: 210000,
    sessionOutputTokens: 48000,
    sessionCostCny: 21.60,
    sessionCostUsd: 2.98,
    sparkline: [40, 52, 60, 58, 64.2]
  });
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(screenshotsDir, '08-quota-mode-active.png') });
console.log('✅ Captured: 08-quota-mode-active.png');

await browser.close();
server.close();
console.log('✨ All 8 visual verification screenshots generated successfully!');
