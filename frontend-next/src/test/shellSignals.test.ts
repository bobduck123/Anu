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
});
