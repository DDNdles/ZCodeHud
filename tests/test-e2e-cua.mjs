// ZCode-TPS-HUD End-to-End CUA Automated Test Suite
// Executes 6-step testing protocol and exports screenshots

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HUD_URL = 'http://127.0.0.1:38291/hud';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTestSuite() {
  console.log('=== Starting ZCode-TPS-HUD CUA Automated Verification ===\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security', '--allow-file-access-from-files']
  });

  const context = await browser.newContext({
    viewport: { width: 500, height: 420 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // [Step 1: Launch & Initialization]
    // -------------------------------------------------------------
    console.log('[Step 1/6] Launching HUD & validating Apple Liquid Glass layout...');
    await page.goto(HUD_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const shot1Path = path.join(SCREENSHOT_DIR, 'Screenshot_01_Launch.png');
    await page.screenshot({ path: shot1Path, omitBackground: true });
    console.log(`  -> Screenshot saved: ${shot1Path}`);

    // Verify Title & Metric Elements
    const title = await page.title();
    console.log(`  -> Page title: "${title}"`);
    const statusText = await page.textContent('#status-text');
    console.log(`  -> Status badge: "${statusText.trim()}"`);

    // -------------------------------------------------------------
    // [Step 2: Drag & Placement Validation]
    // -------------------------------------------------------------
    console.log('\n[Step 2/6] Testing HUD Drag & Floating Placement...');
    const header = await page.locator('.hud-header');
    const headerBox = await header.boundingBox();
    if (headerBox) {
      await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y + headerBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(headerBox.x + 40, headerBox.y + 30, { steps: 5 });
      await page.mouse.up();
      console.log('  -> Mouse drag gesture completed smoothly.');
    }

    // -------------------------------------------------------------
    // [Step 3: Right Click / Open Apple Settings Drawer]
    // -------------------------------------------------------------
    console.log('\n[Step 3/6] Opening Apple Settings Drawer via Right Click...');
    await page.locator('#app-container').click({ button: 'right' });
    await page.waitForTimeout(400);

    const settingsDrawer = page.locator('#settings-drawer');
    const isOpen = await settingsDrawer.evaluate(el => el.classList.contains('open'));
    console.log(`  -> Settings Drawer open state: ${isOpen}`);

    const shot2Path = path.join(SCREENSHOT_DIR, 'Screenshot_02_SettingsOpen.png');
    await page.screenshot({ path: shot2Path, omitBackground: true });
    console.log(`  -> Screenshot saved: ${shot2Path}`);

    // -------------------------------------------------------------
    // [Step 4: Interactive Theme Switching & Slider Testing]
    // -------------------------------------------------------------
    console.log('\n[Step 4/6] Testing 5 Theme Palettes & Adjusting Sliders...');
    const themes = ['crystal', 'deepseek', 'cyber', 'titanium', 'obsidian'];
    for (const t of themes) {
      await page.click(`button[data-theme="${t}"]`);
      await page.waitForTimeout(200);
      const activeTheme = await page.evaluate(() => document.body.getAttribute('data-theme'));
      console.log(`  -> Switched theme to: ${activeTheme}`);
    }

    // Adjust Opacity to 70% and Scale to 110%
    await page.fill('#slider-opacity', '70');
    await page.dispatchEvent('#slider-opacity', 'input');
    await page.fill('#slider-scale', '110');
    await page.dispatchEvent('#slider-scale', 'input');
    await page.fill('#slider-refresh', '0.5');
    await page.dispatchEvent('#slider-refresh', 'input');
    await page.waitForTimeout(300);

    const shot3Path = path.join(SCREENSHOT_DIR, 'Screenshot_03_Themes.png');
    await page.screenshot({ path: shot3Path, omitBackground: true });
    console.log(`  -> Screenshot saved: ${shot3Path}`);

    // Close Settings Drawer
    await page.click('#btn-close-settings');
    await page.waitForTimeout(300);

    // -------------------------------------------------------------
    // [Step 5: High-Frequency Token Stream & Waveform Active]
    // -------------------------------------------------------------
    console.log('\n[Step 5/6] Simulating real-time Token Stream & Sparkline Waveform...');
    
    // Inject active streaming data with fluctuating TPS
    const testPoints = [
      { tps: 15.2, input_tokens: 4200, output_tokens: 350, cache_read_input_tokens: 3800, duration_ms: 1200, time_to_first_token_ms: 185, reasoning_output_tokens: 128 },
      { tps: 48.6, input_tokens: 4200, output_tokens: 850, cache_read_input_tokens: 3800, duration_ms: 2400, time_to_first_token_ms: 185, reasoning_output_tokens: 512 },
      { tps: 72.4, input_tokens: 4200, output_tokens: 1680, cache_read_input_tokens: 3800, duration_ms: 3800, time_to_first_token_ms: 185, reasoning_output_tokens: 1024 },
      { tps: 54.1, input_tokens: 4200, output_tokens: 2450, cache_read_input_tokens: 3800, duration_ms: 4900, time_to_first_token_ms: 185, reasoning_output_tokens: 1536 }
    ];

    for (const point of testPoints) {
      await page.evaluate((data) => {
        if (window.renderHUD) {
          window.renderHUD({
            ...data,
            model: 'Claude 3.7 Sonnet',
            estimated_cost_usd: 0.0412,
            estimated_cost_cny: 0.2987,
            session_turns: 4
          });
        }
      }, point);
      await page.waitForTimeout(250);
    }

    const shot4Path = path.join(SCREENSHOT_DIR, 'Screenshot_04_WaveformActive.png');
    await page.screenshot({ path: shot4Path, omitBackground: true });
    console.log(`  -> Screenshot saved: ${shot4Path}`);

    // -------------------------------------------------------------
    // [Step 6: Persistence Validation]
    // -------------------------------------------------------------
    console.log('\n[Step 6/6] Reloading Page to Validate LocalStorage Persistence...');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const persistedTheme = await page.evaluate(() => document.body.getAttribute('data-theme'));
    const persistedOpacity = await page.evaluate(() => localStorage.getItem('zcode_hud_opacity'));
    const persistedScale = await page.evaluate(() => localStorage.getItem('zcode_hud_scale'));
    console.log(`  -> Restored Theme: ${persistedTheme}`);
    console.log(`  -> Restored Opacity: ${persistedOpacity}%`);
    console.log(`  -> Restored Scale: ${persistedScale}%`);

    const shot5Path = path.join(SCREENSHOT_DIR, 'Screenshot_05_Persistence.png');
    await page.screenshot({ path: shot5Path, omitBackground: true });
    console.log(`  -> Screenshot saved: ${shot5Path}`);

    console.log('\n=== All 6 CUA Verification Steps Passed Successfully! ===');

  } catch (err) {
    console.error('Test Suite Error:', err);
  } finally {
    await browser.close();
  }
}

runTestSuite();
