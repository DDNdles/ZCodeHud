import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const homeDir = os.homedir();
console.log('Home directory:', homeDir);

// 1. Check all sqlite files in ~/.zcode
function findFiles(dir, matchExt, maxDepth = 4, depth = 0) {
  if (depth > maxDepth || !fs.existsSync(dir)) return [];
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        results.push(...findFiles(fullPath, matchExt, maxDepth, depth + 1));
      } else if (matchExt.test(ent.name)) {
        results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

const sqliteFiles = findFiles(path.join(homeDir, '.zcode'), /\.sqlite$/i, 4);
console.log('Found SQLite files:', sqliteFiles);

for (const dbPath of sqliteFiles) {
  console.log('\n--- Inspecting:', dbPath, '---');
  try {
    const tables = execFileSync('sqlite3', [dbPath, '.tables'], { encoding: 'utf8' }).trim();
    console.log('Tables:', tables);
    
    // Check tables for session / topic / usage
    const tableList = tables.split(/\s+/);
    for (const t of tableList) {
      if (t.includes('session') || t.includes('usage') || t.includes('model') || t.includes('conversation')) {
        console.log(`\nTable [${t}] schema:`);
        const schema = execFileSync('sqlite3', [dbPath, `.schema ${t}`], { encoding: 'utf8' }).trim();
        console.log(schema);
        console.log(`Table [${t}] sample:`);
        const rows = execFileSync('sqlite3', [dbPath, '-json', `SELECT * FROM ${t} ORDER BY rowid DESC LIMIT 3;`], { encoding: 'utf8' }).trim();
        console.log(rows);
      }
    }
  } catch (e) {
    console.log('Query error:', e.message);
  }
}
