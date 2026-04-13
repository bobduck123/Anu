'use client';

import Link from 'next/link';
import { Globe, Shield, Users, Database, Activity, Plus } from 'lucide-react';
import { Card, CardTitle } from '@/ui-system/primitives/Card';
import { Button } from '@/ui-system/primitives/Button';

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>Platform Administration</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">System-wide overview and provisioning.</p>
        </div>
        <Link href="/control/tenants/create">
          <Button variant="primary" icon={Plus}>Provision Tenant</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-institutional-light)]">
              <Globe className="w-5 h-5 text-[var(--color-institutional)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Active Nodes</p>
              <p className="text-xl font-bold font-mono-data">--</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-sage-light)]">
              <Users className="w-5 h-5 text-[var(--color-forest)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">Total Users</p>
              <p className="text-xl font-bold font-mono-data">--</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-accent-light)]">
              <Activity className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">System Health</p>
              <p className="text-xl font-bold text-[var(--color-forest)]">OK</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-danger-light)]">
              <Database className="w-5 h-5 text-[var(--color-danger)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted-foreground)]">DB Status</p>
              <p className="text-xl font-bold text-[var(--color-forest)]">Online</p>
            </div>
          </div>
        </Card>
      </div>

      <CardTitle>Quick Actions</CardTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card padding="md" hover>
          <Link href="/control/tenants" className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-[var(--color-institutional)]" />
            <div>
              <p className="font-semibold">All Tenants</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">View and manage all nodes</p>
            </div>
          </Link>
        </Card>
        <Card padding="md" hover>
          <Link href="/governance/federation" className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[var(--color-forest)]" />
            <div>
              <p className="font-semibold">Federation</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Cross-node governance</p>
            </div>
          </Link>
        </Card>
        <Card padding="md" hover>
          <Link href="/control/ledger" className="flex items-center gap-3">
            <Database className="w-6 h-6 text-[var(--color-accent)]" />
            <div>
              <p className="font-semibold">Global Ledger</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">All transactions across nodes</p>
            </div>
          </Link>
        </Card>
      </div>
    </div>
  );
}
