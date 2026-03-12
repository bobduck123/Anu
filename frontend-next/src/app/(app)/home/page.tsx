'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/ui-system/states/LoadingState';
import VolunteerDashboard from './VolunteerDashboard';
import OrganizerDashboard from './OrganizerDashboard';
import MerchantDashboard from './MerchantDashboard';
import TenantAdminDashboard from './TenantAdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState fullPage />;

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
