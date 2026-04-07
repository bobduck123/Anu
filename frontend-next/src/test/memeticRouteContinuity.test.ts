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
  it('keeps /flora-fauna on the celestial memetic surface contract', () => {
    expectMemeticCelestialSurface('/flora-fauna');
  });

  it('keeps meme detail routes on the same memetic celestial contract', () => {
    expectMemeticCelestialSurface('/flora-fauna/memes/meme-123');
  });

  it('keeps channel detail routes on the same memetic celestial contract', () => {
    expectMemeticCelestialSurface('/flora-fauna/channels/channel-42');
  });
});
