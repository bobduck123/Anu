import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = process.env.PRESENCE_QA_BASE || 'http://localhost:3001';
const OUT = process.env.PRESENCE_QA_OUT || 'C:/Dev/Flora_fauna/docs/presence/screenshots/v1-1-gallery-draft-template-pass';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const targets = [
  // Public surfaces, including the new gallery list state.
  { path: '/',                                                  name: 'landing' },
  { path: '/beta',                                              name: 'beta' },
  { path: '/beta/onboarding',                                   name: 'onboarding-gated' },
  { path: '/gallery',                                           name: 'gallery-list' },
  { path: '/gallery?filter=studio_practice',                    name: 'gallery-filtered' },
  { path: '/plans',                                             name: 'plans' },
  // The three distinctive template upgrades, on real demo slugs
  { path: '/p/studio-anika-wells',                              name: 'tpl-studio-practice' },
  { path: '/p/mina-river-practitioner',                         name: 'tpl-practitioner' },
  { path: '/p/waratah-room',                                    name: 'tpl-venue-noticeboard' },
  // Studio auth-gate state: honest, no fake data.
  { path: '/studio',                                            name: 'studio-list' },
];

async function capture(browser, target, viewport, suffix) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.error(`page error on ${target.path}: ${err.message}`));
  try {
    await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle', timeout: 60000 });
  } catch {
    /* swallow timeout, capture whatever we have */
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
      await capture(browser, t, { width: 390,  height: 844 }, 'mobile');
    } catch (e) {
      console.error(`x ${t.name}: ${e.message}`);
    }
  }
  await browser.close();
})();
