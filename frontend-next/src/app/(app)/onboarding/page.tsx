'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Action } from '@/lib/api';
import { onboardingApi, OnboardingState } from '@/lib/api/onboarding';

const interestOptions = [
  'Climate Action',
  'Community Care',
  'Environmental Justice',
  'Education',
  'Food Systems',
  'Local Policy',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [microcosms, setMicrocosms] = useState<OnboardingState['microcosms']>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedMicrocosm, setSelectedMicrocosm] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const state = await onboardingApi.get();
        if (cancelled) return;
        setMicrocosms(state.microcosms);
        setInterests(state.interests);
        setSelectedMicrocosm(state.joined_microcosms[0]?.id ?? null);
        setConfirmed(state.complete);
        setStep(state.complete ? 3 : 1);
        const actionData = await api.actions.getAll().catch(() => []);
        if (!cancelled) setActions(actionData.slice(0, 6));
      } catch {
        if (!cancelled) setError('Your community account could not be loaded. Sign in or try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [loadAttempt]);

  const toggleInterest = (interest: string) => {
    setInterests((previous) => previous.includes(interest)
      ? previous.filter((item) => item !== interest)
      : [...previous, interest]
    );
  };

  const actionHref = selectedAction ? `/actions/${selectedAction}` : '/actions';

  const finish = async () => {
    if (submitting) return;
    if (confirmed) {
      router.push(actionHref);
      return;
    }
    if (!selectedMicrocosm || interests.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const state = await onboardingApi.confirm(interests, selectedMicrocosm);
      if (!state.complete) throw new Error('Membership was not confirmed');
      setConfirmed(true);
      router.push(actionHref);
    } catch {
      // A response may be lost after the server commits. Read the account before reporting failure.
      const state = await onboardingApi.get().catch(() => null);
      const joined = state?.joined_microcosms.some((micro) => micro.id === selectedMicrocosm);
      const savedInterests = state &&
        interests.length === state.interests.length &&
        interests.every((interest) => state.interests.includes(interest));
      if (state?.complete && joined && savedInterests) {
        setConfirmed(true);
        router.push(actionHref);
      } else {
        setError('Membership could not be confirmed. Your choices are still here; please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading onboarding">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-institutional)]" />
      </div>
    );
  }

  if (error && microcosms.length === 0) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
        <div className="card-civic mx-auto max-w-xl space-y-4">
          <h1 className="text-2xl font-bold">Welcome Journey</h1>
          <p role="alert">{error}</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-pill btn-pill-primary" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Try again</button>
            <Link href="/auth" className="btn-pill btn-pill-outline">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card-civic">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Welcome Journey</h1>
          <p className="text-[var(--color-muted-foreground)] mb-8">Pick your interests, join a microcosm, and take a first action.</p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-6 text-sm text-[var(--color-muted-foreground)]">
            <span className={`whitespace-nowrap ${step === 1 ? 'text-[var(--color-foreground)] font-semibold' : ''}`}>1. Interests</span>
            <span>›</span>
            <span className={`whitespace-nowrap ${step === 2 ? 'text-[var(--color-foreground)] font-semibold' : ''}`}>2. Microcosm</span>
            <span>›</span>
            <span className={`whitespace-nowrap ${step === 3 ? 'text-[var(--color-foreground)] font-semibold' : ''}`}>3. Starter Action</span>
          </div>

          {error ? <p role="alert" className="mb-5 text-sm text-[var(--color-institutional)]">{error}</p> : null}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Choose your interests</h2>
              <div className="flex flex-wrap gap-3">
                {interestOptions.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    aria-pressed={interests.includes(interest)}
                    onClick={() => toggleInterest(interest)}
                    className={`btn-pill text-sm ${interests.includes(interest) ? 'btn-pill-sage' : 'btn-pill-outline'}`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => setStep(2)} className="btn-pill btn-pill-primary" disabled={interests.length === 0}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Choose a microcosm</h2>
              {microcosms.length === 0 ? <p>No microcosms are available for your community yet.</p> : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {microcosms.map((micro) => (
                  <button
                    key={micro.id}
                    type="button"
                    aria-pressed={selectedMicrocosm === micro.id}
                    onClick={() => setSelectedMicrocosm(micro.id)}
                    className={`p-4 rounded-lg border text-left ${
                      selectedMicrocosm === micro.id ? 'border-[var(--color-sage)] bg-[var(--color-sage-light)]' : 'border-[var(--color-border)]'
                    }`}
                  >
                    <h3 className="font-semibold">{micro.name}</h3>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{micro.description || 'Community focus area'}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="btn-pill btn-pill-outline">Back</button>
                <button type="button" onClick={() => setStep(3)} className="btn-pill btn-pill-primary" disabled={!selectedMicrocosm}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{confirmed ? 'You have joined a microcosm' : 'Confirm your membership'}</h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {confirmed ? 'Your interests and membership are saved to your account.' : 'Your interests and membership are saved when you confirm below. Choosing an action only opens its details.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {actions.map((action) => (
                  <button
                    key={action._id}
                    type="button"
                    aria-pressed={selectedAction === action._id}
                    onClick={() => setSelectedAction(action._id)}
                    className={`p-4 rounded-lg border text-left ${
                      selectedAction === action._id ? 'border-[var(--color-institutional)] bg-[var(--color-institutional-light)]' : 'border-[var(--color-border)]'
                    }`}
                  >
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="text-sm text-[var(--color-muted-foreground)] line-clamp-2">{action.details}</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-between gap-3">
                {confirmed ? <span /> : <button type="button" onClick={() => setStep(2)} className="btn-pill btn-pill-outline" disabled={submitting}>Back</button>}
                <button type="button" onClick={() => void finish()} className="btn-pill btn-pill-primary" disabled={submitting || (!confirmed && (!selectedMicrocosm || interests.length === 0))}>
                  {submitting ? 'Confirming...' : confirmed ? 'Explore actions' : 'Confirm membership & explore actions'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
