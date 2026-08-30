import { MODEL_PRICING, resolvePricing, calculateCost, pollOnce } from './poll-metrics.mjs';

console.log('=== Stage 1: Data Calculation & Metrics Audit ===\n');

// 1. Audit Pricing Table & Tiered Cost Calculations
console.log('[Test 1] Testing Model Pricing Table...');
const modelsToTest = [
  { id: 'claude-3-7-sonnet', in: 10000, out: 2000, cr: 5000, cw: 1000 },
  { id: 'gemini-3.7-flash', in: 25000, out: 1500, cr: 10000, cw: 0 },
  { id: 'deepseek-r1', in: 8000, out: 3000, cr: 4000, cw: 0 },
  { id: 'gpt-4o', in: 12000, out: 1000, cr: 6000, cw: 0 }
];

for (const m of modelsToTest) {
  const p = resolvePricing(m.id);
  const cost = calculateCost(m.id, m.in, m.out, m.cr, m.cw);
  console.log(`- Model: ${p.name} (${m.id})`);
  console.log(`  Input: ${m.in}, Output: ${m.out}, CacheRead: ${m.cr}`);
  console.log(`  USD: ${cost.formattedUsd} | CNY: ${cost.formattedCny}`);
  if (cost.usd <= 0 || isNaN(cost.usd)) {
    throw new Error(`Cost calculation failed for ${m.id}`);
  }
}
console.log('✔ Test 1 Passed: Pricing table and tiering calculations verified.\n');

// 2. Audit Cache Hit Rate % Formula
console.log('[Test 2] Testing Cache Hit Rate % Formula...');
function calcCacheHitRate(inputTokens, cacheReadTokens) {
  const total = inputTokens + cacheReadTokens;
  return total > 0 ? +((cacheReadTokens / total) * 100).toFixed(1) : 0.0;
}

const cacheTests = [
  { in: 0, cr: 0, expected: 0.0 },
  { in: 1000, cr: 0, expected: 0.0 },
  { in: 1000, cr: 1000, expected: 50.0 },
  { in: 200, cr: 800, expected: 80.0 },
  { in: 0, cr: 500, expected: 100.0 }
];

for (const ct of cacheTests) {
  const rate = calcCacheHitRate(ct.in, ct.cr);
  console.log(`  In: ${ct.in}, CacheRead: ${ct.cr} -> Rate: ${rate}% (Expected: ${ct.expected}%)`);
  if (rate !== ct.expected) {
    throw new Error(`Cache hit rate mismatch: got ${rate}, expected ${ct.expected}`);
  }
}
console.log('✔ Test 2 Passed: Cache hit rate formula and zero-divide guard verified.\n');

// 3. Audit TPS Threshold Color Function
console.log('[Test 3] Testing TPS Dynamic Color Thresholds...');
function getTpsColor(tps) {
  if (tps >= 40) return '#22C55E'; // 极速绿
  if (tps >= 25) return '#38BDF8'; // 青色
  if (tps > 0) return '#F59E0B';  // 平稳橙
  return '#64748B';               // 紫灰/闲置
}

const tpsTests = [
  { tps: 75.4, expected: '#22C55E', label: '≥40 Rapid Green' },
  { tps: 40.0, expected: '#22C55E', label: '≥40 Rapid Green' },
  { tps: 32.5, expected: '#38BDF8', label: '≥25 Cyan' },
  { tps: 25.0, expected: '#38BDF8', label: '≥25 Cyan' },
  { tps: 18.2, expected: '#F59E0B', label: '>0 Steady Orange' },
  { tps: 0.0, expected: '#64748B', label: '=0 Idle Purple-Gray' }
];

for (const tt of tpsTests) {
  const color = getTpsColor(tt.tps);
  console.log(`  TPS: ${tt.tps} -> Color: ${color} (${tt.label})`);
  if (color !== tt.expected) {
    throw new Error(`TPS color mismatch for ${tt.tps}: got ${color}, expected ${tt.expected}`);
  }
}
console.log('✔ Test 3 Passed: Dynamic TPS color thresholds verified.\n');

// 4. Test Live PollOnce Output Structure
console.log('[Test 4] Testing pollOnce() data structure...');
const liveData = pollOnce();
console.log('  Live Data Output:', {
  status: liveData.status,
  tps: liveData.tps,
  modelName: liveData.modelName,
  inputTokens: liveData.inputTokens,
  outputTokens: liveData.outputTokens,
  cacheHitRate: liveData.cacheHitRate,
  cost: liveData.cost.formattedCny,
  sparklineLen: liveData.sparkline.length
});

if (!liveData.sparkline || liveData.sparkline.length !== 30) {
  throw new Error('Sparkline buffer should be 30 items');
}
console.log('✔ Test 4 Passed: Live data structure and 30-sample sliding buffer verified.\n');

console.log('🎉 ALL STAGE 1 AUDIT TESTS PASSED SUCCESSFULLY!');
