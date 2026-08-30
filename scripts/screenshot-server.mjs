import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPath = path.join(__dirname, 'hud-web.html');
const metricsPath = path.join(__dirname, 'live-metrics.json');
const settingsPath = path.join(__dirname, 'settings.json');

const server = http.createServer((req, res) => {
  const parsed = req.url.split('?')[0];
  if (parsed === '/live-metrics.json' || parsed === '/api/metrics') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(fs.existsSync(metricsPath) ? fs.readFileSync(metricsPath, 'utf8') : '{}');
    return;
  }
  if (parsed === '/settings.json') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(fs.existsSync(settingsPath) ? fs.readFileSync(settingsPath, 'utf8') : '{}');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(htmlPath, 'utf8'));
});

server.listen(4899, '127.0.0.1', () => {
  console.log('✅ Screenshot Test Server running on http://127.0.0.1:4899');
});
