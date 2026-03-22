import { compileMapDraft } from '../../src/maps/compiler/autopilot';

describe('left-thought graph seed parity', () => {
  it('preserves node/edge scale and SEP source coverage in the compiler output', () => {
    const compiled = compileMapDraft({
      topic: 'left-thought-graph-atlas',
      mode: 'curated_refine',
    });

    expect(compiled.definition.topicKey).toBe('left-thought-graph-atlas');
    expect(compiled.nodes).toHaveLength(79);
    expect(compiled.edges).toHaveLength(126);

    const sepLinkedNodes = compiled.nodes.filter((node) =>
      node.sources.some((source) => source.domain === 'plato.stanford.edu'),
    );
    expect(sepLinkedNodes).toHaveLength(79);

    const relationKinds = new Set(compiled.edges.map((edge) => edge.relation));
    expect(relationKinds.has('influences')).toBe(true);
    expect(relationKinds.has('extends')).toBe(true);
    expect(relationKinds.has('belongs_to')).toBe(true);
    expect(relationKinds.has('derived_from')).toBe(true);
  });

  it('normalizes topic variants to the same deterministic atlas seed', () => {
    const fromSlug = compileMapDraft({ topic: 'left-thought-graph-atlas', mode: 'curated_refine' });
    const fromPhrase = compileMapDraft({ topic: 'Left Thought Graph Atlas', mode: 'curated_refine' });

    expect(fromPhrase.definition.topicKey).toBe('left-thought-graph-atlas');
    expect(fromPhrase.nodes).toHaveLength(fromSlug.nodes.length);
    expect(fromPhrase.edges).toHaveLength(fromSlug.edges.length);
  });
});
