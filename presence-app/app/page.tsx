import Link from "next/link";
import { ArrowRight, Compass, DoorOpen, Grid3X3, Sparkles } from "lucide-react";

const principles = [
  "Artists and creative practices",
  "Practitioners and cultural workers",
  "Venues, collectives, and organisations",
];

export default function Home() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[var(--p-bg)] text-[var(--p-text)]">
      <section className="relative px-5 py-8 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(194,65,12,0.14),transparent_30%),linear-gradient(135deg,#faf9f7_0%,#f1ede6_55%,#e9dfd3_100%)]" />
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-900"
          >
            Presence
          </Link>
          <Link
            href="/auth/sign-in"
            className="rounded-full border border-stone-300/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
          >
            Owner login
          </Link>
        </nav>

        <div className="mx-auto grid max-w-6xl gap-10 py-16 lg:grid-cols-[1.04fr_0.96fr] lg:items-end lg:py-24">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-white/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
              <Sparkles className="h-3.5 w-3.5 text-[var(--p-accent)]" />
              Public worlds, not generic pages
            </p>
            <h1 className="text-5xl font-semibold leading-[0.96] tracking-tight text-stone-950 sm:text-6xl lg:text-7xl">
              Presence builds public worlds for cultural work.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-stone-700 sm:text-lg">
              Beautiful enough to use immediately, structured enough to become
              part of a future network for artists, practitioners, venues, and
              cultural organisations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/presence-chooser"
                className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                Start your Presence
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/beta"
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-950"
              >
                Public beta
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {principles.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-stone-300/70 bg-white/50 px-4 py-2 text-xs font-medium text-stone-700"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <Link
              href="/gallery"
              className="group rounded-[2rem] border border-stone-300/80 bg-white/70 p-6 shadow-xl shadow-stone-900/5 backdrop-blur transition hover:-translate-y-0.5 hover:border-stone-950/40"
            >
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white">
                <Grid3X3 className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                Public entry
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-stone-950">
                Explore Presence Gallery
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                View selected public Presences as pilot artists, practitioners,
                venues, and organisations are published.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-950">
                Open gallery
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>

            <Link
              href="/studio"
              className="group rounded-[2rem] border border-stone-900 bg-stone-950 p-6 text-white shadow-2xl shadow-stone-950/20 transition hover:-translate-y-0.5"
            >
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--p-studio-accent)] text-stone-950">
                <DoorOpen className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                Owner entry
              </p>
              <h2 className="mt-3 text-2xl font-semibold">
                Open owner workspace
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                Prepare, preview, publish, and share the public world assigned
                to your account.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-200">
                Go to owner workspace
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white px-5 py-10 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Public route", "/p/your-slug"],
            ["Public Studio", "/presence-chooser"],
            ["Owner workspace", "/studio"],
            ["Plans", "/plans"],
          ].map(([label, route]) => (
            <div key={label} className="rounded-2xl border border-stone-200 p-5">
              <Compass className="mb-4 h-4 w-4 text-[var(--p-accent)]" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                {label}
              </p>
              <p className="mt-2 font-mono text-sm text-stone-900">{route}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
