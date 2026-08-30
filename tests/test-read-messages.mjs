import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.join(os.homedir(), '.zcode', 'cli', 'db', 'db.sqlite');
const db = new DatabaseSync(dbPath, { readOnly: true });

const rows = db.prepare(`
  SELECT id, session_id, time_created, time_updated, data 
  FROM message 
  ORDER BY time_created DESC 
  LIMIT 50
`).all();

console.log(`Found ${rows.length} messages`);
let count = 0;
for (const r of rows) {
  try {
    const d = JSON.parse(r.data);
    if (d.role === 'assistant' && d.tokens && d.tokens.input > 0) {
      console.log({
        id: r.id,
        model: d.modelID,
        input: d.tokens.input,
        output: d.tokens.output,
        reasoning: d.tokens.reasoning,
        cacheRead: d.tokens.cache ? d.tokens.cache.read : 0,
        timeCreated: d.time ? d.time.created : r.time_created,
        timeCompleted: d.time ? d.time.completed : r.time_updated,
        durationMs: (d.time && d.time.completed && d.time.created) ? (d.time.completed - d.time.created) : 0
      });
      count++;
      if (count >= 5) break;
    }
  } catch (e) {}
}
