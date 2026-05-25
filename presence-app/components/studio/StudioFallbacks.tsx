import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { StudioAuthGate } from "@/components/auth/StudioAuthGate";

export function StudioNodeGate({
  authRequired,
  returnTo,
  error,
  retryable,
  onRetry,
}: {
  authRequired?: boolean;
  returnTo: string;
  error?: string | null;
  retryable?: boolean;
  onRetry?: () => void;
}) {
  if (authRequired) {
    return (
      <StudioAuthGate
        returnTo={returnTo}
        title="Sign in to open this Presence"
        body="This Studio route is protected. Sign in with the account assigned to this Presence to continue."
      />
    );
  }

  return (
    <main className="min-h-dvh bg-[var(--p-studio-bg)] px-4 py-10 text-[var(--p-studio-text)] safe-top">
      <div className="mx-auto max-w-lg rounded-3xl border border-red-900/60 bg-red-950/25 p-6">
        <AlertCircle className="mb-4 h-5 w-5 text-red-300" />
        <h1 className="text-xl font-semibold">{retryable ? "Unable to confirm access" : "Presence unavailable"}</h1>
        <p className="mt-3 text-sm leading-6 text-red-100/80">
          {error ?? (retryable ? "We could not confirm access to this Room yet." : "This Presence could not be loaded for your account.")}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {retryable && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex rounded-2xl bg-[var(--p-studio-accent)] px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-orange-300"
            >
              Try again
            </button>
          )}
          <Link
            href="/studio"
            className="inline-flex rounded-2xl border border-red-900/60 px-4 py-2 text-sm font-semibold text-red-100 transition hover:border-red-200"
          >
            Return to Studio
          </Link>
        </div>
      </div>
    </main>
  );
}
