"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Globe, LogOut } from "lucide-react";
import { listNodes } from "@/lib/api/owner";
import type { PresenceNode } from "@/lib/api/types";
import { createClient } from "@/lib/supabase/client";
import { isEmailVerificationRequired } from "@/lib/supabase/config";
import { Loading, Empty, StatusPill } from "@/components/ui";
import { StudioAuthGate } from "@/components/auth/StudioAuthGate";

export default function StudioIndexPage() {
  const emailVerificationRequired = isEmailVerificationRequired();
  const [nodes, setNodes] = useState<PresenceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("Sign in to access your studio.");
          return;
        }
        const user = session.user;
        if (
          emailVerificationRequired &&
          user?.email &&
          !user.email_confirmed_at &&
          !user.confirmed_at
        ) {
          setVerificationEmail(user.email);
          return;
        }
        const data = await listNodes(session.access_token);
        setNodes(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load your nodes.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [emailVerificationRequired]);

  if (!loading && error === "Sign in to access your studio.") {
    return <StudioAuthGate returnTo="/studio" />;
  }

  if (!loading && verificationEmail) {
    const params = new URLSearchParams();
    params.set("email", verificationEmail);
    params.set("returnTo", "/studio");
    return (
      <main className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-10 text-[var(--p-studio-text)] safe-top">
        <div className="mx-auto max-w-lg rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--p-studio-muted)]">
            Email verification required
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Check your email before opening Studio
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--p-studio-muted)]">
            Your account is signed in, but Supabase has not marked the email as
            verified. Verify <span className="text-[var(--p-studio-text)]">{verificationEmail}</span> before loading owner data.
          </p>
          <Link
            href={`/auth/verify-email?${params.toString()}`}
            className="mt-6 inline-flex rounded-2xl bg-[var(--p-studio-accent)] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
          >
            Enter verification code
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-8 text-[var(--p-studio-text)] safe-top">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--p-studio-muted)] hover:text-[var(--p-studio-text)]"
            >
              Presence Studio
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--p-studio-text)]">
              Choose your Presence
            </h1>
            <p className="text-sm leading-6 text-[var(--p-studio-muted)]">
              Open the public world assigned to your account, then prepare,
              preview, publish, and share it.
            </p>
          </div>
          <Link
            href="/auth/sign-out"
            className="rounded-xl border border-[var(--p-studio-border)] px-3 py-2 text-xs font-semibold text-[var(--p-studio-muted)] transition hover:border-[var(--p-studio-accent)]/60 hover:text-[var(--p-studio-text)]"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </header>

        {loading && <Loading label="Loading your Presences..." />}

        {error && (
          <div className="rounded-2xl border border-red-900/70 bg-red-950/30 p-4 text-sm leading-6 text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && nodes.length === 0 && (
          <Empty
            title="Create your first draft Presence"
            body={
              emailVerificationRequired
                ? "Your account is verified. Start the onboarding sequence and we'll generate a private draft Presence you can shape in Studio. Drafts stay private until you publish."
                : "Start the onboarding sequence and we'll generate a private draft Presence you can shape in Studio. Drafts stay private until you publish."
            }
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/onboarding"
                  className="rounded-xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
                >
                  Start onboarding
                </Link>
                <Link
                  href="/gallery"
                  className="rounded-xl border border-[var(--p-studio-border)] px-4 py-2 text-sm font-semibold text-[var(--p-studio-text)] transition hover:border-[var(--p-studio-accent)]/60"
                >
                  Explore gallery
                </Link>
              </div>
            }
          />
        )}

        {!loading && nodes.length > 0 && (
          <div className="flex flex-col gap-3">
            {nodes.map((node) => (
              <Link
                key={node.id}
                href={`/studio/${node.id}`}
                className="group flex items-center gap-4 rounded-3xl border border-[var(--p-studio-border)] bg-[var(--p-studio-surface)] p-4 transition-colors hover:border-[var(--p-studio-accent)]/50"
              >
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <span className="font-medium text-[var(--p-studio-text)] truncate">
                    {node.display_name}
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--p-studio-muted)]">
                    <StatusPill status={node.status} />
                    <span className="flex items-center gap-1 truncate">
                      <Globe className="w-3 h-3" />
                      {node.status === "published" ? `/p/${node.slug}` : `draft /p/${node.slug}`}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--p-studio-muted)] group-hover:text-[var(--p-studio-accent)] shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
