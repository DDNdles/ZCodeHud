import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const dbPath = path.join(os.homedir(), '.zcode', 'db.sqlite');
console.log('DB Path exists:', fs.existsSync(dbPath));
