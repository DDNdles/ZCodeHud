import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const gacMsil = 'C:\\Windows\\Microsoft.Net\\assembly\\GAC_MSIL';
const gac64 = 'C:\\Windows\\Microsoft.Net\\assembly\\GAC_64';

function findGac(base, dll) {
  const name = dll.replace('.dll', '');
  const dir = path.join(base, name);
  if (!fs.existsSync(dir)) return null;
  for (const ver of fs.readdirSync(dir)) {
    const full = path.join(dir, ver, dll);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

const pf = findGac(gacMsil, 'PresentationFramework.dll') || 'PresentationFramework.dll';
const pc = findGac(gac64, 'PresentationCore.dll') || findGac(gacMsil, 'PresentationCore.dll') || 'PresentationCore.dll';
const wb = findGac(gacMsil, 'WindowsBase.dll') || 'WindowsBase.dll';
const sx = findGac(gacMsil, 'System.Xaml.dll') || 'System.Xaml.dll';

const src = path.join(__dirname, 'ZCodeHud.cs');
const out = path.join(__dirname, 'ZCodeHud.exe');

const args = [
  '/target:winexe',
  '/nologo',
  '/optimize+',
  `/r:${pf}`,
  `/r:${pc}`,
  `/r:${wb}`,
  `/r:${sx}`,
  '/r:System.dll',
  `/out:${out}`,
  src
];

console.log('Building ZCodeHud.exe from:', src);
const res = spawnSync(csc, args, { encoding: 'utf8' });
if (res.error) {
  console.error('Error:', res.error);
} else if (res.status !== 0) {
  console.error('Compiler error output:', res.stdout, res.stderr);
} else {
  console.log('✅ BUILD SUCCESS: ZCodeHud.exe built at', out);
}
