'use client';

import { useQuery } from '@tanstack/react-query';
import { transparencyApi } from '@/lib/api/endpoints';

const STALE_TIME = 1000 * 60 * 5; // 5 minutes

interface CommonsStats {
  totalDistributed: number;
  totalMembers: number;
  validators: number;
  organizers: number;
  activeNodes: number;
  monthlyGrantsRemaining: number;
  avgProcessingDays: number;
  adminRatio: number;
}

async function fetchStats(): Promise<CommonsStats> {
  const summary = await transparencyApi.nodeSummary();

  return {
    totalDistributed: summary.totals.outflows_30d / 100,
    totalMembers: 0,
    validators: 0,
    organizers: 0,
    activeNodes: 0,
    monthlyGrantsRemaining: summary.relief_capacity.monthly_grants_remaining,
    avgProcessingDays: summary.relief_capacity.avg_processing_days,
    adminRatio: summary.totals.admin_ratio_30d,
  };
}

export function useStats() {
  return useQuery<CommonsStats>({
    queryKey: ['stats'],
    queryFn: fetchStats,
    staleTime: STALE_TIME,
  });
}

export function useTransparencySummary(node?: string) {
  return useQuery({
    queryKey: ['transparency', 'summary', node],
    queryFn: async () => transparencyApi.nodeSummary(node),
    staleTime: STALE_TIME,
  });
}

// Hook for animated counter with real data
export function useAnimatedStat(key: keyof CommonsStats) {
  const { data: stats, isLoading } = useStats();
  
  return {
    value: stats?.[key] || 0,
    isLoading,
  };
}
