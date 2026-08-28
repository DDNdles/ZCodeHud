import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

const homeDir = os.homedir();
const dbPath = path.join(homeDir, '.zcode', 'db.sqlite');
console.log('dbPath exists:', fs.existsSync(dbPath));

if (fs.existsSync(dbPath)) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables in db.sqlite:', tables.map(t => t.name));

  for (const t of tables) {
    console.log(`\n--- TABLE: ${t.name} ---`);
    try {
      const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get();
      console.log('Count:', count.c);
      const rows = db.prepare(`SELECT * FROM "${t.name}" ORDER BY rowid DESC LIMIT 3`).all();
      console.log('Recent rows:', JSON.stringify(rows, null, 2));
    } catch (e) {
      console.log('Error querying table:', e.message);
    }
  }
}
