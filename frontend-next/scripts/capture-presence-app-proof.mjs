import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.PRESENCE_APP_QA_BASE || 'http://127.0.0.1:3000';
const OUT = process.env.PRESENCE_APP_QA_OUT || 'C:/Dev/Flora_fauna/docs/presence/screenshots/app-proof-pass';

fs.mkdirSync(OUT, { recursive: true });

const node = {
  id: 42,
  slug: 'river-practitioner',
  public_url: 'http://127.0.0.1:3000/p/river-practitioner',
  display_name: 'River Stone',
  headline: 'Trauma-informed practitioner',
  bio: 'A grounded practice for people moving through grief, transition, and nervous-system repair.',
  node_type: 'practitioner',
  display_mode: 'practitioner_profile',
  plan_type: 'premium',
  status: 'published',
  visibility: 'public',
  visual_mood: 'calm, grounded, human',
  profile_image_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
  cover_image_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
  practice_statement: '<p>Practice statement for care work.</p>',
  curatorial_statement: '<p>Curatorial statement for public presence.</p>',
  landing_enabled: false,
  links: [
    { id: 1, node_id: 42, label: 'Instagram', url: 'https://example.com/river', link_type: 'social', sort_order: 0, is_visible: true },
  ],
  services: [
    { id: 1, node_id: 42, title: 'One-to-one session', description: 'Personal guidance.', sort_order: 0, is_visible: true },
  ],
  collections: [],
  works: [],
};

const collections = [
  {
    id: 7,
    node_id: 42,
    title: 'Selected Works',
    description: 'A small collection.',
    cover_image_url: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742',
    sort_order: 0,
    is_visible: true,
  },
];

const works = [
  {
    id: 11,
    node_id: 42,
    collection_id: 7,
    slug: 'mural-study',
    title: 'Mural Study',
    year: '2026',
    medium: 'Acrylic',
    dimensions: '18m wall',
    description: 'A public work prepared for community gathering.',
    image_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    thumbnail_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    sort_order: 0,
    is_visible: true,
    availability_status: 'available',
  },
  {
    id: 12,
    node_id: 42,
    collection_id: 7,
    slug: 'signal-work',
    title: 'Signal Work',
    year: '2025',
    medium: 'Textile',
    dimensions: '120 x 90 cm',
    description: 'A quieter proof object for the Presence.',
    image_url: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742',
    thumbnail_url: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742',
    sort_order: 1,
    is_visible: true,
    availability_status: 'private',
  },
  {
    id: 13,
    node_id: 42,
    collection_id: 7,
    slug: 'room-note',
    title: 'Room Note',
    year: '2024',
    medium: 'Installation',
    dimensions: 'Variable',
    description: 'An installation trace.',
    image_url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72',
    thumbnail_url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72',
    sort_order: 2,
    is_visible: true,
    availability_status: 'archived',
  },
];

const enquiries = [
  {
    id: 501,
    node_id: 42,
    enquiry_type: 'commission',
    name: 'Mina Vale',
    email: 'mina@example.test',
    phone: '+61 400 000 000',
    company: 'Community Rooms',
    message: 'Can we discuss a small public program?',
    preferred_contact_method: 'email',
    source_url: 'http://127.0.0.1:3000/p/river-practitioner',
    source_type: 'qr',
    status: 'new',
    created_at: '2026-05-07T09:00:00Z',
  },
];

const nfcTags = [
  {
    id: 90,
    node_id: 42,
    label: 'Studio wall card',
    tag_type: 'artwork_tag',
    source_code: 'studio-wall',
    destination_url: 'http://127.0.0.1:3000/p/river-practitioner?source=studio-wall',
    is_active: true,
    created_at: '2026-05-07T09:00:00Z',
  },
];

const analytics = {
  total_views: 37,
  total_enquiries: 3,
  quote_requests: 0,
  conversion_rate: 8.1,
  top_links: [{ label: 'Instagram', count: 5 }],
  top_sources: [{ label: 'studio-wall', count: 9 }],
  recent_events: [
    { id: 1, event_type: 'node_viewed', created_at: '2026-05-07T09:00:00Z', metadata: { source: 'studio-wall' } },
    { id: 2, event_type: 'enquiry_submitted', created_at: '2026-05-07T09:30:00Z', metadata: { type: 'commission' } },
  ],
};

const ok = (data) => ({ ok: true, data });

async function fulfillJson(route, data, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  });
}

async function installOwnerApiMocks(page, proof = {}) {
  await page.route('http://localhost:5000/api/presence/public/river-practitioner/qr', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256" role="img" aria-label="Presence QR proof">
        <rect width="256" height="256" fill="#fff"/>
        <path fill="#111" d="M16 16h64v64H16zM176 16h64v64h-64zM16 176h64v64H16z"/>
        <path fill="#fff" d="M30 30h36v36H30zM190 30h36v36h-36zM30 190h36v36H30z"/>
        <path fill="#111" d="M104 24h16v16h-16zM136 24h16v16h-16zM104 56h48v16h-48zM96 96h16v16H96zM128 96h32v16h-32zM184 96h16v16h-16zM216 96h16v16h-16zM96 128h48v16H96zM160 128h16v16h-16zM200 128h32v16h-32zM104 160h16v16h-16zM136 160h64v16h-64zM224 160h16v16h-16zM96 192h16v16H96zM128 192h16v16h-16zM160 192h32v16h-32zM208 192h32v16h-32zM96 224h48v16H96zM176 224h16v16h-16zM216 224h16v16h-16z"/>
      </svg>`,
    });
  });
  await page.route('http://localhost:5000/api/presence/public/river-practitioner/vcard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/vcard',
      body: 'BEGIN:VCARD\\nVERSION:3.0\\nFN:River Stone\\nTITLE:Trauma-informed practitioner\\nURL:http://127.0.0.1:3000/p/river-practitioner\\nEND:VCARD\\n',
    });
  });

  await page.route('http://localhost:5000/api/presence/owner/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();

    if (pathname === '/api/presence/owner/nodes' && method === 'GET') {
      return fulfillJson(route, ok([node]));
    }
    if (pathname === '/api/presence/owner/nodes/42' && method === 'GET') {
      return fulfillJson(route, ok({ ...node, works, collections, enquiries, analytics }));
    }
    if (pathname === '/api/presence/owner/nodes/42' && method === 'PATCH') {
      const payload = JSON.parse(request.postData() || '{}');
      proof.nodePatch = true;
      return fulfillJson(route, ok({ ...node, ...payload, works, collections, enquiries, analytics }));
    }
    if (pathname === '/api/presence/owner/nodes/42/works' && method === 'GET') {
      return fulfillJson(route, ok(works));
    }
    if (pathname === '/api/presence/owner/nodes/42/works' && method === 'POST') {
      const payload = JSON.parse(request.postData() || '{}');
      proof.workPost = true;
      return fulfillJson(route, ok({ ...works[0], id: 99, ...payload }), 201);
    }
    if (pathname === '/api/presence/owner/works/11' && method === 'PATCH') {
      const payload = JSON.parse(request.postData() || '{}');
      proof.workPatch = true;
      return fulfillJson(route, ok({ ...works[0], ...payload }));
    }
    if (pathname === '/api/presence/owner/nodes/42/collections' && method === 'GET') {
      return fulfillJson(route, ok(collections));
    }
    if (pathname === '/api/presence/owner/nodes/42/collections' && method === 'POST') {
      const payload = JSON.parse(request.postData() || '{}');
      proof.collectionPost = true;
      return fulfillJson(route, ok({ ...collections[0], id: 88, ...payload }), 201);
    }
    if (pathname === '/api/presence/owner/collections/7' && method === 'PATCH') {
      const payload = JSON.parse(request.postData() || '{}');
      proof.collectionPatch = true;
      return fulfillJson(route, ok({ ...collections[0], ...payload }));
    }
    if (pathname === '/api/presence/owner/nodes/42/enquiries' && method === 'GET') {
      return fulfillJson(route, ok(enquiries));
    }
    if (pathname === '/api/presence/owner/enquiries/501' && method === 'PATCH') {
      const payload = JSON.parse(request.postData() || '{}');
      proof.enquiryPatch = true;
      return fulfillJson(route, ok({ ...enquiries[0], ...payload }));
    }
    if (pathname === '/api/presence/owner/nodes/42/nfc-tags' && method === 'GET') {
      return fulfillJson(route, ok(nfcTags));
    }
    if (pathname === '/api/presence/owner/nodes/42/nfc-tags' && method === 'POST') {
      const payload = JSON.parse(request.postData() || '{}');
      proof.nfcPost = true;
      return fulfillJson(route, ok({ ...nfcTags[0], id: 91, ...payload }), 201);
    }
    if (pathname === '/api/presence/owner/nodes/42/analytics' && method === 'GET') {
      return fulfillJson(route, ok(analytics));
    }

    return fulfillJson(route, { ok: false, error: { code: 'not_mocked', message: pathname } }, 404);
  });
}

const mobileTargets = [
  ['app-dashboard-mobile.png', '/app/dashboard'],
  ['app-presence-mobile.png', '/app/presence'],
  ['app-portfolio-mobile.png', '/app/portfolio'],
  ['app-works-mobile.png', '/app/works'],
  ['app-collections-mobile.png', '/app/collections'],
  ['app-enquiries-mobile.png', '/app/enquiries'],
  ['app-qr-nfc-mobile.png', '/app/qr-nfc'],
  ['app-settings-mobile.png', '/app/settings'],
];

const desktopTargets = [
  ['app-dashboard-desktop.png', '/app/dashboard'],
  ['app-works-desktop.png', '/app/works'],
  ['app-qr-nfc-desktop.png', '/app/qr-nfc'],
];

async function capture(page, file, routePath) {
  await page.goto(`${BASE}${routePath}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => document.body.classList.contains('site-ready'), { timeout: 12000 });
  await page.waitForSelector('text=Presence Studio', { timeout: 12000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  console.log(`${file} ${routePath}`);
}

async function runInteractiveProof(browser) {
  const proof = {};
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await installOwnerApiMocks(page, proof);

  await page.goto(`${BASE}/app/presence`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('text=Public identity', { timeout: 12000 });
  await page.getByLabel('Headline').fill('Trauma-informed practitioner updated');
  await page.getByRole('button', { name: 'Save public identity' }).click();
  await page.waitForTimeout(350);

  await page.goto(`${BASE}/app/works`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('text=Proof objects for the public world', { timeout: 12000 });
  await page.getByRole('button', { name: 'Refine' }).first().click();
  await page.getByLabel('Work title').fill('Mural Study Revised');
  await page.getByRole('button', { name: 'Save work' }).click();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'Add selected work' }).click();
  await page.getByLabel('Work title').fill('Proof Flow Work');
  await page.getByRole('button', { name: 'Add work' }).click();
  await page.waitForTimeout(350);

  await page.goto(`${BASE}/app/collections`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('text=Rooms inside the public world', { timeout: 12000 });
  await page.getByRole('button', { name: 'Refine' }).first().click();
  await page.getByLabel('Collection title').fill('Selected Works Revised');
  await page.getByRole('button', { name: 'Save collection' }).click();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: 'New collection' }).click();
  await page.getByLabel('Collection title').fill('Proof Flow Collection');
  await page.getByRole('button', { name: 'Create collection' }).click();
  await page.waitForTimeout(350);

  await page.goto(`${BASE}/app/enquiries`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('text=Opportunity inbox', { timeout: 12000 });
  await page.locator('select').first().selectOption('replied');
  await page.waitForTimeout(350);

  await page.goto(`${BASE}/app/qr-nfc`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('text=Physical-world bridge', { timeout: 12000 });
  await page.getByLabel('Label').fill('Proof card');
  await page.getByLabel('Source code').fill('proof-card');
  await page.getByRole('button', { name: 'Create source tag' }).click();
  await page.waitForTimeout(350);

  await context.close();

  const expected = ['nodePatch', 'workPatch', 'workPost', 'collectionPatch', 'collectionPost', 'enquiryPatch', 'nfcPost'];
  const missing = expected.filter((key) => !proof[key]);
  if (missing.length > 0) {
    throw new Error(`Interactive proof did not hit: ${missing.join(', ')}`);
  }
  console.log(`interactive-proof ${expected.join(',')}`);
}

async function main() {
  const browser = await chromium.launch();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true });
  const mobilePage = await mobile.newPage();
  await installOwnerApiMocks(mobilePage);
  for (const [file, routePath] of mobileTargets) {
    await capture(mobilePage, file, routePath);
  }
  await mobile.close();

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const desktopPage = await desktop.newPage();
  await installOwnerApiMocks(desktopPage);
  for (const [file, routePath] of desktopTargets) {
    await capture(desktopPage, file, routePath);
  }
  await desktop.close();

  await runInteractiveProof(browser);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
