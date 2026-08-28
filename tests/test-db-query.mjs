import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const homedir = os.homedir();
const dbPath = path.join(homedir, '.zcode', 'db.sqlite');

try {
  const tables = execFileSync('sqlite3', [dbPath, '.tables'], { encoding: 'utf8' });
  console.log('TABLES:\n', tables);

  const usageCols = execFileSync('sqlite3', [dbPath, 'PRAGMA table_info(model_usage);'], { encoding: 'utf8' });
  console.log('model_usage columns:\n', usageCols);

  const sample = execFileSync('sqlite3', [dbPath, '-json', 'SELECT * FROM model_usage ORDER BY updated_at_epoch_ms DESC LIMIT 3;'], { encoding: 'utf8' });
  console.log('Recent 3 rows:\n', sample);
} catch (e) {
  console.error('Error:', e.message);
}
