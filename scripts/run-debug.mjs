import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const homedir = os.homedir();
const dbPath = path.join(homedir, '.zcode', 'db.sqlite');

try {
  const tables = execFileSync('sqlite3', [dbPath, '.tables'], { encoding: 'utf8' });
  const sample = execFileSync('sqlite3', [dbPath, '-json', 'SELECT * FROM model_usage ORDER BY updated_at_epoch_ms DESC LIMIT 3;'], { encoding: 'utf8' });
  fs.writeFileSync(path.join(process.cwd(), 'zcode-tps-hud', 'debug-output.json'), JSON.stringify({
    tables: tables.trim().split(/\s+/),
    sample: JSON.parse(sample)
  }, null, 2), 'utf8');
} catch (e) {
  fs.writeFileSync(path.join(process.cwd(), 'zcode-tps-hud', 'debug-output.json'), JSON.stringify({
    error: e.message
  }, null, 2), 'utf8');
}
