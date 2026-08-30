import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.join(os.homedir(), '.zcode', 'cli', 'db', 'db.sqlite');
const metricsPath = path.join(process.cwd(), 'zcode-tps-hud', 'live-metrics.json');

try {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const activeSession = db.prepare("SELECT id, title, time_updated FROM session ORDER BY time_updated DESC LIMIT 1").get();
  
  if (activeSession) {
    const messages = db.prepare("SELECT data, time_created, time_updated FROM message WHERE session_id = ? ORDER BY time_created ASC").all(activeSession.id);
    
    let totalTurns = 0;
    let totalCostUsd = 0;
    let latestTurn = null;
    const sparkline = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (const msg of messages) {
      if (!msg.data) continue;
      try {
        const d = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
        if (d.role === 'assistant' && d.tokens) {
          totalTurns++;
          const inTok = d.tokens.input || 0;
          const outTok = d.tokens.output || 0;
          const cacheRead = d.tokens.cache ? d.tokens.cache.read || 0 : 0;
          const reasoning = d.tokens.reasoning || 0;
          
          let dur = 0;
          if (d.time && d.time.created && d.time.completed) {
            dur = Math.max(0.1, (d.time.completed - d.time.created) / 1000);
          }
          const tps = dur > 0 && outTok > 0 ? parseFloat((outTok / dur).toFixed(1)) : 0;
          const cost = (inTok * 0.10 + outTok * 0.40 + cacheRead * 0.025) / 1000000;
          totalCostUsd += cost;

          latestTurn = {
            tps,
            inputTokens: inTok,
            outputTokens: outTok,
            reasoningTokens: reasoning,
            cacheReadTokens: cacheRead,
            cacheHitRate: (inTok + cacheRead) > 0 ? parseFloat(((cacheRead / (inTok + cacheRead)) * 100).toFixed(1)) : 0,
            durationSec: parseFloat(dur.toFixed(1)),
            costUsd: cost,
            modelId: d.modelID || 'gemini-3.7-flash',
            modelName: 'Gemini 3.7 Flash'
          };
          
          if (tps > 0) {
            sparkline.shift();
            sparkline.push(tps);
          }
        }
      } catch (e) {}
    }

    if (latestTurn) {
      const liveData = {
        status: "idle",
        sessionTitle: activeSession.title || "ZCode 当前会话",
        tps: latestTurn.tps,
        inputTokens: latestTurn.inputTokens,
        outputTokens: latestTurn.outputTokens,
        reasoningTokens: latestTurn.reasoningTokens,
        cacheReadTokens: latestTurn.cacheReadTokens,
        cacheHitRate: latestTurn.cacheHitRate,
        cost: {
          usd: latestTurn.costUsd,
          cny: latestTurn.costUsd * 7.25,
          formattedUsd: "$" + latestTurn.costUsd.toFixed(4),
          formattedCny: "¥" + (latestTurn.costUsd * 7.25).toFixed(4)
        },
        durationSec: latestTurn.durationSec,
        ttftMs: 0,
        modelId: latestTurn.modelId,
        modelName: latestTurn.modelName,
        sparkline: sparkline,
        session: {
          turnCount: totalTurns,
          costUsd: totalCostUsd,
          costCny: totalCostUsd * 7.25,
          formattedUsd: "$" + totalCostUsd.toFixed(4),
          formattedCny: "¥" + (totalCostUsd * 7.25).toFixed(4)
        },
        sessions: [
          {
            sessionId: activeSession.id,
            sessionTitle: activeSession.title || "当前任务",
            modelName: latestTurn.modelName,
            turnCount: totalTurns
          }
        ],
        updatedAt: Date.now()
      };

      fs.writeFileSync(metricsPath, JSON.stringify(liveData, null, 2), 'utf-8');
      console.log("Successfully wrote live metrics:", liveData);
    }
  }
} catch (err) {
  console.error("Error updating metrics:", err);
}
