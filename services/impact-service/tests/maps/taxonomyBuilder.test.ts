import { buildTaxonomy } from '../../src/maps/compiler/taxonomyBuilder';
import { TopicProfile } from '../../src/maps/domain/types';

const profile: TopicProfile = {
  topic: 'software architecture patterns',
  topicKey: 'software-architecture-patterns',
  title: 'Software Architecture Patterns',
  archetype: 'technology',
  entityType: 'technology',
  likelySourceClasses: ['documentation'],
  defaultCategoryPatterns: ['patterns', 'protocols', 'tradeoffs'],
  axisTemplates: [],
  defaultEdgeTypes: ['extends', 'similar_to'],
};

describe('buildTaxonomy', () => {
  it('assigns a single primary category per node', () => {
    const result = buildTaxonomy(
      'map_1',
      [
        {
          label: 'Modular Monolith',
          aliases: [],
          entityType: 'technology',
          categoryHint: 'patterns',
          tags: ['deployment'],
          metadata: {},
          sources: [],
          seedAxisScores: {},
          seedAxisExplanations: {},
          metrics: {},
          relations: [],
        },
        {
          label: 'CQRS',
          aliases: [],
          entityType: 'technology',
          categoryHint: 'protocols',
          tags: ['segregation'],
          metadata: {},
          sources: [],
          seedAxisScores: {},
          seedAxisExplanations: {},
          metrics: {},
          relations: [],
        },
      ],
      profile,
    );

    expect(result.categoryAssignments.get('Modular Monolith')).toBe('patterns');
    expect(result.categoryAssignments.get('CQRS')).toBe('protocols');
    expect(result.categories.some((category) => category.key === 'patterns')).toBe(true);
  });
});
