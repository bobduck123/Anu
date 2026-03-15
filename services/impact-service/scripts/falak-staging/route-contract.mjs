import {
  assert,
  assertSafeHostedStagingTarget,
  loadFalakStagingEnv,
  normalizeBaseUrl,
  requestAt,
  stageInfo,
  stagePass
} from './common.mjs';

function readMode(name, fallback, allowed) {
  const value = (process.env[name] ?? fallback).trim().toLowerCase();
  if (!allowed.includes(value)) {
    throw new Error(`${name} must be one of: ${allowed.join(', ')}`);
  }

  return value;
}

function headerValue(response, name) {
  return response.headers.get(name) ?? '';
}

function hasJsonPayload(response) {
  return response.contentType.includes('application/json') || response.json !== null;
}

function assertJsonResponse(response, context) {
  assert(hasJsonPayload(response), `${context} did not return a JSON payload.`);
}

function assertHtmlResponse(response, context) {
  const looksHtml =
    response.contentType.includes('text/html') ||
    response.text.includes('<!DOCTYPE html') ||
    response.text.includes('<html');
  assert(looksHtml, `${context} did not return an HTML document.`);
}

function isExpressHtml404(response) {
  return (
    response.status === 404 &&
    headerValue(response, 'x-powered-by').toLowerCase() === 'express' &&
    response.text.includes('Cannot GET /v1/education/maps')
  );
}

async function fetchRoute(baseUrl, routePath, options = {}) {
  return requestAt(baseUrl, 'GET', routePath, {
    headers: options.headers ?? {}
  });
}

async function verifyDirectStagingRoutes(baseUrl) {
  const health = await fetchRoute(baseUrl, '/health');
  assert(health.status === 200, `Direct staging /health returned ${health.status}.`);
  assertJsonResponse(health, 'Direct staging /health');
  assert(health.json?.service === 'impact-service', 'Direct staging /health did not identify the impact service.');
  stagePass('Stage D.1', 'Direct staging /health resolves through the deployed impact service');

  const falakHealth = await fetchRoute(baseUrl, '/v1/falak/health');
  assert(falakHealth.status === 200, `Direct staging /v1/falak/health returned ${falakHealth.status}.`);
  assertJsonResponse(falakHealth, 'Direct staging /v1/falak/health');
  assert(falakHealth.json?.protocol === 'Falak Protocol', 'Direct staging Falak health did not identify the Falak protocol.');
  stagePass('Stage D.2', 'Direct staging /v1/falak/health resolves through Falak');

  const maps = await fetchRoute(baseUrl, '/v1/education/maps');
  assert([200, 400, 401, 403, 404].includes(maps.status), `Direct staging /v1/education/maps returned unexpected status ${maps.status}.`);
  assertJsonResponse(maps, 'Direct staging /v1/education/maps');
  assert(!isExpressHtml404(maps), 'Direct staging /v1/education/maps fell through to an Express HTML 404.');
  stagePass('Stage D.3', 'Direct staging /v1/education/maps is owned by the Falak route family');
}

async function verifyFrontendProxy(baseUrl, options) {
  const mapRouteMode = readMode(options.mapRouteModeEnv, options.defaultMapRouteMode, ['legacy', 'falak']);
  const feedMode = readMode(options.feedModeEnv, options.defaultFeedMode, ['placeholder', 'real']);
  const mapsHeaders = {};
  const tenantId = (process.env[options.tenantEnv] ?? '').trim();
  if (tenantId) {
    mapsHeaders['x-tenant-id'] = tenantId;
  }

  const page = await fetchRoute(baseUrl, '/manara');
  assert(page.status === 200, `${options.label} /manara returned ${page.status}.`);
  assertHtmlResponse(page, `${options.label} /manara`);
  stagePass(options.stageLabels.manara, `${options.label} /manara resolves from the frontend host`);

  const impactHealth = await fetchRoute(baseUrl, '/_impact/health');
  assert(impactHealth.status === 200, `${options.label} /_impact/health returned ${impactHealth.status}.`);
  assertJsonResponse(impactHealth, `${options.label} /_impact/health`);
  assert(impactHealth.json?.service === 'impact-service', `${options.label} /_impact/health did not identify the impact service.`);
  stagePass(options.stageLabels.impactHealth, `${options.label} /_impact/health rewrites correctly`);

  const feed = await fetchRoute(baseUrl, '/_impact/api/manara/feed');
  assert(feed.status === 200, `${options.label} /_impact/api/manara/feed returned ${feed.status}.`);
  assertJsonResponse(feed, `${options.label} /_impact/api/manara/feed`);
  assert(Array.isArray(feed.json?.feed), `${options.label} /_impact/api/manara/feed did not return a feed array.`);
  if (feedMode === 'placeholder') {
    assert(feed.json?.placeholder === true, `${options.label} Manara feed is no longer marked placeholder, but the contract still expects placeholder mode.`);
  } else {
    assert(feed.json?.placeholder !== true, `${options.label} Manara feed is still marked placeholder.`);
  }
  stagePass(options.stageLabels.feed, `${options.label} /_impact/api/manara/feed matches the declared feed mode (${feedMode})`);

  const maps = await fetchRoute(baseUrl, '/_impact/v1/education/maps', {
    headers: mapsHeaders
  });
  if (mapRouteMode === 'legacy') {
    assert(isExpressHtml404(maps), `${options.label} maps route no longer matches the declared legacy proxy contract.`);
  } else {
    assert([200, 400, 401, 403, 404].includes(maps.status), `${options.label} maps route returned unexpected status ${maps.status}.`);
    assertJsonResponse(maps, `${options.label} /_impact/v1/education/maps`);
    assert(!isExpressHtml404(maps), `${options.label} maps route is still falling through to an Express HTML 404.`);
  }
  stagePass(options.stageLabels.maps, `${options.label} /_impact/v1/education/maps matches the declared route mode (${mapRouteMode})`);

  const coreHealth = await fetchRoute(baseUrl, '/_core/health');
  assert(coreHealth.status === 200, `${options.label} /_core/health returned ${coreHealth.status}.`);
  assertJsonResponse(coreHealth, `${options.label} /_core/health`);
  assert(typeof coreHealth.json?.db === 'boolean', `${options.label} /_core/health did not include the expected db status.`);
  stagePass(options.stageLabels.coreHealth, `${options.label} /_core/health rewrites correctly`);

  const snapshot = await fetchRoute(baseUrl, '/_core/api/public/worlds/sydney-alpha/snapshot');
  assert([200, 404].includes(snapshot.status), `${options.label} world snapshot route returned unexpected status ${snapshot.status}.`);
  assertJsonResponse(snapshot, `${options.label} world snapshot route`);
  stagePass(options.stageLabels.snapshot, `${options.label} world snapshot route is reachable (${snapshot.status})`);

  const membershipPlans = await fetchRoute(baseUrl, '/_core/api/memberships/plans');
  assert(membershipPlans.status === 200, `${options.label} memberships plans route returned ${membershipPlans.status}.`);
  assertJsonResponse(membershipPlans, `${options.label} memberships plans route`);
  const plansPayload = Array.isArray(membershipPlans.json) ? membershipPlans.json : membershipPlans.json?.data;
  assert(Array.isArray(plansPayload), `${options.label} memberships plans route did not return an array payload.`);
  stagePass(options.stageLabels.memberships, `${options.label} memberships plans route is reachable`);
}

loadFalakStagingEnv();
assertSafeHostedStagingTarget('Falak route contract');

const stagingBaseUrl = normalizeBaseUrl('STAGING_BASE_URL');
const productionBaseUrl = normalizeBaseUrl('PRODUCTION_BASE_URL');
const stagingFrontendBaseUrl = normalizeBaseUrl('STAGING_FRONTEND_BASE_URL');

assert(stagingBaseUrl, 'STAGING_BASE_URL is required for route contract verification.');
assert(productionBaseUrl, 'PRODUCTION_BASE_URL is required for route contract verification.');

await verifyDirectStagingRoutes(stagingBaseUrl);

if (stagingFrontendBaseUrl) {
  await verifyFrontendProxy(stagingFrontendBaseUrl, {
    label: 'Staging frontend proxy',
    mapRouteModeEnv: 'STAGING_PROXY_MAP_ROUTE_MODE',
    defaultMapRouteMode: 'falak',
    feedModeEnv: 'STAGING_MANARA_FEED_MODE',
    defaultFeedMode: 'placeholder',
    tenantEnv: 'STAGING_FALAK_TENANT_ID',
    stageLabels: {
      manara: 'Stage D.4a',
      impactHealth: 'Stage D.4b',
      feed: 'Stage D.4c',
      maps: 'Stage D.4d',
      coreHealth: 'Stage D.4e',
      snapshot: 'Stage D.4f',
      memberships: 'Stage D.4g'
    }
  });
} else {
  stageInfo('Stage D.4', 'Skipping staging frontend proxy checks because STAGING_FRONTEND_BASE_URL is not set');
}

await verifyFrontendProxy(productionBaseUrl, {
  label: 'Production frontend proxy',
  mapRouteModeEnv: 'PRODUCTION_PROXY_MAP_ROUTE_MODE',
  defaultMapRouteMode: 'legacy',
  feedModeEnv: 'PRODUCTION_MANARA_FEED_MODE',
  defaultFeedMode: 'placeholder',
  tenantEnv: 'PRODUCTION_FALAK_TENANT_ID',
  stageLabels: {
    manara: 'Stage E.1',
    impactHealth: 'Stage E.2',
    feed: 'Stage E.3',
    maps: 'Stage E.4',
    coreHealth: 'Stage E.5',
    snapshot: 'Stage E.6',
    memberships: 'Stage E.7'
  }
});
