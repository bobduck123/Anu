'use client';

import { useEffect, useState } from 'react';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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

export default function OrganiserCockpitPage() {
  const [needs, setNeeds] = useState<NeedsSignal[]>([]);
  const [profile, setProfile] = useState<CompetencyProfile | null>(null);
  const [analytics, setAnalytics] = useState<OrganizerAnalyticsSnapshot | null>(null);
  const [guilds, setGuilds] = useState<GuildRecommendation[]>([]);
  const [burnout, setBurnout] = useState<BurnoutSnapshot | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/needs-signals/`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/competency/profile`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/organiser-analytics/me`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/guilds/recommendations`, { headers: getAuthHeaders() }).then((r) => r.json()),
      fetch(`${API_BASE}/api/burnout-index/me`, { headers: getAuthHeaders() }).then((r) => r.json()),
    ])
      .then(([needsResp, profileResp, analyticsResp, guildResp, burnoutResp]: [
        { data?: { signals?: NeedsSignal[] } },
        { data?: { profile?: CompetencyProfile | null } },
        { data?: { snapshot?: OrganizerAnalyticsSnapshot | null } },
        { data?: { recommendations?: GuildRecommendation[] } },
        { data?: { snapshot?: BurnoutSnapshot | null } },
      ]) => {
        setNeeds(needsResp.data?.signals || []);
        setProfile(profileResp.data?.profile || null);
        setAnalytics(analyticsResp.data?.snapshot || null);
        setGuilds(guildResp.data?.recommendations || []);
        setBurnout(burnoutResp.data?.snapshot || null);
      })
      .catch(() => setError('Failed to load organiser intelligence'));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Organiser Intelligence
          </h1>
          <p className="text-[var(--color-muted-foreground)]">Your private cockpit for collaboration and readiness.</p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card-civic">
            <h2 className="text-lg font-semibold mb-2">Competency Summary</h2>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Proficiency level: {profile?.proficiency_level ?? '—'}
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Confidence: {profile?.confidence_score ?? '—'}
            </p>
          </div>
          <div className="card-civic">
            <h2 className="text-lg font-semibold mb-2">Performance Snapshot</h2>
            {!analytics && <p className="text-sm text-[var(--color-muted-foreground)]">No snapshot yet.</p>}
            {analytics && (
              <div className="text-sm space-y-1">
                <div>Events created: {analytics.events_created}</div>
                <div>Completion rate: {Math.round((analytics.completion_rate || 0) * 100)}%</div>
                <div>Compliance rate: {Math.round((analytics.compliance_checklist_pass_rate || 0) * 100)}%</div>
              </div>
            )}
          </div>
          <div className="card-civic">
            <h2 className="text-lg font-semibold mb-2">Burnout Advisory</h2>
            {!burnout && <p className="text-sm text-[var(--color-muted-foreground)]">No snapshot yet.</p>}
            {burnout && (
              <div className="text-sm space-y-1">
                <div>Load score: {burnout.load_score}</div>
                <div>Risk: {burnout.burnout_risk}</div>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card-civic">
            <h2 className="text-lg font-semibold mb-2">Where You’re Needed</h2>
            {needs.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No active signals.</p>}
            <div className="space-y-2">
              {needs.map((signal) => (
                <div key={signal.id} className="text-sm">
                  Severity {signal.severity_0_100}: {signal.reason_codes?.join(', ')}
                </div>
              ))}
            </div>
          </div>
          <div className="card-civic">
            <h2 className="text-lg font-semibold mb-2">Recommended Guilds</h2>
            {guilds.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No recommendations yet.</p>}
            <div className="space-y-2">
              {guilds.map((g) => (
                <div key={g.guild_id} className="text-sm">
                  Guild #{g.guild_id} — {g.reasons?.join(', ') || 'recommended'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


