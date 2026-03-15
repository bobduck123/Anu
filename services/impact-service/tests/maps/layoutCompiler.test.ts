import { compileConstrainedLayout } from '../../src/maps/compiler/layoutCompiler';

describe('compileConstrainedLayout', () => {
  it('keeps semantic anchors dominant while separating collisions', () => {
    const layout = compileConstrainedLayout(
      [
        {
          id: 'n1',
          categoryKey: 'deities',
          axisScores: { x: 0.8, y: 0.1, z: 0.6 },
          renderRadius: 3,
        },
        {
          id: 'n2',
          categoryKey: 'deities',
          axisScores: { x: 0.78, y: 0.12, z: 0.62 },
          renderRadius: 3,
        },
      ],
      [
        {
          sourceId: 'n1',
          targetId: 'n2',
          weight: 0.8,
        },
      ],
    );

    const nodeOne = layout.get('n1');
    const nodeTwo = layout.get('n2');

    expect(nodeOne).toBeDefined();
    expect(nodeTwo).toBeDefined();
    expect(Math.abs(nodeOne!.position.x - 17.6)).toBeLessThan(4);
    expect(Math.abs(nodeTwo!.position.x - 17.16)).toBeLessThan(4);

    const dx = nodeOne!.position.x - nodeTwo!.position.x;
    const dy = nodeOne!.position.y - nodeTwo!.position.y;
    const dz = nodeOne!.position.z - nodeTwo!.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    expect(distance).toBeGreaterThan(2.5);
  });

  it('is reproducible for the same inputs', () => {
    const nodes = [
      {
        id: 'n1',
        categoryKey: 'deities',
        axisScores: { x: 0.8, y: 0.1, z: 0.6 },
        renderRadius: 3,
      },
      {
        id: 'n2',
        categoryKey: 'deities',
        axisScores: { x: 0.78, y: 0.12, z: 0.62 },
        renderRadius: 3,
      },
      {
        id: 'n3',
        categoryKey: 'rituals',
        axisScores: { x: -0.35, y: 0.42, z: 0.15 },
        renderRadius: 2.4,
      },
    ];
    const edges = [
      {
        sourceId: 'n1',
        targetId: 'n2',
        weight: 0.8,
      },
      {
        sourceId: 'n1',
        targetId: 'n3',
        weight: 0.35,
      },
    ];

    const first = compileConstrainedLayout(nodes, edges);
    const second = compileConstrainedLayout(nodes, edges);

    expect(Array.from(first.entries())).toEqual(Array.from(second.entries()));
  });
});
