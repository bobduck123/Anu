'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar, Clock, Users, Leaf, TrendingUp } from 'lucide-react';
import { api, ImpactSummary } from '@/lib/api';
import { wcleApi } from '@/lib/api/wcleApi';
import { Card, CardTitle } from '@/ui-system/primitives/Card';
import { ProgressBar } from '@/ui-system/primitives/ProgressBar';
import { LoadingState } from '@/ui-system/states/LoadingState';

interface VolunteerData {
  impact: ImpactSummary | null;
  pledgeCount: number;
  savings: number;
}

export default function VolunteerDashboard() {
  const [data, setData] = useState<VolunteerData>({ impact: null, pledgeCount: 0, savings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [impact, pledges, savings] = await Promise.allSettled([
          api.engagement.getImpactSummary(),
          wcleApi.myPledges(),
          wcleApi.mySavings(),
        ]);
        setData({
          impact: impact.status === 'fulfilled' ? impact.value : null,
          pledgeCount: pledges.status === 'fulfilled' ? (pledges.value?.length || 0) : 0,
          savings: savings.status === 'fulfilled' ? (savings.value?.savings_lifetime_cents || 0) / 100 : 0,
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
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>Welcome back</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">Here&apos;s your community activity summary.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-sage-light)]">
              <TrendingUp className="w-5 h-5 text-[var(--color-forest)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Actions Completed</p>
              <p className="text-xl font-bold font-mono-data">{data.impact?.completions ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-institutional-light)]">
              <Calendar className="w-5 h-5 text-[var(--color-institutional)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Events Attended</p>
              <p className="text-xl font-bold font-mono-data">{data.impact?.events ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-accent-light)]">
              <Leaf className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Active Pledges</p>
              <p className="text-xl font-bold font-mono-data">{data.pledgeCount}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-sage-light)]">
              <Clock className="w-5 h-5 text-[var(--color-sage)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Savings</p>
              <p className="text-xl font-bold font-mono-data">${data.savings.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Points progress */}
      <Card padding="md">
        <CardTitle>Points Progress</CardTitle>
        <div className="mt-3">
          <ProgressBar value={data.impact?.points ?? 0} max={1000} color="institutional" showLabel />
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)] mt-2">
          {data.impact?.points ?? 0} / 1,000 points to next level
        </p>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" hover>
          <Link href="/actions" className="flex items-center gap-3">
            <Users className="w-6 h-6 text-[var(--color-sage)]" />
            <div>
              <p className="font-semibold">Browse Actions</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Find actions to participate in</p>
            </div>
          </Link>
        </Card>
        <Card padding="md" hover>
          <Link href="/calendar" className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-[var(--color-institutional)]" />
            <div>
              <p className="font-semibold">View Calendar</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Upcoming shifts and events</p>
            </div>
          </Link>
        </Card>
        <Card padding="md" hover>
          <Link href="/cost-lowering" className="flex items-center gap-3">
            <Leaf className="w-6 h-6 text-[var(--color-accent)]" />
            <div>
              <p className="font-semibold">Cost Lowering</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Join a WCLE run</p>
            </div>
          </Link>
        </Card>
      </div>
    </div>
  );
}
