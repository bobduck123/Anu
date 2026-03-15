import { canonicalizeLabel, dedupeEntities } from '../../src/maps/compiler/dedupe';

describe('dedupeEntities', () => {
  it('merges alias and punctuation variants into a single canonical entity', () => {
    const result = dedupeEntities([
      {
        label: 'Baal Hadad',
        aliases: ['Baal'],
        entityType: 'mythic_entity',
        tags: ['storm'],
        metadata: {},
        sources: [],
        seedAxisScores: {},
        seedAxisExplanations: {},
        metrics: { importance: 0.7 },
        relations: [],
      },
      {
        label: 'Baal-Hadad',
        aliases: ['Hadad'],
        entityType: 'mythic_entity',
        tags: ['fertility'],
        metadata: {},
        sources: [],
        seedAxisScores: {},
        seedAxisExplanations: {},
        metrics: { evidence: 0.5 },
        relations: [],
      },
    ]);

    expect(canonicalizeLabel('Baal-Hadad')).toBe('baalhadad');
    expect(result).toHaveLength(1);
    expect(result[0].aliases).toEqual(expect.arrayContaining(['Baal', 'Hadad']));
  });
});
