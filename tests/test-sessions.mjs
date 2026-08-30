import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.join(os.homedir(), '.zcode', 'cli', 'db', 'db.sqlite');
const db = new DatabaseSync(dbPath, { readOnly: true });

const sessions = db.prepare("SELECT * FROM session ORDER BY time_updated DESC LIMIT 5").all();
console.log('Sessions:', JSON.stringify(sessions, null, 2));
