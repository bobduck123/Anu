import { describe, expect, it } from 'vitest';
import {
  layoutRegistryArchive,
  presentRegistryModel,
} from '@/app/(app)/governance/model-registry/modelRegistryPresentation';

describe('presentRegistryModel', () => {
  it('marks heavily reviewed models as contested and derives probabilistic shapes from uncertainty metadata', () => {
    const model = presentRegistryModel({
      key: 'mutual_aid_pressure',
      version: 2,
      description: 'Tracks pressure on relief and care routing.',
      required_inputs: ['queue_depth', 'volunteer_capacity'],
      confidence_method: 'bayesian',
      uncertainty_format: 'credible_interval',
      requires_backtest: true,
      requires_calibration: true,
    });

    expect(model.state).toBe('contested');
    expect(model.stateReason).toMatch(/backtesting and calibration/i);
    expect(model.shapeLabel).toBe('Probabilistic contour');
    expect(model.dependencySummary).toMatch(/required inputs/i);
  });

  it('marks legacy models as deprecated and surfaces history notes from fallback and cooling metadata', () => {
    const model = presentRegistryModel({
      key: 'legacy_repair_registry',
      version: 5,
      description: 'Legacy model retained for archive review.',
      fallback_mode: 'manual_review',
      cooling_period_days: 14,
      update_policy: 'scheduled_review',
    });

    expect(model.state).toBe('deprecated');
    expect(model.historySummary).toMatch(/14 day cooling window/i);
    expect(model.releaseNotes).toContain('Manual Review fallback mode');
  });

  it('lays archive markers into staged lanes and gives more active models greater vertical mass', () => {
    const markers = layoutRegistryArchive([
      presentRegistryModel({
        key: 'stewardship_core',
        version: 4,
        description: 'Stable stewardship model.',
      }),
      presentRegistryModel({
        key: 'legacy_repair_registry',
        version: 5,
        description: 'Legacy model retained for archive review.',
        fallback_mode: 'manual_review',
      }),
    ]);

    expect(markers[0]?.lane).not.toBe(markers[1]?.lane);
    expect(markers[0]?.towerHeight).toBeGreaterThan(markers[1]?.towerHeight ?? 0);
  });

  it('does not mark a model deprecated merely because archive language appears in the description', () => {
    const model = presentRegistryModel({
      key: 'commons_memory',
      version: 3,
      description: 'Archive entry for public memory and institutional reading.',
    });

    expect(model.state).toBe('active');
  });
});
