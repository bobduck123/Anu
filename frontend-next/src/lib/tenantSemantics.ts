import { brand } from './brand';

export type ThresholdKey = 'witness' | 'participant' | 'contributor' | 'steward';

export interface ThresholdDefinition {
  key: ThresholdKey;
  label: string;
  summary: string;
  routeFocus: string;
}

export interface TenantSemanticsManifest {
  key: string;
  title: string;
  civicFrame: string;
  shellDescriptor: string;
  thresholds: ThresholdDefinition[];
}

export interface TenantSemanticSource {
  semanticKey?: string | null;
  slug?: string | null;
  name?: string | null;
}

export interface ThresholdState {
  manifest: TenantSemanticsManifest;
  current: ThresholdDefinition;
  next: ThresholdDefinition | null;
}

const defaultThresholds: ThresholdDefinition[] = [
  {
    key: 'witness',
    label: 'Witness',
    summary: 'Reads public truth, docs, and contact lanes before entering private commons data.',
    routeFocus: 'Transparency, docs, contact, memberships',
  },
  {
    key: 'participant',
    label: 'Participant',
    summary: 'Enters the commons, joins routes, and begins taking part in shared social and learning surfaces.',
    routeFocus: 'Community, education, profile, microcosms',
  },
  {
    key: 'contributor',
    label: 'Contributor',
    summary: 'Sustains the commons through memberships, tasks, pledges, learning, and visible contribution.',
    routeFocus: 'Memberships, impact, actions, relief, calendar',
  },
  {
    key: 'steward',
    label: 'Steward',
    summary: 'Holds organizer, governance, or institutional responsibility for the commons.',
    routeFocus: 'Organizer, governance, admin, sandbox',
  },
];

const MANARA_SEMANTICS: TenantSemanticsManifest = {
  key: 'manara',
  title: 'Beacon civic commons',
  civicFrame: brand.civicFrame,
  shellDescriptor: 'Beacon commons',
  thresholds: defaultThresholds,
};

const manifests: Record<string, TenantSemanticsManifest> = {
  manara: MANARA_SEMANTICS,
};

const stewardRoles = new Set(['organizer', 'node_admin', 'platform_admin', 'board_member', 'treasury_guardian']);
const contributorRoles = new Set(['member', 'contributor', 'supporter', 'donor']);

export function resolveTenantSemanticKey(source?: TenantSemanticSource | null): string {
  if (source?.semanticKey && manifests[source.semanticKey]) {
    return source.semanticKey;
  }

  if (source?.slug) {
    const slug = source.slug.toLowerCase();
    if (slug.includes('manara') || slug.includes('anu')) {
      return brand.semanticKey;
    }
  }

  if (source?.name) {
    const name = source.name.toLowerCase();
    if (name.includes('manara') || name.includes('anu')) {
      return brand.semanticKey;
    }
  }

  return brand.semanticKey;
}

export function getTenantSemantics(source?: TenantSemanticSource | null): TenantSemanticsManifest {
  return manifests[resolveTenantSemanticKey(source)] ?? MANARA_SEMANTICS;
}

export function getThresholdKey(role: string | null | undefined, isAuthenticated: boolean): ThresholdKey {
  if (!isAuthenticated) {
    return 'witness';
  }

  if (role && stewardRoles.has(role)) {
    return 'steward';
  }

  if (role && contributorRoles.has(role)) {
    return 'contributor';
  }

  return 'participant';
}

export function getThresholdState(
  role: string | null | undefined,
  isAuthenticated: boolean,
  source?: TenantSemanticSource | null,
): ThresholdState {
  const manifest = getTenantSemantics(source);
  const currentKey = getThresholdKey(role, isAuthenticated);
  const currentIndex = manifest.thresholds.findIndex((threshold) => threshold.key === currentKey);
  const current = manifest.thresholds[currentIndex] ?? manifest.thresholds[0];
  const next = currentIndex >= 0 ? manifest.thresholds[currentIndex + 1] ?? null : null;

  return { manifest, current, next };
}
