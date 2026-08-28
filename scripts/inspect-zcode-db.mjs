import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

const dbPath = path.join(os.homedir(), '.zcode', 'db.sqlite');
console.log('Opening database at:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t => t.name));

  for (const table of tables) {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`\nTable [${table.name}] count:`, count.count);
    const sample = db.prepare(`SELECT * FROM ${table.name} ORDER BY rowid DESC LIMIT 3`).all();
    console.log('Sample rows:', JSON.stringify(sample, null, 2));
  }
} catch (err) {
  console.error('DB inspection error:', err);
}
