import { Request, Response, Router } from 'express';

type PlaceholderEcology = {
  ecologyIdentity: string;
  identityConfidence: number;
  dominantNutrients: string[];
  nutrientVector: {
    careIndex: number;
    reciprocityIndex: number;
    resonanceIndex: number;
    originalityIndex: number;
    stewardshipIndex: number;
    mycelialDensityIndex: number;
  };
  geology: {
    formKey: string;
    strataSummary: string;
    permeabilityIndex: number;
    volatilityIndex: number;
    stabilityIndex: number;
  };
};

type PlaceholderMeme = {
  id: string;
  channelId: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  mediaUrl: string | null;
  attentionScore: number;
  shareable: boolean;
  createdAt: string;
  channel: {
    id: string;
    slug: string;
    title: string;
  };
  ecology: PlaceholderEcology;
};

type PlaceholderChannel = {
  id: string;
  slug: string;
  title: string;
  description: string;
  manifesto: string;
  creatorUserId: string;
  sharePolicy: string;
  createdAt: string;
  updatedAt: string;
  memes: PlaceholderMeme[];
  ecology: PlaceholderEcology;
  moderation: {
    openFlags: number;
    openCases: number;
  };
};

type PlaceholderPool = {
  id: string;
  slug: string;
  name: string;
  description: string;
  availableBalanceCents: number;
  reservedBalanceCents: number;
  disbursedBalanceCents: number;
  policyJson: Record<string, unknown>;
  ledgerAccounts: Array<{
    id: string;
    code: string;
    name: string;
    balanceCents: number;
  }>;
  recentEntries: Array<{
    id: string;
    journalId: string;
    amountCents: number;
    memo: string;
    createdAt: string;
    account: {
      code: string;
      name: string;
    };
  }>;
};

type PlaceholderMemeDetail = PlaceholderMeme & {
  lineage: {
    parents: Array<{
      relationType: string;
      parentMeme: {
        id: string;
        slug: string;
        title: string;
        channelId: string;
      };
    }>;
    children: Array<{
      relationType: string;
      childMeme: {
        id: string;
        slug: string;
        title: string;
        channelId: string;
      };
    }>;
  };
  nutrientSnapshots: Array<{
    id: string;
    ecologyIdentity: string;
    geologyFormKey: string;
  }>;
  riskFlags: Array<{
    id: string;
    flagType: string;
    severity: string;
    reason: string;
  }>;
};

const placeholderEcology: PlaceholderEcology = {
  ecologyIdentity: 'estuary commons',
  identityConfidence: 0.71,
  dominantNutrients: ['care', 'reciprocity', 'stewardship'],
  nutrientVector: {
    careIndex: 0.72,
    reciprocityIndex: 0.79,
    resonanceIndex: 0.68,
    originalityIndex: 0.63,
    stewardshipIndex: 0.74,
    mycelialDensityIndex: 0.83,
  },
  geology: {
    formKey: 'alluvial-delta',
    strataSummary:
      'Dense reciprocity and connective tissue move attention through the commons without hard bottlenecks.',
    permeabilityIndex: 0.79,
    volatilityIndex: 0.44,
    stabilityIndex: 0.75,
  },
};

const placeholderFeed: PlaceholderMeme[] = [
  {
    id: 'seed-the-canopy',
    channelId: 'manara-origami',
    slug: 'seed-the-canopy',
    title: 'Seed the Canopy',
    summary: 'A founding mutual-aid meme for free replication.',
    body: 'Take, remix, and propagate. Never sell the artifact; only steward the attention around it.',
    mediaUrl: null,
    attentionScore: 0.88,
    shareable: true,
    createdAt: '2026-03-01T00:00:00.000Z',
    channel: {
      id: 'manara-origami',
      slug: 'manara-origami',
      title: 'Manara Origami',
    },
    ecology: placeholderEcology,
  },
  {
    id: 'delta-remix-ledger',
    channelId: 'manara-origami',
    slug: 'delta-remix-ledger',
    title: 'Delta Remix Ledger',
    summary: 'A remix about auditable pool flow.',
    body: 'Every remix should leave a public trace and a ledger-readable downstream footprint.',
    mediaUrl: null,
    attentionScore: 0.76,
    shareable: true,
    createdAt: '2026-03-05T00:00:00.000Z',
    channel: {
      id: 'manara-origami',
      slug: 'manara-origami',
      title: 'Manara Origami',
    },
    ecology: placeholderEcology,
  },
];

const placeholderChannel: PlaceholderChannel = {
  id: 'manara-origami',
  slug: 'manara-origami',
  title: 'Manara Origami',
  description: 'Memes as mutual-aid spores and shareable cultural infrastructure.',
  manifesto:
    'Memes circulate freely; revenue only arrives through downstream attention and subscriptions.',
  creatorUserId: 'gardenkeeper',
  sharePolicy: 'free_shareable',
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-05T00:00:00.000Z',
  memes: placeholderFeed,
  ecology: placeholderEcology,
  moderation: {
    openFlags: 0,
    openCases: 0,
  },
};

const placeholderPool: PlaceholderPool = {
  id: 'mutual-aid-canopy',
  slug: 'mutual-aid-canopy',
  name: 'Mutual Aid Canopy',
  description: 'Shared liquidity for rapid-response care and community stabilisation.',
  availableBalanceCents: 125000,
  reservedBalanceCents: 15000,
  disbursedBalanceCents: 40000,
  policyJson: {
    reserveFloorPct: 0.15,
    allocationCadence: 'weekly',
    note: 'Placeholder preview data served while impact-service infrastructure is being configured.',
  },
  ledgerAccounts: [
    {
      id: 'acct-available',
      code: 'AVAILABLE',
      name: 'Available Balance',
      balanceCents: 125000,
    },
    {
      id: 'acct-reserved',
      code: 'RESERVED',
      name: 'Reserved Balance',
      balanceCents: 15000,
    },
  ],
  recentEntries: [
    {
      id: 'entry-1',
      journalId: 'journal-1',
      amountCents: 50000,
      memo: 'Founding pool allocation',
      createdAt: '2026-03-01T00:00:00.000Z',
      account: {
        code: 'AVAILABLE',
        name: 'Available Balance',
      },
    },
    {
      id: 'entry-2',
      journalId: 'journal-2',
      amountCents: -10000,
      memo: 'Community stabilisation disbursement',
      createdAt: '2026-03-04T00:00:00.000Z',
      account: {
        code: 'AVAILABLE',
        name: 'Available Balance',
      },
    },
  ],
};

const placeholderMemeDetails = new Map<string, PlaceholderMemeDetail>(
  placeholderFeed.map((meme, index, feed) => {
    const sibling = feed[(index + 1) % feed.length];
    return [
      meme.id,
      {
        ...meme,
        lineage: {
          parents:
            meme.id === 'delta-remix-ledger'
              ? [
                  {
                    relationType: 'remix',
                    parentMeme: {
                      id: 'seed-the-canopy',
                      slug: 'seed-the-canopy',
                      title: 'Seed the Canopy',
                      channelId: 'manara-origami',
                    },
                  },
                ]
              : [],
          children:
            meme.id === 'seed-the-canopy'
              ? [
                  {
                    relationType: 'remix',
                    childMeme: {
                      id: 'delta-remix-ledger',
                      slug: 'delta-remix-ledger',
                      title: 'Delta Remix Ledger',
                      channelId: 'manara-origami',
                    },
                  },
                ]
              : [],
        },
        nutrientSnapshots: [
          {
            id: `snapshot-${meme.id}`,
            ecologyIdentity: placeholderEcology.ecologyIdentity,
            geologyFormKey: placeholderEcology.geology.formKey,
          },
        ],
        riskFlags: [],
      },
    ];
  }),
);

function parseLimit(rawValue: unknown, fallback: number): number {
  const candidate = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (typeof candidate !== 'string') {
    return fallback;
  }

  const parsed = Number.parseInt(candidate, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function notFound(res: Response, message: string) {
  return res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message,
    },
  });
}

function betaDependencyMissing(res: Response, route: string) {
  return res.status(503).json({
    ok: false,
    error: {
      code: 'BetaDependencyMissing',
      message:
        `Impact service is running in beta-limited mode. ${route} requires database and billing configuration beyond the public Manara preview.`,
    },
    dependencies: {
      database: 'todo',
      stripe: 'todo',
    },
  });
}

export const createFloraFaunaPlaceholderRoutes = (): Router => {
  const router = Router();

  router.use(createFloraFaunaPlaceholderFeedRoutes());

  router.get('/channels', (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit, 12);
    res.json({
      channels: [placeholderChannel].slice(0, limit),
      placeholder: true,
    });
  });

  router.get('/channels/:channelId', (req: Request, res: Response) => {
    if (req.params.channelId !== placeholderChannel.id && req.params.channelId !== placeholderChannel.slug) {
      return notFound(res, 'Channel not found');
    }

    return res.json({
      ...placeholderChannel,
      placeholder: true,
    });
  });

  router.get('/channels/:channelId/ecology', (req: Request, res: Response) => {
    if (req.params.channelId !== placeholderChannel.id && req.params.channelId !== placeholderChannel.slug) {
      return notFound(res, 'No ecology snapshots found for channel');
    }

    return res.json({
      ...placeholderEcology,
      placeholder: true,
    });
  });

  router.get('/memes/:memeId', (req: Request, res: Response) => {
    const detail = placeholderMemeDetails.get(req.params.memeId) ?? [...placeholderMemeDetails.values()].find(
      (item) => item.slug === req.params.memeId,
    );

    if (!detail) {
      return notFound(res, 'Meme not found');
    }

    return res.json({
      ...detail,
      placeholder: true,
    });
  });

  router.get('/pools', (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit, 12);
    res.json({
      pools: [placeholderPool].slice(0, limit),
      placeholder: true,
    });
  });

  router.get('/pools/:poolId', (req: Request, res: Response) => {
    if (req.params.poolId !== placeholderPool.id && req.params.poolId !== placeholderPool.slug) {
      return notFound(res, 'Pool not found');
    }

    return res.json({
      ...placeholderPool,
      placeholder: true,
    });
  });

  router.all('*', (req: Request, res: Response) => betaDependencyMissing(res, req.path));

  return router;
};

export const createFloraFaunaPlaceholderFeedRoutes = (): Router => {
  const router = Router();

  router.get('/feed', (req: Request, res: Response) => {
    const limit = parseLimit(req.query.limit, 12);
    res.json({
      feed: placeholderFeed.slice(0, limit),
      placeholder: true,
    });
  });

  return router;
};

export default createFloraFaunaPlaceholderRoutes;
