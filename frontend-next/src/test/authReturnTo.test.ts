import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildAuthHref,
  buildOrganizerOnRampHref,
  clearPendingReturnTo,
  readPendingReturnTo,
  resolvePostAuthReturnTo,
  sanitizeReturnTo,
  savePendingReturnTo,
} from '@/lib/auth/returnTo';

describe('auth returnTo helpers', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearPendingReturnTo();
  });

  it('accepts safe internal routes and rejects external routes', () => {
    expect(sanitizeReturnTo('/community?compose=1', '/profile')).toBe('/community?compose=1');
    expect(sanitizeReturnTo('https://malicious.example/steal', '/profile')).toBe('/profile');
  });

  it('never resolves auth route as return target', () => {
    expect(sanitizeReturnTo('/auth?returnTo=%2Fcommunity', '/profile')).toBe('/profile');
  });

  it('builds a stable auth href for valid internal routes', () => {
    expect(buildAuthHref('/runs/9')).toBe('/auth?returnTo=%2Fruns%2F9');
  });

  it('builds organizer on-ramp links with preserved next route', () => {
    expect(buildOrganizerOnRampHref('/organizer/intelligence')).toBe('/organizer/on-ramp?next=%2Forganizer%2Fintelligence');
  });

  it('normalizes invalid organizer on-ramp next routes', () => {
    expect(buildOrganizerOnRampHref('https://malicious.example/steal')).toBe('/organizer/on-ramp?next=%2Forganizer');
    expect(buildOrganizerOnRampHref('/organizer/on-ramp?next=%2Forganizer')).toBe('/organizer/on-ramp?next=%2Forganizer');
  });

  it('uses pending returnTo when explicit returnTo is missing', () => {
    savePendingReturnTo('/education/certifications');
    expect(readPendingReturnTo()).toBe('/education/certifications');
    expect(resolvePostAuthReturnTo(null, '/profile')).toBe('/education/certifications');
  });

  it('clears pending returnTo', () => {
    savePendingReturnTo('/pledges');
    clearPendingReturnTo();
    expect(readPendingReturnTo()).toBeNull();
  });
});
