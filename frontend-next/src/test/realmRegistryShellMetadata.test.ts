import { describe, expect, it } from 'vitest';
import { getRealmSurface, REALM_ROUTE_REGISTRY } from '@/ui-system/realms/realmRegistry';

describe('M3 realm registry shell wiring', () => {
  it('maps /lab to internal neutral surface', () => {
    const surface = getRealmSurface('/lab');
    expect(surface.realm).toBe('neutral');
    expect(surface.surfaceKind).toBe('internal');
    expect(surface.environmentTitle).toMatch(/Internal lab/i);
  });

  it('maps private chamber routes to internal chamber surface', () => {
    const surface = getRealmSurface('/profile');
    expect(surface.realm).toBe('neutral');
    expect(surface.surfaceKind).toBe('internal');
    expect(surface.environmentTitle).toMatch(/Private chamber network/i);
  });

  it('publishes route registry entries for shell metadata consumers', () => {
    expect(REALM_ROUTE_REGISTRY.length).toBeGreaterThanOrEqual(7);
    expect(REALM_ROUTE_REGISTRY.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(['internal-lab', 'private-chambers', 'labyrinth-passage', 'earth-field', 'celestial-weave'])
    );
  });
});
