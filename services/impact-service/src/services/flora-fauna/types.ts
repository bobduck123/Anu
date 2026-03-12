import {
  AttributionRecipientType,
  DisbursementStatus,
  LedgerAccountType,
  MemeLineageRelationType,
  ModerationActionType,
  ModerationCaseStatus,
  ModerationSeverity,
  PoolLedgerEntryKind,
  Prisma,
  PrismaClient,
  RevenueSourceType,
} from '@prisma/client';
import { errors } from '../../utils/errors';

export type DbClient = PrismaClient | Prisma.TransactionClient;

export interface DomainActor {
  id: string;
  role: string;
  ip?: string;
  requestId?: string;
  correlationId?: string;
}

export interface NutrientVectorInput {
  careIndex: number;
  reciprocityIndex: number;
  resonanceIndex: number;
  originalityIndex: number;
  stewardshipIndex: number;
  mycelialDensityIndex: number;
}

export interface EcologySummary {
  ecologyIdentity: string;
  identityConfidence: number;
  dominantNutrients: string[];
  nutrientVector: NutrientVectorInput;
  geology: GeologicalSummary;
}

export interface GeologicalSummary {
  formKey: string;
  strataSummary: string;
  permeabilityIndex: number;
  volatilityIndex: number;
  stabilityIndex: number;
  rationale: Record<string, number | string>;
}

export interface CreateChannelInput {
  slug: string;
  title: string;
  creatorUserId: string;
  description?: string;
  manifesto?: string;
  initialNutrients?: NutrientVectorInput;
}

export interface CreateMemeInput {
  channelId: string;
  slug: string;
  title: string;
  body?: string;
  summary?: string;
  mediaUrl?: string;
  parentMemeIds?: string[];
  lineageType?: MemeLineageRelationType;
  nutrientSnapshot?: NutrientVectorInput;
}

export interface RevenueSplitInput {
  recipientType: AttributionRecipientType;
  recipientId: string;
  amountCents: number;
  sharePct: number;
  metadata?: Record<string, unknown>;
}

export interface RecordRevenueEventInput {
  subscriptionId?: string;
  channelId?: string;
  memeId?: string;
  sourceType: RevenueSourceType;
  grossAmountCents: number;
  netAmountCents: number;
  currency?: string;
  memo?: string;
  splits: RevenueSplitInput[];
}

export interface CreateLiquidityPoolInput {
  slug: string;
  name: string;
  description?: string;
  policyJson?: Record<string, unknown>;
}

export interface JournalLineInput {
  accountCode: string;
  amountCents: number;
}

export interface CreateAllocationRequestInput {
  poolId: string;
  beneficiaryId: string;
  amountCents: number;
  purpose: string;
  rationale?: string;
}

export interface FlagRiskInput {
  channelId?: string;
  memeId?: string;
  flagType: string;
  severity: ModerationSeverity;
  reason: string;
}

export interface ModerationActionInput {
  caseId: string;
  actionType: ModerationActionType;
  notes?: string;
}

export const DEFAULT_NUTRIENT_VECTOR: NutrientVectorInput = {
  careIndex: 0.62,
  reciprocityIndex: 0.58,
  resonanceIndex: 0.55,
  originalityIndex: 0.57,
  stewardshipIndex: 0.61,
  mycelialDensityIndex: 0.6,
};

export const DEFAULT_POOL_ACCOUNTS: Array<{
  code: string;
  name: string;
  accountType: LedgerAccountType;
}> = [
  { code: 'treasury', name: 'Pool Treasury', accountType: LedgerAccountType.treasury },
  { code: 'allocation-reserve', name: 'Allocation Reserve', accountType: LedgerAccountType.allocation_reserve },
  { code: 'revenue-clearing', name: 'Revenue Clearing', accountType: LedgerAccountType.revenue_clearing },
  { code: 'creator-reserve', name: 'Creator Reserve', accountType: LedgerAccountType.creator_reserve },
  { code: 'platform-reserve', name: 'Platform Reserve', accountType: LedgerAccountType.platform_reserve },
  {
    code: 'mutual-aid-disbursed',
    name: 'Mutual Aid Disbursed',
    accountType: LedgerAccountType.mutual_aid_disbursed,
  },
];

export const MODERATION_ACTION_TO_STATUS: Partial<Record<ModerationActionType, ModerationCaseStatus>> = {
  warn: ModerationCaseStatus.actioned,
  label: ModerationCaseStatus.actioned,
  limit: ModerationCaseStatus.actioned,
  remove: ModerationCaseStatus.actioned,
  restore: ModerationCaseStatus.reviewed,
  close: ModerationCaseStatus.closed,
  escalate: ModerationCaseStatus.actioned,
};

export const DISBURSEMENT_FINAL_STATUSES = new Set<DisbursementStatus>([
  DisbursementStatus.settled,
  DisbursementStatus.failed,
  DisbursementStatus.reversed,
]);

export const JOURNAL_KIND_TO_MEMO: Record<PoolLedgerEntryKind, string> = {
  funding_inflow: 'Pool funding inflow',
  allocation_reservation: 'Allocation reservation',
  allocation_release: 'Allocation reservation released',
  creator_allocation: 'Creator revenue allocation',
  pool_allocation: 'Mutual-aid pool allocation',
  disbursement: 'Mutual-aid disbursement',
  adjustment: 'Ledger adjustment',
};

export const MODERATION_CASE_STATUSES = Object.values(ModerationCaseStatus) as ModerationCaseStatus[];
export const REVENUE_SOURCE_TYPES = Object.values(RevenueSourceType) as RevenueSourceType[];
export const MODERATION_SEVERITIES = Object.values(ModerationSeverity) as ModerationSeverity[];
export const MODERATION_ACTION_TYPES = Object.values(ModerationActionType) as ModerationActionType[];

export function clampMetric(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    throw errors.badRequest('Nutrient metrics must be finite numbers');
  }
  return Math.min(1, Math.max(0, Number(value.toFixed(4))));
}

export function normalizeNutrientVector(vector: NutrientVectorInput): NutrientVectorInput {
  return {
    careIndex: clampMetric(vector.careIndex),
    reciprocityIndex: clampMetric(vector.reciprocityIndex),
    resonanceIndex: clampMetric(vector.resonanceIndex),
    originalityIndex: clampMetric(vector.originalityIndex),
    stewardshipIndex: clampMetric(vector.stewardshipIndex),
    mycelialDensityIndex: clampMetric(vector.mycelialDensityIndex),
  };
}

export function roundMetric(value: number): number {
  return Number(value.toFixed(4));
}

export function assertPositiveCents(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw errors.badRequest(`${fieldName} must be a positive integer amount in cents`);
  }
}

export function normalizeRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw errors.badRequest(`${fieldName} must be a string`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw errors.badRequest(`${fieldName} is required`);
  }

  return normalized;
}

export function normalizeOptionalText(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw errors.badRequest(`${fieldName} must be a string`);
  }

  const normalized = value.trim();
  return normalized || undefined;
}

export function normalizeCurrency(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return 'usd';
  }

  if (typeof value !== 'string') {
    throw errors.badRequest('currency must be a string');
  }

  const normalized = value.trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(normalized)) {
    throw errors.badRequest('currency must be a 3-letter ISO code');
  }

  return normalized;
}

export function assertEnumValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName: string,
): T {
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw errors.badRequest(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }

  return value as T;
}

export function parseBoundedLimit(value: unknown, defaultValue: number, maxValue: number): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw errors.badRequest(`limit must be a positive integer between 1 and ${maxValue}`);
  }

  return Math.min(maxValue, parsed);
}

export function ensureShareablePolicy(policy: string | undefined): string {
  if (policy && policy !== 'free_shareable') {
    throw errors.unprocessable('Memes must remain free and shareable');
  }
  return 'free_shareable';
}

export function toDomainActorFallback(actor?: Partial<DomainActor>): DomainActor {
  return {
    id: actor?.id || 'system',
    role: actor?.role || 'system',
    ip: actor?.ip,
    requestId: actor?.requestId,
    correlationId: actor?.correlationId,
  };
}
