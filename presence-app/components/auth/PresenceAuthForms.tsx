"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  isEmailVerificationRequired,
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

function useReturnTo(fallback = "/studio") {
  const searchParams = useSearchParams();
  return useMemo(
    () => sanitizeReturnTo(searchParams.get("returnTo"), fallback),
    [searchParams, fallback],
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
        <Link href={`/auth/sign-up?returnTo=${encodeURIComponent("/onboarding")}`} className="hover:text-[var(--p-studio-text)]">
          Start your Presence
        </Link>
      </div>
    </AuthShell>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const returnTo = useReturnTo("/onboarding");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [intendedPresenceType, setIntendedPresenceType] = useState("artist");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const signupsEnabled = isPublicSignupEnabled();
  const emailVerificationRequired = isEmailVerificationRequired();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signupsEnabled) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!displayName.trim()) {
      setError("Add your name so the studio can recognise the account.");
      return;
    }
    if (!normalizedEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    const onboardingReturnTo = "/onboarding";
    const redirectTo = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(onboardingReturnTo)}`;
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          display_name: displayName.trim(),
          intended_presence_type: intendedPresenceType,
          product: "presence",
          role: "presence_owner_candidate",
        },
      },
    });
    setBusy(false);
    if (signUpError) {
      setError(
        signUpError.message.toLowerCase().includes("already")
          ? "An account with this email may already exist. Try signing in or reset your password."
          : signUpError.message,
      );
      return;
    }
    if (emailVerificationRequired) {
      savePendingReturnTo(onboardingReturnTo);
      setMessage("We sent a verification code to your email.");
      const params = new URLSearchParams();
      params.set("email", normalizedEmail);
      params.set("returnTo", onboardingReturnTo);
      router.replace(`/auth/verify-email?${params.toString()}`);
      return;
    }

    if (data.session) {
      clearPendingReturnTo();
      setMessage("Account created. Opening your onboarding studio.");
      window.setTimeout(() => router.replace(onboardingReturnTo), 500);
      return;
    }

    setError(
      "Account created, but Supabase is still requiring email confirmation. For testing, disable Confirm email in Supabase Auth settings, then try signing in.",
    );
    return;
  }

  function verificationAwareSignupBody() {
    if (!signupsEnabled) {
      return "Public signup is paused for this environment. Reach the Presence team for access if you expected to sign in here.";
    }
    if (emailVerificationRequired) {
      return "Verify your email, then shape your first draft Presence in a guided onboarding sequence. Drafts stay private until you publish.";
    }
    return "Create an account, enter onboarding, and generate your first private draft Presence. Drafts stay private until you publish.";
  }

  function verificationAwareSignupNote() {
    if (emailVerificationRequired) {
      return "After verification, you will enter beta onboarding. Your first Presence starts as a private draft or setup-pending request.";
    }
    return "After account creation, you will enter onboarding. Your first Presence starts as a private draft or setup-pending request.";
  }

  function verificationAwareEyebrow() {
    if (!signupsEnabled) return "Studio access";
    return emailVerificationRequired ? "Public beta verification" : "Public beta";
  }

  function verificationAwareTitle() {
    if (!signupsEnabled) return "Studio access is paused";
    return "Create your Presence Studio account";
  }

  return (
    <AuthShell
      eyebrow={verificationAwareEyebrow()}
      title={verificationAwareTitle()}
      body={verificationAwareSignupBody()}
    >
      {!signupsEnabled ? (
        <div className="mt-6 flex flex-col gap-4">
          <Message tone="info">
            Public signup is currently disabled. If you already have an account
            you can still sign in below.
          </Message>
          <a
            href={studioContactHref()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--p-studio-border)] px-5 py-3 text-sm font-semibold text-[var(--p-studio-text)] transition hover:border-[var(--p-studio-accent)]/60"
          >
            Contact the studio
            <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
            className="text-center text-xs text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]"
          >
            Already have an account? Sign in
          </Link>
        </div>
      ) : (
        <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
          {!isSupabaseConfigured() && (
            <Message tone="error">{SUPABASE_MISSING_MESSAGE}</Message>
          )}
          {error && <Message tone="error">{error}</Message>}
          {message && <Message tone="success">{message}</Message>}
          <Field label="Name" value={displayName} autoComplete="name" onChange={setDisplayName} />
          <Field label="Email" type="email" value={email} autoComplete="email" onChange={setEmail} />
          <Field label="Password" type="password" value={password} autoComplete="new-password" onChange={setPassword} />
          <Field label="Confirm password" type="password" value={confirmPassword} autoComplete="new-password" onChange={setConfirmPassword} />
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--p-studio-muted)]">
              Intended Presence type
            </span>
            <select
              value={intendedPresenceType}
              onChange={(event) => setIntendedPresenceType(event.target.value)}
              className="rounded-2xl border border-[var(--p-studio-border)] bg-black/20 px-4 py-3 text-[var(--p-studio-text)] outline-none transition focus:border-[var(--p-studio-accent)]"
            >
              <option value="artist">Artist</option>
              <option value="practitioner">Practitioner</option>
              <option value="venue_collective">Venue / Collective</option>
              <option value="organisation">Organisation</option>
              <option value="creative_professional">Creative Professional</option>
              <option value="other">Other</option>
            </select>
          </label>
          <p className="text-xs leading-5 text-[var(--p-studio-muted)]">
            {verificationAwareSignupNote()}
          </p>
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

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const returnTo = useMemo(
    () => sanitizeReturnTo(searchParams.get("returnTo"), "/onboarding"),
    [searchParams],
  );
  const emailVerificationRequired = isEmailVerificationRequired();
  const [testModeSessionState, setTestModeSessionState] = useState<
    "checking" | "no_session"
  >("checking");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (emailVerificationRequired) return;
    let cancelled = false;
    async function redirectActiveSession() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        router.replace("/onboarding");
        return;
      }
      setTestModeSessionState("no_session");
    }
    void redirectActiveSession();
    return () => {
      cancelled = true;
    };
  }, [emailVerificationRequired, router]);

  if (!emailVerificationRequired) {
    if (testModeSessionState === "checking") {
      return (
        <AuthShell
          eyebrow="Verification optional"
          title="Checking your Presence session"
          body="Email verification is not required in this testing environment. If you are already signed in, we will open onboarding."
        >
          <div className="mt-6">
            <Message tone="info">Checking session...</Message>
          </div>
        </AuthShell>
      );
    }

    return (
      <AuthShell
        eyebrow="Verification optional"
        title="Email verification is not enabled for testing"
        body="This page is only required when Presence email verification is enabled. Sign in or create an account to continue into onboarding."
      >
        <div className="mt-6 grid gap-3">
          <Message tone="info">
            No active session was found. If you just created an account and
            Supabase sent a confirmation email, disable Confirm email in
            Supabase Auth settings for testing, then try signing in.
          </Message>
          <Link
            href={`/auth/sign-in?returnTo=${encodeURIComponent("/onboarding")}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/auth/sign-up?returnTo=${encodeURIComponent("/onboarding")}`}
            className="text-center text-xs text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]"
          >
            Create account
          </Link>
        </div>
      </AuthShell>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!emailFromQuery) {
      setError("Missing email address. Return to sign-up and try again.");
      return;
    }
    const token = code.trim().replace(/\s+/g, "");
    if (token.length < 6) {
      setError("Enter the verification code from your email.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: emailFromQuery,
      token,
      type: "email",
    });
    setBusy(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    clearPendingReturnTo();
    setMessage("Email verified. Opening Presence onboarding...");
    window.setTimeout(() => router.replace(returnTo), 700);
  }

  async function resend() {
    if (!emailFromQuery) {
      setError("Missing email address. Return to sign-up and try again.");
      return;
    }
    setResending(true);
    setError(null);
    setMessage(null);
    const redirectTo = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: emailFromQuery,
      options: { emailRedirectTo: redirectTo },
    });
    setResending(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    setMessage("A new verification email has been sent. Wait a moment before requesting another code.");
  }

  return (
    <AuthShell
      eyebrow="Verify email"
      title="Activate your Presence Studio account"
      body="Email verification is required in this environment. Enter the code from your email, then continue into onboarding."
    >
      <form className="mt-6 flex flex-col gap-4" onSubmit={submit}>
        {!isSupabaseConfigured() && (
          <Message tone="error">{SUPABASE_MISSING_MESSAGE}</Message>
        )}
        {!emailFromQuery && (
          <Message tone="error">
            Missing email address. Return to sign-up so we know which account to verify.
          </Message>
        )}
        {emailFromQuery && (
          <Message tone="info">
            Code sent to <span className="text-[var(--p-studio-text)]">{emailFromQuery}</span>.
          </Message>
        )}
        {error && <Message tone="error">{error}</Message>}
        {message && <Message tone="success">{message}</Message>}
        <Field
          label="Verification code"
          value={code}
          autoComplete="one-time-code"
          onChange={setCode}
        />
        <button
          type="submit"
          disabled={busy || !isSupabaseConfigured() || !emailFromQuery}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Verifying..." : "Verify and enter onboarding"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-5 grid gap-3 text-xs text-[var(--p-studio-muted)]">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={resending || !isSupabaseConfigured() || !emailFromQuery}
          className="text-left hover:text-[var(--p-studio-text)] disabled:opacity-50"
        >
          {resending ? "Resending..." : "Resend verification code"}
        </button>
        <Link href={`/auth/sign-up?returnTo=${encodeURIComponent(returnTo)}`} className="hover:text-[var(--p-studio-text)]">
          Change email
        </Link>
        <Link href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`} className="hover:text-[var(--p-studio-text)]">
          Already verified? Sign in
        </Link>
      </div>
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
