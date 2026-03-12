'use client';

import { useQuery } from '@tanstack/react-query';
import { transparencyApi } from '@/lib/api/endpoints';
import { mockStats, mockTransparencySummary } from '@/lib/mockData';

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
  try {
    // Try to get stats from transparency API
    const summary = await transparencyApi.nodeSummary();
    
    return {
      totalDistributed: summary.totals.outflows_30d / 100,
      totalMembers: mockStats.totalMembers, // Not in transparency API
      validators: mockStats.validators,
      organizers: mockStats.organizers,
      activeNodes: mockStats.activeNodes,
      monthlyGrantsRemaining: summary.relief_capacity.monthly_grants_remaining,
      avgProcessingDays: summary.relief_capacity.avg_processing_days,
      adminRatio: summary.totals.admin_ratio_30d,
    };
  } catch (error) {
    console.warn('API failed, using mock data:', error);
    return mockStats;
  }
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
    queryFn: async () => {
      try {
        return await transparencyApi.nodeSummary(node);
      } catch (error) {
        console.warn('API failed, using mock data:', error);
        return mockTransparencySummary;
      }
    },
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
