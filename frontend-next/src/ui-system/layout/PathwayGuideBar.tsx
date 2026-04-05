'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AnuChip, AnuSurfacePanel } from '@/ui-system/anu/surfacePrimitives';
import { buildPathwayGuide } from './pathwayGuidance';
import { getShellSignal } from './shellSignals';
import { getRealmSurface } from '@/ui-system/realms/realmRegistry';

export function PathwayGuideBar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const guide = buildPathwayGuide(pathname);
  const signal = getShellSignal(pathname);
  const realmSurface = getRealmSurface(pathname);

  const steps = guide.steps.filter((step) => !step.authRequired || isAuthenticated).slice(0, 3);

  if (steps.length === 0) {
    return null;
  }

  return (
    <section className="mt-2">
      <AnuSurfacePanel tone="quiet" className="manara-grid-hero px-3 py-2.5 md:px-4">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="min-w-[220px]">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#f6d4cb]/80">Route guidance</p>
              <AnuChip tone="muted">{realmSurface.environmentTitle}</AnuChip>
              <AnuChip tone="muted">{signal.label}</AnuChip>
            </div>
            <p className="text-sm font-medium text-[color:rgba(246,212,203,0.92)]">{guide.title}</p>
            <p className="text-xs text-[color:rgba(246,212,203,0.72)]">{signal.note}</p>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {steps.map((step) => (
              <Link
                key={step.href}
                href={step.href}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.05)] px-3 py-1.5 text-xs text-[color:rgba(246,212,203,0.9)] transition-colors hover:border-[color:rgba(246,212,203,0.24)] hover:bg-[color:rgba(246,212,203,0.12)]"
              >
                <span>{step.label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-[color:rgba(246,212,203,0.8)]" />
              </Link>
            ))}
          </div>
        </div>
      </AnuSurfacePanel>
    </section>
  );
}
