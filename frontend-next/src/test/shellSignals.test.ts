import { describe, expect, it } from 'vitest';
import { getShellSignal } from '@/ui-system/layout/shellSignals';

describe('shell signal model', () => {
  it('maps sandbox routes to internal lab signaling', () => {
    const signal = getShellSignal('/sandbox/ui-lab');
    expect(signal.eyebrow).toBe('Internal route');
    expect(signal.label).toBe('Sandbox and lab');
  });

  it('maps community routes to commons signaling', () => {
    const signal = getShellSignal('/community');
    expect(signal.label).toBe('Community mesh');
  });

  it('maps governance routes to steward signaling', () => {
    const signal = getShellSignal('/governance/metrics-registry');
    expect(signal.label).toBe('Steward systems');
  });

  it('maps model registry routes to archive-specific signaling', () => {
    const signal = getShellSignal('/governance/model-registry');
    expect(signal.label).toBe('Model archive');
  });

  it('maps auth routes to threshold signaling', () => {
    const signal = getShellSignal('/auth');
    expect(signal.label).toBe('Entry doorway');
  });

  it('maps impact routes to bridge signaling', () => {
    const signal = getShellSignal('/impact');
    expect(signal.label).toBe('Impact bridge');
  });

  it('maps relief routes to care signaling', () => {
    const signal = getShellSignal('/relief');
    expect(signal.label).toBe('Grounded care');
  });

  it('maps profile routes to member cockpit signaling', () => {
    const signal = getShellSignal('/profile');
    expect(signal.label).toBe('Profile cockpit');
  });
});
