import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const homedir = os.homedir();
const candidates = [
  path.join(homedir, '.zcode', 'db.sqlite'),
  path.join(homedir, '.zcode', 'cli', 'db', 'db.sqlite'),
  path.join(homedir, '.zcode', 'data', 'db.sqlite')
];

for (const dbPath of candidates) {
  console.log(`Checking candidate: ${dbPath} (exists: ${fs.existsSync(dbPath)})`);
  if (!fs.existsSync(dbPath)) continue;
  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
    console.log(`Tables in ${dbPath}:`);
    for (const t of tables) {
      console.log(`  - Table: ${t.name}`);
      console.log(`    SQL: ${t.sql}`);
      try {
        const count = db.prepare(`SELECT count(*) as count FROM "${t.name}"`).get();
        console.log(`    Count: ${count.count}`);
      } catch (err) {
        console.log(`    Count error: ${err.message}`);
      }
    }
  } catch (e) {
    console.error(`Error opening ${dbPath}:`, e.message);
  }
}
