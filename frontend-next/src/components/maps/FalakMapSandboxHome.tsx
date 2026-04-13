'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Compass, Database, GitBranch, Orbit, Play, Shield } from 'lucide-react';
import {
  FALAK_SANDBOX_ACTORS,
  getFalakSandboxActorIdentity,
  getFalakSandboxTenantId,
  isFalakMapSandbox,
  setFalakSandboxActorIdentity,
} from '@/lib/maps/sandbox';

const SANDBOX_MAPS = [
  { key: 'consciousness-theories', label: 'Consciousness Theories' },
  { key: 'ancient-levantine-deities', label: 'Ancient Levantine Deities' },
  { key: 'software-architecture-patterns', label: 'Software Architecture Patterns' },
  { key: 'toy-commons-loop', label: 'Toy Commons Loop' },
];

export function FalakMapSandboxHome() {
  const [actorId, setActorId] = useState(getFalakSandboxActorIdentity());

  useEffect(() => {
    setFalakSandboxActorIdentity(actorId);
  }, [actorId]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border border-[#1e0227] bg-[radial-gradient(circle_at_top_left,_rgba(102,87,0,0.16),_transparent_42%),linear-gradient(155deg,_rgba(30,2,39,0.98),_rgba(30,2,39,0.98))] p-8 text-[var(--color-foreground)]">
        <p className="text-xs uppercase tracking-[0.32em] text-[color:rgba(102,87,0,0.8)]">Local-first validation</p>
        <h1 className="mt-3 text-4xl font-semibold">Manara Learning Universe Sandbox</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[color:rgba(246,212,203,0.76)]">
          Local sandbox mode exercises the live universe backend, compiler, Prisma schema, and Three.js universe renderer.
          Use this surface to validate generation, editing, reruns, and snapshot restore before touching hosted environments.
        </p>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_22rem]">
        <section className="space-y-4">
          <article className="rounded-[1.75rem] border border-[#f6d4cb] bg-[var(--color-foreground)] p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[#1e0227]">
              <Play className="h-5 w-5 text-[#7c413c]" />
              <h2 className="text-xl font-semibold">Sandbox routes</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Link
                href="/education/maps"
                className="rounded-[1.25rem] border border-[#f6d4cb] bg-[#f6d4cb] p-4 transition hover:border-[#7c413c] hover:bg-[#7c413c]"
              >
                <p className="font-semibold text-[#1e0227]">/education/maps</p>
                <p className="mt-1 text-sm text-[#1e0227]">Universe library index, search, compare, and route launcher.</p>
              </Link>
              <Link
                href="/education/maps/new"
                className="rounded-[1.25rem] border border-[#f6d4cb] bg-[#f6d4cb] p-4 transition hover:border-[#7c413c] hover:bg-[#7c413c]"
              >
                <p className="font-semibold text-[#1e0227]">/education/maps/new</p>
                <p className="mt-1 text-sm text-[#1e0227]">Request a missing topic and persist a real draft universe.</p>
              </Link>
              <Link
                href="/control/maps"
                className="rounded-[1.25rem] border border-[#f6d4cb] bg-[#f6d4cb] p-4 transition hover:border-[#7c413c] hover:bg-[#7c413c]"
              >
                <p className="font-semibold text-[#1e0227]">/control/maps</p>
                <p className="mt-1 text-sm text-[#1e0227]">Admin editor for taxonomy, stars, relations, and layout snapshots.</p>
              </Link>
              <div className="rounded-[1.25rem] border border-[#f6d4cb] bg-[#f6d4cb] p-4">
                <p className="font-semibold text-[#1e0227]">Seeded detail pages</p>
                <p className="mt-1 text-sm text-[#1e0227]">Open a real persisted topic directly from the list below.</p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-[#f6d4cb] bg-[var(--color-foreground)] p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[#1e0227]">
              <Orbit className="h-5 w-5 text-[#7c413c]" />
              <h2 className="text-xl font-semibold">Seeded sandbox universes</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {SANDBOX_MAPS.map((map) => (
                <Link
                  key={map.key}
                  href={`/education/maps/${encodeURIComponent(map.key)}`}
                  className="rounded-[1.25rem] border border-[#f6d4cb] bg-[#f6d4cb] p-4 transition hover:border-[#7c413c] hover:bg-[#7c413c]"
                >
                  <p className="font-semibold text-[#1e0227]">{map.label}</p>
                  <p className="mt-1 text-xs text-[#7c413c]">{map.key}</p>
                </Link>
              ))}
            </div>
          </article>
        </section>

        <aside className="space-y-4">
          <article className="rounded-[1.75rem] border border-[#f6d4cb] bg-[var(--color-foreground)] p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[#1e0227]">
              <Shield className="h-5 w-5 text-[#665700]" />
              <h2 className="text-xl font-semibold">Runtime contract</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm text-[#1e0227]">
              <div className="flex items-center justify-between gap-3 rounded-[1rem] bg-[#f6d4cb] px-4 py-3">
                <span>FALAK_MODE</span>
                <span className="font-medium text-[#1e0227]">{isFalakMapSandbox() ? 'map_sandbox' : 'default'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[1rem] bg-[#f6d4cb] px-4 py-3">
                <span>Tenant</span>
                <span className="font-mono text-xs text-[#1e0227]">{getFalakSandboxTenantId()}</span>
              </div>
              <label className="block rounded-[1rem] bg-[#f6d4cb] px-4 py-3">
                <span className="mb-2 flex items-center gap-2 text-[#1e0227]">
                  <GitBranch className="h-4 w-4 text-[#7c413c]" />
                  Sandbox actor
                </span>
                <select
                  value={actorId}
                  onChange={(event) => setActorId(event.target.value)}
                  className="w-full bg-transparent text-sm text-[#1e0227] outline-none"
                >
                  {FALAK_SANDBOX_ACTORS.map((actor) => (
                    <option key={actor.id || 'public'} value={actor.id}>
                      {actor.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-[#f6d4cb] bg-[var(--color-foreground)] p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[#1e0227]">
              <Database className="h-5 w-5 text-[#7c413c]" />
              <h2 className="text-xl font-semibold">Verification path</h2>
            </div>
            <ul className="mt-4 space-y-3 text-sm text-[#1e0227]">
              <li className="rounded-[1rem] bg-[#f6d4cb] px-4 py-3">1. Open a seeded universe and inspect the 3D scene.</li>
              <li className="rounded-[1rem] bg-[#f6d4cb] px-4 py-3">2. Generate a missing draft via `/education/maps/new`.</li>
              <li className="rounded-[1rem] bg-[#f6d4cb] px-4 py-3">3. Edit category, star, and relation data in `/control/maps`.</li>
              <li className="rounded-[1rem] bg-[#f6d4cb] px-4 py-3">4. Rerun layout and restore a prior snapshot.</li>
            </ul>
            <Link
              href="/education/maps"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#f6d4cb] px-4 py-2 text-sm font-medium text-[#1e0227] transition hover:border-[#7c413c] hover:text-[#7c413c]"
            >
              <Compass className="h-4 w-4" />
              Open universe library
            </Link>
          </article>
        </aside>
      </div>
    </div>
  );
}
