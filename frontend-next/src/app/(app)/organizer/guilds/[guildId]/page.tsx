'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { getCoreApiBase } from '@/lib/runtime';
import { HoverBubble } from '@/ui-system/primitives/HoverBubble';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type GuildMember = {
  user_id: number | string;
  role?: string;
};

type GuildRotation = {
  role_name: string;
  current_user_id?: number | string | null;
};

type GuildData = {
  guild?: {
    name?: string;
    description?: string;
  };
  members?: GuildMember[];
  rotations?: GuildRotation[];
};

function buildFallbackGuild(guildId: string): GuildData {
  return {
    guild: {
      name: `Guild ${guildId}`,
      description: 'Fallback guild profile while live guild services recover.',
    },
    members: [
      { user_id: 'pending-1', role: 'coordinator' },
      { user_id: 'pending-2', role: 'reviewer' },
    ],
    rotations: [
      { role_name: 'Week lead', current_user_id: 'pending-1' },
      { role_name: 'Care lane owner', current_user_id: null },
    ],
  };
}

export default function GuildDetailPage() {
  const params = useParams();
  const guildId = (params?.guildId as string) || 'unknown';

  const [guild, setGuild] = useState<GuildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [rotation, setRotation] = useState({ role_name: '', current_user_id: '' });

  const fallbackGuild = useMemo(() => buildFallbackGuild(guildId), [guildId]);

  useEffect(() => {
    let active = true;

    const loadGuild = async () => {
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        const response = await fetch(`${API_BASE}/api/guilds/${guildId}`, { headers: getAuthHeaders() });
        if (!response.ok) {
          throw new Error('request_failed');
        }

        const data = (await response.json()) as { data?: GuildData | null };
        if (!active) return;
        setGuild(data.data || fallbackGuild);
      } catch {
        if (!active) return;
        setGuild(fallbackGuild);
        setError('Live guild detail is unavailable in this environment.');
        setNotice('Working now: fallback guild roster remains visible while guild services recover.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadGuild();

    return () => {
      active = false;
    };
  }, [fallbackGuild, guildId]);

  const joinGuild = async () => {
    setActionMessage(null);
    try {
      const response = await fetch(`${API_BASE}/api/guilds/${guildId}/join`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
      });

      if (!response.ok) {
        throw new Error('join_failed');
      }

      setActionMessage('Join request submitted.');
    } catch {
      setNotice('Working now: join request could not reach live service. Please retry from this page later.');
    }
  };

  const addRotation = async () => {
    if (!rotation.role_name.trim()) {
      return;
    }

    setActionMessage(null);

    try {
      const response = await fetch(`${API_BASE}/api/guilds/${guildId}/rotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          role_name: rotation.role_name,
          current_user_id: rotation.current_user_id ? Number(rotation.current_user_id) : null,
        }),
      });

      if (!response.ok) {
        throw new Error('rotation_failed');
      }

      setActionMessage('Rotation saved.');
      setRotation({ role_name: '', current_user_id: '' });
    } catch {
      setNotice('Working now: rotation save could not reach live service. Keep draft values and retry.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-5">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              {guild?.guild?.name || 'Guild'}
            </h1>
            <HoverBubble title="Guild detail" align="right">
              Track current members and role rotations before changing assignments.
            </HoverBubble>
          </div>
          <p className="text-sm text-[color:rgba(246,212,203,0.8)]">{guild?.guild?.description || 'No description available yet.'}</p>
          <Link href="/organizer/guilds" className="btn-pill btn-pill-outline text-xs">
            Back to guild directory
          </Link>
        </header>

        {loading ? <div className="card-civic text-sm text-[color:rgba(246,212,203,0.8)]">Loading guild detail…</div> : null}

        {error || notice ? (
          <div className="rounded-2xl border border-[color:rgba(224,177,21,0.28)] bg-[color:rgba(224,177,21,0.1)] p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--color-foreground)]" />
              <div className="space-y-2 min-w-0">
                {error ? <p className="text-sm text-[var(--color-foreground)]">{error}</p> : null}
                {notice ? <p className="text-sm text-[color:rgba(246,212,203,0.86)]">{notice}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Link href="/organizer/on-ramp" className="btn-pill btn-pill-outline text-xs">
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

        {actionMessage ? <div className="card-civic text-sm text-[var(--color-foreground)]">{actionMessage}</div> : null}

        <section className="card-civic space-y-3">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Members</h2>
          {!guild?.members?.length ? <p className="text-sm text-[color:rgba(246,212,203,0.78)]">No members yet.</p> : null}
          <ul className="space-y-1">
            {guild?.members?.map((member) => (
              <li key={`${member.user_id}-${member.role}`} className="text-sm text-[color:rgba(246,212,203,0.84)]">
                User {member.user_id} — {member.role || 'member'}
              </li>
            ))}
          </ul>
          <button className="btn-pill btn-pill-primary text-xs" onClick={joinGuild}>
            Join guild
          </button>
        </section>

        <details className="card-civic">
          <summary className="cursor-pointer text-sm font-medium text-[var(--color-foreground)]">Show rotation editor</summary>
          <div className="mt-4 space-y-3">
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">Current rotations</h2>
            {!guild?.rotations?.length ? <p className="text-sm text-[color:rgba(246,212,203,0.78)]">No rotations yet.</p> : null}
            <ul className="space-y-1">
              {guild?.rotations?.map((rotationItem) => (
                <li key={`${rotationItem.role_name}-${rotationItem.current_user_id}`} className="text-sm text-[color:rgba(246,212,203,0.84)]">
                  {rotationItem.role_name} — User {rotationItem.current_user_id || 'TBD'}
                </li>
              ))}
            </ul>

            <div className="grid md:grid-cols-2 gap-3">
              <input
                className="w-full rounded-xl border border-[color:rgba(246,212,203,0.18)] bg-[color:rgba(246,212,203,0.05)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                placeholder="Role name"
                value={rotation.role_name}
                onChange={(event) => setRotation((previous) => ({ ...previous, role_name: event.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-[color:rgba(246,212,203,0.18)] bg-[color:rgba(246,212,203,0.05)] px-3 py-2 text-sm text-[var(--color-foreground)]"
                placeholder="Current user id"
                value={rotation.current_user_id}
                onChange={(event) => setRotation((previous) => ({ ...previous, current_user_id: event.target.value }))}
              />
            </div>

            <button className="btn-pill btn-pill-secondary text-xs" onClick={addRotation}>
              Save rotation
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
