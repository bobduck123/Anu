'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import { getParticipantAuthHeaders } from '@/lib/api/client';
import { buildOrganizerOnRampHref } from '@/lib/auth/returnTo';
import { HoverBubble } from '@/ui-system/primitives/HoverBubble';

const API_BASE = getCoreApiBase();

const getAuthHeaders = async (): Promise<Record<string, string>> =>
  getParticipantAuthHeaders({ allowLegacyTokenFallback: false });

type NeedsSignal = {
  id: number | string;
  severity_0_100?: number;
  reason_codes?: string[];
};

type CompetencyProfile = {
  proficiency_level?: string;
  confidence_score?: number;
};

type OrganizerAnalyticsSnapshot = {
  events_created?: number;
  completion_rate?: number;
  compliance_checklist_pass_rate?: number;
};

type GuildRecommendation = {
  guild_id: number | string;
  reasons?: string[];
};

type BurnoutSnapshot = {
  load_score?: number;
  burnout_risk?: string;
};

const fallbackNeeds: NeedsSignal[] = [
  { id: 'fallback-needs-1', severity_0_100: 62, reason_codes: ['event_follow_up'] },
  { id: 'fallback-needs-2', severity_0_100: 55, reason_codes: ['care_lane_review'] },
];

const fallbackProfile: CompetencyProfile = {
  proficiency_level: 'developing',
  confidence_score: 0.58,
};

const fallbackAnalytics: OrganizerAnalyticsSnapshot = {
  events_created: 3,
  completion_rate: 0.74,
  compliance_checklist_pass_rate: 0.82,
};

const fallbackGuilds: GuildRecommendation[] = [
  { guild_id: 'care-coordination', reasons: ['Needs signal overlap'] },
  { guild_id: 'field-stewardship', reasons: ['Strong execution pattern'] },
];

const fallbackBurnout: BurnoutSnapshot = {
  load_score: 41,
  burnout_risk: 'moderate',
};

async function readJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: await getAuthHeaders() });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export default function OrganiserCockpitPage() {
  const [needs, setNeeds] = useState<NeedsSignal[]>([]);
  const [profile, setProfile] = useState<CompetencyProfile | null>(null);
  const [analytics, setAnalytics] = useState<OrganizerAnalyticsSnapshot | null>(null);
  const [guilds, setGuilds] = useState<GuildRecommendation[]>([]);
  const [burnout, setBurnout] = useState<BurnoutSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setNotice(null);

      const [
        needsResp,
        profileResp,
        analyticsResp,
        guildResp,
        burnoutResp,
      ] = await Promise.all([
        readJson<{ data?: { signals?: NeedsSignal[] } }>(`${API_BASE}/api/needs-signals/`),
        readJson<{ data?: { profile?: CompetencyProfile | null } }>(`${API_BASE}/api/competency/profile`),
        readJson<{ data?: { snapshot?: OrganizerAnalyticsSnapshot | null } }>(`${API_BASE}/api/organiser-analytics/me`),
        readJson<{ data?: { recommendations?: GuildRecommendation[] } }>(`${API_BASE}/api/guilds/recommendations`),
        readJson<{ data?: { snapshot?: BurnoutSnapshot | null } }>(`${API_BASE}/api/burnout-index/me`),
      ]);

      if (!active) {
        return;
      }

      const nextNeeds = needsResp?.data?.signals ?? fallbackNeeds;
      const nextProfile = profileResp?.data?.profile ?? fallbackProfile;
      const nextAnalytics = analyticsResp?.data?.snapshot ?? fallbackAnalytics;
      const nextGuilds = guildResp?.data?.recommendations ?? fallbackGuilds;
      const nextBurnout = burnoutResp?.data?.snapshot ?? fallbackBurnout;

      setNeeds(nextNeeds);
      setProfile(nextProfile);
      setAnalytics(nextAnalytics);
      setGuilds(nextGuilds);
      setBurnout(nextBurnout);

      const allUnavailable = !needsResp && !profileResp && !analyticsResp && !guildResp && !burnoutResp;
      const someUnavailable = !allUnavailable && (!needsResp || !profileResp || !analyticsResp || !guildResp || !burnoutResp);

      if (allUnavailable) {
        setError('Live organizer intelligence is unavailable in this environment.');
        setNotice('Working now: fallback readiness snapshots remain visible while intelligence services recover.');
      } else if (someUnavailable) {
        setNotice('Working now: partial fallback snapshots are shown while remaining intelligence feeds recover.');
      }

      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-5">
        <header className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Organizer intelligence
            </h1>
            <HoverBubble title="What this tracks" align="right">
              Focus on readiness, workload, and where your organizer effort is needed next.
            </HoverBubble>
          </div>
          <p className="text-sm text-[color:rgba(246,212,203,0.8)]">A concise readiness view for day-to-day organizer decisions.</p>
        </header>

        {loading ? <div className="card-civic text-sm text-[color:rgba(246,212,203,0.8)]">Loading intelligence signals…</div> : null}

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="space-y-2 min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Link href={buildOrganizerOnRampHref('/organizer/intelligence')} className="btn-pill btn-pill-outline text-xs">
                    Organizer path
                  </Link>
                  <Link href="/events" className="btn-pill btn-pill-outline text-xs">
                    Open events
                  </Link>
                  <Link href="/profile" className="btn-pill btn-pill-outline text-xs">
                    Open profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-4">
          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.64)]">Competency</p>
            <p className="text-sm text-[var(--color-foreground)]">Level: {profile?.proficiency_level ?? '—'}</p>
            <p className="text-sm text-[color:rgba(246,212,203,0.78)]">Confidence: {Math.round((profile?.confidence_score ?? 0) * 100)}%</p>
          </article>

          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.64)]">Performance</p>
            <p className="text-sm text-[var(--color-foreground)]">Events created: {analytics?.events_created ?? 0}</p>
            <p className="text-sm text-[color:rgba(246,212,203,0.78)]">Completion: {Math.round((analytics?.completion_rate ?? 0) * 100)}%</p>
            <p className="text-sm text-[color:rgba(246,212,203,0.78)]">Compliance: {Math.round((analytics?.compliance_checklist_pass_rate ?? 0) * 100)}%</p>
          </article>

          <article className="card-civic space-y-1">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.64)]">Burnout advisory</p>
            <p className="text-sm text-[var(--color-foreground)]">Load score: {burnout?.load_score ?? '—'}</p>
            <p className="text-sm text-[color:rgba(246,212,203,0.78)]">Risk: {burnout?.burnout_risk ?? '—'}</p>
          </article>

          <article className="card-civic space-y-2">
            <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.64)]">Recommended guilds</p>
            {guilds.length === 0 ? <p className="text-sm text-[color:rgba(246,212,203,0.78)]">No recommendations yet.</p> : null}
            <div className="space-y-1">
              {guilds.map((guild) => (
                <p key={guild.guild_id} className="text-sm text-[var(--color-foreground)]">
                  {String(guild.guild_id)} — {guild.reasons?.join(', ') || 'recommended'}
                </p>
              ))}
            </div>
          </article>
        </div>

        <details className="card-civic">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-foreground)]">Show detailed needs signals</summary>
          <div className="mt-3 space-y-2">
            {needs.length === 0 ? <p className="text-sm text-[color:rgba(246,212,203,0.78)]">No active needs signals.</p> : null}
            {needs.map((signal) => (
              <p key={signal.id} className="text-sm text-[color:rgba(246,212,203,0.82)]">
                Severity {signal.severity_0_100 ?? '—'} — {signal.reason_codes?.join(', ') || 'No reason codes'}
              </p>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}




