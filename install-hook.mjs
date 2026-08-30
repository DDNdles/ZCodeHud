// install-hook.mjs - one-shot installer: writes the SessionStart hook into
// ~/.zcode/cli/config.json (preserving all other keys), pointing at launch-hud.mjs.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const launcherAbs = path.join(__dirname, 'launch-hud.mjs');
const cfgPath = path.join(os.homedir(), '.zcode', 'cli', 'config.json');

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
cfg.hooks = {
  enabled: true,
  events: {
    SessionStart: [
      {
        hooks: [
          {
            type: 'process',
            command: 'node',
            args: [launcherAbs],
            timeoutMs: 10000,
            statusMessage: 'Launching ZCode TPS HUD'
          }
        ]
      }
    ]
  }
};
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');

const back = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const hookArgs = back.hooks.events.SessionStart[0].hooks[0].args;
console.log('hook launcher path:', hookArgs[0]);
console.log('launcher exists:', fs.existsSync(hookArgs[0]));
console.log('plugins preserved:', !!back.plugins, '| mcp preserved:', !!back.mcp, '| skills preserved:', !!back.skills);
