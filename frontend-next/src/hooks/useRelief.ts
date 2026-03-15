'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reliefApi, type ReliefRequestInput, type ReliefRequestStatus, type ReliefRequestRecord } from '@/lib/api/endpoints';

const STALE_TIME = 1000 * 60 * 2; // 2 minutes

type RequestStatus = 'submitted' | 'pending' | 'under_review' | 'approved' | 'approved_under_cap' | 'disbursed' | 'escalated';

interface ReliefRequest {
  id: string;
  amount: number;
  purpose: string;
  urgency: 'low' | 'medium' | 'high';
  status: RequestStatus;
  queuePosition: number;
  totalInQueue: number;
  submittedAt: string;
  estimatedDays: number;
  anonId: string;
  amount_requested_cents: number;
  description?: string;
  contact_preference: string;
}

function transformRequest(req: ReliefRequestRecord, index: number): ReliefRequest {
  const urgencyValue = req.urgency === 'low' || req.urgency === 'medium' || req.urgency === 'high'
    ? req.urgency
    : 'medium';
  return {
    id: String(req.request_id || req.id),
    amount: (req.amount_requested_cents || req.amount || 0) / 100,
    purpose: req.purpose || 'General assistance',
    urgency: urgencyValue,
    status: (req.status || 'pending').toLowerCase().replace(' ', '_') as RequestStatus,
    queuePosition: req.queue_position_estimate || index + 1,
    totalInQueue: 24,
    submittedAt: req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : 'Recently',
    estimatedDays: req.next_update_eta_hours ? Math.ceil(req.next_update_eta_hours / 24) : 3,
    anonId: req.anon_id || Math.random().toString(36).substring(2, 8).toUpperCase(),
    amount_requested_cents: req.amount_requested_cents || 0,
    description: req.description,
    contact_preference: req.contact_preference || 'in-app',
  };
}

async function fetchMyRequests(): Promise<ReliefRequest[]> {
  const requests = await reliefApi.myRequests();
  return requests.map((req, i) => transformRequest(req, i));
}

async function fetchQueue(): Promise<ReliefRequest[]> {
  const requests = await reliefApi.queue();
  return requests.map((req, i) => transformRequest(req, i));
}

export function useMyReliefRequests(options: { enabled?: boolean } = {}) {
  return useQuery<ReliefRequest[]>({
    queryKey: ['relief', 'my-requests'],
    queryFn: fetchMyRequests,
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useReliefQueue(options: { enabled?: boolean } = {}) {
  return useQuery<ReliefRequest[]>({
    queryKey: ['relief', 'queue'],
    queryFn: fetchQueue,
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useCreateReliefRequest() {
  const queryClient = useQueryClient();
  
  return useMutation<ReliefRequestStatus, Error, ReliefRequestInput>({
    mutationFn: reliefApi.createRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relief', 'my-requests'] });
    },
  });
}

export function useVoteOnRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, vote }: { requestId: number; vote: 'approve' | 'reject' }) =>
      reliefApi.vote(requestId, vote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relief', 'queue'] });
    },
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, amount_cents, second_approver_id }: 
      { requestId: number; amount_cents: number; second_approver_id?: number }) =>
      reliefApi.approve(requestId, amount_cents, second_approver_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relief'] });
    },
  });
}

export function useDisburseRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, amount_cents }: { requestId: number; amount_cents: number }) =>
      reliefApi.disburse(requestId, amount_cents),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relief'] });
    },
  });
}
