// pricing-catalog.mjs - Comprehensive Multi-Provider AI Model Pricing Catalog
// All prices in USD per 1M tokens (Standard 1M token benchmark)
// Includes OpenCode Go, OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Zhipu GLM, Xiaomi MiMo, Tencent Hunyuan, MiniMax, Moonshot Kimi, Alibaba Qwen

export const USD_TO_CNY = 7.23;

export const PRESET_CATALOG = {
  // ==========================================
  // 1. OpenCode Go Subscription Models ($10/mo)
  // ==========================================
  "opencode-go/deepseek-v4-flash": {
    name: "OpenCode Go · DeepSeek V4 Flash",
    category: "OpenCode Go",
    input: 0.22,
    output: 0.66,
    cacheRead: 0.022,
    contextWindow: "1000K",
    desc: "OpenCode Go 精选高速代码模型，极高性价比"
  },
  "opencode-go/deepseek-v4-pro": {
    name: "OpenCode Go · DeepSeek V4 Pro",
    category: "OpenCode Go",
    input: 0.66,
    output: 1.98,
    cacheRead: 0.066,
    contextWindow: "1000K",
    desc: "OpenCode Go 旗舰深度推理代码模型"
  },
  "opencode-go/glm-5.3": {
    name: "OpenCode Go · GLM-5.3",
    category: "OpenCode Go",
    input: 1.40,
    output: 4.40,
    cacheRead: 0.26,
    contextWindow: "1000K",
    desc: "智谱最新 GLM-5.3 编程强化版"
  },
  "opencode-go/glm-5.2": {
    name: "OpenCode Go · GLM-5.2",
    category: "OpenCode Go",
    input: 1.40,
    output: 4.40,
    cacheRead: 0.26,
    contextWindow: "1000K",
    desc: "智谱 GLM-5.2 代码旗舰"
  },
  "opencode-go/glm-5.1": {
    name: "OpenCode Go · GLM-5.1",
    category: "OpenCode Go",
    input: 1.40,
    output: 4.40,
    cacheRead: 0.26,
    contextWindow: "203K",
    desc: "智谱 GLM-5.1"
  },
  "opencode-go/glm-5": {
    name: "OpenCode Go · GLM-5",
    category: "OpenCode Go",
    input: 1.00,
    output: 3.20,
    cacheRead: 0.20,
    contextWindow: "203K",
    desc: "智谱 GLM-5 标准版"
  },
  "opencode-go/glm-5.3-flash": {
    name: "OpenCode Go · GLM-5.3 Flash",
    category: "OpenCode Go",
    input: 0.10,
    output: 0.30,
    cacheRead: 0.02,
    contextWindow: "1000K",
    desc: "智谱 GLM-5.3 Flash 极速轻量"
  },
  "opencode-go/gpt-5.6-luna": {
    name: "OpenCode Go · GPT 5.6 Luna",
    category: "OpenCode Go",
    input: 0.20,
    output: 1.20,
    cacheRead: 0.02,
    cacheWrite: 0.25,
    contextWindow: "1100K",
    desc: "超长上下文 Luna 代码专用模型"
  },
  "opencode-go/grok-4.5": {
    name: "OpenCode Go · Grok 4.5",
    category: "OpenCode Go",
    input: 2.00,
    output: 6.00,
    cacheRead: 0.30,
    contextWindow: "500K",
    desc: "xAI Grok 4.5 编程版"
  },
  "opencode-go/kimi-k3": {
    name: "OpenCode Go · Kimi K3",
    category: "OpenCode Go",
    input: 3.00,
    output: 15.00,
    cacheRead: 0.30,
    contextWindow: "1000K",
    desc: "月之暗面 Kimi K3 旗舰长上下文"
  },
  "opencode-go/kimi-k2.7-code": {
    name: "OpenCode Go · Kimi K2.7 Code",
    category: "OpenCode Go",
    input: 0.95,
    output: 4.00,
    cacheRead: 0.19,
    contextWindow: "1000K",
    desc: "月之暗面 K2.7 代码专精模型"
  },
  "opencode-go/kimi-k2.6": {
    name: "OpenCode Go · Kimi K2.6",
    category: "OpenCode Go",
    input: 0.95,
    output: 4.00,
    cacheRead: 0.16,
    contextWindow: "1000K",
    desc: "月之暗面 K2.6"
  },
  "opencode-go/mimo-v2.5": {
    name: "OpenCode Go · MiMo V2.5",
    category: "OpenCode Go",
    input: 0.14,
    output: 0.28,
    cacheRead: 0.0028,
    contextWindow: "1000K",
    desc: "小米 MiMo V2.5 超高速超低单价"
  },
  "opencode-go/mimo-v2.5-pro": {
    name: "OpenCode Go · MiMo V2.5 Pro",
    category: "OpenCode Go",
    input: 0.43,
    output: 0.87,
    cacheRead: 0.043,
    contextWindow: "1048K",
    desc: "小米 MiMo V2.5 Pro 性能版"
  },
  "opencode-go/mimo-v2": {
    name: "OpenCode Go · MiMo V2",
    category: "OpenCode Go",
    input: 0.14,
    output: 0.28,
    cacheRead: 0.0028,
    contextWindow: "1000K",
    desc: "小米 MiMo V2"
  },
  "opencode-go/mimo-v2-pro": {
    name: "OpenCode Go · MiMo V2 Pro",
    category: "OpenCode Go",
    input: 1.00,
    output: 3.00,
    cacheRead: 0.10,
    contextWindow: "1000K",
    desc: "小米 MiMo V2 Pro"
  },
  "opencode-go/minimax-m3": {
    name: "OpenCode Go · MiniMax M3",
    category: "OpenCode Go",
    input: 0.30,
    output: 1.20,
    cacheRead: 0.03,
    contextWindow: "205K",
    desc: "MiniMax M3 编程与推理"
  },
  "opencode-go/minimax-m2.7": {
    name: "OpenCode Go · MiniMax M2.7",
    category: "OpenCode Go",
    input: 0.30,
    output: 1.20,
    cacheRead: 0.03,
    contextWindow: "205K",
    desc: "MiniMax M2.7"
  },
  "opencode-go/minimax-m2.5": {
    name: "OpenCode Go · MiniMax M2.5",
    category: "OpenCode Go",
    input: 0.30,
    output: 1.20,
    cacheRead: 0.03,
    contextWindow: "205K",
    desc: "MiniMax M2.5"
  },
  "opencode-go/muse-spark-1.2-contributor": {
    name: "OpenCode Go · Muse Spark 1.2",
    category: "OpenCode Go",
    input: 0.10,
    output: 0.20,
    cacheRead: 0.002,
    contextWindow: "1000K",
    desc: "Muse Spark 1.2 极速轻量"
  },
  "opencode-go/qwen3.8-max": {
    name: "OpenCode Go · Qwen 3.8 Max",
    category: "OpenCode Go",
    input: 2.00,
    output: 6.00,
    cacheRead: 0.25,
    contextWindow: "1000K",
    desc: "通义千问 Qwen 3.8 Max"
  },
  "opencode-go/qwen3.7-max": {
    name: "OpenCode Go · Qwen 3.7 Max",
    category: "OpenCode Go",
    input: 2.50,
    output: 7.50,
    cacheRead: 0.50,
    contextWindow: "1000K",
    desc: "通义千问 Qwen 3.7 Max"
  },
  "opencode-go/qwen3.7-plus": {
    name: "OpenCode Go · Qwen 3.7 Plus",
    category: "OpenCode Go",
    input: 0.40,
    output: 1.60,
    cacheRead: 0.04,
    contextWindow: "1000K",
    desc: "通义千问 Qwen 3.7 Plus"
  },
  "opencode-go/qwen3.6-plus": {
    name: "OpenCode Go · Qwen 3.6 Plus",
    category: "OpenCode Go",
    input: 0.50,
    output: 3.00,
    cacheRead: 0.10,
    contextWindow: "1000K",
    desc: "通义千问 Qwen 3.6 Plus"
  },
  "opencode-go/hy3": {
    name: "OpenCode Go · Hunyuan 3 (HY3)",
    category: "OpenCode Go",
    input: 0.02,
    output: 0.07,
    cacheRead: 0.005,
    contextWindow: "256K",
    desc: "腾讯混元 HY3 极速极低成本"
  },

  // ==========================================
  // 2. OpenAI Official & Frontier Models
  // ==========================================
  "gpt-5.6-sol": {
    name: "OpenAI · GPT-5.6 Sol",
    category: "OpenAI",
    input: 5.00,
    output: 30.00,
    cacheRead: 0.50,
    contextWindow: "2000K",
    desc: "OpenAI 2026 旗舰前沿编程与全能模型 (SWE-Bench 96.2%)"
  },
  "gpt-5.6-terra": {
    name: "OpenAI · GPT-5.6 Terra",
    category: "OpenAI",
    input: 2.50,
    output: 15.00,
    cacheRead: 0.25,
    contextWindow: "1000K",
    desc: "OpenAI 均衡型前沿旗舰推理模型"
  },
  "gpt-5.6-luna": {
    name: "OpenAI · GPT-5.6 Luna",
    category: "OpenAI",
    input: 0.20,
    output: 1.20,
    cacheRead: 0.02,
    contextWindow: "1100K",
    desc: "OpenAI 高速轻量长上下文模型"
  },
  "gpt-5.5": {
    name: "OpenAI · GPT-5.5",
    category: "OpenAI",
    input: 5.00,
    output: 30.00,
    cacheRead: 0.50,
    contextWindow: "1000K",
    desc: "OpenAI GPT-5.5 基础前沿大模型"
  },
  "gpt-4o": {
    name: "OpenAI · GPT-4o",
    category: "OpenAI",
    input: 2.50,
    output: 10.00,
    cacheRead: 1.25,
    contextWindow: "128K",
    desc: "OpenAI 旗舰全模态模型"
  },
  "gpt-4o-mini": {
    name: "OpenAI · GPT-4o mini",
    category: "OpenAI",
    input: 0.15,
    output: 0.60,
    cacheRead: 0.075,
    contextWindow: "128K",
    desc: "OpenAI 高性价比轻量模型"
  },
  "gpt-4.5-preview": {
    name: "OpenAI · GPT-4.5 Preview",
    category: "OpenAI",
    input: 75.00,
    output: 150.00,
    cacheRead: 37.50,
    contextWindow: "128K",
    desc: "OpenAI 超大规模深度世界模型"
  },
  "o1": {
    name: "OpenAI · o1",
    category: "OpenAI",
    input: 15.00,
    output: 60.00,
    cacheRead: 7.50,
    contextWindow: "200K",
    desc: "OpenAI 全量强化深度推理模型"
  },
  "o3-mini": {
    name: "OpenAI · o3-mini",
    category: "OpenAI",
    input: 1.10,
    output: 4.40,
    cacheRead: 0.55,
    contextWindow: "200K",
    desc: "OpenAI 新一代代码与数学推理模型"
  },
  "o1-mini": {
    name: "OpenAI · o1-mini",
    category: "OpenAI",
    input: 1.10,
    output: 4.40,
    cacheRead: 0.55,
    contextWindow: "128K",
    desc: "OpenAI 轻量推理模型"
  },

  // ==========================================
  // 3. Anthropic Claude Frontier Models
  // ==========================================
  "claude-opus-5": {
    name: "Anthropic · Claude Opus 5",
    category: "Claude",
    input: 15.00,
    output: 75.00,
    cacheRead: 1.50,
    contextWindow: "1000K",
    desc: "Anthropic 顶级旗舰长思维链与架构模型"
  },
  "claude-fable-5": {
    name: "Anthropic · Claude Fable 5",
    category: "Claude",
    input: 10.00,
    output: 50.00,
    cacheRead: 1.00,
    contextWindow: "1000K",
    desc: "Anthropic 旗舰前沿代理与编程专用模型"
  },
  "claude-sonnet-5": {
    name: "Anthropic · Claude Sonnet 5",
    category: "Claude",
    input: 3.00,
    output: 10.00,
    cacheRead: 0.30,
    contextWindow: "500K",
    desc: "Anthropic 新一代代码工作主力"
  },
  "claude-haiku-5": {
    name: "Anthropic · Claude Haiku 5",
    category: "Claude",
    input: 0.25,
    output: 1.25,
    cacheRead: 0.025,
    contextWindow: "200K",
    desc: "Anthropic 极速极低成本轻量模型"
  },
  "claude-opus-4-8": {
    name: "Anthropic · Claude Opus 4.8",
    category: "Claude",
    input: 5.00,
    output: 25.00,
    cacheRead: 0.50,
    contextWindow: "1000K",
    desc: "Anthropic 高性能日常编程主力 (88.6% Verified)"
  },
  "claude-3-7-sonnet": {
    name: "Anthropic · Claude 3.7 Sonnet",
    category: "Claude",
    input: 3.00,
    output: 15.00,
    cacheRead: 0.30,
    contextWindow: "200K",
    desc: "Anthropic 旗舰混合推理与编程模型"
  },
  "claude-3-5-sonnet": {
    name: "Anthropic · Claude 3.5 Sonnet",
    category: "Claude",
    input: 3.00,
    output: 15.00,
    cacheRead: 0.30,
    contextWindow: "200K",
    desc: "行业标杆级代码与逻辑模型"
  },
  "claude-3-5-haiku": {
    name: "Anthropic · Claude 3.5 Haiku",
    category: "Claude",
    input: 0.80,
    output: 4.00,
    cacheRead: 0.08,
    contextWindow: "200K",
    desc: "Anthropic 极速轻量模型"
  },
  "claude-3-opus": {
    name: "Anthropic · Claude 3 Opus",
    category: "Claude",
    input: 15.00,
    output: 75.00,
    cacheRead: 1.50,
    contextWindow: "200K",
    desc: "深度复杂长文解析模型"
  },

  // ==========================================
  // 4. Google Gemini Official Models
  // ==========================================
  "gemini-3.7-flash": {
    name: "Google · Gemini 3.7 Flash",
    category: "Gemini",
    input: 0.15,
    output: 0.60,
    cacheRead: 0.0375,
    contextWindow: "1000K",
    desc: "Google 新一代高速多模态推理模型"
  },
  "gemini-3.7-flash-high": {
    name: "Google · Gemini 3.7 Flash High-Thinking",
    category: "Gemini",
    input: 0.15,
    output: 0.60,
    cacheRead: 0.0375,
    contextWindow: "1000K",
    desc: "Google Gemini 3.7 高思考深度版本"
  },
  "gemini-2.5-pro": {
    name: "Google · Gemini 2.5 Pro",
    category: "Gemini",
    input: 1.25,
    output: 5.00,
    cacheRead: 0.3125,
    contextWindow: "2000K",
    desc: "Google 超长上下文主力模型"
  },
  "gemini-2.0-flash": {
    name: "Google · Gemini 2.0 Flash",
    category: "Gemini",
    input: 0.10,
    output: 0.40,
    cacheRead: 0.025,
    contextWindow: "1000K",
    desc: "Google 极速低成本模型"
  },
  "gemini-1.5-pro": {
    name: "Google · Gemini 1.5 Pro",
    category: "Gemini",
    input: 1.25,
    output: 5.00,
    cacheRead: 0.3125,
    contextWindow: "2000K",
    desc: "Google 200万超大上下文旗舰"
  },
  "gemini-1.5-flash": {
    name: "Google · Gemini 1.5 Flash",
    category: "Gemini",
    input: 0.075,
    output: 0.30,
    cacheRead: 0.01875,
    contextWindow: "1000K",
    desc: "Google 极低价高频模型"
  },

  // ==========================================
  // 5. DeepSeek Official API (2026 Modern V4 Series)
  // ==========================================
  "deepseek-v4-flash": {
    name: "DeepSeek · DeepSeek-V4 Flash",
    category: "DeepSeek",
    input: 0.14, // ¥1/1M
    output: 0.28, // ¥2/1M
    cacheRead: 0.014, // ¥0.1/1M
    contextWindow: "1000K",
    desc: "DeepSeek V4 官方极速代码模型 (¥1/¥2 每百万 Token)"
  },
  "deepseek-v4-pro": {
    name: "DeepSeek · DeepSeek-V4 Pro",
    category: "DeepSeek",
    input: 0.435, // ¥3.15/1M
    output: 0.87, // ¥6.3/1M
    cacheRead: 0.0435,
    contextWindow: "1000K",
    desc: "DeepSeek V4 官方旗舰深度推理模型"
  },

  // ==========================================
  // 6. Zhipu GLM Official Models (智谱清言)
  // ==========================================
  "glm-4-plus": {
    name: "智谱 · GLM-4-Plus",
    category: "GLM",
    input: 6.90, // ¥50/1M
    output: 6.90,
    cacheRead: 1.38, // ¥10/1M
    contextWindow: "128K",
    desc: "智谱旗舰大模型 (¥50/1M)"
  },
  "glm-4-air": {
    name: "智谱 · GLM-4-Air",
    category: "GLM",
    input: 0.14, // ¥1/1M
    output: 0.14,
    cacheRead: 0.014,
    contextWindow: "128K",
    desc: "智谱超高性价比主力模型 (¥1/1M)"
  },
  "glm-4-flash": {
    name: "智谱 · GLM-4-Flash",
    category: "GLM",
    input: 0.0,
    output: 0.0,
    cacheRead: 0.0,
    contextWindow: "128K",
    desc: "智谱官方完全免费模型 (Free)"
  },
  "glm-zero-preview": {
    name: "智谱 · GLM-Zero-Preview",
    category: "GLM",
    input: 1.38, // ¥10/1M
    output: 1.38,
    cacheRead: 0.28,
    contextWindow: "128K",
    desc: "智谱首款深度思维推理模型 (¥10/1M)"
  },
  "glm-4-long": {
    name: "智谱 · GLM-4-Long",
    category: "GLM",
    input: 0.14, // ¥1/1M
    output: 0.14,
    cacheRead: 0.014,
    contextWindow: "1000K",
    desc: "智谱百万超长上下文模型 (¥1/1M)"
  },

  // ==========================================
  // 7. Xiaomi MiMo Models (小米)
  // ==========================================
  "mimo-v2.5": {
    name: "小米 · MiMo V2.5",
    category: "MiMo",
    input: 0.14,
    output: 0.28,
    cacheRead: 0.0028,
    contextWindow: "1000K",
    desc: "小米开源超高速模型 (OpenCode / 官方 API)"
  },
  "mimo-v2.5-pro": {
    name: "小米 · MiMo V2.5 Pro",
    category: "MiMo",
    input: 0.43,
    output: 0.87,
    cacheRead: 0.043,
    contextWindow: "1000K",
    desc: "小米 MiMo 高性能版"
  },

  // ==========================================
  // 8. Tencent Hunyuan Models (腾讯混元 HY)
  // ==========================================
  "hunyuan-standard": {
    name: "腾讯混元 · Hunyuan Standard",
    category: "Hunyuan",
    input: 0.62, // ¥4.5/1M
    output: 0.62,
    cacheRead: 0.062,
    contextWindow: "256K",
    desc: "腾讯混元标准模型 (¥4.5/1M)"
  },
  "hunyuan-pro": {
    name: "腾讯混元 · Hunyuan Pro",
    category: "Hunyuan",
    input: 4.15, // ¥30/1M
    output: 4.15,
    cacheRead: 0.415,
    contextWindow: "256K",
    desc: "腾讯混元旗舰模型 (¥30/1M)"
  },
  "hunyuan-turbo": {
    name: "腾讯混元 · Hunyuan Turbo",
    category: "Hunyuan",
    input: 0.02, // OpenCode rate
    output: 0.07,
    cacheRead: 0.005,
    contextWindow: "256K",
    desc: "腾讯混元 Turbo / HY3 超高速"
  },
  "hunyuan-t1": {
    name: "腾讯混元 · Hunyuan T1 (Deep Reasoning)",
    category: "Hunyuan",
    input: 2.08, // ¥15/1M
    output: 2.08,
    cacheRead: 0.208,
    contextWindow: "64K",
    desc: "腾讯混元深度思考与复杂任务推理模型"
  },

  // ==========================================
  // 9. MiniMax Official Models (名之梦)
  // ==========================================
  "minimax-text-01": {
    name: "MiniMax · Text-01",
    category: "MiniMax",
    input: 0.14, // ¥1/1M
    output: 1.11, // ¥8/1M
    cacheRead: 0.028,
    contextWindow: "1000K",
    desc: "MiniMax 400万超长文本旗舰 (¥1/¥8 每百万)"
  },
  "abab6.5s": {
    name: "MiniMax · abab 6.5s",
    category: "MiniMax",
    input: 0.14, // ¥1/1M
    output: 0.14,
    cacheRead: 0.014,
    contextWindow: "245K",
    desc: "MiniMax 高性能轻量模型 (¥1/1M)"
  },

  // ==========================================
  // 10. Moonshot Kimi Official Models
  // ==========================================
  "moonshot-v1-8k": {
    name: "Moonshot · Kimi V1 8K",
    category: "Kimi",
    input: 1.66, // ¥12/1M
    output: 1.66,
    cacheRead: 0.166,
    contextWindow: "8K",
    desc: "月之暗面 Kimi 基础版"
  },
  "moonshot-v1-32k": {
    name: "Moonshot · Kimi V1 32K",
    category: "Kimi",
    input: 3.32, // ¥24/1M
    output: 3.32,
    cacheRead: 0.332,
    contextWindow: "32K",
    desc: "月之暗面 Kimi 32K 长文版"
  },
  "moonshot-v1-128k": {
    name: "Moonshot · Kimi V1 128K",
    category: "Kimi",
    input: 8.30, // ¥60/1M
    output: 8.30,
    cacheRead: 0.83,
    contextWindow: "128K",
    desc: "月之暗面 Kimi 128K 超长上下文"
  },

  // ==========================================
  // 11. Alibaba Qwen Official Models (通义千问)
  // ==========================================
  "qwen-max": {
    name: "阿里通义 · Qwen Max",
    category: "Qwen",
    input: 2.77, // ¥20/1M
    output: 8.30, // ¥60/1M
    cacheRead: 0.69, // ¥5/1M
    contextWindow: "32K",
    desc: "通义千问千亿级旗舰模型"
  },
  "qwen-plus": {
    name: "阿里通义 · Qwen Plus",
    category: "Qwen",
    input: 0.11, // ¥0.8/1M
    output: 0.28, // ¥2/1M
    cacheRead: 0.028,
    contextWindow: "128K",
    desc: "通义千问主流编程与能力模型"
  },
  "qwen-turbo": {
    name: "阿里通义 · Qwen Turbo",
    category: "Qwen",
    input: 0.04, // ¥0.3/1M
    output: 0.08, // ¥0.6/1M
    cacheRead: 0.008,
    contextWindow: "128K",
    desc: "通义千问极速轻量模型"
  }
};

// Freeze the catalog so external modules cannot modify preset values
Object.freeze(PRESET_CATALOG);
for (const val of Object.values(PRESET_CATALOG)) {
  Object.freeze(val);
}

/**
 * Helper to produce a safe immutable price rule object
 */
function createPriceRule(input, output, cacheRead, name, isCustom = false) {
  return {
    input: Number.isFinite(input) ? Math.max(0, input) : 0.15,
    output: Number.isFinite(output) ? Math.max(0, output) : 0.60,
    cacheRead: Number.isFinite(cacheRead) ? Math.max(0, cacheRead) : 0.0375,
    name: (typeof name === 'string' && name.trim().length > 0) ? name.trim() : "默认模型",
    isCustom: !!isCustom
  };
}

/**
 * Resolve price rule with custom overrides, preset catalog, and fuzzy matching
 * Guarantees immutability and robust handling of extreme input boundaries.
 */
export function resolvePriceRule(modelId, customModels = {}) {
  // 1. Extreme boundary checks: null, undefined, boolean, number, whitespace or empty string
  if (modelId === null || modelId === undefined) {
    return createPriceRule(0.15, 0.60, 0.0375, "默认模型 (Gemini 3.7)", false);
  }

  const rawId = (typeof modelId === 'string' ? modelId : String(modelId)).trim();
  if (rawId.length === 0 || /^[^a-zA-Z0-9]+$/.test(rawId)) {
    return createPriceRule(0.15, 0.60, 0.0375, "默认模型 (Gemini 3.7)", false);
  }

  // 2. Normalize model ID: Strip UUID prefixes (e.g. "14d98e0e-12f0-40fc-8397-f4fc731cccd2/gemini-3.7-flash-high")
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i;
  const cleanModelId = rawId.replace(uuidRegex, '').trim();
  const lower = cleanModelId.toLowerCase();
  const cleanSuffix = lower.includes('/') ? lower.split('/').slice(1).join('/') : lower;
  const lastSegment = lower.split('/').pop() || lower;

  // 3. Check user custom model overrides (exact, cleaned, suffix, or last segment)
  if (customModels && typeof customModels === 'object' && !Array.isArray(customModels)) {
    const customMatchKey = [rawId, cleanModelId, cleanSuffix, lastSegment].find(k => k && customModels[k]);
    if (customMatchKey) {
      const custom = customModels[customMatchKey];
      const parsedIn = typeof custom.input === 'number' ? custom.input : (parseFloat(custom.input) || 0.15);
      const parsedOut = typeof custom.output === 'number' ? custom.output : (parseFloat(custom.output) || 0.60);
      const parsedCache = typeof custom.cacheRead === 'number' ? custom.cacheRead : (parseFloat(custom.cacheRead) || 0.0375);
      return createPriceRule(parsedIn, parsedOut, parsedCache, custom.name || rawId, true);
    }
  }

  // 4. Exact match in preset catalog (raw and cleaned)
  if (PRESET_CATALOG[rawId]) {
    const p = PRESET_CATALOG[rawId];
    return createPriceRule(p.input, p.output, p.cacheRead, p.name || rawId, false);
  }
  if (PRESET_CATALOG[cleanModelId]) {
    const p = PRESET_CATALOG[cleanModelId];
    return createPriceRule(p.input, p.output, p.cacheRead, p.name || cleanModelId, false);
  }

  // 5. Match cleaned key in preset catalog (case-insensitive)
  for (const [key, rule] of Object.entries(PRESET_CATALOG)) {
    if (key.toLowerCase() === lower) {
      return createPriceRule(rule.input, rule.output, rule.cacheRead, rule.name || key, false);
    }
  }

  // 6. Provider prefix stripping and suffix matching
  for (const [key, rule] of Object.entries(PRESET_CATALOG)) {
    const keyLower = key.toLowerCase();
    const keySuffix = keyLower.includes('/') ? keyLower.split('/').slice(1).join('/') : keyLower;
    const keyLastSegment = keyLower.split('/').pop();
    if (keySuffix === cleanSuffix || keyLastSegment === lastSegment) {
      return createPriceRule(rule.input, rule.output, rule.cacheRead, rule.name || key, false);
    }
  }

  // 7. Substring match (ONLY cleanModelId contains catalog key, sorted by length descending)
  // FIX: the key list is now pre-sorted once at module load; the previous code
  // re-sorted the whole catalog on EVERY resolvePriceRule call, which dominated
  // CPU cost when pricing thousands of usage records per poll.
  for (const key of CATALOG_KEYS_BY_LENGTH) {
    const keyLower = key.toLowerCase();
    const keyStripped = keyLower.includes('/') ? keyLower.split('/').pop() : keyLower;
    if (lower.includes(keyLower) || (keyStripped && keyStripped.length >= 4 && lower.includes(keyStripped))) {
      const p = PRESET_CATALOG[key];
      return createPriceRule(p.input, p.output, p.cacheRead, p.name || rawId, false);
    }
  }

  // 8. Heuristic fallback based on family keywords
  if (lower.includes('opus') || lower.includes('gpt-4.5')) {
    return createPriceRule(15.0, 75.0, 1.50, rawId, false);
  }
  if (lower.includes('deepseek-v4') || lower.includes('kimi-k3') || lower.includes('o1') || lower.includes('o3')) {
    return createPriceRule(0.66, 1.98, 0.066, rawId, false);
  }
  if (lower.includes('sonnet') || lower.includes('pro') || lower.includes('max')) {
    return createPriceRule(1.0, 4.0, 0.20, rawId, false);
  }
  if (lower.includes('flash') || lower.includes('mini') || lower.includes('turbo') || lower.includes('air') || lower.includes('lite') || lower.includes('mimo')) {
    return createPriceRule(0.15, 0.60, 0.0375, rawId, false);
  }

  return createPriceRule(0.15, 0.60, 0.0375, rawId, false);
}

// Pre-sorted catalog keys shared by resolvePriceRuleUncached (step 7).
const CATALOG_KEYS_BY_LENGTH = Object.keys(PRESET_CATALOG).sort((a, b) => b.length - a.length);

// ============================================
// Memoization layer for resolvePriceRule.
// The resolver runs regex cascades and linear catalog scans, and the poller
// invokes it per usage record on every recompute. Results depend only on
// (modelId, customModels), and customModels object identity is stable across
// ticks while settings.json is unchanged (see loadSettings mtime cache), so a
// WeakMap keyed by the customModels object gives safe, self-invalidating
// caching: editing custom models in the Web HUD creates a fresh parsed
// settings object and therefore a fresh cache.
// ============================================
const RULE_MEMO_BY_CUSTOM_MODELS = new WeakMap();
const NO_CUSTOM_MODELS = Object.freeze({}); // sentinel for calls without overrides

export function resolvePriceRuleCached(modelId, customModels) {
  let cacheKey = customModels;
  if (!cacheKey || typeof cacheKey !== 'object' || Array.isArray(cacheKey)) {
    cacheKey = NO_CUSTOM_MODELS;
  }
  let perModels = RULE_MEMO_BY_CUSTOM_MODELS.get(cacheKey);
  if (!perModels) {
    perModels = new Map();
    RULE_MEMO_BY_CUSTOM_MODELS.set(cacheKey, perModels);
  }
  let rule = perModels.get(modelId);
  if (rule === undefined) {
    rule = resolvePriceRule(modelId, cacheKey === NO_CUSTOM_MODELS ? {} : customModels);
    if (perModels.size > 5000) perModels.clear(); // bound memory on exotic inputs
    perModels.set(modelId, rule);
  }
  return rule;
}
