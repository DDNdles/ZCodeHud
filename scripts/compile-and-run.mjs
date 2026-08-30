import { spawnSync, spawn } from 'node:child_process';
import path from 'node:path';

const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const src = path.resolve('zcode-tps-hud', 'ZCodeHud.cs');
const out = path.resolve('zcode-tps-hud', 'ZCodeHud.exe');

const refs = [
  'C:\\Windows\\Microsoft.Net\\assembly\\GAC_MSIL\\PresentationFramework\\v4.0_4.0.0.0__31bf3856ad364e35\\PresentationFramework.dll',
  'C:\\Windows\\Microsoft.Net\\assembly\\GAC_64\\PresentationCore\\v4.0_4.0.0.0__31bf3856ad364e35\\PresentationCore.dll',
  'C:\\Windows\\Microsoft.Net\\assembly\\GAC_MSIL\\WindowsBase\\v4.0_4.0.0.0__31bf3856ad364e35\\WindowsBase.dll',
  'System.Xaml.dll',
  'System.dll'
];

const args = ['/target:winexe', '/nologo', '/optimize+', ...refs.map(r => `/r:${r}`), `/out:${out}`, src];
console.log('Compiling ZCodeHud.cs...');
const res = spawnSync(csc, args, { encoding: 'utf8' });
if (res.status === 0) {
  console.log('✅ Compiled successfully!');
} else {
  console.error('❌ Error:', res.stdout, res.stderr);
}
