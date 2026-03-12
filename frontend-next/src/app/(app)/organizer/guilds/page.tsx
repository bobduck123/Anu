'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type GuildSummary = {
  id: number | string;
  name: string;
  type?: string;
  description?: string;
};

export default function GuildDirectoryPage() {
  const [guilds, setGuilds] = useState<GuildSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/api/guilds/`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data: { data?: { guilds?: GuildSummary[] } }) => setGuilds(data.data?.guilds || []))
      .catch(() => setError('Failed to load guilds'));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            Guilds
          </h1>
          <p className="text-[var(--color-muted-foreground)]">Organiser cohorts aligned to needs and competency.</p>
        </div>

        {error && <div className="card-civic text-[var(--color-accent)]">{error}</div>}

        <div className="grid md:grid-cols-2 gap-4">
          {guilds.map((guild) => (
            <Link key={guild.id} href={`/organizer/guilds/${guild.id}`} className="card-civic hover:shadow-sm transition-shadow">
              <div className="text-lg font-semibold">{guild.name}</div>
              <div className="text-xs text-[var(--color-muted-foreground)]">{guild.type}</div>
              <div className="text-sm mt-2">{guild.description}</div>
            </Link>
          ))}
          {guilds.length === 0 && <p className="text-sm text-[var(--color-muted-foreground)]">No guilds yet.</p>}
        </div>
      </div>
    </div>
  );
}


