import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const PORT = 38291;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HTML_FILE = path.join(__dirname, 'hud-web.html');
const METRICS_FILE = path.join(__dirname, 'live-metrics.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const PROFILE_DIR = path.join(os.tmpdir(), 'zcode_tps_hud_isolated_profile');

// Ensure isolated profile directory exists
if (!fs.existsSync(PROFILE_DIR)) {
  try { fs.mkdirSync(PROFILE_DIR, { recursive: true }); } catch (e) {}
}

let simulatedMetrics = null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Atomic settings write (tmp file + rename) so concurrent readers (WPF HUD,
 * poller) never observe a half-written JSON. Falls back to a direct write if
 * the rename collides with a reader holding the file open on Windows.
 */
function writeSettingsAtomic(content) {
  const tmpFile = `${SETTINGS_FILE}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  try {
    fs.writeFileSync(tmpFile, content, 'utf8');
    let retries = 4;
    while (retries > 0) {
      try {
        fs.renameSync(tmpFile, SETTINGS_FILE);
        return true;
      } catch (err) {
        retries--;
        if (retries === 0) {
          try {
            fs.copyFileSync(tmpFile, SETTINGS_FILE);
            fs.unlinkSync(tmpFile);
            return true;
          } catch (e2) {
            try { fs.writeFileSync(SETTINGS_FILE, content, 'utf8'); } catch (e3) {}
          }
        }
      }
    }
  } catch (err) {
    try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {}
  }
  return false;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Recursive merge: keys present in the POSTed settings win, keys absent from
 * the POST but present in the existing file are preserved. This prevents the
 * Web HUD (which only manages a subset of keys) from wiping WPF/poller-owned
 * configuration such as customModels or planSettings fields it never sends.
 */
function deepMergeSettings(base, patch) {
  const out = isPlainObject(base) ? { ...base } : {};
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    if (isPlainObject(pv) && isPlainObject(out[key])) {
      out[key] = deepMergeSettings(out[key], pv);
    } else {
      out[key] = pv;
    }
  }
  return out;
}

// HTTP Server for HUD UI & Real-time Metrics API
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url.pathname === '/' || url.pathname === '/hud') {
      try {
        const html = await fsp.readFile(HTML_FILE, 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (e) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('hud-web.html not found');
      }
      return;
    }

    if (url.pathname === '/api/settings') {
      if (req.method === 'POST') {
        let body = '';
        let tooLarge = false;
        req.on('data', chunk => {
          body += chunk;
          if (body.length > 1_000_000) {
            tooLarge = true;
            req.removeAllListeners('data');
            req.removeAllListeners('end');
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request body too large (1MB limit)' }));
          }
        });
        req.on('end', () => {
          if (tooLarge) return;
          try {
            const parsed = JSON.parse(body);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Settings must be a JSON object' }));
              return;
            }

            // Merge onto the current on-disk settings instead of replacing
            // them wholesale (avoids last-write-wins data loss between the
            // Web HUD and the WPF window / poller-owned keys).
            //
            // The read is retried a few times: a transient failure (a writer
            // mid-replace, antivirus scan) must NOT silently degrade into the
            // "write parsed as-is" path, which would drop every key owned by
            // the other UI. All current writers use atomic tmp+rename writes,
            // so a couple of short retries fully closes that window.
            let merged = parsed;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                const existingRaw = fs.readFileSync(SETTINGS_FILE, 'utf8');
                const existing = JSON.parse(existingRaw);
                if (isPlainObject(existing)) {
                  merged = deepMergeSettings(existing, parsed);
                }
                break; // readable file (merged or not an object) -> done
              } catch (e) {
                if (attempt === 2) break; // missing/corrupt file -> write parsed as-is
              }
            }

            // Keep the legacy WPF quota toggle in sync with planSettings.enabled
            // so both UIs agree on a single source of truth.
            if (isPlainObject(merged.planSettings) && typeof merged.planSettings.enabled === 'boolean') {
              if (!isPlainObject(merged.quotaSettings)) merged.quotaSettings = {};
              merged.quotaSettings.enabled = merged.planSettings.enabled;
            }

            writeSettingsAtomic(JSON.stringify(merged, null, 2));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, settings: merged }));
          } catch (e) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
        return;
      }

      // GET settings — must never be cached, otherwise the Web HUD shows stale config
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      });
      try {
        const raw = await fsp.readFile(SETTINGS_FILE, 'utf8');
        res.end(raw);
      } catch (e) {
        res.end(JSON.stringify({}));
      }
      return;
    }

    if (url.pathname === '/api/metrics' || url.pathname === '/live-metrics.json') {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (simulatedMetrics) {
        res.end(JSON.stringify(simulatedMetrics));
        return;
      }

      try {
        const data = await fsp.readFile(METRICS_FILE, 'utf8');
        res.end(data);
        return;
      } catch (e) { /* fall through to default payload */ }

      // Default Fallback
      res.end(JSON.stringify({
        status: 'idle',
        tps: 0.0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheHitRate: 0.0,
        costUsd: 0,
        costCny: 0,
        durationSec: 0.0,
        ttftMs: 0,
        modelName: 'Gemini 3.7 Flash',
        sparkline: new Array(30).fill(0)
      }));
      return;
    }

    if (url.pathname === '/api/simulate' && req.method === 'POST') {
      let body = '';
      let tooLarge = false;
      req.on('data', chunk => {
        body += chunk;
        if (body.length > 1_000_000) {
          tooLarge = true;
          req.removeAllListeners('data');
          req.removeAllListeners('end');
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Request body too large (1MB limit)' }));
        }
      });
      req.on('end', () => {
        if (tooLarge) return;
        try {
          if (body.trim() === '' || body === 'null') {
            simulatedMetrics = null;
          } else {
            simulatedMetrics = JSON.parse(body);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, simulated: !!simulatedMetrics }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    // Serve static assets in project directory.
    // NOTE: the containment check must compare against `__dirname + path.sep`
    // (or exact equality); a bare startsWith(__dirname) would also accept a
    // sibling directory such as `zcode-tps-hud2\...`.
    const safePath = path.normalize(path.join(__dirname, url.pathname));
    const contained = safePath === __dirname || safePath.startsWith(__dirname + path.sep);
    if (contained) {
      try {
        const stat = await fsp.stat(safePath);
        if (stat.isFile()) {
          const ext = path.extname(safePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          const data = await fsp.readFile(safePath);
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
          return;
        }
      } catch (e) { /* not found / vanished between stat and read -> 404 below */ }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } catch (err) {
    // Never let an async handler rejection crash the whole HUD server process.
    try {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    } catch (e) {}
  }
});

// Launch Native Transparent HUD Window (Zero Browser Residue)
export function launchHudWindow(port = PORT) {
  const psScript = path.join(__dirname, 'zcode-hud.ps1');
  if (fs.existsSync(psScript)) {
    console.log(`[HUD Server] Spawning native transparent WPF HUD window...`);
    const child = spawn('powershell', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-WindowStyle', 'Hidden',
      '-File', psScript
    ], { detached: true, stdio: 'ignore' });
    child.unref();
    return child;
  }
  return null;
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[HUD Server] Port ${PORT} is already in use by an existing HUD server.`);
    console.log(`[HUD Server] Reconnecting to existing server and launching client window...`);
    if (process.argv.includes('--launch') || !process.argv.includes('--no-launch')) {
      launchHudWindow(PORT);
    }
    // Graceful exit without throwing unhandled error
    process.exit(0);
  } else {
    console.error('[HUD Server] Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[HUD Server] Running at http://127.0.0.1:${PORT}/hud`);
  if (process.argv.includes('--launch') || !process.argv.includes('--no-launch')) {
    launchHudWindow(PORT);
  }
});
