import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const homedir = os.homedir();
const dbPath = path.join(homedir, '.zcode', 'db.sqlite');

try {
  const schema = execFileSync('sqlite3', [dbPath, '.schema'], { encoding: 'utf8' });
  console.log('SCHEMA:\n', schema);
} catch (e) {
  console.error('Error:', e.message);
}
