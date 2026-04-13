import { describe, expect, it } from 'vitest';
import { getMobileDockLinks } from '@/ui-system/layout/mobileDockModel';

describe('mobile dock model', () => {
  it('returns sandbox steward links for internal routes', () => {
    const links = getMobileDockLinks('/sandbox/ui-lab', true, true);

    expect(links.map((link) => link.href)).toEqual(['/home', '/lab', '/sandbox/maps', '/profile']);
  });

  it('returns trust links for transparency routes', () => {
    const links = getMobileDockLinks('/transparency', false, false);

    expect(links.map((link) => link.href)).toEqual(['/home', '/transparency', '/archive', '/auth']);
  });

  it('returns celestial links for constellation routes', () => {
    const links = getMobileDockLinks('/constellations', true, false);

    expect(links.map((link) => link.href)).toEqual(['/community', '/constellations', '/impact', '/profile']);
  });

  it('returns default commons links for general routes', () => {
    const links = getMobileDockLinks('/home', true, false);

    expect(links.map((link) => link.href)).toEqual(['/community', '/education', '/cost-lowering', '/profile']);
  });
});
