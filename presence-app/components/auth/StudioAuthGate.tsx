import Link from "next/link";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { buildSignInHref, buildSignUpHref } from "@/lib/auth/returnTo";
import {
  isEmailVerificationRequired,
  studioContactHref,
} from "@/lib/supabase/config";

export function StudioAuthGate({
  returnTo = "/studio",
  title = "Enter Presence Studio",
  body = "Sign in to prepare, preview, and manage your public Presence.",
}: {
  returnTo?: string;
  title?: string;
  body?: string;
}) {
  const emailVerificationRequired = isEmailVerificationRequired();
  return (
    <main className="min-h-dvh bg-[var(--p-studio-bg)] text-[var(--p-studio-text)] px-4 py-10 safe-top">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <Link
          href="/"
          className="text-xs font-medium uppercase tracking-[0.26em] text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]"
        >
          Presence
        </Link>

        <section className="rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-6 shadow-2xl">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--p-studio-accent)]/15 text-[var(--p-studio-accent)]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--p-studio-muted)]">
            Owner access
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--p-studio-muted)]">
            {body}
          </p>

          <div className="mt-6 grid gap-3">
            <Link
              href={buildSignInHref(returnTo)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
            >
              Sign in to Studio
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={buildSignUpHref(returnTo)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--p-studio-border)] px-5 py-3 text-sm font-semibold text-[var(--p-studio-text)] transition hover:border-[var(--p-studio-accent)]/60"
            >
              {emailVerificationRequired ? "Create verified account" : "Create account"}
            </Link>
          </div>
        </section>

        <aside className="rounded-2xl border border-[var(--p-studio-border)] bg-black/10 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--p-studio-accent)]" />
            <p className="text-xs leading-5 text-[var(--p-studio-muted)]">
              Presence Studio is in public beta. Signing in gives access only
              to Presences assigned to your account.
              <a
                href={studioContactHref()}
                className="ml-1 text-[var(--p-studio-text)] underline decoration-[var(--p-studio-accent)]/60 underline-offset-4"
              >
                Contact the studio
              </a>
              {" "}if you expected access.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
