"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  clearPendingReturnTo,
  resolvePostAuthReturnTo,
  sanitizeReturnTo,
  savePendingReturnTo,
} from "@/lib/auth/returnTo";
import { createClient } from "@/lib/supabase/client";
import {
  isPublicSignupEnabled,
  isSupabaseConfigured,
  studioContactHref,
  SUPABASE_MISSING_MESSAGE,
} from "@/lib/supabase/config";

function AuthShell({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-8 text-[var(--p-studio-text)] safe-top">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Presence
        </Link>
        <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--p-studio-muted)]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--p-studio-muted)]">
            {body}
          </p>
          {children}
        </section>
      </div>
    </main>
  );
}

function Message({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  const style =
    tone === "error"
      ? "border-red-900/70 bg-red-950/30 text-red-200"
      : tone === "success"
        ? "border-emerald-900/70 bg-emerald-950/30 text-emerald-100"
        : "border-[var(--p-studio-border)] bg-black/10 text-[var(--p-studio-muted)]";
  return <p className={`rounded-2xl border p-3 text-sm leading-5 ${style}`}>{children}</p>;
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  required = true,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-[var(--p-studio-text)] outline-none transition placeholder:text-[var(--p-studio-muted)] focus:border-[var(--p-studio-accent)]"
      />
    </label>
  );
}

function useReturnTo() {
  const searchParams = useSearchParams();
  return useMemo(
    () => sanitizeReturnTo(searchParams.get("returnTo"), "/studio"),
    [searchParams],
  );
}

export function SignInForm() {
  const router = useRouter();
  const returnTo = useReturnTo();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth_callback_failed"
      ? "The sign-in link could not be completed. Try signing in again."
      : null,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    savePendingReturnTo(returnTo);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    clearPendingReturnTo();
    router.replace(resolvePostAuthReturnTo(returnTo, "/studio"));
  }

  return (
    <AuthShell
      eyebrow="Presence Studio"
      title="Sign in to shape your public world"
      body="Enter Presence Studio to prepare, preview, publish, and share the Presence assigned to your account."
    >
      <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
        {!isSupabaseConfigured() && (
          <Message tone="error">{SUPABASE_MISSING_MESSAGE}</Message>
        )}
        {error && <Message tone="error">{error}</Message>}
        <Field
          label="Email"
          type="email"
          value={email}
          autoComplete="email"
          onChange={setEmail}
        />
        <Field
          label="Password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={setPassword}
        />
        <button
          type="submit"
          disabled={busy || !isSupabaseConfigured()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Signing in..." : "Enter Studio"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--p-studio-muted)]">
        <Link href={`/auth/forgot-password?returnTo=${encodeURIComponent(returnTo)}`} className="hover:text-[var(--p-studio-text)]">
          Forgot password?
        </Link>
        <Link href={`/auth/sign-up?returnTo=${encodeURIComponent(returnTo)}`} className="hover:text-[var(--p-studio-text)]">
          Request access
        </Link>
      </div>
    </AuthShell>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const returnTo = useReturnTo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const signupsEnabled = isPublicSignupEnabled();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signupsEnabled) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          product: "presence",
          role: "presence_owner_candidate",
        },
      },
    });
    setBusy(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      router.replace(returnTo);
      return;
    }
    setMessage("Check your email to confirm the account, then return to Presence Studio.");
  }

  return (
    <AuthShell
      eyebrow="Invite-first alpha"
      title={signupsEnabled ? "Create your Studio account" : "Presence Studio is invite-first"}
      body={
        signupsEnabled
          ? "Create an account for Presence Studio. Access to owner data still requires an assigned Presence record."
          : "First pilots are studio-assisted. We create or assign your Presence before you can manage it here."
      }
    >
      {!signupsEnabled ? (
        <div className="mt-6 flex flex-col gap-4">
          <Message tone="info">
            Request access if you are part of the current pilot group or need a
            Presence assigned to your email.
          </Message>
          <a
            href={studioContactHref()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
          >
            Request pilot access
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
            className="text-center text-xs text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]"
          >
            Already invited? Sign in
          </Link>
        </div>
      ) : (
        <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
          {!isSupabaseConfigured() && (
            <Message tone="error">{SUPABASE_MISSING_MESSAGE}</Message>
          )}
          {error && <Message tone="error">{error}</Message>}
          {message && <Message tone="success">{message}</Message>}
          <Field label="Email" type="email" value={email} autoComplete="email" onChange={setEmail} />
          <Field label="Password" type="password" value={password} autoComplete="new-password" onChange={setPassword} />
          <button
            type="submit"
            disabled={busy || !isSupabaseConfigured()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Creating account..." : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}
    </AuthShell>
  );
}

export function ForgotPasswordForm() {
  const returnTo = useReturnTo();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent("/auth/reset-password")}`;
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setBusy(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage("Check your email for a secure reset link.");
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your Studio password"
      body="Send a secure reset link to the email attached to your Presence Studio account."
    >
      <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
        {!isSupabaseConfigured() && (
          <Message tone="error">{SUPABASE_MISSING_MESSAGE}</Message>
        )}
        {error && <Message tone="error">{error}</Message>}
        {message && <Message tone="success">{message}</Message>}
        <Field label="Email" type="email" value={email} autoComplete="email" onChange={setEmail} />
        <button
          type="submit"
          disabled={busy || !isSupabaseConfigured()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send reset link"}
        </button>
        <Link href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`} className="text-center text-xs text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]">
          Back to sign in
        </Link>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.replace("/studio");
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password"
      body="Set a new password, then return to Presence Studio."
    >
      <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
        {!isSupabaseConfigured() && (
          <Message tone="error">{SUPABASE_MISSING_MESSAGE}</Message>
        )}
        {error && <Message tone="error">{error}</Message>}
        <Field label="New password" type="password" value={password} autoComplete="new-password" onChange={setPassword} />
        <button
          type="submit"
          disabled={busy || !isSupabaseConfigured()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving..." : "Update password"}
        </button>
      </form>
    </AuthShell>
  );
}
