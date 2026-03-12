/**
 * Starfield data adapter for the Universe visualization.
 * Maps Flora Fauna entities (events, actions, community posts, etc.) to stars/constellations.
 */

import { seededRandom, pickRandom } from './types';

export interface Star {
  id: string;
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
  label: string;
  type: StarType;
  metadata: Record<string, unknown>;
  connections: string[];
}

export interface Constellation {
  id: string;
  name: string;
  starIds: string[];
  color: string;
  description: string;
}

export type StarType = 'event' | 'action' | 'community' | 'donor' | 'relief' | 'education' | 'marketplace';

export interface UniverseData {
  stars: Star[];
  constellations: Constellation[];
  filters: StarType[];
}

export interface UniverseFilters {
  types?: StarType[];
  search?: string;
  constellation?: string;
}

const STAR_COLORS: Record<StarType, string> = {
  event: '#667eea',
  action: '#48bb78',
  community: '#ed8936',
  donor: '#f6e05e',
  relief: '#fc8181',
  education: '#b794f4',
  marketplace: '#4fd1c5',
};

const NAMES = {
  event: ['Community Gathering', 'Harvest Festival', 'Town Hall', 'Workshop', 'Fundraiser', 'Clean-up Day', 'Music Night', 'Art Show'],
  action: ['Tree Planting', 'Beach Cleanup', 'Food Drive', 'Tutoring', 'Elder Care', 'Park Restoration', 'Recycling Drive'],
  community: ['Local News', 'Recipe Share', 'Book Club', 'Garden Tips', 'Volunteer Call', 'Success Story', 'Debate'],
  donor: ['Foundation Grant', 'Corporate Gift', 'Individual Donor', 'Matching Fund', 'Legacy Gift'],
  relief: ['Housing Aid', 'Food Assistance', 'Medical Support', 'Utility Help', 'Emergency Fund'],
  education: ['Permaculture 101', 'Governance Basics', 'Financial Literacy', 'Digital Skills', 'Civic Engagement'],
  marketplace: ['Fresh Produce', 'Handmade Crafts', 'Local Services', 'Skill Exchange', 'Equipment Share'],
};

const CONSTELLATION_NAMES = [
  'Mutual Aid Network', 'Green Initiative', 'Education Hub',
  'Relief Coalition', 'Marketplace Circle', 'Civic Governance',
  'Youth Network', 'Elder Council', 'Arts Collective',
];

export function generateMockUniverse(starCount: number = 500, seed: number = 7): UniverseData {
  const rng = seededRandom(seed);
  const types = Object.keys(STAR_COLORS) as StarType[];
  const stars: Star[] = [];

  for (let i = 0; i < starCount; i++) {
    const type = pickRandom(types, rng);
    const names = NAMES[type];
    const star: Star = {
      id: `star-${i}`,
      x: (rng() - 0.5) * 200,
      y: (rng() - 0.5) * 200,
      z: (rng() - 0.5) * 200,
      size: 0.3 + rng() * 2.5,
      color: STAR_COLORS[type],
      label: `${pickRandom(names, rng)} #${i}`,
      type,
      metadata: {
        created: new Date(2026, Math.floor(rng() * 2), Math.floor(rng() * 28) + 1).toISOString(),
        participants: Math.floor(rng() * 100),
        impact: Math.round(rng() * 1000) / 10,
      },
      connections: [],
    };
    stars.push(star);
  }

  // Create constellations by grouping nearby stars
  const constellations: Constellation[] = [];
  const usedStars = new Set<string>();

  for (let c = 0; c < Math.min(CONSTELLATION_NAMES.length, Math.floor(starCount / 10)); c++) {
    const centerStar = stars[Math.floor(rng() * stars.length)];
    if (usedStars.has(centerStar.id)) continue;

    const nearby = stars
      .filter(s => !usedStars.has(s.id))
      .filter(s => {
        const dx = s.x - centerStar.x;
        const dy = s.y - centerStar.y;
        const dz = s.z - centerStar.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz) < 40;
      })
      .slice(0, 5 + Math.floor(rng() * 10));

    const starIds = nearby.map(s => s.id);
    starIds.forEach(id => usedStars.add(id));

    // Add connections between constellation stars
    for (let i = 0; i < starIds.length - 1; i++) {
      const star = stars.find(s => s.id === starIds[i])!;
      star.connections.push(starIds[i + 1]);
    }

    constellations.push({
      id: `constellation-${c}`,
      name: CONSTELLATION_NAMES[c],
      starIds,
      color: STAR_COLORS[pickRandom(types, rng)],
      description: `A network of ${starIds.length} connected entities in the Manara universe.`,
    });
  }

  return { stars, constellations, filters: types };
}

export function filterUniverse(data: UniverseData, filters: UniverseFilters): UniverseData {
  let filtered = data.stars;

  if (filters.types && filters.types.length > 0) {
    filtered = filtered.filter(s => filters.types!.includes(s.type));
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(s => s.label.toLowerCase().includes(q));
  }

  if (filters.constellation) {
    const c = data.constellations.find(c => c.id === filters.constellation);
    if (c) {
      const ids = new Set(c.starIds);
      filtered = filtered.filter(s => ids.has(s.id));
    }
  }

  return { ...data, stars: filtered };
}
