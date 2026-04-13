'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCoreApiBase } from '@/lib/runtime';
import { getParticipantAuthHeaders } from '@/lib/api/client';

const API_BASE = getCoreApiBase();

const getAuthHeaders = async (): Promise<Record<string, string>> =>
  getParticipantAuthHeaders({ allowLegacyTokenFallback: false });

type ModeResponse = {
  mode: string;
  activated_at?: string | null;
  expiry_at?: string | null;
  resilience_score?: number;
};

const modeStyles: Record<string, string> = {
  NORMAL: 'bg-[#665700] text-[#665700] border-[#665700]',
  ELEVATED_STRESS: 'bg-[#e0b115] text-[#e0b115] border-[#e0b115]',
  CRISIS_STABILIZATION: 'bg-[#e0b115] text-[#e0b115] border-[#e0b115]',
  BLACK_SWAN: 'bg-[#7c413c] text-[#7c413c] border-[#7c413c]',
};

export function ModeBanner() {
  const [mode, setMode] = useState<ModeResponse | null>(null);
  const [error, setError] = useState('');
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    let cancelled = false;

    queueMicrotask(async () => {
      if (cancelled) {
        return;
      }

      if (!isAuthenticated) {
        setMode(null);
        setError('');
        return;
      }

      fetch(`${API_BASE}/api/systemic/mode`, { headers: await getAuthHeaders() })
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) {
            setMode(data.data || null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError('Failed to load system mode');
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  if (pathname?.startsWith('/wishlist/') || error || !mode || mode.mode === 'NORMAL') return null;

  return (
    <div className={`border-b ${modeStyles[mode.mode] || modeStyles.NORMAL}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
        <div className="font-semibold">
          System Mode: {mode.mode.replace('_', ' ')}
        </div>
        <div className="opacity-80">
          Resilience Score: {typeof mode.resilience_score === 'number' ? mode.resilience_score.toFixed(2) : 'n/a'}
        </div>
        {mode.expiry_at && (
          <div className="opacity-80">
            Expires: {new Date(mode.expiry_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}




