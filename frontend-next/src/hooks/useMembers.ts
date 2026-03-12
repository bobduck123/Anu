'use client';

import { useQuery } from '@tanstack/react-query';
import { api, MemberResponse } from '@/lib/api';
import { mockMembers } from '@/lib/mockData';

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
  try {
    const data = await api.members.getAll();
    return data.map((m, i) => transformMember(m, i));
  } catch (error) {
    console.warn('API failed, using mock data:', error);
    return mockMembers;
  }
}

export function useMembers(limit?: number) {
  return useQuery<Member[]>({
    queryKey: ['members', limit],
    queryFn: async () => {
      const members = await fetchMembers();
      return limit ? members.slice(0, limit) : members;
    },
    staleTime: STALE_TIME,
  });
}

export function useMemberStats() {
  return useQuery({
    queryKey: ['members', 'stats'],
    queryFn: async () => {
      try {
        const data = await api.members.getAll();
        return {
          total: data.length,
          validators: data.filter(m => m.role === 'validator').length,
          organizers: data.filter(m => m.role === 'organizer').length,
          activeNodes: new Set(data.map(m => m.node_id).filter(Boolean)).size,
        };
      } catch {
        return {
          total: 1247,
          validators: 156,
          organizers: 42,
          activeNodes: 12,
        };
      }
    },
    staleTime: STALE_TIME,
  });
}
