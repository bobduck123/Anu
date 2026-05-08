import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = process.env.PRESENCE_QA_BASE || 'http://localhost:3001';
const OUT = process.env.PRESENCE_QA_OUT || 'C:/Dev/Flora_fauna/docs/presence/screenshots/beta-to-launch-v1-pass';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const targets = [
  { path: '/',                  name: 'landing' },
  { path: '/beta',              name: 'beta' },
  { path: '/beta/onboarding',   name: 'onboarding' },
  { path: '/gallery',           name: 'gallery' },
  { path: '/plans',             name: 'plans' },
  { path: '/auth/sign-up',      name: 'signup' },
  { path: '/auth/verify-email', name: 'verify' },
  { path: '/auth/sign-in',      name: 'signin' },
  { path: '/studio',            name: 'studio-list' },
];

async function capture(browser, target, viewport, suffix) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.error(`page error on ${target.path}: ${err.message}`));
  try {
    await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    console.error(`x ${target.name}-${suffix}: navigation timeout`);
  }
  await page.waitForTimeout(2500);
  const file = path.join(OUT, `${target.name}-${suffix}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`ok ${file}`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const t of targets) {
    try {
      await capture(browser, t, { width: 1440, height: 900 }, 'desktop');
      await capture(browser, t, { width: 390, height: 844 },  'mobile');
    } catch (e) {
      console.error(`x ${t.name}: ${e.message}`);
    }
  }
  await browser.close();
})();
