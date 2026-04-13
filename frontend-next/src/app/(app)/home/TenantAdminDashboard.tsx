'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Shield, BarChart3, Settings } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/ui-system/primitives/Card';
import { LoadingState } from '@/ui-system/states/LoadingState';

interface AdminData {
  memberCount: number;
  activeModules: number;
  recentActivity: Array<{ id: number; description: string; created_at: string }>;
}

export default function TenantAdminDashboard() {
  const [data, setData] = useState<AdminData>({ memberCount: 0, activeModules: 0, recentActivity: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [membersRes] = await Promise.allSettled([
          api.members.getAll(),
        ]);
        setData({
          memberCount: membersRes.status === 'fulfilled' ? (membersRes.value?.length || 0) : 0,
          activeModules: 8,
          recentActivity: [],
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
        <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>Tenant Administration</h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">Node-level overview and management.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-institutional-light)]">
              <Users className="w-5 h-5 text-[var(--color-institutional)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Total Members</p>
              <p className="text-xl font-bold font-mono-data">{data.memberCount}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-sage-light)]">
              <Settings className="w-5 h-5 text-[var(--color-forest)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Active Modules</p>
              <p className="text-xl font-bold font-mono-data">{data.activeModules}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-accent-light)]">
              <BarChart3 className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Recent Activity</p>
              <p className="text-xl font-bold font-mono-data">{data.recentActivity.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card padding="md" hover>
          <Link href="/control/tenants" className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[var(--color-forest)]" />
            <div>
              <p className="font-semibold">Tenant Config</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Manage modules and branding</p>
            </div>
          </Link>
        </Card>
        <Card padding="md" hover>
          <Link href="/control/relief" className="flex items-center gap-3">
            <Users className="w-6 h-6 text-[var(--color-institutional)]" />
            <div>
              <p className="font-semibold">Relief Queue</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Review pending requests</p>
            </div>
          </Link>
        </Card>
        <Card padding="md" hover>
          <Link href="/control/ledger" className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-[var(--color-accent)]" />
            <div>
              <p className="font-semibold">Ledger Explorer</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Browse all transactions</p>
            </div>
          </Link>
        </Card>
      </div>
    </div>
  );
}
