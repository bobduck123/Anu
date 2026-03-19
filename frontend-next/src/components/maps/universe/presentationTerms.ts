import type { UniverseAnchorMode, UniverseStarType } from './types';

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

const universeStarTypeLabels: Record<UniverseStarType, string> = {
  action: 'Action',
  community: 'Community',
  donor: 'Donor',
  education: 'Education',
  event: 'Event',
  marketplace: 'Marketplace',
  relief: 'Relief',
};

const universeAnchorModeLabels: Record<UniverseAnchorMode, string> = {
  authored: 'Authored anchor',
  derived: 'Derived anchor',
  hybrid: 'Hybrid anchor',
};

export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function labelUniverseStarType(type: UniverseStarType): string {
  return universeStarTypeLabels[type];
}

export function labelUniverseAnchorMode(mode: UniverseAnchorMode): string {
  return universeAnchorModeLabels[mode];
}

export function starIndexLabel(): string {
  return `${universePresentationTerms.star} index`;
}

export function universeIndexLabel(): string {
  return `${universePresentationTerms.universe} index`;
}

export function searchStarsLabel(suffix = 'aliases, tags...'): string {
  return `Search ${universePresentationTerms.stars.toLowerCase()}, ${suffix}`;
}
