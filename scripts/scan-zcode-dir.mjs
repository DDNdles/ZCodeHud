import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const zcodeDir = path.join(os.homedir(), '.zcode');

function scanDir(dir, depth = 0) {
  if (depth > 3) return null;
  const result = {};
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result[entry.name] = scanDir(fullPath, depth + 1);
      } else {
        const stats = fs.statSync(fullPath);
        result[entry.name] = { size: stats.size, mtime: stats.mtime };
      }
    }
  } catch (e) {
    return { error: e.message };
  }
  return result;
}

const scan = scanDir(zcodeDir);
fs.writeFileSync('zcode-scan-result.json', JSON.stringify(scan, null, 2), 'utf8');
console.log('Saved scan to zcode-scan-result.json');
