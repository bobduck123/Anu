import Link from "next/link";
import { ArrowLeft, ArrowRight, Grid3X3 } from "lucide-react";

export const metadata = {
  title: "Presence Gallery",
  description:
    "Selected public Presences for artists, practitioners, venues, and cultural organisations.",
};

export default function GalleryPage() {
  return (
    <main className="min-h-dvh bg-[var(--p-bg)] px-5 py-8 text-[var(--p-text)] sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500 hover:text-stone-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Presence
        </Link>

        <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-xl shadow-stone-900/5 sm:p-10">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-3xl bg-stone-950 text-white">
            <Grid3X3 className="h-6 w-6" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
            Public Gallery
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-stone-950 sm:text-5xl">
            The public index opens as pilot Presences are published.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">
            Presence Gallery is the public entry point for selected artists,
            practitioners, venues, and cultural organisations. It does not list
            draft, private, suspended, or unassigned Presences.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <h2 className="font-semibold text-stone-950">Publishing rule</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Only intentionally published public Presences should appear here
                when the directory API is enabled.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <h2 className="font-semibold text-stone-950">Pilot state</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                For alpha, owners can share their canonical public route at
                <span className="font-mono"> /p/[slug]</span>.
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/sign-up?returnTo=%2Fbeta%2Fonboarding"
              className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Start your Presence
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-950"
            >
              Enter Studio
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
