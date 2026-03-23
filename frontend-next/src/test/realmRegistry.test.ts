import { describe, expect, it } from 'vitest';
import { getRealmSurface } from '@/ui-system/realms/realmRegistry';

describe('realm registry', () => {
  it('maps model registry to a strong labyrinth archive surface', () => {
    const surface = getRealmSurface('/governance/model-registry');

    expect(surface.realm).toBe('labyrinth');
    expect(surface.strength).toBe('strong');
    expect(surface.surfaceKind).toBe('archive');
    expect(surface.environmentTitle).toBe('Archive passage');
  });

  it('maps actions to a strong earth field surface', () => {
    const surface = getRealmSurface('/actions');

    expect(surface.realm).toBe('earth');
    expect(surface.strength).toBe('strong');
    expect(surface.surfaceKind).toBe('field');
    expect(surface.environmentTitle).toBe('Grounded field');
  });

  it('maps impact to the earth bridge posture', () => {
    const surface = getRealmSurface('/impact');

    expect(surface.realm).toBe('earth');
    expect(surface.entryPattern).toBe('bridge');
    expect(surface.environmentTitle).toBe('Grounded ascent');
  });

  it('keeps relief on the grounded earth family', () => {
    const surface = getRealmSurface('/relief');

    expect(surface.realm).toBe('earth');
    expect(surface.surfaceKind).toBe('field');
    expect(surface.fallbackMode).toBe('utility');
  });

  it('maps community to a strong celestial route with support chrome hidden', () => {
    const surface = getRealmSurface('/community');

    expect(surface.realm).toBe('celestial');
    expect(surface.strength).toBe('strong');
    expect(surface.surfaceKind).toBe('starfield');
    expect(surface.hideSupportChrome).toBe(true);
    expect(surface.fallbackMode).toBe('two-dimensional');
    expect(surface.immersiveCanvas).toBe(true);
  });

  it('keeps the universe on its separate immersive track', () => {
    const surface = getRealmSurface('/universe');

    expect(surface.realm).toBe('neutral');
    expect(surface.surfaceKind).toBe('universe');
    expect(surface.hideSupportChrome).toBe(true);
    expect(surface.immersiveCanvas).toBe(true);
  });

  it('returns a neutral default for unrelated routes', () => {
    const surface = getRealmSurface('/home');

    expect(surface.realm).toBe('neutral');
    expect(surface.strength).toBe('none');
    expect(surface.environmentTitle).toBe('Shared commons');
  });
});
