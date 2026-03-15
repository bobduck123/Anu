'use client';

import { useQuery } from '@tanstack/react-query';
import { api, MemberResponse } from '@/lib/api';

const STALE_TIME = 1000 * 60 * 10; // 10 minutes

type MemberRole = 'participant' | 'organizer' | 'validator' | 'case_worker' |
                  'relief_moderator' | 'auditor' | 'board_member' | 'node_admin';

interface Member {
  name: string;
  pseudonym: string;
  role: MemberRole;
  impactScore: number;
  tier: 'seed' | 'sapling' | 'oak' | 'redwood';
  streakMonths: number;
  index: number;
  avatarUrl?: string;
}

function getTier(level: number): 'seed' | 'sapling' | 'oak' | 'redwood' {
  if (level >= 20) return 'redwood';
  if (level >= 10) return 'oak';
  if (level >= 5) return 'sapling';
  return 'seed';
}

function transformMember(m: MemberResponse, index: number): Member {
  return {
    name: m.pseudonym,
    pseudonym: m.pseudonym,
    role: m.role as MemberRole,
    impactScore: m.points,
    tier: getTier(m.level),
    streakMonths: 0,
    index,
  };
}

async function fetchMembers(): Promise<Member[]> {
  const data = await api.members.getAll();
  return data.map((m, i) => transformMember(m, i));
}

export function useMembers(limit?: number, options: { enabled?: boolean } = {}) {
  return useQuery<Member[]>({
    queryKey: ['members', limit],
    queryFn: async () => {
      const members = await fetchMembers();
      return limit ? members.slice(0, limit) : members;
    },
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
  });
}

export function useMemberStats(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['members', 'stats'],
    queryFn: async () => {
      const data = await api.members.getAll();
      return {
        total: data.length,
        validators: data.filter(m => m.role === 'validator').length,
        organizers: data.filter(m => m.role === 'organizer').length,
        activeNodes: new Set(data.map(m => m.node_id).filter(Boolean)).size,
      };
    },
    staleTime: STALE_TIME,
    enabled: options.enabled ?? true,
  });
}
