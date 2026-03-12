'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, Users, Calendar, ClipboardList } from 'lucide-react';
import { api } from '@/lib/api';
import { wcleApi } from '@/lib/api/wcleApi';
import { Card, CardTitle } from '@/ui-system/primitives/Card';
import { LoadingState } from '@/ui-system/states/LoadingState';
import { StatusBadge } from '@/ui-system/primitives/StatusBadge';

interface OrganizerData {
  runs: Array<{ id: number; title: string; status: string; participant_count: number }>;
  teamCount: number;
  eventsHosted: number;
}

export default function OrganizerDashboard() {
  const [data, setData] = useState<OrganizerData>({ runs: [], teamCount: 0, eventsHosted: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [runsRes, statusRes] = await Promise.allSettled([
          wcleApi.listRuns(),
          api.organizer.getStatus(),
        ]);
        setData({
          runs: runsRes.status === 'fulfilled'
            ? (runsRes.value.runs || []).slice(0, 5).map((run) => ({
              id: run.id,
              title: run.title,
              status: run.status.toLowerCase(),
              participant_count: run.pledge_count ?? 0,
            }))
            : [],
          teamCount: statusRes.status === 'fulfilled' ? (statusRes.value?.team_count || 0) : 0,
          eventsHosted: statusRes.status === 'fulfilled' ? (statusRes.value?.events_hosted || 0) : 0,
        });
      } catch { /* graceful */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <LoadingState variant="skeleton" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>Organizer Dashboard</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">Manage your runs, teams, and events.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-institutional-light)]">
              <ClipboardList className="w-5 h-5 text-[var(--color-institutional)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Active Runs</p>
              <p className="text-xl font-bold font-mono-data">{data.runs.length}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-sage-light)]">
              <Users className="w-5 h-5 text-[var(--color-forest)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Team Members</p>
              <p className="text-xl font-bold font-mono-data">{data.teamCount}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-accent-light)]">
              <Calendar className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Events Hosted</p>
              <p className="text-xl font-bold font-mono-data">{data.eventsHosted}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Runs */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Recent Runs</CardTitle>
          <Link href="/organizer" className="text-sm text-[var(--color-primary)] hover:underline">View All</Link>
        </div>
        <div className="space-y-3">
          {data.runs.map((run) => (
            <Link
              key={run.id}
              href={`/organizer/runs/${run.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
            >
              <div>
                <p className="font-medium text-sm">{run.title}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{run.participant_count} participants</p>
              </div>
              <StatusBadge status={run.status as 'open' | 'closed' | 'draft'} />
            </Link>
          ))}
          {data.runs.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">No runs yet.</p>
          )}
        </div>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card padding="md" hover>
          <Link href="/organizer/intelligence" className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-[var(--color-institutional)]" />
            <div>
              <p className="font-semibold">Analytics Cockpit</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">View detailed analytics</p>
            </div>
          </Link>
        </Card>
        <Card padding="md" hover>
          <Link href="/teams" className="flex items-center gap-3">
            <Users className="w-6 h-6 text-[var(--color-sage)]" />
            <div>
              <p className="font-semibold">Manage Teams</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">View and manage your teams</p>
            </div>
          </Link>
        </Card>
      </div>
    </div>
  );
}
