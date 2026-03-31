'use client';

import { ArrowRight, Compass, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  AnuActionLink,
  AnuChip,
  AnuHeroMetric,
  AnuHeroMetricsRail,
  AnuPageHero,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import VolunteerDashboard from './VolunteerDashboard';
import OrganizerDashboard from './OrganizerDashboard';
import MerchantDashboard from './MerchantDashboard';
import TenantAdminDashboard from './TenantAdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import { StartHereRail } from '@/components/onboarding/StartHereRail';

const STEWARDSHIP_PILLARS = [
  {
    label: 'Signal field',
    value: 'Context first',
    detail: 'Read community intelligence, channel signals, and stewardship activity without losing route clarity.',
  },
  {
    label: 'Mutual aid',
    value: 'Coordinate in real time',
    detail: 'Move between local action, savings, and support workflows from the same shell.',
  },
  {
    label: 'Trust surfaces',
    value: 'Visible governance',
    detail: 'Keep transparency, docs, and institutional legitimacy close to day-to-day work.',
  },
] as const;

const HOME_SUMMARY_BY_ROLE: Record<string, { title: string; detail: string }> = {
  platform_admin: {
    title: 'Platform stewardship spans every domain.',
    detail: 'Move between tenants, education, relief, and governance signals without dropping the shared shell context.',
  },
  node_admin: {
    title: 'Node administration lives inside the same cultural commons.',
    detail: 'Review local trust, education, and operational surfaces from a single anchored home route.',
  },
  organizer: {
    title: 'Organising work should feel coordinated, not fragmented.',
    detail: 'Keep fieldwork, member pathways, and local intelligence connected while moving through action-heavy flows.',
  },
  board_member: {
    title: 'Governance needs visibility without bureaucratic drag.',
    detail: 'Use the home route as a calm entry into decision support, legitimacy, and member stewardship.',
  },
  treasury_guardian: {
    title: 'Financial stewardship should remain legible and culturally grounded.',
    detail: 'Balance governance, savings, and institutional trust without falling into generic dashboard chrome.',
  },
  merchant: {
    title: 'Merchant work is part of the commons, not outside it.',
    detail: 'Track economic participation and local contribution while staying connected to community and education surfaces.',
  },
  participant: {
    title: 'Your home route should keep learning, action, and belonging connected.',
    detail: 'Return here to move between community participation, education, and next-step tasks.',
  },
  volunteer: {
    title: 'Volunteer pathways need clear next steps and social context.',
    detail: 'Use home as the place where service, learning, and local contribution stay aligned.',
  },
};

function formatRoleLabel(role: string) {
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState fullPage />;

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <AnuPageHero
          eyebrow="Cultural operations home"
          title={
            <>
              Operate culture,
              <br />
              care, and governance
              <br />
              from one shared beacon.
            </>
          }
          description={
            <>
              <span className="font-medium text-white">/home</span> is the steward workspace for members, organisers, and
              admins. Enter with an account to coordinate local action, then move between Manara signals, trust surfaces,
              and learning pathways without losing context.
            </>
          }
          actions={
            <>
              <AnuActionLink href="/auth" tone="primary" iconLeft={ShieldCheck} iconRight={ArrowRight}>
                Enter with account
              </AnuActionLink>
              <AnuActionLink href="/manara" tone="secondary" iconLeft={Compass} iconRight={ArrowRight}>
                Explore Manara signals
              </AnuActionLink>
            </>
          }
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full p-5 md:p-6">
              <p className="anu-lab-kicker">Steward access</p>
              <h2 className="mt-3 text-2xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
                Why sign in?
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <AnuChip tone="accent">Accountable identity</AnuChip>
                <AnuChip tone="muted">Saved progress</AnuChip>
                <AnuChip tone="muted">Node activity</AnuChip>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-200/90">
                <li className="rounded-xl border border-white/10 bg-[#0f1b2d]/55 px-3 py-2">Save your learning progress and reflections.</li>
                <li className="rounded-xl border border-white/10 bg-[#0f1b2d]/55 px-3 py-2">Post to community streams with accountable identity.</li>
                <li className="rounded-xl border border-white/10 bg-[#0f1b2d]/55 px-3 py-2">Track pledges, resources, and node-level activity.</li>
              </ul>
              <p className="mt-4 text-xs leading-5 text-slate-300/90">
                If you are exploring for the first time, begin with the orientation flow below before entering steward mode.
              </p>
            </AnuSurfacePanel>
          }
        >
          <AnuHeroMetricsRail columns="three" className="sm:grid-cols-3">
            {STEWARDSHIP_PILLARS.map((pillar) => (
              <AnuHeroMetric key={pillar.label} label={pillar.label} value={pillar.value} detail={pillar.detail} />
            ))}
          </AnuHeroMetricsRail>
        </AnuPageHero>

        <StartHereRail />
      </div>
    );
  }

  const role = user?.role || 'participant';
  const roleSummary = HOME_SUMMARY_BY_ROLE[role] ?? HOME_SUMMARY_BY_ROLE.participant;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <AnuSurfacePanel tone="soft" className="p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="anu-lab-kicker">Home beacon</p>
            <h1 className="mt-3 text-3xl text-white md:text-[2.6rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              {roleSummary.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-200/86 md:text-base">{roleSummary.detail}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <AnuChip tone="accent">Role: {formatRoleLabel(role)}</AnuChip>
            <AnuChip tone="muted">Shared shell</AnuChip>
            <AnuChip tone="muted">Route continuity</AnuChip>
          </div>
        </div>
      </AnuSurfacePanel>

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
