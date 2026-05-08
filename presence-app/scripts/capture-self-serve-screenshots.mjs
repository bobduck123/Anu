import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = process.env.PRESENCE_QA_BASE || 'http://localhost:3001';
const OUT = process.env.PRESENCE_QA_OUT || 'C:/Dev/Flora_fauna/docs/presence/screenshots/self-serve-onboarding-pass';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Public surfaces (no auth required) — these prove the new copy and CTAs.
const targets = [
  { path: '/',                  name: '01-landing',         steps: 0 },
  { path: '/auth/sign-up',      name: '02-signup-public',   steps: 0 },
  { path: '/auth/verify-email', name: '03-verify-email',    steps: 0 },
  { path: '/onboarding',        name: '04-onboarding-step1',steps: 0 },
  // Walk through the wizard by clicking Continue. Each click advances one step.
  { path: '/onboarding',        name: '05-onboarding-step2',steps: 1 },
  { path: '/onboarding',        name: '06-onboarding-step3',steps: 2 },
  { path: '/onboarding',        name: '07-onboarding-step4',steps: 3 },
  { path: '/onboarding',        name: '08-onboarding-step5',steps: 4 },
  { path: '/onboarding',        name: '09-onboarding-step6',steps: 5 },
  { path: '/onboarding',        name: '10-onboarding-step7',steps: 6 },
  { path: '/studio',            name: '11-studio-no-node',  steps: 0 },
  { path: '/beta/onboarding',   name: '12-legacy-redirect', steps: 0 },
];

async function captureWizardSequence(browser, target, viewport, suffix) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.error(`page error on ${target.path}: ${err.message}`));
  try {
    await page.goto(`${BASE}${target.path}`, { waitUntil: 'networkidle', timeout: 60000 });
  } catch {}
  await page.waitForTimeout(2500);

  // For wizard steps, we have to fill required fields on step 1 and step 6
  // before clicking Continue, otherwise the form blocks navigation. Onboarding
  // route requires a Supabase session — without one it shows the auth gate,
  // which is itself a useful screenshot. So just capture whatever renders.
  for (let i = 0; i < target.steps; i++) {
    // Try to advance — if a Continue button is visible, click it.
    const continueBtn = page.locator('button:has-text("Continue")').first();
    if (await continueBtn.count()) {
      try {
        await continueBtn.click({ timeout: 1500 });
      } catch {}
    }
    await page.waitForTimeout(400);
  }

  const file = path.join(OUT, `${target.name}-${suffix}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`ok ${file}`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const t of targets) {
    try {
      await captureWizardSequence(browser, t, { width: 1440, height: 900 }, 'desktop');
      await captureWizardSequence(browser, t, { width: 390, height: 844 }, 'mobile');
    } catch (e) {
      console.error(`x ${t.name}: ${e.message}`);
    }
  }
  await browser.close();
})();
