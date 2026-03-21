import { describe, expect, it } from 'vitest';
import { buildPathwayGuide, deriveNavigationMode } from '@/ui-system/layout/pathwayGuidance';

describe('pathway guidance model', () => {
  it('derives tasks mode for operational routes', () => {
    expect(deriveNavigationMode('/cost-lowering')).toBe('tasks');
    expect(deriveNavigationMode('/events')).toBe('tasks');
  });

  it('derives explore mode for exploratory routes', () => {
    expect(deriveNavigationMode('/education')).toBe('explore');
    expect(deriveNavigationMode('/community')).toBe('explore');
  });

  it('builds education-specific guidance steps', () => {
    const guide = buildPathwayGuide('/education/curriculum');
    expect(guide.title).toBe('Learning to action');
    expect(guide.steps.map((step) => step.href)).toContain('/education/maps');
  });

  it('builds cost-lowering-specific guidance steps', () => {
    const guide = buildPathwayGuide('/runs/12');
    expect(guide.title).toBe('Cost-lowering flow');
    expect(guide.steps.map((step) => step.href)).toContain('/cost-lowering');
  });
});
