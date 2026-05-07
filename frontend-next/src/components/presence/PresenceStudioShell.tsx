'use client';

import type { ReactNode } from 'react';
import { Eye, Sparkles } from 'lucide-react';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { PresenceStudioNav } from './PresenceStudioNav';
import { presenceStudioQuickRoutes, presenceStudioRoutes } from './presenceStudioRoutes';

export function PresenceStudioShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-[rgba(246,212,203,0.12)] bg-[linear-gradient(180deg,rgba(30,2,39,0.96),rgba(30,2,39,0.9))] shadow-[0_28px_80px_-42px_rgba(12,4,20,0.92)]">
        <header className="border-b border-white/10 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#f6d4cb]/70">Presence Studio</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-[#f6d4cb]">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#fff7f2]" style={{ fontFamily: 'var(--anu-type-display)' }}>
                    Shape your public world
                  </p>
                  <p className="text-sm text-[#f6d4cb]/78">A mobile-first workroom for preparing, publishing, and reading your Presence.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <AnuChip tone="accent" icon={Sparkles}>Public world studio</AnuChip>
              <AnuChip tone="muted">Owner-only</AnuChip>
              <AnuChip tone="muted">Mobile first</AnuChip>
            </div>
          </div>

          <AnuSurfacePanel tone="quiet" className="mt-4 p-4">
            <p className="text-sm leading-6 text-[color:rgba(246,212,203,0.88)]">
              The public Presence page is the output. This Studio is the private base where owners shape identity, works, collections, enquiries, QR/NFC surfaces, signals, and launch state.
            </p>
          </AnuSurfacePanel>
        </header>

        <div className="border-b border-white/10 px-4 py-3 sm:px-6">
          <PresenceStudioNav routes={presenceStudioRoutes} />
        </div>

        <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>

        <footer className="border-t border-white/10 px-4 py-4 sm:px-6 md:hidden">
          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[#f6d4cb]/62">Quick loop</p>
          <PresenceStudioNav routes={presenceStudioQuickRoutes} variant="dock" />
        </footer>
      </div>
    </div>
  );
}
