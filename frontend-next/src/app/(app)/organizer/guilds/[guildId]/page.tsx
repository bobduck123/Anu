'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCoreApiBase } from '@/lib/runtime';

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

export default function GuildDetailPage() {
  const params = useParams();
  const guildId = params?.guildId as string;
  const [guild, setGuild] = useState<GuildData | null>(null);
  const [error, setError] = useState('');
  const [rotation, setRotation] = useState({ role_name: '', current_user_id: '' });

  useEffect(() => {
    if (!guildId) return;
    fetch(`${API_BASE}/api/guilds/${guildId}`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data: { data?: GuildData | null }) => setGuild(data.data || null))
      .catch(() => setError('Failed to load guild'));
  }, [guildId]);

  const joinGuild = async () => {
    const res = await fetch(`${API_BASE}/api/guilds/${guildId}/join`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
    });
    if (!res.ok) {
      setError('Failed to join guild');
    }
  };

  const addRotation = async () => {
    const res = await fetch(`${API_BASE}/api/guilds/${guildId}/rotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({
        role_name: rotation.role_name,
        current_user_id: rotation.current_user_id ? Number(rotation.current_user_id) : null,
      }),
    });
    if (!res.ok) {
      setError('Failed to add rotation');
      return;
    }
    setRotation({ role_name: '', current_user_id: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}
        {!guild && <div className="card-civic">Loading guild...</div>}
        {guild && (
          <div className="card-civic space-y-4">
            <div>
              <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
                {guild.guild?.name}
              </h1>
              <p className="text-[var(--color-muted-foreground)]">{guild.guild?.description}</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">Members</h2>
              {guild.members?.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No members yet.</p>}
              <ul className="text-sm space-y-1">
                {guild.members?.map((m) => (
                  <li key={`${m.user_id}-${m.role}`}>User {m.user_id} — {m.role}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Rotations</h2>
              {guild.rotations?.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No rotations yet.</p>}
              <ul className="text-sm space-y-1">
                {guild.rotations?.map((r) => (
                  <li key={`${r.role_name}-${r.current_user_id}`}>{r.role_name} — User {r.current_user_id || 'TBD'}</li>
                ))}
              </ul>
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  placeholder="Role name"
                  value={rotation.role_name}
                  onChange={(e) => setRotation((prev) => ({ ...prev, role_name: e.target.value }))}
                />
                <input
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg"
                  placeholder="Current user id"
                  value={rotation.current_user_id}
                  onChange={(e) => setRotation((prev) => ({ ...prev, current_user_id: e.target.value }))}
                />
              </div>
              <button className="btn-pill btn-pill-secondary" onClick={addRotation}>
                Add Rotation
              </button>
            </div>
            <button className="btn-pill btn-pill-primary" onClick={joinGuild}>
              Join Guild
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


