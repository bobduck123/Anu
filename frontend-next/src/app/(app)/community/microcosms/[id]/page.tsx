'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { Card, CardTitle } from '@/ui-system/primitives/Card';
import { Button } from '@/ui-system/primitives/Button';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { ErrorState } from '@/ui-system/states/ErrorState';
import { EmptyState } from '@/ui-system/states/EmptyState';

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
  const [detail, setDetail] = useState<MicrocosmDetail | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [d, a] = await Promise.allSettled([
        apiFetch<MicrocosmDetail>(`/api/hell/microcosms/${id}`),
        apiFetch<{ activity: ActivityItem[] }>(`/api/hell/microcosms/${id}/activity`),
      ]);
      if (d.status === 'fulfilled') setDetail(d.value);
      else setError('Microcosm not found.');
      if (a.status === 'fulfilled') setActivity(a.value.activity || []);
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
    try {
      const endpoint = detail.is_member ? 'leave' : 'join';
      await apiFetch(`/api/hell/microcosms/${id}/${endpoint}`, { method: 'POST' });
      await loadData();
    } catch {
      alert('Action failed. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <LoadingState fullPage message="Loading microcosm..." />;
  if (error || !detail) return <ErrorState message={error || 'Not found'} onRetry={loadData} />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/community" className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Community
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>{detail.name}</h1>
          {detail.description && (
            <p className="text-[var(--color-muted-foreground)] mt-2 max-w-2xl">{detail.description}</p>
          )}
        </div>
        <Button
          variant={detail.is_member ? 'outline' : 'primary'}
          icon={detail.is_member ? LogOut : LogIn}
          loading={joining}
          onClick={handleJoinLeave}
        >
          {detail.is_member ? 'Leave' : 'Join'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card padding="md">
          <p className="text-xs text-[var(--color-muted-foreground)]">Members</p>
          <p className="text-2xl font-bold font-mono-data">{detail.member_count}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-[var(--color-muted-foreground)]">Stories</p>
          <p className="text-2xl font-bold font-mono-data">{detail.story_count}</p>
        </Card>
        <Card padding="md">
          <p className="text-xs text-[var(--color-muted-foreground)]">Teams</p>
          <p className="text-2xl font-bold font-mono-data">{detail.team_count}</p>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card padding="md">
        <CardTitle>Recent Activity</CardTitle>
        {activity.length === 0 ? (
          <EmptyState icon={FileText} title="No activity yet" description="This microcosm is just getting started." />
        ) : (
          <div className="mt-4 space-y-3">
            {activity.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-[var(--color-muted-foreground)]" />
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
