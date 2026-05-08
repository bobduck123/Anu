import Link from "next/link";
import { SearchX } from "lucide-react";

export default function PresenceNotFound() {
  return (
    <main className="min-h-dvh bg-[var(--p-bg)] px-4 py-16 text-[var(--p-text)]">
      <div className="mx-auto flex max-w-md flex-col gap-5 rounded-3xl border border-[var(--p-border)] bg-[var(--p-surface)] p-6">
        <SearchX className="h-7 w-7 text-[var(--p-text-muted)]" />
        <div>
          <h1 className="text-2xl font-semibold">Presence not public yet</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--p-text-muted)]">
            This public page is unavailable. It may still be a private draft, unpublished, or using a different slug.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/gallery"
            className="inline-flex rounded-2xl bg-[var(--p-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--p-accent-dark)]"
          >
            Browse gallery
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-2xl border border-[var(--p-border)] px-4 py-2 text-sm font-semibold text-[var(--p-text)] transition hover:border-[var(--p-accent)]/60"
          >
            Presence home
          </Link>
        </div>
      </div>
    </main>
  );
}
