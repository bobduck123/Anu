import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { StudioAuthGate } from "@/components/auth/StudioAuthGate";

export function StudioNodeGate({
  authRequired,
  returnTo,
  error,
}: {
  authRequired?: boolean;
  returnTo: string;
  error?: string | null;
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
        <h1 className="text-xl font-semibold">Presence unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-red-100/80">
          {error ?? "This Presence could not be loaded for your account."}
        </p>
        <Link
          href="/studio"
          className="mt-5 inline-flex rounded-2xl border border-red-900/60 px-4 py-2 text-sm font-semibold text-red-100 transition hover:border-red-200"
        >
          Return to Studio
        </Link>
      </div>
    </main>
  );
}
