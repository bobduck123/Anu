/**
 * Data adapter layer — abstracts mock vs real API for each feature.
 *
 * Every adapter implements a common pattern:
 *   { useMock: boolean, mock: MockImpl, real: RealImpl }
 *
 * Components import the adapter and call methods without caring about source.
 */

export interface DataAdapter<T> {
  getAll(params?: Record<string, unknown>): Promise<T[]>;
  getById(id: string | number): Promise<T | null>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Seed-based deterministic random for reproducible mock data */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}
