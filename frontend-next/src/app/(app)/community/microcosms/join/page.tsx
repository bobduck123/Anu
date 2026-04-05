'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { LoadingState } from '@/ui-system/states/LoadingState';
import {
  AnuChamberCard,
  AnuChip,
  AnuControlButton,
  AnuPageHero,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch<{ microcosms: MicrocosmOption[] }>('/api/hell/microcosms');
        setMicrocosms(res.microcosms || []);
      } catch {
        setErrorMessage('Microcosms could not be loaded right now.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleJoin = async () => {
    if (!selected) return;
    setJoining(true);
    setErrorMessage(null);
    try {
      await apiFetch(`/api/hell/microcosms/${selected.id}/join`, { method: 'POST' });
      router.push(`/community/microcosms/${selected.id}`);
    } catch {
      setErrorMessage('Failed to join microcosm.');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return <LoadingState fullPage message="Loading microcosms..." />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <AnuPageHero
        eyebrow="Microcosm entry"
        title="Join a microcosm"
        description="Microcosms are local chambers inside the commons. The join flow should feel intentional and place-aware, not like a generic group picker."
        aside={
          <AnuSurfacePanel tone="quiet" className="h-full">
            <div className="flex flex-wrap gap-2">
              <AnuChip tone={step === 'browse' ? 'signal' : 'muted'}>1. Choose</AnuChip>
              <AnuChip tone={step === 'confirm' ? 'accent' : 'muted'}>2. Confirm</AnuChip>
            </div>
            <p className="mt-4 text-sm leading-6 text-[color:rgba(246,212,203,0.84)]">
              Select the local chamber first, then confirm membership once the place feels right.
            </p>
          </AnuSurfacePanel>
        }
      />

      {errorMessage ? (
        <div className="mt-6 rounded-2xl border border-[rgba(224,177,21,0.22)] bg-[rgba(224,177,21,0.08)] px-4 py-3 text-sm text-[#f6d4cb]">
          {errorMessage}
        </div>
      ) : null}

      {step === 'browse' ? (
        <div className="mt-8 grid gap-4">
          {microcosms.length ? (
            microcosms.map((microcosm) => (
              <AnuChamberCard
                key={microcosm.id}
                eyebrow="Microcosm"
                title={microcosm.name}
                description={microcosm.description || 'No description yet.'}
                tone={selected?.id === microcosm.id ? 'affirmed' : 'default'}
                action={
                  microcosm.member_count ? (
                    <AnuChip tone="muted">{microcosm.member_count} members</AnuChip>
                  ) : null
                }
              >
                <div className="mt-1 flex justify-end">
                  <AnuControlButton
                    onClick={() => setSelected(microcosm)}
                    tone={selected?.id === microcosm.id ? 'active' : 'default'}
                  >
                    {selected?.id === microcosm.id ? 'Selected' : 'Select'}
                  </AnuControlButton>
                </div>
              </AnuChamberCard>
            ))
          ) : (
            <AnuChamberCard
              eyebrow="No chambers"
              title="No microcosms available yet"
              description="Local chambers have not been opened yet. Return to the commons and try again later."
            >
              <div className="mt-1 flex justify-end">
                <AnuControlButton onClick={() => router.push('/community')} tone="default">
                  Return to community
                </AnuControlButton>
              </div>
            </AnuChamberCard>
          )}

          <div className="flex justify-end">
            <AnuControlButton
              onClick={() => setStep('confirm')}
              disabled={!selected}
              tone="active"
              iconRight={ArrowRight}
            >
              Continue
            </AnuControlButton>
          </div>
        </div>
      ) : null}

      {step === 'confirm' && selected ? (
        <div className="mt-8">
          <AnuChamberCard
            eyebrow="Confirmation"
            title={`Join ${selected.name}`}
            description={selected.description || 'Confirm this chamber before joining.'}
            tone="affirmed"
            action={<AnuChip tone="signal" icon={CheckCircle}>Ready</AnuChip>}
          >
            <div className="flex flex-wrap gap-3">
              <AnuControlButton onClick={() => setStep('browse')} tone="default" iconLeft={ArrowLeft}>
                Back
              </AnuControlButton>
              <AnuControlButton onClick={() => void handleJoin()} tone="active" iconLeft={Users} disabled={joining}>
                {joining ? 'Joining...' : 'Join microcosm'}
              </AnuControlButton>
            </div>
          </AnuChamberCard>
        </div>
      ) : null}
    </div>
  );
}
