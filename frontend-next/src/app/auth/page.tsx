'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  clearPendingReturnTo,
  resolvePostAuthReturnTo,
  sanitizeReturnTo,
  savePendingReturnTo,
} from '@/lib/auth/returnTo';
import { useTenant } from '@/ui-system/layout/TenantBrandWrapper';
import { getThresholdState } from '@/lib/tenantSemantics';
import {
  AnuChip,
  AnuControlButton,
  AnuControlLink,
  AnuHeroMetric,
  AnuHeroMetricsRail,
  AnuPageHero,
  AnuSurfacePanel,
} from '@/ui-system/anu/surfacePrimitives';
import { AnuThresholdPathPanel } from '@/ui-system/anu/tenantSemanticsPrimitives';

const authInputClass =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-slate-400';

function AuthPageFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl card-civic">
        <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
          Loading account access
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Preparing your sign-in route and return path.
        </p>
      </div>
    </div>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register, isLoading, isAuthenticated } = useAuth();
  const tenant = useTenant();

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [pseudonym, setPseudonym] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const rawReturnTo = searchParams.get('returnTo');
  const hasExplicitReturnTo = Boolean(rawReturnTo);
  const nextHref = useMemo(() => resolvePostAuthReturnTo(rawReturnTo, '/profile'), [rawReturnTo]);
  const backHref = useMemo(() => (hasExplicitReturnTo ? sanitizeReturnTo(rawReturnTo, '/') : '/'), [hasExplicitReturnTo, rawReturnTo]);
  const thresholdState = useMemo(() => getThresholdState(null, false, tenant), [tenant]);

  useEffect(() => {
    if (hasExplicitReturnTo) {
      savePendingReturnTo(nextHref);
    }
  }, [hasExplicitReturnTo, nextHref]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      clearPendingReturnTo();
      router.replace(nextHref);
    }
  }, [isAuthenticated, isLoading, nextHref, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      if (isLogin) {
        await login(email, password);
        clearPendingReturnTo();
        router.push(nextHref);
      } else {
        await register(username || email.split('@')[0], email, password, pseudonym || username);
        setSuccess('Check your email to confirm your account before logging in.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 md:px-8">
        <AnuPageHero
          eyebrow={`${thresholdState.manifest.title} doorway`}
          title={isLogin ? 'Return to the commons with a clear threshold.' : 'Cross the witness threshold deliberately.'}
          description={
            isLogin
              ? hasExplicitReturnTo
                ? 'Log in to resume the route you were already taking, with the threshold language kept explicit.'
                : 'Log in to re-enter private commons routes without losing the distinction between witness, participant, contributor, and steward access.'
              : hasExplicitReturnTo
                ? 'Create an account to continue the route you started and move from public witness reading into participant access.'
                : 'Sign up to move from public truth surfaces into participant access, with contributor and steward pathways remaining explicit rather than implied.'
          }
          actions={
            <>
              <AnuControlLink href={backHref} tone="default" iconRight={ArrowRight}>
                {hasExplicitReturnTo ? 'Back' : 'Back home'}
              </AnuControlLink>
              <AnuControlLink href="/docs" tone="default" iconLeft={ShieldCheck}>
                Read the trust routes
              </AnuControlLink>
            </>
          }
          aside={
            <AnuSurfacePanel tone="quiet" className="h-full p-5">
              <div className="flex flex-wrap gap-2">
                <AnuChip tone="signal" icon={ShieldCheck}>Witness threshold</AnuChip>
                <AnuChip tone="muted" icon={Users}>Participant next</AnuChip>
                {hasExplicitReturnTo ? <AnuChip tone="accent" icon={Sparkles}>Return path protected</AnuChip> : null}
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-300/84">
                {thresholdState.manifest.civicFrame}
              </p>
            </AnuSurfacePanel>
          }
        >
          <AnuHeroMetricsRail columns="three">
            <AnuHeroMetric
              label="Current threshold"
              value={thresholdState.current.label}
              detail={thresholdState.current.summary}
            />
            <AnuHeroMetric
              label="Next threshold"
              value={thresholdState.next?.label ?? 'Steward'}
              detail={thresholdState.next?.routeFocus ?? 'Organizer, governance, admin, sandbox'}
            />
            <AnuHeroMetric
              label="Return path"
              value={hasExplicitReturnTo ? 'Preserved' : 'Default profile'}
              detail={hasExplicitReturnTo ? nextHref : 'Successful sign-in returns to /profile by default.'}
            />
          </AnuHeroMetricsRail>
        </AnuPageHero>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <AnuSurfacePanel tone="soft" className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                  {isLogin ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="mt-2 text-sm text-slate-300/82">
                  {isLogin
                    ? hasExplicitReturnTo
                      ? 'Log in to continue where you left off.'
                      : 'Log in to continue.'
                    : hasExplicitReturnTo
                      ? 'Sign up to continue where you left off.'
                      : 'Sign up to join the commons.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <AnuControlButton
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
                tone={isLogin ? 'active' : 'default'}
              >
                Log in
              </AnuControlButton>
              <AnuControlButton
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
                tone={!isLogin ? 'active' : 'default'}
              >
                Sign up
              </AnuControlButton>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-100">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={authInputClass}
                  placeholder="you@example.com"
                  type="email"
                  required
                  autoComplete="email"
                />
              </div>
              {!isLogin ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-100">Username</label>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={authInputClass}
                      placeholder="Username (optional)"
                      type="text"
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-100">Display Name</label>
                    <input
                      value={pseudonym}
                      onChange={(e) => setPseudonym(e.target.value)}
                      className={authInputClass}
                      placeholder="Public name (optional)"
                      type="text"
                    />
                  </div>
                </>
              ) : null}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-100">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={authInputClass}
                  placeholder="Password"
                  type="password"
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  minLength={6}
                />
              </div>
              {!isLogin ? (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-100">Confirm Password</label>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={authInputClass}
                    placeholder="Confirm password"
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
              ) : null}
              {error ? (
                <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-3 text-sm text-rose-100">{error}</div>
              ) : null}
              {success ? (
                <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-3 text-sm text-emerald-100">{success}</div>
              ) : null}
              <AnuControlButton type="submit" disabled={isLoading} tone="active" className="w-full justify-center">
                {isLoading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
              </AnuControlButton>
            </form>

            <div className="mt-4 text-sm text-slate-300/82">
              Forgot password? <span className="text-[#f1d3a1]">Contact support</span>
            </div>
          </AnuSurfacePanel>

          <AnuThresholdPathPanel
            eyebrow="Threshold doctrine"
            title="How access deepens"
            description="Crossing the auth route should not collapse all roles into the same undifferentiated member state. The commons ladder stays explicit."
            thresholds={thresholdState.manifest.thresholds}
            currentKey={thresholdState.current.key}
            nextKey={thresholdState.next?.key ?? null}
          />
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}
