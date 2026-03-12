// React Query hooks with mock data fallback
// All hooks gracefully fall back to mock data when API is unavailable

export { usePools, usePoolDashboard } from './usePools';
export { 
  useMyReliefRequests, 
  useReliefQueue, 
  useCreateReliefRequest,
  useVoteOnRequest,
  useApproveRequest,
  useDisburseRequest 
} from './useRelief';
export { useMembers, useMemberStats } from './useMembers';
export { useStats, useTransparencySummary, useAnimatedStat } from './useStats';
