// launch-hud.mjs - ZCode SessionStart hook launcher
//
// ZCode runs hooks inline (the session waits for the hook process to exit),
// so this script must daemonize the HUD and return immediately:
//   1. spawn ZCodeHud.exe fully detached (its own process group, no stdio)
//   2. unref() so this Node process has no reason to stay alive
//   3. exit 0
// The HUD exe itself is single-instance (named mutex), and its poller is
// single-instance (poller.lock heartbeat), so repeated hook fires are no-ops.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const exePath = path.join(__dirname, 'ZCodeHud.exe');

try {
  const child = spawn(exePath, [], {
    cwd: __dirname,
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
  // Give the child a moment to initialize; if it dies instantly (e.g. missing
  // exe) report failure so the hook shows up as failed in the ZCode log.
  await new Promise(resolve => setTimeout(resolve, 300));
  if (child.exitCode !== null && child.exitCode !== 0) {
    console.error(`ZCodeHud.exe exited immediately with code ${child.exitCode}`);
    process.exit(1);
  }
} catch (err) {
  console.error('Failed to launch ZCodeHud.exe:', err.message);
  process.exit(1);
}
process.exit(0);
