import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = process.env.PRESENCE_QA_BASE || 'http://localhost:3000';
const OUT = process.env.PRESENCE_QA_OUT || 'C:/Dev/Flora_fauna/docs/presence/screenshots/hard-template-pass';

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const targets = [
  { slug: 'lena-moss-portal',           name: 'minimal-portal',     scrollMobile: 0 },
  { slug: 'kira-stone-creative',        name: 'gallery-wall',       scrollMobile: 800 },
  { slug: 'editorial-yorke-collier',    name: 'editorial',          scrollMobile: 700 },
  { slug: 'studio-anika-wells',         name: 'studio-practice',    scrollMobile: 700 },
  { slug: 'mina-river-practitioner',    name: 'practitioner',       scrollMobile: 700 },
  { slug: 'waratah-room',               name: 'venue',              scrollMobile: 900 },
];

async function capture(browser, target, viewport, suffix, scroll = 0) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const url = `${BASE}/p/${target.slug}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  if (scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), scroll);
    await page.waitForTimeout(400);
  }
  const file = path.join(OUT, `${target.name}-${suffix}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`✓ ${file}`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const t of targets) {
    try {
      // Desktop hero (top)
      await capture(browser, t, { width: 1440, height: 900 }, 'desktop-hero');
      // Desktop scrolled content
      await capture(browser, t, { width: 1440, height: 900 }, 'desktop-content', 900);
      // Mobile hero
      await capture(browser, t, { width: 390, height: 844 }, 'mobile-hero');
      // Mobile scrolled
      await capture(browser, t, { width: 390, height: 844 }, 'mobile-content', t.scrollMobile);
    } catch (e) {
      console.error(`✗ ${t.slug}: ${e.message}`);
    }
  }
  await browser.close();
})();
