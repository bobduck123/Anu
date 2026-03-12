export const MANARA_BASE_PATH = '/manara';
export const LEGACY_MANARA_BASE_PATH = '/flora-fauna';

export const brand = {
  name: 'Manara',
  legacyName: 'Flora Fauna',
  longName: 'Manara Civic Commons',
  homepageTitle: 'Manara | Beacon Civic Commons',
  description:
    'Beacon infrastructure for mutual aid, impact pools, and community governance.',
  keywords: [
    'manara',
    'beacon',
    'civic commons',
    'mutual aid',
    'community governance',
    'impact pools',
    'blak australia',
  ],
  tagline: 'Beacon infrastructure for mutual aid, stewardship, and community governance.',
  beaconLine:
    'Manara, from the Arabic for beacon, holds mutual aid in warm light: grounded in Blak Australia thematics, accountable stewardship, and local sovereignty.',
  footerLine:
    'Grounded in mutual aid, local stewardship, and beacon-light accountability.',
  memeticsTitle: 'Manara Signals',
  memeticsSubtitle: 'Free cultural matter. Auditable mutual-aid liquidity.',
  memeticsErrorRecordLabel: 'Manara record',
  wishlistHostLabel: 'Hosted by Manara',
  privacyLine:
    'Manara is built for high-trust civic coordination, with minimal public profile exposure.',
  dumbDumbSupportLine:
    'Creator tools use your existing Manara account and node pools.',
};

export function manaraPath(path = ''): string {
  if (!path) {
    return MANARA_BASE_PATH;
  }

  return `${MANARA_BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
