import type { UniverseStarType } from '@/components/maps/universe/types';

export type CelestialNodeFamily =
  | 'community_signal'
  | 'constellation_cluster'
  | 'impact_outcome'
  | 'memetic_artifact';

export interface CelestialNodeArchetype {
  family: CelestialNodeFamily;
  label: string;
  material: string;
  motion: string;
  defaultStarType: UniverseStarType;
  color: string;
}

export const CELESTIAL_NODE_ARCHETYPES: Record<CelestialNodeFamily, CelestialNodeArchetype> = {
  community_signal: {
    family: 'community_signal',
    label: 'Community signal',
    material: 'glass pulse',
    motion: 'slow drift',
    defaultStarType: 'community',
    color: '#f6d4cb',
  },
  constellation_cluster: {
    family: 'constellation_cluster',
    label: 'Constellation cluster',
    material: 'etched lattice',
    motion: 'orbital trace',
    defaultStarType: 'community',
    color: '#f6d4cb',
  },
  impact_outcome: {
    family: 'impact_outcome',
    label: 'Impact outcome',
    material: 'lifted filament',
    motion: 'ascending thread',
    defaultStarType: 'action',
    color: '#f6d4cb',
  },
  memetic_artifact: {
    family: 'memetic_artifact',
    label: 'Memetic artifact',
    material: 'crafted relic',
    motion: 'forking bloom',
    defaultStarType: 'marketplace',
    color: '#f6d4cb',
  },
};

export function getCelestialArchetype(family: CelestialNodeFamily): CelestialNodeArchetype {
  return CELESTIAL_NODE_ARCHETYPES[family];
}

