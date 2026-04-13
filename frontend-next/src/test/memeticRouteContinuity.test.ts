import { describe, expect, it } from 'vitest';
import { getRealmSurface } from '@/ui-system/realms/realmRegistry';

function expectMemeticCelestialSurface(pathname: string) {
  const surface = getRealmSurface(pathname);
  expect(surface.realm).toBe('celestial');
  expect(surface.strength).toBe('strong');
  expect(surface.surfaceKind).toBe('starfield');
  expect(surface.environmentTitle).toBe('Memetic artifact mesh');
  expect(surface.entryPattern).toBe('carving');
  expect(surface.fallbackMode).toBe('two-dimensional');
  expect(surface.supportsRealmTransition).toBe(true);
}

describe('C3 memetic route continuity', () => {
  it('keeps /anu on the celestial memetic surface contract', () => {
    expectMemeticCelestialSurface('/anu');
  });

  it('keeps anu pool detail routes on the same memetic celestial contract', () => {
    expectMemeticCelestialSurface('/anu/pools/pool-123');
  });

  it('keeps anu channel detail routes on the same memetic celestial contract', () => {
    expectMemeticCelestialSurface('/anu/channels/channel-42');
  });
});
