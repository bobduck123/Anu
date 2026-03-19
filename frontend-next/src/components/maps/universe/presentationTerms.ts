export const universePresentationTerms = {
  platformName: 'Manara',
  universe: 'Universe',
  domain: 'Domain',
  star: 'Star',
  stars: 'Stars',
  constellation: 'Constellation',
  constellations: 'Constellations',
  explainer: 'Explainer',
  evidence: 'Evidence',
  freshness: 'Freshness',
  sourceDensity: 'Source density',
  placement: 'Placement',
  atlasAdminSandbox: 'Atlas / Admin Sandbox',
  universePacket: 'universe packet',
  readOnlyPacket: 'read-only universe packet',
  educationUniverse: 'Manara Learning Universe',
  communityUniverse: 'Manara Community Universe',
  globalUniverse: 'Manara Shared Universe',
} as const;

export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
