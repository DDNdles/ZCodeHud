import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

const homeDir = os.homedir();
const dbCandidates = [
  path.join(homeDir, '.zcode', 'db.sqlite'),
  path.join(homeDir, '.zcode', 'cli', 'db', 'db.sqlite'),
  path.join(homeDir, '.claude', 'db.sqlite')
];

for (const dbPath of dbCandidates) {
  if (!fs.existsSync(dbPath)) continue;
  console.log('=== DB:', dbPath, '===');
  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name));
    for (const t of tables) {
      console.log(`\nTable [${t.name}]:`);
      const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${t.name}'`).get();
      console.log('Schema:', schema ? schema.sql : 'N/A');
      const rows = db.prepare(`SELECT * FROM "${t.name}" ORDER BY rowid DESC LIMIT 2`).all();
      console.log('Sample:', JSON.stringify(rows, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}
