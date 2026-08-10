import { apiFetch } from '@/lib/api/client';
import { controlFetchJson } from '@/lib/api/controlClient';

export type PeachContributionType = 'text_reflection' | 'question' | 'memory' | 'research_note' | 'archive_fragment' | 'other';
export type PeachVisibilityPreference = 'private' | 'internal' | 'anonymous_public' | 'credited_public' | 'yield_only' | 'follow_up_required';
export type PeachConsentLevel = 'private_to_stewards' | 'internal_discussion' | 'anonymous_quote' | 'public_credit' | 'yield_inclusion' | 'follow_up_required';
export type PeachCreditPreference = 'full_name' | 'chosen_name' | 'organization' | 'pseudonym' | 'anonymous' | 'credit_withheld' | 'follow_up_before_crediting';
export type PeachReviewStatus = 'pending_review' | 'held' | 'accepted_private' | 'rejected';
export type PeachConsentOperationType = 'export' | 'withdrawal';
export type PeachConsentOperationStatus = 'pending_steward_review' | 'in_review' | 'completed' | 'rejected';
export type PeachSupportType = 'membership' | 'one_off_support' | 'sponsor_access' | 'sponsor_field' | 'sponsor_yield';
export type PeachSupportIntentStatus = 'manual_enquiry' | 'pending_follow_up' | 'closed';

export type PeachContributionSubmission = {
  adultOnly: boolean;
  contributionType: PeachContributionType;
  body: string;
  contributorChosenCredit: string;
  contactMethod: string;
  visibilityPreference: PeachVisibilityPreference;
  creditPreference: PeachCreditPreference;
  consentLevel: PeachConsentLevel;
  permissionForYield: boolean;
  sensitiveMaterialFlag: boolean;
  youthMaterialFlag: boolean;
  acceptedTerms: boolean;
};

export type PeachContributionSubmissionResponse = {
  contribution: {
    id: number;
    fieldId: string;
    fieldSlug: string;
    reviewStatus: PeachReviewStatus;
    publicDisplay: false;
    createdAt: string | null;
  };
  message: string;
};

export type PeachConsentRecord = {
  id: number;
  contributionId: number;
  consentVersion: string;
  consentLevel: PeachConsentLevel;
  permissionForYield: boolean;
  creditPreference: PeachCreditPreference;
  visibilityPreference: PeachVisibilityPreference;
  acceptedTerms: boolean;
  createdAt: string | null;
  stewardReviewedAt: string | null;
  stewardReviewedBy: number | null;
};

export type PeachStewardContribution = {
  id: number;
  fieldId: string;
  fieldSlug: string;
  contributionType: PeachContributionType;
  contributorChosenCredit: string;
  contactMethod: string;
  visibilityPreference: PeachVisibilityPreference;
  creditPreference: PeachCreditPreference;
  permissionForYield: boolean;
  sensitiveMaterialFlag: boolean;
  youthMaterialFlag: boolean;
  reviewStatus: PeachReviewStatus;
  publicDisplay: false;
  stewardNote: string | null;
  reviewedAt: string | null;
  reviewedBy: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  consentRecord: PeachConsentRecord | null;
  bodyText?: string;
};

export type PeachConsentOperationSubmission = {
  operationType: PeachConsentOperationType;
  contributionId?: number | '';
  contributorContact: string;
  contributorCreditOrName: string;
  requestDetail: string;
  adultOnly: boolean;
  sensitiveMaterialFlag: boolean;
  youthMaterialFlag: boolean;
  acceptedTerms: boolean;
};

export type PeachConsentOperationRequest = {
  id: number;
  contributionId?: number | null;
  contributorContact?: string;
  contributorCreditOrName?: string;
  operationType: PeachConsentOperationType;
  requestDetail?: string;
  status: PeachConsentOperationStatus;
  stewardNote?: string | null;
  createdAt: string | null;
  updatedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: number | null;
  message?: string;
};

export type PeachSupportIntentSubmission = {
  supportType: PeachSupportType;
  supporterName?: string;
  supporterContact?: string;
  amountIntent?: string;
  currency?: string;
  note?: string;
  paymentTaken: false;
  adultOnly: boolean;
  sensitiveMaterialFlag: boolean;
  youthMaterialFlag: boolean;
  acceptedTerms: boolean;
};

export type PeachSupportIntent = {
  id: number;
  fieldId: string | null;
  fieldSlug: string | null;
  supportType: PeachSupportType;
  supporterName?: string | null;
  supporterContact?: string | null;
  amountIntent?: string | null;
  currency?: string | null;
  note?: string | null;
  paymentTaken: false;
  status: PeachSupportIntentStatus;
  createdAt: string | null;
  updatedAt?: string | null;
  message?: string;
};

function unwrapData<T>(payload: T | { data: T }): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function submitPeachContribution(fieldSlug: string, payload: PeachContributionSubmission) {
  return apiFetch<PeachContributionSubmissionResponse>(
    `/api/peach/fields/${encodeURIComponent(fieldSlug)}/contributions`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function submitPeachConsentOperationRequest(payload: PeachConsentOperationSubmission) {
  return apiFetch<{ consentOperationRequest: PeachConsentOperationRequest }>('/api/peach/consent/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitPeachSupportIntent(fieldSlug: string, payload: PeachSupportIntentSubmission) {
  return apiFetch<{ supportIntent: PeachSupportIntent }>(
    `/api/peach/fields/${encodeURIComponent(fieldSlug)}/support-intents`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function listStewardPeachContributions(status: PeachReviewStatus = 'pending_review') {
  return controlFetchJson<{ contributions: PeachStewardContribution[] } | { data: { contributions: PeachStewardContribution[] } }>(
    `core/api/control/peach/contributions?status=${encodeURIComponent(status)}`,
  ).then((payload) => unwrapData<{ contributions: PeachStewardContribution[] }>(payload).contributions);
}

export function updateStewardPeachContributionReview(
  contributionId: number,
  payload: { reviewStatus: Exclude<PeachReviewStatus, 'pending_review'>; stewardNote?: string },
) {
  return controlFetchJson<{ contribution: PeachStewardContribution } | { data: { contribution: PeachStewardContribution } }>(
    `core/api/control/peach/contributions/${contributionId}/review`,
    {
      method: 'PATCH',
      body: JSON.stringify({ ...payload, publicDisplay: false }),
    },
  ).then((responsePayload) => unwrapData<{ contribution: PeachStewardContribution }>(responsePayload).contribution);
}

export function listStewardPeachConsentOperations(status: PeachConsentOperationStatus = 'pending_steward_review') {
  return controlFetchJson<
    { consentOperationRequests: PeachConsentOperationRequest[] } | { data: { consentOperationRequests: PeachConsentOperationRequest[] } }
  >(`core/api/control/peach/consent-operations?status=${encodeURIComponent(status)}`).then(
    (payload) => unwrapData<{ consentOperationRequests: PeachConsentOperationRequest[] }>(payload).consentOperationRequests,
  );
}

export function updateStewardPeachConsentOperation(
  requestId: number,
  payload: { status: Exclude<PeachConsentOperationStatus, 'pending_steward_review'>; stewardNote?: string },
) {
  return controlFetchJson<
    { consentOperationRequest: PeachConsentOperationRequest } | { data: { consentOperationRequest: PeachConsentOperationRequest } }
  >(`core/api/control/peach/consent-operations/${requestId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((responsePayload) => unwrapData<{ consentOperationRequest: PeachConsentOperationRequest }>(responsePayload).consentOperationRequest);
}

export function listStewardPeachSupportIntents(status?: PeachSupportIntentStatus) {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
  return controlFetchJson<{ supportIntents: PeachSupportIntent[] } | { data: { supportIntents: PeachSupportIntent[] } }>(
    `core/api/control/peach/support-intents${suffix}`,
  ).then((payload) => unwrapData<{ supportIntents: PeachSupportIntent[] }>(payload).supportIntents);
}
