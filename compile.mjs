import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cscCandidates = [
  'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',
  'C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe'
];
const csc = cscCandidates.find(p => fs.existsSync(p)) || cscCandidates[0];
const src = path.join(__dirname, 'src', 'ZCodeHud.cs');
const out = path.join(__dirname, 'ZCodeHud.exe');

// GAC / WPF References
const gacMsil = 'C:\\Windows\\Microsoft.Net\\assembly\\GAC_MSIL';
const gac64 = 'C:\\Windows\\Microsoft.Net\\assembly\\GAC_64';

function findDll(baseDir, name) {
  if (!fs.existsSync(baseDir)) return null;
  const matchDir = path.join(baseDir, name);
  if (!fs.existsSync(matchDir)) return null;
  const versions = fs.readdirSync(matchDir);
  if (versions.length > 0) {
    const target = path.join(matchDir, versions[0], `${name}.dll`);
    if (fs.existsSync(target)) return target;
  }
  return null;
}

const refs = [
  findDll(gacMsil, 'PresentationFramework') || 'PresentationFramework.dll',
  findDll(gac64, 'PresentationCore') || findDll(gacMsil, 'PresentationCore') || 'PresentationCore.dll',
  findDll(gacMsil, 'WindowsBase') || 'WindowsBase.dll',
  findDll(gacMsil, 'System.Xaml') || 'System.Xaml.dll',
  'System.dll'
];

const refArgs = refs.map(r => `"/r:${r}"`).join(' ');
const cmd = `"${csc}" /target:winexe /nologo /optimize+ ${refArgs} "/out:${out}" "${src}"`;

console.log('Compiling ZCodeHud.cs into standalone native ZCodeHud.exe...');
try {
  const result = execSync(cmd, { encoding: 'utf8' });
  if (result) console.log(result);
  if (fs.existsSync(out)) {
    console.log('✅ SUCCESS: Compiled ZCodeHud.exe successfully!');
  } else {
    console.error('❌ FAILED: Output executable not found');
  }
} catch (e) {
  console.error('Compilation failed:', e.message);
  if (e.stdout) console.log('stdout:', e.stdout);
  if (e.stderr) console.log('stderr:', e.stderr);
}
