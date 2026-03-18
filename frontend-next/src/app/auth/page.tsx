'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

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
  const { login, register, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [pseudonym, setPseudonym] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const returnTo = searchParams.get('returnTo');
  const nextHref = returnTo && returnTo.startsWith('/') ? returnTo : '/profile';
  const backHref = returnTo && returnTo.startsWith('/') ? returnTo : '/';

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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl card-civic">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {isLogin
                ? (returnTo ? 'Log in to continue where you left off.' : 'Log in to continue.')
                : (returnTo ? 'Sign up to continue where you left off.' : 'Sign up to join the commons.')}
            </p>
          </div>
          <Link href={backHref} className="text-sm text-[var(--color-institutional)] hover:underline">
            {returnTo ? 'Back' : 'Back home'}
          </Link>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`btn-pill text-sm ${isLogin ? 'btn-pill-primary' : 'btn-pill-outline'}`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`btn-pill text-sm ${!isLogin ? 'btn-pill-primary' : 'btn-pill-outline'}`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-background"
              placeholder="you@example.com"
              type="email"
              required
              autoComplete="email"
            />
          </div>
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-background"
                  placeholder="Username (optional)"
                  type="text"
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Display Name</label>
                <input
                  value={pseudonym}
                  onChange={(e) => setPseudonym(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-background"
                  placeholder="Public name (optional)"
                  type="text"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-background"
              placeholder="Password"
              type="password"
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={6}
            />
          </div>
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password</label>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-background"
                placeholder="Confirm password"
                type="password"
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
          {success && (
            <div className="text-sm text-green-600 dark:text-green-400">{success}</div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-pill btn-pill-primary w-full"
          >
            {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Create Account')}
          </button>
        </form>

        <div className="mt-4 text-sm text-[var(--color-muted-foreground)]">
          Forgot password? <span className="text-[var(--color-institutional)]">Contact support</span>
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

