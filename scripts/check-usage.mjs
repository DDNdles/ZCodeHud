import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.join(os.homedir(), '.zcode', 'cli', 'db', 'db.sqlite');
const db = new DatabaseSync(dbPath, { readOnly: true });

// Check latest message columns and values
const latestMsg = db.prepare("SELECT * FROM message ORDER BY time_created DESC LIMIT 3").all();
console.log('Messages:', JSON.stringify(latestMsg, null, 2));

// Check latest model_usage
const latestUsage = db.prepare("SELECT * FROM model_usage ORDER BY time_created DESC LIMIT 5").all();
console.log('ModelUsage:', JSON.stringify(latestUsage, null, 2));
