// plan-quota-detector.mjs - Automated Coding Plan Quota & Consumption Detector
// Supports OpenCode Go ($12/5h, $30/7d, $60/mo), Zhipu GLM Coding Plan, DeepSeek Balance, and Custom Dynamic Plans

import { resolvePriceRuleCached as resolvePriceRule, USD_TO_CNY } from './pricing-catalog.mjs';

/**
 * Mainstream Plan Definitions & Detection Heuristics
 */
// Stable sentinel object for the resolvePriceRule memoization cache.
const moduleEmptyCustomModels = Object.freeze({});

export const CODING_PLANS = {
  "opencode-go": {
    id: "opencode-go",
    name: "OpenCode Go 订阅计划 ($10/月)",
    provider: "OpenCode",
    description: "5小时 $12 限额 / 每周 $30 限额 / 每月 $60 限额",
    type: "rolling-usd",
    tiers: [
      { id: "5h", name: "5小时滚动窗口", windowHours: 5, limitUsd: 12.0 },
      { id: "7d", name: "每周滚动窗口 (7天)", windowHours: 24 * 7, limitUsd: 30.0 },
      { id: "30d", name: "每月限额 (30天)", windowHours: 24 * 30, limitUsd: 60.0 }
    ]
  },
  "glm-coding-plan": {
    id: "glm-coding-plan",
    name: "智谱 GLM Coding Plan (按月 Token 包)",
    provider: "智谱清言",
    description: "月度 Token 配额监控 (如 50M / 100M / 200M Tokens)",
    type: "token-pack",
    defaultMonthlyTokens: 100_000_000 // 100M tokens
  },
  "deepseek-api-balance": {
    id: "deepseek-api-balance",
    name: "DeepSeek 官方 API 充值余额",
    provider: "DeepSeek",
    description: "账户余额与赠送额度实时扣减监控",
    type: "balance-cny",
    defaultBalanceCny: 50.0
  },
  "custom-plan": {
    id: "custom-plan",
    name: "自定义 Coding 配额计划",
    provider: "Custom",
    description: "用户自定义周期、额度与币种",
    type: "custom"
  }
};

// Freeze the plan registry (deeply) so no consumer can mutate the shared
// definitions — every detectPlanQuota call must observe identical plan data.
for (const plan of Object.values(CODING_PLANS)) {
  Object.freeze(plan);
  if (Array.isArray(plan.tiers)) {
    Object.freeze(plan.tiers);
    for (const tier of plan.tiers) Object.freeze(tier);
  }
}
Object.freeze(CODING_PLANS);

/**
 * Helper to safely parse SQLite mixed timestamp formats (Epoch ms number/string or ISO string)
 */
function parseSafeTimestamp(raw, defaultTs = Date.now()) {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0) return defaultTs;
    return raw < 1e11 ? raw * 1000 : raw;
  }
  if (typeof raw === 'bigint') {
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? (n < 1e11 ? n * 1000 : n) : defaultTs;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d{10,14}$/.test(trimmed)) {
      const n = Number(trimmed);
      return Number.isFinite(n) && n > 0 ? (trimmed.length === 10 ? n * 1000 : n) : defaultTs;
    }
    const d = new Date(trimmed).getTime();
    return Number.isFinite(d) && d > 0 ? d : defaultTs;
  }
  return defaultTs;
}

/**
 * Calculate multi-tier usage directly from SQLite model_usage records
 * @param {object} db - node:sqlite DatabaseSync instance
 * @param {object} settings - ZCode HUD Settings
 */
export function detectPlanQuota(db, settings = {}) {
  const planConfig = settings.planSettings || {
    selectedPlan: "opencode-go", // "opencode-go" | "glm-coding-plan" | "deepseek-api-balance" | "custom-plan"
    enabled: true,
    customTiers: null,
    initialBalance: 50.0,
    monthlyTokenQuota: 100_000_000,
    currency: "USD"
  };

  // Reuse a stable frozen sentinel so resolvePriceRuleCached's WeakMap stays
  // effective when settings define no custom models.
  const EMPTY_CUSTOM_MODELS = moduleEmptyCustomModels;
  const customModels = settings.customModels || EMPTY_CUSTOM_MODELS;
  const usdToCny = (settings.customPricing && settings.customPricing.usdToCny > 0) ? settings.customPricing.usdToCny : USD_TO_CNY;

  if (!db) {
    return {
      planId: planConfig.selectedPlan || "opencode-go",
      planName: CODING_PLANS[planConfig.selectedPlan]?.name || "Coding Plan",
      enabled: !!planConfig.enabled,
      status: "db_unavailable",
      activeTier: null,
      tiers: []
    };
  }

  const now = Date.now();

  // 1. Query recent usage records within the maximum lookback window (30 days = 2592000000 ms)
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoIso = new Date(thirtyDaysAgo).toISOString();
  let rawRecords = [];
  try {
    rawRecords = db.prepare(`
      SELECT started_at, model_id, input_tokens, output_tokens, cache_read_input_tokens
      FROM model_usage
      WHERE started_at >= ? OR started_at >= ?
      ORDER BY started_at ASC
    `).all(thirtyDaysAgo, thirtyDaysAgoIso);
  } catch (e) {
    try {
      // Fallback query if started_at filter fails
      rawRecords = db.prepare(`
        SELECT started_at, model_id, input_tokens, output_tokens, cache_read_input_tokens
        FROM model_usage
        ORDER BY rowid DESC LIMIT 5000
      `).all();
    } catch (err) {
      rawRecords = [];
    }
  }

  // Pre-calculate cost for each record and filter accurately in memory
  const costedRecords = [];
  for (const r of rawRecords) {
    const timestamp = parseSafeTimestamp(r.started_at, now);
    if (timestamp < thirtyDaysAgo) continue;

    const inTokens = Number(r.input_tokens) || 0;
    const outTokens = Number(r.output_tokens) || 0;
    const cacheTokens = Number(r.cache_read_input_tokens) || 0;

    const rule = resolvePriceRule(r.model_id, customModels);
    const uncachedIn = Math.max(0, inTokens - cacheTokens);
    const costUsd = (uncachedIn / 1e6) * rule.input + (cacheTokens / 1e6) * rule.cacheRead + (outTokens / 1e6) * rule.output;
    const totalTokens = inTokens + outTokens;

    costedRecords.push({
      timestamp,
      modelId: r.model_id,
      costUsd,
      costCny: costUsd * usdToCny,
      totalTokens
    });
  }

  const planId = planConfig.selectedPlan || "opencode-go";

  // ==========================================
  // A. OpenCode Go Multi-Tier Rolling Limits
  // ==========================================
  if (planId === "opencode-go") {
    const fiveHoursAgo = now - (5 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    let used5hUsd = 0;
    let used7dUsd = 0;
    let used30dUsd = 0;

    let oldestIn5h = null;

    for (const r of costedRecords) {
      if (r.timestamp >= fiveHoursAgo) {
        used5hUsd += r.costUsd;
        if (!oldestIn5h || r.timestamp < oldestIn5h) {
          oldestIn5h = r.timestamp;
        }
      }
      if (r.timestamp >= sevenDaysAgo) {
        used7dUsd += r.costUsd;
      }
      used30dUsd += r.costUsd;
    }

    // Estimate reset countdown for the 5h window
    let reset5hInMin = 0;
    if (oldestIn5h) {
      const resetTime = oldestIn5h + (5 * 60 * 60 * 1000);
      reset5hInMin = Math.max(0, Math.round((resetTime - now) / 60000));
    }

    const limit5h = 12.0;
    const limit7d = 30.0;
    const limit30d = 60.0;

    const remaining5h = Math.max(0, Number((limit5h - used5hUsd).toFixed(4)));
    const percent5h = Number((Math.max(0, Math.min(100, (remaining5h / limit5h) * 100))).toFixed(1));

    const remaining7d = Math.max(0, Number((limit7d - used7dUsd).toFixed(4)));
    const percent7d = Number((Math.max(0, Math.min(100, (remaining7d / limit7d) * 100))).toFixed(1));

    const remaining30d = Math.max(0, Number((limit30d - used30dUsd).toFixed(4)));
    const percent30d = Number((Math.max(0, Math.min(100, (remaining30d / limit30d) * 100))).toFixed(1));

    const tiers = [
      {
        id: "5h",
        name: "5小时限额 ($12)",
        limit: limit5h,
        used: Number(used5hUsd.toFixed(4)),
        remaining: remaining5h,
        percent: percent5h,
        unit: "USD",
        resetTimeMin: reset5hInMin,
        alertLevel: percent5h <= 8.3 ? "critical" : (percent5h <= 25.0 ? "warning" : "normal")
      },
      {
        id: "7d",
        name: "周限额 ($30)",
        limit: limit7d,
        used: Number(used7dUsd.toFixed(4)),
        remaining: remaining7d,
        percent: percent7d,
        unit: "USD",
        alertLevel: percent7d <= 10.0 ? "critical" : (percent7d <= 23.3 ? "warning" : "normal")
      },
      {
        id: "30d",
        name: "月限额 ($60)",
        limit: limit30d,
        used: Number(used30dUsd.toFixed(4)),
        remaining: remaining30d,
        percent: percent30d,
        unit: "USD",
        alertLevel: percent30d <= 8.3 ? "critical" : (percent30d <= 25.0 ? "warning" : "normal")
      }
    ];

    // The primary bottleneck tier is usually 5h or whichever is closest to exhaustion
    const primaryTier = tiers.reduce((prev, curr) => (curr.percent < prev.percent ? curr : prev), tiers[0]);

    return {
      planId: "opencode-go",
      planName: "OpenCode Go 订阅计划",
      enabled: planConfig.enabled !== false,
      primaryTier,
      tiers,
      currentUsageSummary: {
        last5h: `$${used5hUsd.toFixed(3)} / $${limit5h.toFixed(2)}`,
        last7d: `$${used7dUsd.toFixed(2)} / $${limit7d.toFixed(2)}`,
        last30d: `$${used30dUsd.toFixed(2)} / $${limit30d.toFixed(2)}`,
        reset5hEstimate: reset5hInMin > 0 ? `${reset5hInMin} 分钟后释放额度` : "额度充足"
      }
    };
  }

  // ==========================================
  // B. 智谱 GLM Coding Plan (Token Pack)
  // ==========================================
  if (planId === "glm-coding-plan") {
    // Current month beginning in local timezone (Year, Month, Day 1 at 00:00:00.000)
    const nowObj = new Date(now);
    const startOfMonth = new Date(nowObj.getFullYear(), nowObj.getMonth(), 1, 0, 0, 0, 0);
    const startOfMonthTs = startOfMonth.getTime();

    let monthUsedTokens = 0;
    for (const r of costedRecords) {
      if (r.timestamp >= startOfMonthTs) {
        monthUsedTokens += (r.totalTokens || 0);
      }
    }

    const totalQuotaTokens = Number(planConfig.monthlyTokenQuota) > 0 ? Number(planConfig.monthlyTokenQuota) : 100_000_000;
    const remainingTokens = Math.max(0, totalQuotaTokens - monthUsedTokens);
    const percent = Number((Math.max(0, Math.min(100, (remainingTokens / totalQuotaTokens) * 100))).toFixed(1));

    const tier = {
      id: "monthly-tokens",
      name: "本月 Token 配额包",
      limit: totalQuotaTokens,
      used: monthUsedTokens,
      remaining: remainingTokens,
      percent,
      unit: "Tokens",
      alertLevel: percent <= 5 ? "critical" : (percent <= 20 ? "warning" : "normal")
    };

    return {
      planId: "glm-coding-plan",
      planName: "智谱 GLM Coding Plan",
      enabled: planConfig.enabled !== false,
      primaryTier: tier,
      tiers: [tier],
      currentUsageSummary: {
        usedStr: `${(monthUsedTokens / 1e6).toFixed(2)}M / ${(totalQuotaTokens / 1e6).toFixed(0)}M Tokens`,
        remainingStr: `剩余 ${(remainingTokens / 1e6).toFixed(2)}M Tokens (${percent}%)`
      }
    };
  }

  // ==========================================
  // C. DeepSeek API / Balance Monitor
  // ==========================================
  if (planId === "deepseek-api-balance") {
    let totalSpentCny = 0;
    for (const r of costedRecords) {
      totalSpentCny += (r.costCny || 0);
    }

    const initBalance = Number(planConfig.initialBalance) > 0 ? Number(planConfig.initialBalance) : 50.0;
    const remainingBalance = Math.max(0, initBalance - totalSpentCny);
    const percent = Number((Math.max(0, Math.min(100, (remainingBalance / initBalance) * 100))).toFixed(1));

    const tier = {
      id: "balance-cny",
      name: "DeepSeek API 账户余额",
      limit: initBalance,
      used: Number(totalSpentCny.toFixed(2)),
      remaining: Number(remainingBalance.toFixed(2)),
      percent,
      unit: "CNY",
      alertLevel: percent <= 5 ? "critical" : (percent <= 20 ? "warning" : "normal")
    };

    return {
      planId: "deepseek-api-balance",
      planName: "DeepSeek 账户余额监控",
      enabled: planConfig.enabled !== false,
      primaryTier: tier,
      tiers: [tier],
      currentUsageSummary: {
        balanceStr: `¥${remainingBalance.toFixed(2)} / ¥${initBalance.toFixed(2)}`,
        percentStr: `剩余 ${percent}%`
      }
    };
  }

  // ==========================================
  // D. Custom Dynamic Plan
  // ==========================================
  const customLimit = Number(planConfig.totalQuota) > 0 ? Number(planConfig.totalQuota) : 100.0;
  const customCurr = planConfig.currency || "USD";
  let usedAmount = 0;
  for (const r of costedRecords) {
    usedAmount += (customCurr === "CNY" ? (r.costCny || 0) : (r.costUsd || 0));
  }
  const remaining = Math.max(0, customLimit - usedAmount);
  const percent = Number((Math.max(0, Math.min(100, (remaining / customLimit) * 100))).toFixed(1));

  const customTier = {
    id: "custom",
    name: "自定义限额",
    limit: customLimit,
    used: Number(usedAmount.toFixed(4)),
    remaining: Number(remaining.toFixed(4)),
    percent,
    unit: customCurr,
    alertLevel: percent <= 5 ? "critical" : (percent <= 20 ? "warning" : "normal")
  };

  return {
    planId: "custom-plan",
    planName: "自定义 Coding 配额计划",
    enabled: planConfig.enabled !== false,
    primaryTier: customTier,
    tiers: [customTier],
    currentUsageSummary: {
      usedStr: `${customCurr === 'CNY' ? '¥' : '$'}${usedAmount.toFixed(2)} / ${customLimit.toFixed(2)}`,
      percentStr: `剩余 ${percent}%`
    }
  };
}
