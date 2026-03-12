/**
 * Met Museum Collection API client.
 * Throttled, cached, with abort controller support.
 */

export interface Artwork {
  objectID: number;
  primaryImage: string;
  title: string;
  artistDisplayName: string;
  objectDate: string;
  medium: string;
  department: string;
  objectURL: string;
}

const BASE_URL = 'https://collectionapi.metmuseum.org/public/collection/v1';
const THROTTLE_MS = 500;
let lastRequestTime = 0;

async function throttledFetch(url: string, signal?: AbortSignal): Promise<Response> {
  const now = Date.now();
  const waitTime = Math.max(0, THROTTLE_MS - (now - lastRequestTime));
  if (waitTime > 0) {
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
  return fetch(url, { signal });
}

function getCacheKey(key: string): string {
  return `met-museum-${key}`;
}

function getFromCache<T>(key: string): T | null {
  try {
    const cached = sessionStorage.getItem(getCacheKey(key));
    if (cached) return JSON.parse(cached);
  } catch { /* ignore */ }
  return null;
}

function setCache<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(getCacheKey(key), JSON.stringify(data));
  } catch { /* ignore - storage full */ }
}

/** Search artworks by year range, returns object IDs */
export async function searchArtworksByYear(
  yearStart: number,
  yearEnd: number,
  signal?: AbortSignal,
): Promise<number[]> {
  const cacheKey = `search-${yearStart}-${yearEnd}`;
  const cached = getFromCache<number[]>(cacheKey);
  if (cached) return cached;

  const query = `dateBegin=${yearStart}&dateEnd=${yearEnd}&hasImages=true&q=*`;
  const res = await throttledFetch(`${BASE_URL}/search?${query}`, signal);
  if (!res.ok) throw new Error(`Met API search failed: ${res.status}`);

  const data = await res.json();
  const ids = (data.objectIDs || []) as number[];
  setCache(cacheKey, ids);
  return ids;
}

/** Fetch artwork details by ID */
export async function getArtworkById(
  objectId: number,
  signal?: AbortSignal,
): Promise<Artwork | null> {
  const cacheKey = `object-${objectId}`;
  const cached = getFromCache<Artwork>(cacheKey);
  if (cached) return cached;

  try {
    const res = await throttledFetch(`${BASE_URL}/objects/${objectId}`, signal);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.primaryImage) return null;

    const artwork: Artwork = {
      objectID: data.objectID,
      primaryImage: data.primaryImage,
      title: data.title || 'Untitled',
      artistDisplayName: data.artistDisplayName || 'Unknown Artist',
      objectDate: data.objectDate || '',
      medium: data.medium || '',
      department: data.department || '',
      objectURL: data.objectURL || '',
    };
    setCache(cacheKey, artwork);
    return artwork;
  } catch {
    return null;
  }
}

/** Fetch a random sample of artworks for a year range */
export async function fetchArtworksForRange(
  yearStart: number,
  yearEnd: number,
  count: number = 6,
  signal?: AbortSignal,
): Promise<Artwork[]> {
  const ids = await searchArtworksByYear(yearStart, yearEnd, signal);
  if (ids.length === 0) return [];

  // Pick random sample from first 100 results
  const pool = ids.slice(0, 100);
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, count * 2);

  const results: Artwork[] = [];
  for (const id of shuffled) {
    if (signal?.aborted) break;
    if (results.length >= count) break;
    const artwork = await getArtworkById(id, signal);
    if (artwork) results.push(artwork);
  }

  return results;
}
