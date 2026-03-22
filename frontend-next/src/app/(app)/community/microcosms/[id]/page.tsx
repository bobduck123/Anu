'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  LogIn,
  LogOut,
  Users,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { ErrorState } from '@/ui-system/states/ErrorState';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  AnuChamberCard,
  AnuChip,
  AnuControlButton,
  AnuPageHero,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';

interface MicrocosmDetail {
  id: number;
  name: string;
  description: string;
  member_count: number;
  is_member: boolean;
  story_count: number;
  team_count: number;
}

interface ActivityItem {
  type: string;
  id: number;
  title: string;
  created_at: string;
}

export default function MicrocosmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState<MicrocosmDetail | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    setActionError(null);
    try {
      const [detailResult, activityResult] = await Promise.allSettled([
        apiFetch<MicrocosmDetail>(`/api/hell/microcosms/${id}`),
        apiFetch<{ activity: ActivityItem[] }>(`/api/hell/microcosms/${id}/activity`),
      ]);
      if (detailResult.status === 'fulfilled') {
        setDetail(detailResult.value);
      } else {
        setError('Microcosm not found.');
      }
      if (activityResult.status === 'fulfilled') {
        setActivity(activityResult.value.activity || []);
      }
    } catch {
      setError('Failed to load microcosm.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleJoinLeave = async () => {
    if (!detail) return;
    setJoining(true);
    setActionError(null);
    try {
      const endpoint = detail.is_member ? 'leave' : 'join';
      await apiFetch(`/api/hell/microcosms/${id}/${endpoint}`, { method: 'POST' });
      await loadData();
    } catch {
      setActionError('Action failed. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <LoadingState fullPage message="Loading microcosm..." />;
  if (error || !detail) return <ErrorState message={error || 'Not found'} onRetry={loadData} />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <AnuPageHero
        eyebrow="Microcosm chamber"
        title={detail.name}
        description={detail.description || 'No description yet.'}
        actions={
          <>
            <AnuControlButton onClick={() => router.back()} tone="default" iconLeft={ArrowLeft}>
              Back
            </AnuControlButton>
            <AnuControlButton
              onClick={() => void handleJoinLeave()}
              tone={detail.is_member ? 'default' : 'active'}
              iconLeft={detail.is_member ? LogOut : LogIn}
              disabled={joining}
            >
              {joining ? 'Working...' : detail.is_member ? 'Leave microcosm' : 'Join microcosm'}
            </AnuControlButton>
          </>
        }
        aside={
          <AnuSurfacePanel tone="quiet" className="h-full">
            <div className="flex flex-wrap gap-2">
              <AnuChip tone={detail.is_member ? 'signal' : 'muted'}>{detail.is_member ? 'Member' : 'Observer'}</AnuChip>
              <AnuChip tone="muted">{detail.member_count} members</AnuChip>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300/84">
              A microcosm is a local place inside the commons, with its own rhythm, stories, and teams.
            </p>
          </AnuSurfacePanel>
        }
      />

      {actionError ? (
        <div className="mt-6 rounded-2xl border border-[rgba(216,169,95,0.22)] bg-[rgba(216,169,95,0.08)] px-4 py-3 text-sm text-[#f4dbc2]">
          {actionError}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <AnuSurfacePanel tone="soft">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Members</p>
          <p className="mt-3 text-3xl font-semibold text-white font-mono-data">{detail.member_count}</p>
        </AnuSurfacePanel>
        <AnuSurfacePanel tone="soft">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Stories</p>
          <p className="mt-3 text-3xl font-semibold text-white font-mono-data">{detail.story_count}</p>
        </AnuSurfacePanel>
        <AnuSurfacePanel tone="soft">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Teams</p>
          <p className="mt-3 text-3xl font-semibold text-white font-mono-data">{detail.team_count}</p>
        </AnuSurfacePanel>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <AnuChamberCard eyebrow="Activity" title="Recent movement">
          {activity.length ? (
            <div className="space-y-3">
              {activity.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-white">{item.title}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-300/82">This microcosm is just getting started.</p>
          )}
        </AnuChamberCard>

        <AnuChamberCard eyebrow="Relation" title="What this chamber holds">
          <div className="space-y-3 text-sm leading-6 text-slate-300/82">
            <p>Microcosms anchor local membership, stories, and team formation inside a place-aware chamber.</p>
            <p>Teams should emerge from here rather than floating as disconnected organizational objects.</p>
          </div>
          <div className="mt-5 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-300/82">{detail.team_count} team chambers currently linked.</span>
          </div>
        </AnuChamberCard>
      </div>
    </div>
  );
}
