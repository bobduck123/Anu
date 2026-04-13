'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import { getParticipantAuthHeaders } from '@/lib/api/client';
import { buildOrganizerOnRampHref } from '@/lib/auth/returnTo';
import { HoverBubble } from '@/ui-system/primitives/HoverBubble';

const API_BASE = getCoreApiBase();

const getAuthHeaders = async (): Promise<Record<string, string>> =>
  getParticipantAuthHeaders({ allowLegacyTokenFallback: false });

type GuildSummary = {
  id: number | string;
  name: string;
  type?: string;
  description?: string;
};

const fallbackGuilds: GuildSummary[] = [
  {
    id: 'care-coordination',
    name: 'Care coordination guild',
    type: 'response',
    description: 'Handles response rhythm, care queue transitions, and relief follow-through.',
  },
  {
    id: 'field-stewardship',
    name: 'Field stewardship guild',
    type: 'operations',
    description: 'Supports events, actions, and practical organizer execution routines.',
  },
  {
    id: 'governance-bridge',
    name: 'Governance bridge guild',
    type: 'alignment',
    description: 'Links organizer work with governance checks and continuity signals.',
  },
];

export default function GuildDirectoryPage() {
  const [guilds, setGuilds] = useState<GuildSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        const response = await fetch(`${API_BASE}/api/guilds/`, { headers: await getAuthHeaders() });
        if (!response.ok) {
          throw new Error('request_failed');
        }

        const data = (await response.json()) as { data?: { guilds?: GuildSummary[] } };
        if (!active) return;
        setGuilds(data.data?.guilds || []);
      } catch {
        if (!active) return;
        setGuilds(fallbackGuilds);
        setError('Live guild directory is unavailable in this environment.');
        setNotice('Working now: fallback guild lanes are visible while directory services recover.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
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
              Organizer guilds
            </h1>
            <HoverBubble title="Guild purpose" align="right">
              Guilds are small operating cohorts used to keep organizer work coordinated and resilient.
            </HoverBubble>
          </div>
          <p className="text-sm text-[color:rgba(246,212,203,0.8)]">Pick a guild to inspect members, rotations, and assignment context.</p>
        </header>

        {loading ? <div className="card-civic text-sm text-[color:rgba(246,212,203,0.8)]">Loading guild directory…</div> : null}

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="space-y-2 min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Link href={buildOrganizerOnRampHref('/organizer/guilds')} className="btn-pill btn-pill-outline text-xs">
                    Organizer path
                  </Link>
                  <Link href="/organizer/intelligence" className="btn-pill btn-pill-outline text-xs">
                    Intelligence
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-4">
          {guilds.map((guild) => (
            <Link key={guild.id} href={`/organizer/guilds/${guild.id}`} className="card-civic hover:shadow-sm transition-shadow space-y-2">
              <p className="text-lg font-semibold text-[var(--color-foreground)]">{guild.name}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-[color:rgba(246,212,203,0.64)]">{guild.type || 'general'}</p>
              <p className="text-sm text-[color:rgba(246,212,203,0.82)]">{guild.description || 'No description yet.'}</p>
              <p className="inline-flex items-center gap-1 text-xs text-[var(--color-foreground)]">
                Open guild <ArrowRight className="h-3.5 w-3.5" />
              </p>
            </Link>
          ))}
          {!loading && guilds.length === 0 ? <p className="text-sm text-[color:rgba(246,212,203,0.78)]">No guilds available yet.</p> : null}
        </div>

        <details className="card-civic">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-foreground)]">Show matching notes</summary>
          <p className="mt-3 text-sm text-[color:rgba(246,212,203,0.8)]">
            Guild matching uses needs signals, competency context, and current load to suggest likely-fit cohorts.
          </p>
        </details>
      </div>
    </div>
  );
}




