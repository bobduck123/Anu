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

  it('builds sandbox guidance for internal lab routes', () => {
    const guide = buildPathwayGuide('/sandbox/ui-lab');
    expect(guide.title).toBe('Sandbox review');
    expect(guide.steps.map((step) => step.href)).toContain('/sandbox/maps');
    expect(guide.steps.map((step) => step.href)).toContain('/lab');
  });

  it('treats legacy and canonical lab paths equivalently in guidance output', () => {
    const legacy = buildPathwayGuide('/sandbox/ui-lab');
    const canonical = buildPathwayGuide('/lab');

    expect(legacy.title).toBe(canonical.title);
    expect(legacy.steps.map((step) => step.href)).toEqual(canonical.steps.map((step) => step.href));
  });

  it('treats governance routes as operational mode', () => {
    expect(deriveNavigationMode('/governance/formulas')).toBe('tasks');
  });

  it('builds archive descent guidance for model registry routes', () => {
    const guide = buildPathwayGuide('/governance/model-registry');
    expect(guide.title).toBe('Archive descent');
    expect(guide.steps.map((step) => step.href)).toContain('/transparency');
  });

  it('builds explicit care guidance for relief routes', () => {
    const guide = buildPathwayGuide('/relief');
    expect(guide.title).toBe('Grounded care flow');
    expect(guide.steps.map((step) => step.href)).toContain('/impact');
  });

  it('builds bridge guidance for impact routes', () => {
    const guide = buildPathwayGuide('/impact');
    expect(guide.title).toBe('Earth to sky bridge');
    expect(guide.steps.map((step) => step.href)).toContain('/community');
  });
});
