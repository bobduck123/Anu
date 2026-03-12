import type { CourseData } from './types';

export const MOCK_COURSES: CourseData[] = [
  {
    id: 'permaculture-101',
    title: 'Permaculture Foundations',
    description: 'Learn the core principles of permaculture design and sustainable living.',
    author: 'Elder Sage',
    template: 'scroll-snap',
    createdAt: '2026-01-15T10:00:00Z',
    sections: [
      {
        id: 'p1-1', order: 0,
        title: 'What is Permaculture?',
        content: 'Permaculture is a design system based on ecological principles. It integrates land, resources, people, and the environment through mutually beneficial synergies. The word "permaculture" originally referred to "permanent agriculture" but was expanded to mean "permanent culture" as social aspects were integral to a truly sustainable system.\n\nAt its core, permaculture observes natural ecosystems and mimics their patterns in human-designed systems. Rather than fighting nature, we work with it.',
        image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop',
      },
      {
        id: 'p1-2', order: 1,
        title: 'The Three Ethics',
        content: 'Permaculture is guided by three ethics:\n\n1. Earth Care — Provision for all life systems to continue and multiply.\n2. People Care — Provision for people to access resources necessary for existence.\n3. Fair Share — Setting limits to consumption and redistributing surplus.\n\nThese ethics form the foundation for all permaculture design decisions and distinguish it from conventional agriculture or land management.',
      },
      {
        id: 'p1-3', order: 2,
        title: 'Observation & Interaction',
        content: 'The first principle of permaculture is to "observe and interact." Before designing anything, spend a full year (or at least through all seasons) observing your site.\n\nNotice water flow patterns, sun paths, wind corridors, soil types, existing vegetation, and wildlife. These observations become the data that informs your design.\n\nGood design depends on a free and harmonious relationship with nature.',
        image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&h=400&fit=crop',
      },
      {
        id: 'p1-4', order: 3,
        title: 'Design Patterns',
        content: 'Nature uses patterns at every scale. Understanding these patterns helps us design more efficient systems:\n\n- Spirals (galaxies, shells, plant growth)\n- Branching (rivers, trees, veins)\n- Waves (sand dunes, water, wind)\n- Tessellations (honeycombs, crystals)\n\nPermaculture designers use these patterns in garden layouts, water systems, building designs, and social structures.',
      },
    ],
  },
  {
    id: 'civic-governance',
    title: 'Civic Governance Essentials',
    description: 'Understanding participatory governance and community decision-making.',
    author: 'Mountain Echo',
    template: 'cosmic-clock',
    createdAt: '2026-02-01T09:00:00Z',
    sections: [
      {
        id: 'cg-1', order: 0,
        title: 'Why Governance Matters',
        content: 'Governance is the system by which communities make decisions and allocate resources. Good governance is transparent, participatory, equitable, and accountable. It ensures that community resources are managed for the benefit of all members, not just a few.',
      },
      {
        id: 'cg-2', order: 1,
        title: 'Participatory Budgeting',
        content: 'Participatory budgeting (PB) is a democratic process where community members directly decide how to spend part of a public budget. First developed in Porto Alegre, Brazil in 1989, PB has spread to over 7,000 cities worldwide.\n\nIn Manara, impact pools use a modified PB approach where members vote on fund allocation priorities.',
      },
      {
        id: 'cg-3', order: 2,
        title: 'Consent-Based Decision Making',
        content: 'Unlike majority voting, consent-based decision making seeks decisions that everyone can live with. A proposal moves forward unless someone has a "paramount objection" — meaning the proposal would cause harm to the group.\n\nThis approach tends to produce higher-quality decisions and greater buy-in from all members.',
      },
      {
        id: 'cg-4', order: 3,
        title: 'Transparency Mechanisms',
        content: 'Transparency builds trust. Key mechanisms include:\n\n- Open financial ledgers (all transactions visible)\n- Public meeting minutes\n- Clear role definitions and accountability\n- Regular community reports\n- Anonymous feedback channels\n\nManara implements these through the transparency dashboard and append-only impact ledger.',
      },
      {
        id: 'cg-5', order: 4,
        title: 'Conflict Resolution',
        content: 'Healthy communities have clear processes for resolving disputes:\n\n1. Direct dialogue between parties\n2. Facilitated mediation\n3. Community circle process\n4. Restorative justice approach\n\nThe key is addressing conflicts early and creating safe spaces for honest communication.',
      },
    ],
  },
  {
    id: 'regenerative-economics',
    title: 'Regenerative Economics',
    description: 'Moving beyond sustainability to systems that actively restore and regenerate.',
    author: 'River Stone',
    template: 'retro-pixel',
    createdAt: '2026-02-10T14:00:00Z',
    sections: [
      {
        id: 're-1', order: 0,
        title: 'Beyond Sustainability',
        content: 'Sustainability asks: "How do we keep things from getting worse?" Regeneration asks: "How do we make things actively better?"\n\nRegenerative economics designs economic systems that restore ecosystems, strengthen communities, and build shared prosperity — not merely maintain the status quo.',
      },
      {
        id: 're-2', order: 1,
        title: 'Local Currency Systems',
        content: 'Community currencies keep wealth circulating locally. Manara credits function as a local exchange medium that:\n\n- Rewards community contribution\n- Cannot be extracted by outside investors\n- Maintains value within the local economy\n- Incentivizes mutual aid and cooperation',
      },
      {
        id: 're-3', order: 2,
        title: 'The Clearing Band Model',
        content: 'The clearing band is a mechanism for balancing trade between local merchants. It ensures that no single merchant accumulates too much credit (indicating they sell more than they buy locally) or too much debt.\n\nThis promotes balanced local trade and prevents wealth extraction.',
      },
      {
        id: 're-4', order: 3,
        title: 'Impact Measurement',
        content: 'Regenerative economics measures success differently:\n\n- Social capital (community connections, trust)\n- Natural capital (ecosystem health, biodiversity)\n- Human capital (skills, wellbeing, education)\n- Financial capital (only one of many metrics)\n\nManara tracks these through the impact ledger and constellation synergy scores.',
      },
    ],
  },
];
