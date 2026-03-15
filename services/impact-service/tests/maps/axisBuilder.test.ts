import { buildAxes, buildNodeAxisMeta } from '../../src/maps/compiler/axisBuilder';

describe('axisBuilder', () => {
  it('normalizes axis values into [-1, 1]', () => {
    const axes = buildAxes('map_1', {
      topic: 'ancient levantine deities',
      topicKey: 'ancient-levantine-deities',
      title: 'Ancient Levantine Deities',
      archetype: 'myth',
      entityType: 'mythic_entity',
      likelySourceClasses: ['reference'],
      defaultCategoryPatterns: ['deities'],
      axisTemplates: [
        { key: 'x', label: 'Territory', minLabel: 'Local', maxLabel: 'Transregional', description: '', scoringMethod: 'rubric' },
        { key: 'y', label: 'Realm', minLabel: 'Earthly', maxLabel: 'Celestial', description: '', scoringMethod: 'rubric' },
        { key: 'z', label: 'Orientation', minLabel: 'Practical', maxLabel: 'Cosmological', description: '', scoringMethod: 'rubric' },
      ],
      defaultEdgeTypes: ['similar_to'],
    });

    const result = buildNodeAxisMeta({
      label: 'Astarte',
      aliases: [],
      entityType: 'mythic_entity',
      categoryHint: 'deities',
      tags: ['transregional'],
      metadata: {},
      sources: [],
      seedAxisScores: { x: 2.8, y: -1.5, z: 0.25 },
      seedAxisExplanations: {},
      metrics: {},
      relations: [],
    }, axes);

    expect(result.axisScores.x).toBe(1);
    expect(result.axisScores.y).toBe(-1);
    expect(result.axisScores.z).toBe(0.25);
  });
});
