import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const homedir = os.homedir();
console.log('Homedir:', homedir);

// Check potential locations
const candidates = [
  path.join(homedir, '.zcode', 'db.sqlite'),
  path.join(homedir, '.claude', 'db.sqlite'),
  path.join(process.cwd(), 'db.sqlite'),
  'C:\\Users\\30959\\.zcode\\db.sqlite'
];

for (const c of candidates) {
  console.log(`Checking ${c}: exists=${fs.existsSync(c)}`);
  if (fs.existsSync(c)) {
    try {
      const out = execFileSync('sqlite3', [c, '.tables'], { encoding: 'utf8' });
      console.log(`  Tables in ${c}:`, out.trim().split(/\s+/));
    } catch (e) {
      console.log(`  Error querying ${c}:`, e.message);
    }
  }
}
