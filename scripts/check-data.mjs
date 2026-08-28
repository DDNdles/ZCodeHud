import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.join(os.homedir(), '.zcode', 'cli', 'db', 'db.sqlite');
console.log('Opening:', dbPath);

const db = new DatabaseSync(dbPath, { readOnly: true });

// Check latest sessions
const sessions = db.prepare("SELECT * FROM session ORDER BY time_updated DESC LIMIT 5").all();
console.log('Latest sessions:', JSON.stringify(sessions, null, 2));

// Check message
const messages = db.prepare("SELECT * FROM message ORDER BY time_created DESC LIMIT 5").all();
console.log('Latest messages:', JSON.stringify(messages, null, 2));

// Check model_usage
const modelUsages = db.prepare("SELECT * FROM model_usage ORDER BY rowid DESC LIMIT 5").all();
console.log('Latest model_usage:', JSON.stringify(modelUsages, null, 2));

// Check part
const parts = db.prepare("SELECT * FROM part ORDER BY rowid DESC LIMIT 5").all();
console.log('Latest parts:', JSON.stringify(parts, null, 2));
