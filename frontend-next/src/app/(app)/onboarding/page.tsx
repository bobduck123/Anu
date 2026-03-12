'use client';

import { useEffect, useState } from 'react';
import { api, Action, Microcosm } from '@/lib/api';
import Link from 'next/link';

const interestOptions = [
  'Climate Action',
  'Community Care',
  'Environmental Justice',
  'Education',
  'Food Systems',
  'Local Policy',
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [microcosms, setMicrocosms] = useState<Microcosm[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedMicrocosm, setSelectedMicrocosm] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [microData, actionData] = await Promise.all([
          api.community.getMicrocosms(),
          api.actions.getAll(),
        ]);
        setMicrocosms(microData);
        setActions(actionData.slice(0, 6));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('onboarding_progress');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setStep(data.step || 1);
        setInterests(data.interests || []);
        setSelectedMicrocosm(data.selectedMicrocosm || null);
        setSelectedAction(data.selectedAction || null);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('onboarding_progress', JSON.stringify({
      step,
      interests,
      selectedMicrocosm,
      selectedAction,
    }));
  }, [step, interests, selectedMicrocosm, selectedAction]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) => prev.includes(interest)
      ? prev.filter((i) => i !== interest)
      : [...prev, interest]
    );
  };

  const finish = () => {
    localStorage.setItem('onboarding_complete', 'true');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-institutional)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="card-civic">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Welcome Journey</h1>
          <p className="text-[var(--color-muted-foreground)] mb-8">Pick your interests, join a microcosm, and take a first action.</p>

          <div className="flex items-center gap-2 mb-6 text-sm text-[var(--color-muted-foreground)]">
            <span className={step === 1 ? 'text-[var(--color-institutional)] font-semibold' : ''}>1. Interests</span>
            <span>›</span>
            <span className={step === 2 ? 'text-[var(--color-institutional)] font-semibold' : ''}>2. Microcosm</span>
            <span>›</span>
            <span className={step === 3 ? 'text-[var(--color-institutional)] font-semibold' : ''}>3. Starter Action</span>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Choose your interests</h2>
              <div className="flex flex-wrap gap-3">
                {interestOptions.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`btn-pill text-sm ${interests.includes(interest) ? 'btn-pill-sage' : 'btn-pill-outline'}`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={() => setStep(2)} className="btn-pill btn-pill-primary" disabled={interests.length === 0}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Join a microcosm</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {microcosms.map((micro) => (
                  <button
                    key={micro.id}
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
                <button onClick={() => setStep(1)} className="btn-pill btn-pill-outline">Back</button>
                <button onClick={() => setStep(3)} className="btn-pill btn-pill-primary" disabled={!selectedMicrocosm}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Pick a starter action</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {actions.map((action) => (
                  <button
                    key={action._id}
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
              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="btn-pill btn-pill-outline">Back</button>
                <Link
                  href={selectedAction ? `/actions/${selectedAction}` : '/actions'}
                  onClick={finish}
                  className="btn-pill btn-pill-primary"
                >
                  Finish & Start Action
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
