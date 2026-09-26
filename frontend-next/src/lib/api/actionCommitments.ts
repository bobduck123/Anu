import { apiFetch } from '@/lib/api/client';

export type CommitmentStatus = 'CONFIRMED' | 'CANCELLED' | 'PENDING_REVIEW' | 'NEEDS_CHANGES' | 'VERIFIED';

export interface ActionCommitment {
  id: number;
  action_id: number;
  action_title: string;
  status: CommitmentStatus;
  evidence_url: string | null;
  evidence_note: string | null;
  review_note: string | null;
  confirmed_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  awarded_points: number | null;
  participant_id?: number;
  participant_name?: string;
}

const base = '/api/commitments';

export const actionCommitmentsApi = {
  forAction: (actionId: string) => apiFetch<ActionCommitment | null>(`${base}/actions/${actionId}`),
  confirm: (actionId: string) => apiFetch<ActionCommitment>(`${base}/actions/${actionId}`, { method: 'POST' }),
  mine: () => apiFetch<ActionCommitment[]>(`${base}/mine`),
  cancel: (id: number) => apiFetch<ActionCommitment>(`${base}/${id}/cancel`, { method: 'POST' }),
  complete: (id: number, evidenceUrl: string, evidenceNote: string) =>
    apiFetch<ActionCommitment>(`${base}/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ evidence_url: evidenceUrl, evidence_note: evidenceNote }),
    }),
  reviewQueue: () => apiFetch<ActionCommitment[]>(`${base}/review-queue`),
  review: (id: number, decision: 'verify' | 'request_changes', reviewNote: string) =>
    apiFetch<ActionCommitment>(`${base}/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, review_note: reviewNote }),
    }),
  publicOutcome: (actionId: string) => apiFetch<{ action_id: number; verified_outcomes: number }>(`${base}/actions/${actionId}/outcome`),
};
