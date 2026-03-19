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

const STEWARDSHIP_PILLARS = [
  'Signal intelligence with context',
  'Mutual-aid coordination in real time',
  'Transparent trust and governance surfaces',
] as const;

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState fullPage />;

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#2f4b67]/55 bg-[linear-gradient(140deg,#1b2c45_0%,#15253d_45%,#121f33_100%)] px-6 py-8 text-slate-100 shadow-[0_30px_60px_-36px_rgba(10,16,28,0.95)] md:px-10 md:py-12">
          <span className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#f0c886]/14 blur-3xl" />
          <span className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-[#3067a5]/18 blur-3xl" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.45fr_1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#f3d4a5]/85">Cultural operations home</p>
              <h1 className="mt-3 text-4xl font-semibold leading-[1.02] text-white md:text-[3.45rem]" style={{ fontFamily: 'var(--font-serif)' }}>
                Operate culture,
                <br />
                care, and governance
                <br />
                from one shared beacon.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-200/90 md:text-lg">
                `/home` is the steward workspace for members, organisers, and admins. Enter with an account to coordinate
                local action, then move between Manara signals, trust surfaces, and learning pathways without losing context.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/auth"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#ecc58a]/60 bg-[#f3c77b] px-6 text-sm font-semibold text-[#1e2a3b] shadow-[0_18px_34px_-20px_rgba(243,199,123,0.85)] transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Enter with account
                </Link>
                <Link
                  href="/manara"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/8 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/14"
                >
                  Explore Manara signals
                </Link>
              </div>

              <div className="mt-8 grid gap-2 sm:grid-cols-3">
                {STEWARDSHIP_PILLARS.map((pillar) => (
                  <div key={pillar} className="rounded-2xl border border-white/12 bg-white/[0.07] px-3 py-3 text-xs leading-5 text-slate-100/90 backdrop-blur-sm">
                    {pillar}
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-[1.4rem] border border-white/14 bg-white/[0.08] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm md:p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#f3d4a5]/85">Steward access</p>
              <h2 className="mt-3 text-2xl text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                Why sign in?
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-200/90">
                <li className="rounded-xl border border-white/10 bg-[#0f1b2d]/55 px-3 py-2">Save your learning progress and reflections.</li>
                <li className="rounded-xl border border-white/10 bg-[#0f1b2d]/55 px-3 py-2">Post to community streams with accountable identity.</li>
                <li className="rounded-xl border border-white/10 bg-[#0f1b2d]/55 px-3 py-2">Track pledges, resources, and node-level activity.</li>
              </ul>
              <p className="mt-4 text-xs leading-5 text-slate-300/90">
                If you are exploring for the first time, begin with the orientation flow below before entering steward mode.
              </p>
            </aside>
          </div>
        </section>

        <StartHereRail />
      </div>
    );
  }

  const role = user?.role || 'participant';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {role === 'platform_admin' && <SuperAdminDashboard />}
      {role === 'node_admin' && <TenantAdminDashboard />}
      {(role === 'organizer' || role === 'board_member' || role === 'treasury_guardian') && <OrganizerDashboard />}
      {role === 'merchant' && <MerchantDashboard />}
      {(role === 'participant' ||
        role === 'volunteer' ||
        !['platform_admin', 'node_admin', 'organizer', 'board_member', 'treasury_guardian', 'merchant'].includes(role)) && <VolunteerDashboard />}
    </div>
  );
}
