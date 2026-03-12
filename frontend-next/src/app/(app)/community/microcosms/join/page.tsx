'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { Card } from '@/ui-system/primitives/Card';
import { Button } from '@/ui-system/primitives/Button';
import { LoadingState } from '@/ui-system/states/LoadingState';

interface MicrocosmOption {
  id: number;
  name: string;
  description?: string;
  member_count?: number;
}

type Step = 'browse' | 'confirm';

export default function JoinMicrocosmPage() {
  const router = useRouter();
  const [microcosms, setMicrocosms] = useState<MicrocosmOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MicrocosmOption | null>(null);
  const [step, setStep] = useState<Step>('browse');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch<{ microcosms: MicrocosmOption[] }>('/api/hell/microcosms');
        setMicrocosms(res.microcosms || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleJoin = async () => {
    if (!selected) return;
    setJoining(true);
    try {
      await apiFetch(`/api/hell/microcosms/${selected.id}/join`, { method: 'POST' });
      router.push(`/community/microcosms/${selected.id}`);
    } catch {
      alert('Failed to join microcosm.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <LoadingState fullPage message="Loading microcosms..." />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Join a Microcosm</h1>
      <p className="text-[var(--color-muted-foreground)] mb-8">Find a community group that matches your interests.</p>

      {/* Progress */}
      <div className="flex items-center gap-4 mb-8">
        {(['browse', 'confirm'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
            }`}>
              {i + 1}
            </div>
            <span className={`text-sm ${step === s ? 'font-medium' : 'text-[var(--color-muted-foreground)]'}`}>
              {s === 'browse' ? 'Choose' : 'Confirm'}
            </span>
            {i < 1 && <ArrowRight className="w-4 h-4 text-[var(--color-muted-foreground)]" />}
          </div>
        ))}
      </div>

      {step === 'browse' && (
        <div className="space-y-3">
          {microcosms.map((m) => (
            <Card
              key={m.id}
              padding="md"
              hover
              className={`cursor-pointer ${selected?.id === m.id ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
              onClick={() => setSelected(m)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{m.name}</h3>
                  {m.description && <p className="text-sm text-[var(--color-muted-foreground)]">{m.description}</p>}
                </div>
                {selected?.id === m.id && <CheckCircle className="w-5 h-5 text-[var(--color-primary)]" />}
              </div>
            </Card>
          ))}
          <Button
            variant="primary"
            disabled={!selected}
            onClick={() => setStep('confirm')}
            iconRight={ArrowRight}
          >
            Continue
          </Button>
        </div>
      )}

      {step === 'confirm' && selected && (
        <Card padding="lg">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Confirm Membership</h2>
          <p className="mb-2">You&apos;re about to join <strong>{selected.name}</strong>.</p>
          {selected.description && (
            <p className="text-sm text-[var(--color-muted-foreground)] mb-6">{selected.description}</p>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('browse')} icon={ArrowLeft}>Back</Button>
            <Button variant="primary" loading={joining} onClick={handleJoin} icon={Users}>Join Microcosm</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
