import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const DB_PATH = path.join(os.homedir(), '.zcode', 'db.sqlite');

function checkAndFix() {
  console.log('Testing DB at:', DB_PATH, 'exists:', fs.existsSync(DB_PATH));
  if (!fs.existsSync(DB_PATH)) {
    return;
  }
  try {
    const tables = execFileSync('sqlite3', [DB_PATH, "SELECT name FROM sqlite_master WHERE type='table';"], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim().split(/\s+/);
    console.log('Existing tables:', tables);

    if (!tables.includes('model_usage')) {
      console.log('Creating model_usage table for clean tracking...');
      execFileSync('sqlite3', [
        DB_PATH,
        `CREATE TABLE IF NOT EXISTS model_usage (
          session_id TEXT,
          turn_id TEXT,
          model_id TEXT DEFAULT 'gemini-3.7-flash',
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          cache_read_input_tokens INTEGER DEFAULT 0,
          cache_creation_input_tokens INTEGER DEFAULT 0,
          reasoning_output_tokens INTEGER DEFAULT 0,
          duration_ms INTEGER DEFAULT 0,
          time_to_first_token_ms INTEGER DEFAULT 0,
          updated_at_epoch_ms INTEGER
        );`
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      console.log('✅ model_usage table created/verified successfully!');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkAndFix();
