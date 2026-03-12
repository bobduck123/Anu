'use client';

import { useQuery } from '@tanstack/react-query';
import { poolsApi, type ImpactPool } from '@/lib/api/endpoints';
import { mockPools } from '@/lib/mockData';

const STALE_TIME = 1000 * 60 * 5; // 5 minutes

interface PoolWithUI extends ImpactPool {
  balance: number;
  targetAmount?: number;
  allocationPercent: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  color: 'sage' | 'forest' | 'institutional' | 'accent';
  icon: 'heart' | 'shield' | 'sprout';
  sparklineData: number[];
}

function transformPool(pool: ImpactPool): PoolWithUI {
  // Map pool categories to UI colors/icons
  const config: Record<string, { color: PoolWithUI['color']; icon: PoolWithUI['icon'] }> = {
    relief: { color: 'sage', icon: 'heart' },
    sovereignty: { color: 'institutional', icon: 'shield' },
    infrastructure: { color: 'accent', icon: 'sprout' },
  };
  
  const c = config[pool.category || 'relief'] || config.relief;
  
  return {
    ...pool,
    balance: pool.current_balance_cents / 100,
    targetAmount: pool.target_amount_cents ? pool.target_amount_cents / 100 : undefined,
    allocationPercent: 33, // Would come from ledger calculation
    trend: 'up',
    trendValue: '+5% this month',
    color: c.color,
    icon: c.icon,
    sparklineData: Array.from({ length: 12 }, () => Math.floor(Math.random() * 50) + 20),
  };
}

async function fetchPools(): Promise<PoolWithUI[]> {
  try {
    const pools = await poolsApi.list();
    return pools.map(transformPool);
  } catch (error) {
    console.warn('API failed, using mock data:', error);
    // Return mock data transformed to match PoolWithUI
    return mockPools;
  }
}

export function usePools() {
  return useQuery<PoolWithUI[]>({
    queryKey: ['pools'],
    queryFn: fetchPools,
    staleTime: STALE_TIME,
  });
}

export function usePoolDashboard(poolId: number) {
  return useQuery({
    queryKey: ['pool', poolId, 'dashboard'],
    queryFn: () => poolsApi.dashboard(poolId),
    staleTime: STALE_TIME,
    enabled: !!poolId,
  });
}
