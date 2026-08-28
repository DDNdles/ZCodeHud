// test-firstrun.mjs - Validates ZCodeHookInstaller (first-run init) edge cases
// by driving the HUD_HOOK_SELFTEST harness build of ZCodeHud.cs.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csc = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
const gacMsil = 'C:\\Windows\\Microsoft.Net\\assembly\\GAC_MSIL';
const gac64 = 'C:\\Windows\\Microsoft.Net\\assembly\\GAC_64';

function findDll(base, name) {
  const dir = path.join(base, name);
  if (!fs.existsSync(dir)) return null;
  for (const ver of fs.readdirSync(dir)) {
    const full = path.join(dir, ver, `${name}.dll`);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

const testExe = path.join(__dirname, 'selftest-hook.exe');
const refs = [
  findDll(gacMsil, 'PresentationFramework') || 'PresentationFramework.dll',
  findDll(gac64, 'PresentationCore') || findDll(gacMsil, 'PresentationCore') || 'PresentationCore.dll',
  findDll(gacMsil, 'WindowsBase') || 'WindowsBase.dll',
  findDll(gacMsil, 'System.Xaml') || 'System.Xaml.dll',
  'System.dll'
];
const build = spawnSync(csc, [
  '/nologo', '/optimize+', '/target:exe',
  '/define:HUD_HOOK_SELFTEST',
  ...refs.map(r => `/r:${r}`),
  `/out:${testExe}`,
  path.join(__dirname, 'ZCodeHud.cs')
], { encoding: 'utf8' });
if (build.status !== 0) {
  console.error('SELFTEST BUILD FAILED:\n' + build.stdout + build.stderr);
  process.exit(1);
}
console.log('[build] selftest harness OK');

const work = fs.mkdtempSync(path.join(__dirname, 'hooktest-'));
const launcher = path.join(work, 'launch-hud.mjs');
fs.writeFileSync(launcher, '// stub\n');

let failures = 0;
function runCase(cfgPath, launcherOverride) {
  const res = spawnSync(testExe, [cfgPath, launcherOverride || launcher], { encoding: 'utf8' });
  return { out: (res.stdout || '') + (res.stderr || ''), status: res.status };
}

function check(name, cond, detail) {
  if (cond) console.log(`  ✅ ${name}`);
  else { console.error(`  ❌ ${name} ${detail || ''}`); failures++; }
}

// ---------- Case A: fresh machine, no config.json ----------
console.log('Case A: fresh machine (no config.json)');
const dirA = path.join(work, 'A', '.zcode', 'cli');
const cfgA = path.join(dirA, 'config.json');
let r = runCase(cfgA);
check('exit 0', r.status === 0, r.out);
check('config created', fs.existsSync(cfgA));
const a = JSON.parse(fs.readFileSync(cfgA, 'utf8'));
check('hooks.enabled=true', a.hooks && a.hooks.enabled === true);
check('SessionStart registered', Array.isArray(a.hooks.events.SessionStart) && a.hooks.events.SessionStart.length === 1);
const hookA = a.hooks.events.SessionStart[0].hooks[0];
check('process/node/args path', hookA.type === 'process' && hookA.command === 'node' && hookA.args[0] === launcher);
check('no tmp residue', !fs.existsSync(cfgA + '.hud-tmp'));

// ---------- Case B: existing rich config (order + other keys preserved) ----------
console.log('Case B: existing config with plugins/mcp/skills');
const dirB = path.join(work, 'B', '.zcode', 'cli');
fs.mkdirSync(dirB, { recursive: true });
const cfgB = path.join(dirB, 'config.json');
const rich = {
  plugins: { enabledPlugins: { "a@b": true, "c@d": false }, options: {} },
  skills: { "C:/x/SKILL.md": { enable: false } },
  mcp: { servers: { tavily: { command: "npx", args: ["-y", "tavily-mcp"], env: { KEY: "secret\"quote\\slash" } } } }
};
fs.writeFileSync(cfgB, JSON.stringify(rich, null, 2));
r = runCase(cfgB);
check('exit 0', r.status === 0, r.out);
const b = JSON.parse(fs.readFileSync(cfgB, 'utf8'));
check('plugins preserved', JSON.stringify(b.plugins) === JSON.stringify(rich.plugins));
check('skills preserved', JSON.stringify(b.skills) === JSON.stringify(rich.skills));
check('mcp env escaped-string roundtrip', b.mcp.servers.tavily.env.KEY === 'secret"quote\\slash');
check('hooks added', b.hooks && b.hooks.enabled === true);
check('key order preserved (plugins first)', Object.keys(b)[0] === 'plugins');
check('backup created', fs.existsSync(cfgB + '.hud-bak'));

// ---------- Case C: hook already registered at an OLD path (self-heal) ----------
console.log('Case C: old install path self-heal, no duplicates');
const dirC = path.join(work, 'C', '.zcode', 'cli');
fs.mkdirSync(dirC, { recursive: true });
const cfgC = path.join(dirC, 'config.json');
const oldLauncher = 'D:\\old\\install\\launch-hud.mjs';
const existing = {
  hooks: {
    enabled: true,
    events: {
      SessionStart: [
        { matcher: 'startup', hooks: [{ type: 'process', command: 'node', args: ['C:\\other\\tool.mjs'], timeoutMs: 5000 }] },
        { hooks: [{ type: 'process', command: 'node', args: [oldLauncher], timeoutMs: 10000, statusMessage: 'Launching ZCode TPS HUD' }] }
      ]
    }
  },
  plugins: { enabledPlugins: { "x@y": true } }
};
fs.writeFileSync(cfgC, JSON.stringify(existing, null, 2));
r = runCase(cfgC);
check('exit 0', r.status === 0, r.out);
const c = JSON.parse(fs.readFileSync(cfgC, 'utf8'));
check('still 2 SessionStart entries', c.hooks.events.SessionStart.length === 2);
check('foreign hook untouched', c.hooks.events.SessionStart[0].hooks[0].args[0] === 'C:\\other\\tool.mjs');
check('our hook path healed', c.hooks.events.SessionStart[1].hooks[0].args[0] === launcher);
check('other keys kept', c.plugins.enabledPlugins['x@y'] === true);

// ---------- Case D: corrupt config.json ----------
console.log('Case D: corrupt config.json gets backed up, not destroyed');
const dirD = path.join(work, 'D', '.zcode', 'cli');
fs.mkdirSync(dirD, { recursive: true });
const cfgD = path.join(dirD, 'config.json');
const corrupt = '{ "plugins": { broken json...';
fs.writeFileSync(cfgD, corrupt);
r = runCase(cfgD);
check('exit 0', r.status === 0, r.out);
check('corrupt backup made', fs.existsSync(cfgD + '.hud-bak-') || fs.readdirSync(dirD).some(f => f.startsWith('config.json.hud-bak-')));
const d = JSON.parse(fs.readFileSync(cfgD, 'utf8'));
check('fresh valid hooks', d.hooks && d.hooks.enabled === true);

// ---------- Case E: missing launcher -> refuse safely ----------
console.log('Case E: missing launch-hud.mjs -> refuse');
const cfgE = path.join(work, 'E', 'config.json');
r = runCase(cfgE, path.join(work, 'nope.mjs'));
check('exit 0 (graceful)', r.status === 0, r.out);
check('config not created', !fs.existsSync(cfgE));
check('report mentions missing', /missing/.test(r.out), r.out);

console.log('----------------------------------------');
if (failures === 0) console.log('✅ ALL FIRST-RUN TESTS PASSED');
else { console.error(`❌ ${failures} CHECK(S) FAILED`); process.exit(1); }
fs.rmSync(work, { recursive: true, force: true });
fs.rmSync(testExe, { force: true });
