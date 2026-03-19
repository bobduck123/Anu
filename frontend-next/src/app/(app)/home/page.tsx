'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/ui-system/states/LoadingState';
import VolunteerDashboard from './VolunteerDashboard';
import OrganizerDashboard from './OrganizerDashboard';
import MerchantDashboard from './MerchantDashboard';
import TenantAdminDashboard from './TenantAdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import { StartHereRail } from '@/components/onboarding/StartHereRail';

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState fullPage />;

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="card-civic">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-earth-medium)] mb-3">Personal Dashboard</p>
          <h1 className="text-3xl font-semibold text-[var(--color-earth-dark)] mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
            Sign in to open your node dashboard
          </h1>
          <p className="text-[var(--color-earth-medium)] leading-relaxed mb-6">
            `/home` is a personalized workspace for members, organisers, and admins. Public visitors should start from the commons landing page or the Manara feed.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/auth" className="btn-pill btn-pill-primary text-center">
              Sign in
            </Link>
            <Link href="/manara" className="btn-pill btn-pill-outline text-center">
              Open Manara
            </Link>
          </div>
        </div>

        <StartHereRail />
      </div>
    );
  }

  const role = user?.role || 'participant';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {role === 'platform_admin' && <SuperAdminDashboard />}
      {role === 'node_admin' && <TenantAdminDashboard />}
      {(role === 'organizer' || role === 'board_member' || role === 'treasury_guardian') && <OrganizerDashboard />}
      {role === 'merchant' && <MerchantDashboard />}
      {(role === 'participant' || role === 'volunteer' || !['platform_admin', 'node_admin', 'organizer', 'board_member', 'treasury_guardian', 'merchant'].includes(role)) && <VolunteerDashboard />}
    </div>
  );
}
