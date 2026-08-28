import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.join(os.homedir(), '.zcode', 'cli', 'db', 'db.sqlite');
const db = new DatabaseSync(dbPath, { readOnly: true });

const sessions = db.prepare("SELECT * FROM session ORDER BY time_updated DESC LIMIT 5").all();
console.log('Sessions count:', sessions.length);
if (sessions.length > 0) {
  const s = sessions[0];
  console.log('Latest session:', s.id, s.title);
  const msgs = db.prepare("SELECT * FROM message WHERE session_id = ? ORDER BY time_created ASC").all(s.id);
  console.log('Messages count:', msgs.length);
  
  const assistantTurns = [];
  for (const m of msgs) {
    let d = null;
    try {
      d = JSON.parse(m.data);
    } catch(e) {}
    if (d && d.role === 'assistant' && d.tokens) {
      assistantTurns.push({ m, d });
    }
  }
  console.log('Assistant turns with tokens:', assistantTurns.length);
  if (assistantTurns.length > 0) {
    const last = assistantTurns[assistantTurns.length - 1];
    console.log('Last turn tokens:', last.d.tokens);
    console.log('Last turn time:', last.d.time);
  }
}
