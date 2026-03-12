'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getCoreApiBase } from '@/lib/runtime';

const API_BASE = getCoreApiBase();

const getAuthHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

type ModeResponse = {
  mode: string;
  activated_at?: string | null;
  expiry_at?: string | null;
  resilience_score?: number;
};

const modeStyles: Record<string, string> = {
  NORMAL: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  ELEVATED_STRESS: 'bg-amber-50 text-amber-900 border-amber-200',
  CRISIS_STABILIZATION: 'bg-orange-50 text-orange-900 border-orange-200',
  BLACK_SWAN: 'bg-red-50 text-red-900 border-red-200',
};

export function ModeBanner() {
  const [mode, setMode] = useState<ModeResponse | null>(null);
  const [error, setError] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    fetch(`${API_BASE}/api/systemic/mode`, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => setMode(data.data || null))
      .catch(() => setError('Failed to load system mode'));
  }, []);

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
