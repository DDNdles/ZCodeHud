import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { PRESET_CATALOG, resolvePriceRuleCached, USD_TO_CNY } from './pricing-catalog.mjs';
import { detectPlanQuota } from './plan-quota-detector.mjs';

// NOTE: 'node:sqlite' is imported dynamically inside main() after an explicit
// Node version guard. A static import would hard-crash on Node < 22.5 before
// this module gets any chance to report the problem to the user.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = path.join(os.homedir(), '.zcode', 'cli', 'db', 'db.sqlite');
const metricsFile = path.join(__dirname, 'live-metrics.json');
const settingsFile = path.join(__dirname, 'settings.json');
const errorLogFile = path.join(__dirname, 'poller-error.log');

// Minimum Node version required by the built-in node:sqlite module.
const MIN_NODE_MAJOR = 22;
const MIN_NODE_MINOR = 5;

// Stable empty object: keeps resolvePriceRule's WeakMap memoization effective
// when settings.json has no customModels block (a fresh `|| {}` each tick
// would defeat identity-based caching).
const EMPTY_CUSTOM_MODELS = Object.freeze({});

let DatabaseSync = null;

function nodeVersionParts() {
  const raw = (process.versions && process.versions.node) ? process.versions.node : '';
  const parts = raw.split('.').map(n => parseInt(n, 10));
  if (!Number.isInteger(parts[0])) return null;
  return [parts[0], Number.isInteger(parts[1]) ? parts[1] : 0];
}

function reportFatal(message) {
  console.error('[Poller] ' + message);
  try {
    fs.writeFileSync(errorLogFile, 'Timestamp: ' + new Date().toISOString() + '\n' + message + '\n', 'utf8');
  } catch (e) {}
}

let db = null;
function getDb() {
  if (!DatabaseSync) return null;
  if (!db) {
    if (fs.existsSync(dbPath)) {
      try {
        db = new DatabaseSync(dbPath, { readOnly: true });
        db.exec('PRAGMA busy_timeout = 5000;');
        db.exec('PRAGMA query_only = ON;');
      } catch (e) {
        console.error('Failed to open db.sqlite:', e.message);
        db = null;
      }
    }
  }
  return db;
}

function safeWriteMetricsFile(filePath, content) {
  const tmpFile = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  try {
    fs.writeFileSync(tmpFile, content, 'utf8');
    // On Windows, rename can collide if another handle has read lock. Try rename with quick retry, fallback to copy.
    let retries = 4;
    while (retries > 0) {
      try {
        fs.renameSync(tmpFile, filePath);
        return true;
      } catch (err) {
        retries--;
        if (retries === 0) {
          try {
            fs.copyFileSync(tmpFile, filePath);
            fs.unlinkSync(tmpFile);
            return true;
          } catch (e2) {
            try { fs.writeFileSync(filePath, content, 'utf8'); } catch (e3) {}
          }
        }
      }
    }
  } catch (err) {
    try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (e) {}
  }
  return false;
}

function defaultSettings() {
  return {
    selectedSessionId: "auto",
    theme: "AppleGlass",
    opacity: 0.92,
    pollIntervalMs: 500,
    language: "zh-CN",
    alwaysOnTop: true,
    showTps: true,
    showAvgTps: true,
    showTokens: true,
    showCost: true,
    showCache: true,
    showDuration: true,
    showSparkline: true,
    showSessionSummary: true,
    showReasoning: true,
    customModels: EMPTY_CUSTOM_MODELS, // Keyed by modelId: { name, input, output, cacheRead }
    planSettings: {
      selectedPlan: "opencode-go",
      enabled: true,
      monthlyTokenQuota: 100000000,
      initialBalance: 50.0,
      totalQuota: 100.0,
      currency: "USD"
    }
  };
}

// Cache settings.json by (mtime,size) so the 500ms poll loop stops re-reading
// and re-parsing the file every tick.
let settingsCache = { mtimeMs: -1, size: -1, data: null };

function loadSettings() {
  let st = null;
  try {
    st = fs.statSync(settingsFile);
  } catch (e) {
    return settingsCache.data || defaultSettings();
  }
  if (settingsCache.data && st.mtimeMs === settingsCache.mtimeMs && st.size === settingsCache.size) {
    return settingsCache.data;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    settingsCache = { mtimeMs: st.mtimeMs, size: st.size, data: parsed };
    return parsed;
  } catch (e) {
    // Transient mid-write read or malformed JSON: keep serving the last good
    // settings instead of silently reverting to defaults.
    return settingsCache.data || defaultSettings();
  }
}

/**
 * Reconcile legacy quotaSettings (written by the WPF settings window) with
 * planSettings (written by the Web HUD). Older settings.json files contain
 * only `quotaSettings.enabled`; without this migration the poller would keep
 * quota mode enabled even after the user turned it off in the WPF window.
 */
function reconcilePlanSettings(settings) {
  if (!settings.planSettings || typeof settings.planSettings !== 'object') {
    const q = (settings.quotaSettings && typeof settings.quotaSettings === 'object') ? settings.quotaSettings : {};
    settings.planSettings = {
      selectedPlan: 'custom-plan',
      enabled: typeof q.enabled === 'boolean' ? q.enabled : true,
      totalQuota: Number(q.totalQuota) > 0 ? Number(q.totalQuota) : 100.0,
      currency: q.currency === 'USD' ? 'USD' : (q.currency === 'CNY' ? 'CNY' : 'USD')
    };
  }
  return settings;
}

// Per-record cost cache (usage rows are immutable once written), so a full
// recompute only prices NEW records instead of re-running resolvePriceRule
// (which itself is regex-heavy) over the entire session history each tick.
let recordCostCache = new Map();
// Identity of the settings object the cost cache was built against. Costs
// depend on customModels / customPricing / usdToCny, so when loadSettings
// hands us a freshly parsed object (settings.json changed on disk) the whole
// per-record cache must be invalidated — otherwise the fingerprint gate
// correctly triggers a recompute but cachedTurnCost would keep serving
// costs priced with the OLD settings forever.
let costCacheSettingsRef = null;

function cachedTurnCost(record, customModels, usdToCny, customPricing) {
  const key = record.id != null ? 'id:' + record.id
    : 'k:' + record.model_id + '|' + record.input_tokens + '|' + record.output_tokens + '|' + record.cache_read_input_tokens;
  let cost = recordCostCache.get(key);
  if (cost === undefined) {
    cost = calculateTurnCost(
      record.model_id,
      record.input_tokens,
      record.output_tokens,
      record.cache_read_input_tokens,
      customModels,
      usdToCny,
      customPricing
    );
    cost = { usd: cost.usd, cny: cost.cny, ruleName: cost.ruleName, isCustom: cost.isCustom };
    if (recordCostCache.size > 100000) recordCostCache.clear(); // bound memory on very long sessions
    recordCostCache.set(key, cost);
  }
  return cost;
}

function calculateTurnCost(modelId, inTokens, outTokens, cacheReadTokens, customModels, usdToCny, customPricing) {
  let rule;
  if (customPricing && customPricing.enabled) {
    rule = {
      input: Number(customPricing.input) || 0.15,
      output: Number(customPricing.output) || 0.60,
      cacheRead: Number(customPricing.cacheRead) || 0.0375,
      name: `自定义价格 (${modelId || '默认'})`,
      isCustom: true
    };
  } else {
    rule = resolvePriceRuleCached(modelId, customModels);
  }
  const uncachedInput = Math.max(0, (Number(inTokens) || 0) - (Number(cacheReadTokens) || 0));
  const inputCost = (uncachedInput / 1000000) * rule.input;
  const cacheCost = ((Number(cacheReadTokens) || 0) / 1000000) * rule.cacheRead;
  const outputCost = ((Number(outTokens) || 0) / 1000000) * rule.output;
  const totalUsd = inputCost + cacheCost + outputCost;
  return {
    usd: totalUsd,
    cny: totalUsd * usdToCny,
    ruleName: rule.name,
    isCustom: !!rule.isCustom,
    rule
  };
}

// ============================================
// Change fingerprinting: skip all heavy DB work when neither the settings
// file nor the database content changed since the last tick.
//
// PRAGMA data_version bumps whenever ANOTHER connection commits a write to
// this database file. This is essential here: model_usage rows are UPDATEd
// in place when a turn finishes (status running -> completed, duration and
// output tokens filled in), so COUNT(*)/MAX(rowid) fingerprints would never
// notice a turn completing and the HUD would freeze on stale data.
// ============================================
let pollCache = {
  fingerprint: null,   // last seen change signature
  payload: null        // last fully computed liveMetrics payload
};

function computeDbFingerprint(targetSessionId, settingsStat) {
  const database = getDb();
  if (!database) return null;
  let dataVersion = -1;
  try {
    const r = database.prepare('PRAGMA data_version').get();
    if (r && r.data_version !== undefined) dataVersion = Number(r.data_version);
  } catch (e) { dataVersion = -1; }
  if (dataVersion < 0) {
    // data_version unavailable -> cannot detect in-place UPDATEs cheaply.
    // Return null so the caller recomputes every tick (correct, just slower).
    return null;
  }
  return [
    settingsStat ? (settingsStat.mtimeMs + ':' + settingsStat.size) : '-',
    dataVersion,
    targetSessionId || '-'
  ].join('|');
}

function pollMetrics() {
  try {
    let settingsStat = null;
    try { settingsStat = fs.statSync(settingsFile); } catch (e) {}
    const settings = reconcilePlanSettings(loadSettings());
    // Invalidate per-record cost caches whenever the settings object identity
    // changes (fresh parse of settings.json). reconcilePlanSettings mutates the
    // object in place, so identity stays stable across cache-hit ticks.
    if (settings !== costCacheSettingsRef) {
      recordCostCache.clear();
      costCacheSettingsRef = settings;
    }
    const database = getDb();
    const usdToCny = (settings.customPricing && settings.customPricing.usdToCny > 0) ? settings.customPricing.usdToCny : USD_TO_CNY;
    const customModels = settings.customModels || EMPTY_CUSTOM_MODELS;

    if (!database) {
      if (!fs.existsSync(metricsFile)) {
        writeFallbackMetrics(settings, '等待 ZCode 数据库连接...');
      }
      return;
    }

    // ---- Cheap per-tick work: sessions list (LIMIT 30) + target resolution ----
    let rawSessions = [];
    try {
      rawSessions = database.prepare(`
        SELECT id, title, time_created, time_updated, task_type
        FROM session
        WHERE task_type = 'interactive' AND id NOT LIKE 'sess_subagent%'
        ORDER BY time_updated DESC
        LIMIT 30
      `).all();

      // If no interactive sessions found, fallback to any sessions
      if (rawSessions.length === 0) {
        rawSessions = database.prepare(`
          SELECT id, title, time_created, time_updated, task_type
          FROM session
          ORDER BY time_updated DESC
          LIMIT 30
        `).all();
      }
    } catch (e) {
      rawSessions = [];
    }

    const sessionList = rawSessions.map(s => ({
      id: s.id,
      title: s.title || (s.id.startsWith('sess_subagent') ? `子任务 (${s.id.slice(14, 22)})` : `会话 ${s.id.slice(5, 13)}`),
      timeUpdated: s.time_updated,
      timeCreated: s.time_created,
      taskType: s.task_type
    }));

    // Determine target session (Stick to primary active interactive session in auto mode)
    let targetSessionId = null;
    if (settings.selectedSessionId && settings.selectedSessionId !== 'auto') {
      const match = sessionList.find(s => s.id === settings.selectedSessionId);
      if (match) targetSessionId = match.id;
    }
    if (!targetSessionId && sessionList.length > 0) {
      // Pick first interactive session to prevent toggling with subagents
      const primaryInteractive = sessionList.find(s => s.taskType === 'interactive' && !s.id.startsWith('sess_subagent'));
      targetSessionId = primaryInteractive ? primaryInteractive.id : sessionList[0].id;
    }

    if (!targetSessionId) {
      writeFallbackMetrics(settings, '就绪 (暂无活跃会话)');
      return;
    }

    // ---- Fingerprint check: skip ALL heavy queries when nothing changed ----
    // NOTE: the fingerprint is only committed to pollCache AFTER the payload
    // has been fully computed below. Committing it up-front meant that a
    // mid-compute exception would leave fingerprint=new + payload=stale, and
    // every subsequent tick would skip the recompute — freezing the HUD on
    // stale data until the next unrelated change.
    const fingerprint = computeDbFingerprint(targetSessionId, settingsStat);
    if (fingerprint !== null && fingerprint === pollCache.fingerprint && pollCache.payload) {
      return; // steady state: reuse last payload, zero heavy IO this tick
    }

    const currentSessionMeta = sessionList.find(s => s.id === targetSessionId) || {
      id: targetSessionId,
      title: 'ZCode 会话'
    };

    // 1. Fetch user's historical models from model_usage
    let userHistoricalModels = [];
    try {
      const distinctModels = database.prepare(`
        SELECT model_id,
               COUNT(*) as count,
               MAX(started_at) as last_used,
               SUM(input_tokens) as total_in,
               SUM(output_tokens) as total_out
        FROM model_usage
        WHERE model_id IS NOT NULL AND model_id != ''
        GROUP BY model_id
        ORDER BY last_used DESC
        LIMIT 50
      `).all();

      userHistoricalModels = distinctModels.map(m => {
        const rule = resolvePriceRuleCached(m.model_id, customModels);
        return {
          modelId: m.model_id,
          name: rule.name || m.model_id,
          count: m.count,
          lastUsed: m.last_used,
          totalIn: m.total_in || 0,
          totalOut: m.total_out || 0,
          pricing: {
            input: rule.input,
            output: rule.output,
            cacheRead: rule.cacheRead
          },
          isCustom: !!rule.isCustom
        };
      });
    } catch (e) {
      userHistoricalModels = [];
    }

    // 2. Query all model_usage records for target session
    let usageRecords = [];
    try {
      usageRecords = database.prepare(`
        SELECT id, model_id, status, started_at, completed_at, duration_ms, time_to_first_token_ms,
               input_tokens, output_tokens, reasoning_tokens,
               cache_read_input_tokens, provider_total_tokens
        FROM model_usage
        WHERE session_id = ?
        ORDER BY started_at ASC
      `).all(targetSessionId);
    } catch (e) {
      // Fallback query if time_to_first_token_ms column is missing in legacy schema
      try {
        usageRecords = database.prepare(`
          SELECT id, model_id, status, started_at, completed_at, duration_ms,
                 input_tokens, output_tokens, reasoning_tokens,
                 cache_read_input_tokens, provider_total_tokens
          FROM model_usage
          WHERE session_id = ?
          ORDER BY started_at ASC
        `).all(targetSessionId);
      } catch (err2) {
        usageRecords = [];
      }
    }

    // Check active status
    let isRunning = false;
    const latestUsage = usageRecords.length > 0 ? usageRecords[usageRecords.length - 1] : null;
    if (latestUsage && (!latestUsage.completed_at || latestUsage.status === 'running')) {
      isRunning = true;
    }

    try {
      const recentPart = database.prepare(`
        SELECT data FROM part
        WHERE session_id = ?
        ORDER BY rowid DESC LIMIT 1
      `).get(targetSessionId);
      if (recentPart && recentPart.data) {
        if (recentPart.data.includes('"status":"running"') || recentPart.data.includes('"type":"step-start"')) {
          isRunning = true;
        }
      }
    } catch (e) {}

    // Calculate aggregated session metrics
    let sessionTotalIn = 0;
    let sessionTotalOut = 0;
    let sessionTotalReasoning = 0;
    let sessionTotalCache = 0;
    let sessionTotalCostUsd = 0;
    let sessionTotalCostCny = 0;
    let sessionTotalDurationSec = 0;

    // Completed usages filter: non-running records with completed_at timestamp
    const completedUsages = usageRecords.filter(u => u.completed_at != null && u.status !== 'running');

    for (const u of usageRecords) {
      sessionTotalIn += (Number(u.input_tokens) || 0);
      sessionTotalOut += (Number(u.output_tokens) || 0);
      sessionTotalReasoning += (Number(u.reasoning_tokens) || 0);
      sessionTotalCache += (Number(u.cache_read_input_tokens) || 0);

      // Cached per-record pricing: only unseen records pay the resolvePriceRule cost.
      const cost = cachedTurnCost(u, customModels, usdToCny, settings.customPricing);
      sessionTotalCostUsd += cost.usd;
      sessionTotalCostCny += cost.cny;

      if (u.duration_ms != null && Number(u.duration_ms) >= 0) {
        sessionTotalDurationSec += (Number(u.duration_ms) / 1000);
      }
    }

    // Calculate latest turn metrics
    let lastTurn = latestUsage || {
      model_id: userHistoricalModels.length > 0 ? userHistoricalModels[0].modelId : 'gemini-3.7-flash-high',
      input_tokens: 0,
      output_tokens: 0,
      reasoning_tokens: 0,
      cache_read_input_tokens: 0,
      duration_ms: 0,
      time_to_first_token_ms: 0
    };

    const lastIn = Number(lastTurn.input_tokens) || 0;
    const lastOut = Number(lastTurn.output_tokens) || 0;
    const lastReasoning = Number(lastTurn.reasoning_tokens) || 0;
    const lastCache = Number(lastTurn.cache_read_input_tokens) || 0;
    // Guard against TPS explosion: a completed turn with missing/zero duration must NOT
    // be divided by the 1ms floor (that would inflate TPS by 1000x). Only assume 1s while
    // actively running; otherwise report zero duration and let TPS fall back to 0.
    const rawDurMs = Number(lastTurn.duration_ms);
    const hasRealDuration = Number.isFinite(rawDurMs) && rawDurMs > 0;
    const lastDurSec = hasRealDuration ? Math.max(0.001, rawDurMs / 1000) : (isRunning ? 1.0 : 0.0);

    // Real TPS calculation
    let currentTps = 0;
    if (lastOut > 0 && lastDurSec > 0) {
      currentTps = Number((lastOut / lastDurSec).toFixed(1));
    }

    // True Session-Wide Average TPS calculation (Strictly aggregate completed turns, NEVER fallback to current instantaneous TPS)
    // FIX: records without a real positive duration must be EXCLUDED — a 1ms floor
    // here previously inflated avgTps ~1000x for zero-duration completed rows.
    let avgTps = 0;
    {
      let totalCompletedOut = 0;
      let totalCompletedDurSec = 0;
      for (const u of completedUsages) {
        const rawDur = Number(u.duration_ms);
        if (!Number.isFinite(rawDur) || rawDur <= 0) continue; // no real duration -> skip
        const dur = rawDur / 1000;
        const out = Number(u.output_tokens) || 0;
        if (out > 0 && dur > 0) {
          totalCompletedOut += out;
          totalCompletedDurSec += dur;
        }
      }
      if (totalCompletedOut > 0 && totalCompletedDurSec > 0) {
        avgTps = Number((totalCompletedOut / totalCompletedDurSec).toFixed(1));
      }
    }
    // Fallback only to weighted session total tokens / total duration if available, NEVER overwrite with current instantaneous TPS
    if (avgTps === 0 && sessionTotalOut > 0 && sessionTotalDurationSec > 0) {
      avgTps = Number((sessionTotalOut / sessionTotalDurationSec).toFixed(1));
    }

    const lastEffectiveIn = Math.max(lastIn, lastCache);
    const lastCacheHitRate = lastEffectiveIn > 0 ? Number(Math.min(100, Math.max(0, (lastCache / lastEffectiveIn) * 100)).toFixed(1)) : 0;
    const sessionEffectiveIn = Math.max(sessionTotalIn, sessionTotalCache);
    const sessionCacheHitRate = sessionEffectiveIn > 0 ? Number(Math.min(100, Math.max(0, (sessionTotalCache / sessionEffectiveIn) * 100)).toFixed(1)) : 0;

    const lastCost = calculateTurnCost(lastTurn.model_id, lastIn, lastOut, lastCache, customModels, usdToCny, settings.customPricing);

    // 3. Automated Coding Plan Quota Detection
    const planQuota = detectPlanQuota(database, settings);

    // Sparkline history from completed records in this session.
    // FIX: skip records lacking a real duration — the old `|| 1000` fallback
    // fabricated a 1s duration for 0/null-duration rows and produced TPS spikes.
    const sparklineData = [];
    for (let i = completedUsages.length - 1; i >= 0 && sparklineData.length < 14; i--) {
      const u = completedUsages[i];
      const rawDur = Number(u.duration_ms);
      if (!Number.isFinite(rawDur) || rawDur <= 0) continue;
      const out = Number(u.output_tokens) || 0;
      sparklineData.unshift(Number((out / (rawDur / 1000)).toFixed(1)));
    }

    if (sparklineData.length === 0) {
      sparklineData.push(currentTps > 0 ? currentTps : 0.0);
    }

    // Package comprehensive payload
    const liveMetrics = {
      status: isRunning ? 'running' : 'idle',
      sessionId: targetSessionId,
      sessionTitle: currentSessionMeta.title,
      modelName: lastCost.ruleName,
      modelId: lastTurn.model_id || 'gemini-3.7-flash-high',
      isCustomPrice: lastCost.isCustom,

      // Real-time Turn metrics
      tps: currentTps,
      avgTps: avgTps,
      inputTokens: lastIn,
      outputTokens: lastOut,
      reasoningTokens: lastReasoning,
      cacheReadTokens: lastCache,
      cacheHitRate: lastCacheHitRate,
      durationSec: Number(lastDurSec.toFixed(1)),
      ttftMs: Number(lastTurn.time_to_first_token_ms) || 0,
      costUsd: Number(lastCost.usd.toFixed(5)),
      costCny: Number(lastCost.cny.toFixed(4)),

      // Real-time Session Aggregations
      sessionInputTokens: sessionTotalIn,
      sessionOutputTokens: sessionTotalOut,
      sessionReasoningTokens: sessionTotalReasoning,
      sessionCacheTokens: sessionTotalCache,
      sessionCacheHitRate: sessionCacheHitRate,
      sessionCostUsd: Number(sessionTotalCostUsd.toFixed(4)),
      sessionCostCny: Number(sessionTotalCostCny.toFixed(3)),
      sessionDurationSec: Number(sessionTotalDurationSec.toFixed(1)),
      turnsCount: usageRecords.length,
      sparkline: sparklineData,

      // Coding Plan Quota Auto-Detection
      planQuota: planQuota,
      quotaMode: planQuota.enabled,
      primaryTier: planQuota.primaryTier,
      remainingQuota: planQuota.primaryTier ? planQuota.primaryTier.remaining : 100.0,
      quotaPercent: planQuota.primaryTier ? planQuota.primaryTier.percent : 100.0,
      quotaCurrency: planQuota.primaryTier ? planQuota.primaryTier.unit : "USD",
      quotaAlertLevel: planQuota.primaryTier ? planQuota.primaryTier.alertLevel : "normal",

      // Historical Models Used by User
      userModels: userHistoricalModels,

      // Sessions list for switching in settings / frontend
      sessions: sessionList,

      // Timestamp
      updatedAt: Date.now()
    };

    pollCache.payload = liveMetrics;
    pollCache.fingerprint = fingerprint; // commit only after a successful compute
    safeWriteMetricsFile(metricsFile, JSON.stringify(liveMetrics, null, 2));

  } catch (err) {
    // Force a full recompute on the next tick so a transient failure
    // (locked db, partial read) cannot strand a stale payload behind an
    // already-committed fingerprint.
    pollCache.fingerprint = null;
    console.error('Error polling metrics:', err.message);
  }
}

let lastFallbackJson = null;
let lastFallbackAt = 0;

function writeFallbackMetrics(settings, defaultTitle = 'ZCode 实时监控') {
  try {
    // Respect the user's quota toggle: hardcoding quotaMode:true here made
    // the HUD show the quota badge (instead of per-turn cost) even when the
    // user had explicitly disabled plan monitoring in settings.json.
    const planCfg = (settings && typeof settings.planSettings === 'object' && settings.planSettings) ? settings.planSettings : {};
    const quotaEnabled = planCfg.enabled !== false;
    const planId = planCfg.selectedPlan || 'opencode-go';
    const fallback = {
      status: 'idle',
      sessionId: 'auto',
      sessionTitle: defaultTitle,
      modelName: 'Gemini 3.7 Flash High',
      modelId: 'gemini-3.7-flash-high',
      tps: 0.0,
      avgTps: 0.0,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cacheReadTokens: 0,
      cacheHitRate: 0.0,
      durationSec: 0.0,
      ttftMs: 0,
      costUsd: 0.0,
      costCny: 0.0,
      sessionInputTokens: 0,
      sessionOutputTokens: 0,
      sessionReasoningTokens: 0,
      sessionCacheTokens: 0,
      sessionCacheHitRate: 0.0,
      sessionCostUsd: 0.0,
      sessionCostCny: 0.0,
      sessionDurationSec: 0.0,
      turnsCount: 0,
      sparkline: [0.0],
      planQuota: {
        planId: planId,
        planName: "OpenCode Go 订阅计划",
        enabled: quotaEnabled,
        primaryTier: { id: "5h", name: "5小时限额 ($12)", limit: 12.0, used: 0.0, remaining: 12.0, percent: 100.0, unit: "USD", alertLevel: "normal" },
        tiers: []
      },
      quotaMode: quotaEnabled,
      remainingQuota: 12.0,
      quotaPercent: 100.0,
      quotaCurrency: "USD",
      quotaAlertLevel: "normal",
      userModels: [],
      sessions: [],
      updatedAt: Date.now()
    };
    // Throttle: rewriting this ~2KB file every 500ms is pure IO churn; the
    // content only changes via `updatedAt`, so refresh at most every 5s.
    const now = Date.now();
    const json = JSON.stringify(fallback, null, 2);
    const meaningful = json.replace(/"updatedAt":\s*\d+/, '');
    const lastMeaningful = lastFallbackJson ? lastFallbackJson.replace(/"updatedAt":\s*\d+/, '') : null;
    if (meaningful !== lastMeaningful || (now - lastFallbackAt) > 5000) {
      lastFallbackJson = json;
      lastFallbackAt = now;
      safeWriteMetricsFile(metricsFile, json);
    }
  } catch (e) {}
}

// ============================================
// Startup: Node version guard + dynamic node:sqlite load.
// On incompatible runtimes we write poller-error.log (surfaced by the WPF
// HUD) instead of crashing silently with no user-visible hint.
// ============================================
async function main() {
  console.log('Starting ZCode TPS & Plan Quota Poller...');

  const ver = nodeVersionParts();
  if (!ver || ver[0] < MIN_NODE_MAJOR || (ver[0] === MIN_NODE_MAJOR && ver[1] < MIN_NODE_MINOR)) {
    reportFatal(
      `Node.js >= ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR} is required (found ` +
      `${(process.versions && process.versions.node) || 'unknown'}). ` +
      `The built-in node:sqlite module used by this poller is unavailable on older runtimes. ` +
      `Please install a current Node.js LTS and relaunch the HUD.`
    );
    process.exit(1);
  }

  try {
    const sqliteMod = await import('node:sqlite');
    DatabaseSync = sqliteMod.DatabaseSync;
  } catch (e) {
    reportFatal('Failed to load node:sqlite: ' + (e && e.message ? e.message : String(e)));
    process.exit(1);
  }

  // ============================================
  // Single-instance guard via PID lock file.
  // Prevents zombie duplicate pollers when the HUD exe / bat is launched repeatedly.
  // ============================================
  const pollerLockFile = path.join(__dirname, 'poller.lock');
  const LOCK_HEARTBEAT_MS = 5000;   // poller refreshes lock mtime at this cadence
  const LOCK_STALE_MS = 15000;      // lock older than this is considered abandoned (PID reuse safe)

  function isPidAlive(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return e && e.code === 'EPERM'; // EPERM means the process exists but is not ours
    }
  }
  function lockIsStale() {
    try {
      const stat = fs.statSync(pollerLockFile);
      return (Date.now() - stat.mtimeMs) > LOCK_STALE_MS;
    } catch (e) {
      return true; // unreadable/missing -> treat as stale
    }
  }
  function readLockPid() {
    try {
      const pid = parseInt(fs.readFileSync(pollerLockFile, 'utf8').trim(), 10);
      return Number.isInteger(pid) && pid > 0 ? pid : null;
    } catch (e) {
      return null;
    }
  }
  function refreshPollerLock() {
    try {
      const now = new Date();
      fs.utimesSync(pollerLockFile, now, now);
    } catch (e) {}
  }
  function acquirePollerLock() {
    try {
      if (fs.existsSync(pollerLockFile)) {
        const existingPid = readLockPid();
        if (existingPid && existingPid !== process.pid && isPidAlive(existingPid) && !lockIsStale()) {
          console.log(`[Poller] Already running (PID ${existingPid}). Exiting this duplicate instance.`);
          return false;
        }
        if (existingPid && existingPid !== process.pid && isPidAlive(existingPid)) {
          // PID alive but heartbeat expired: the PID was likely reused by another
          // process after the old poller was force-killed. Take over the lock.
          console.log(`[Poller] Lock held by PID ${existingPid} is stale (no heartbeat). Taking over.`);
        }
        try { fs.unlinkSync(pollerLockFile); } catch (e) {}
      }
      // Exclusive create ('wx') closes the dual-startup race: if two pollers
      // race past the stale check, only one wins the create; the loser exits.
      let fd;
      try {
        fd = fs.openSync(pollerLockFile, 'wx');
      } catch (e) {
        if (e && e.code === 'EEXIST') return false; // lost the create race
        return true; // cannot create lock at all (permissions) -> best-effort dedup
      }
      try {
        fs.writeSync(fd, String(process.pid));
      } finally {
        fs.closeSync(fd);
      }
      return true;
    } catch (e) {
      // If the lock file cannot be inspected, continue anyway (best-effort dedup)
      return true;
    }
  }
  function releasePollerLock() {
    try {
      if (fs.existsSync(pollerLockFile)) {
        const raw = readLockPid();
        if (raw === process.pid) fs.unlinkSync(pollerLockFile);
      }
    } catch (e) {}
  }
  if (!acquirePollerLock()) {
    process.exit(0);
  }
  process.on('exit', releasePollerLock);
  process.on('SIGINT', () => { releasePollerLock(); process.exit(0); });
  process.on('SIGTERM', () => { releasePollerLock(); process.exit(0); });

  pollMetrics();
  setInterval(pollMetrics, 500);
  setInterval(refreshPollerLock, LOCK_HEARTBEAT_MS);
}

main().catch(e => {
  reportFatal('Poller crashed: ' + (e && e.stack ? e.stack : String(e)));
  process.exit(1);
});
