export type AnuPatternStatus = 'lab' | 'candidate' | 'approved' | 'shipped';
export type AnuPatternTrack = 'adapted production candidate' | 'high-risk concept';
export type AnuPatternSurface = 'shell' | 'component primitives' | 'community' | 'subsystem chambers';
export type AnuPatternPreview = 'shell' | 'controls' | 'community' | 'chamber';

export interface AnuPatternSource {
  label: string;
  path: string;
  role: string;
}

export interface AnuPatternExperiment {
  id: string;
  title: string;
  track: AnuPatternTrack;
  status: AnuPatternStatus;
  surface: AnuPatternSurface;
  targetSurface: string;
  summary: string;
  extractedQualities: string[];
  discardedQualities: string[];
  sources: AnuPatternSource[];
  preview: AnuPatternPreview;
}

export interface AnuTokenStagingGroup {
  title: string;
  tokenPrefix: string;
  intent: string;
}

export const ANU_PATTERN_EXPERIMENTS: AnuPatternExperiment[] = [
  {
    id: 'shell-beacon-entry',
    title: 'Shell Beacon Entry',
    track: 'adapted production candidate',
    status: 'candidate',
    surface: 'shell',
    targetSurface: 'Header, sidebar, and home hero',
    summary:
      'Preserve the current landing-page gravity while making entry, route identity, and institution signal feel more authored and ceremonial.',
    extractedQualities: [
      'Cinematic shell silhouette with a strong route beacon',
      'Ceremonial entry posture instead of dashboard chrome',
      'Layered panels with authored edges rather than flat blocks',
    ],
    discardedQualities: [
      'Any literal lock-screen mimicry or novelty gating',
      'Over-decorated shells that compete with orientation',
      'Reference-specific layout proportions that do not match ANU information architecture',
    ],
    sources: [
      {
        label: 'Current landing shell root',
        path: 'C:\\Dev\\home-page-design',
        role: 'Primary atmospheric baseline',
      },
      {
        label: 'Current landing shell playground',
        path: 'C:\\Dev\\home-page-playground',
        role: 'Motion and spatial continuity baseline',
      },
      {
        label: 'App menu with lock screen',
        path: 'C:\\Dev\\tools\\app-menu-with-lock-screen',
        role: 'Navigation posture and authored entry choreography',
      },
    ],
    preview: 'shell',
  },
  {
    id: 'ceremonial-control-boxes',
    title: 'Ceremonial Control Boxes',
    track: 'adapted production candidate',
    status: 'candidate',
    surface: 'component primitives',
    targetSurface: 'Buttons, chips, command boxes, and route call-to-actions',
    summary:
      'Derive a family of sculpted ANU controls that can anchor the shell and later scale into community and chamber surfaces.',
    extractedQualities: [
      'Control-box relief and authored borders',
      'Distinct primary versus secondary call-to-action hierarchy',
      'Dense but legible chip clusters for route framing and state display',
    ],
    discardedQualities: [
      'Constant mutation or unstable geometry',
      'Noise-heavy border animation',
      'Reference styling that reads as tech-demo instead of institution-grade product UI',
    ],
    sources: [
      {
        label: 'UI kit always changing',
        path: 'C:\\Dev\\tools\\ui-kit-always-changing',
        role: 'Button and panel box grammar',
      },
      {
        label: 'Current landing shell root',
        path: 'C:\\Dev\\home-page-design',
        role: 'Material restraint and ceremonial tone',
      },
    ],
    preview: 'controls',
  },
  {
    id: 'community-signal-mosaic',
    title: 'Community Signal Mosaic',
    track: 'adapted production candidate',
    status: 'lab',
    surface: 'community',
    targetSurface: 'Community browse, featured media, and filtered commons discovery',
    summary:
      'Use mosaic-style browsing to make the commons feel alive without collapsing into a pure gallery toy or losing filtering clarity.',
    extractedQualities: [
      'Asymmetric browse rhythm that rewards exploration',
      'Media-led scanning with strong filter framing',
      'Clear transitions between live, seeded, and fallback states',
    ],
    discardedQualities: [
      'Any browse pattern that hides content accountability',
      'Pure image spectacle without semantic filtering',
      'Layouts that feel editorial but weaken signal density',
    ],
    sources: [
      {
        label: 'Interactive image mosaic',
        path: 'C:\\Dev\\tools\\interactive-image-mosaic',
        role: 'Browse rhythm and media grid logic',
      },
      {
        label: 'Current landing shell playground',
        path: 'C:\\Dev\\home-page-playground',
        role: 'Spatial pacing continuity for public surfaces',
      },
    ],
    preview: 'community',
  },
  {
    id: 'private-chamber-queues',
    title: 'Private Chamber Queues',
    track: 'high-risk concept',
    status: 'lab',
    surface: 'subsystem chambers',
    targetSurface: 'Profile, notifications, todos, and microcosm interiors',
    summary:
      'Prototype a distinct internal chamber language for private coordination surfaces without importing noise or theatrical cyberpunk literalism.',
    extractedQualities: [
      'Stacked queue logic for messages, todos, and notices',
      'Private-room hierarchy distinct from the public shell',
      'Microcosm blocks that feel like local chambers instead of generic cards',
    ],
    discardedQualities: [
      'Neon-noise overload and cyberpunk literalism',
      'Unreadable density or novelty controls',
      'Any visual treatment that obscures operational semantics',
    ],
    sources: [
      {
        label: 'Slack/Discord Cyberpunk redesign',
        path: 'C:\\Dev\\tools\\slack-discord-cyberpunk-2077-redesign-w-preact',
        role: 'Subsystem chamber density and stack logic',
      },
      {
        label: 'App menu with lock screen',
        path: 'C:\\Dev\\tools\\app-menu-with-lock-screen',
        role: 'Private doorway and layered chamber transitions',
      },
    ],
    preview: 'chamber',
  },
];

export const ANU_PROMOTION_RULES = [
  'Every promoted pattern must name its target ANU surface before it can move beyond the lab.',
  'No experiment can graduate unless mobile, keyboard, and degraded-data states remain clear.',
  'Patterns must read as ANU-specific after restructuring, not as direct clones of their reference source.',
  'High-risk concepts may inform a shipped surface, but they cannot be promoted wholesale into production.',
] as const;

export const ANU_TOKEN_STAGING_GROUPS: AnuTokenStagingGroup[] = [
  {
    title: 'Type',
    tokenPrefix: '--anu-type-*',
    intent: 'Ceremonial serif-led hierarchy with restrained sans and data support.',
  },
  {
    title: 'Color',
    tokenPrefix: '--anu-color-*',
    intent: 'Layered earth-and-heavens palette with blue, gold, violet, and ember accents.',
  },
  {
    title: 'Borders and Radii',
    tokenPrefix: '--anu-border-* / --anu-radius-*',
    intent: 'Authored panel edges and soft ceremonial curvature.',
  },
  {
    title: 'Shadows and Materials',
    tokenPrefix: '--anu-shadow-* / --anu-material-*',
    intent: 'Mineral shell depth, panel layering, and chamber material staging.',
  },
  {
    title: 'Motion',
    tokenPrefix: '--anu-motion-* / --anu-ease-*',
    intent: 'Restrained public transitions and semantically-driven motion timing.',
  },
];

export function formatPatternStatus(status: AnuPatternStatus): string {
  switch (status) {
    case 'lab':
      return 'Lab';
    case 'candidate':
      return 'Candidate';
    case 'approved':
      return 'Approved';
    case 'shipped':
      return 'Shipped';
    default:
      return status;
  }
}
