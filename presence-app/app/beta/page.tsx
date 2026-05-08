import Link from "next/link";
import { ArrowRight, CheckCircle, Compass, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Presence Public Beta",
  description:
    "Create a Presence Studio account and begin shaping your public world in beta.",
};

export default function BetaPage() {
  return (
    <main className="min-h-dvh bg-[var(--p-bg)] px-5 py-8 text-[var(--p-text)] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-900">
            Presence
          </Link>
          <Link href="/auth/sign-in" className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-600 hover:text-stone-950">
            Enter Studio
          </Link>
        </nav>

        <section className="grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
              <Compass className="h-3.5 w-3.5 text-[var(--p-accent)]" />
              Public beta
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.96] tracking-tight text-stone-950 sm:text-6xl">
              Start your Presence as a private draft.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">
              Presence is a public world system for artists, practitioners,
              venues, collectives, creative professionals, and cultural
              organisations. Create an account and begin shaping the public
              surface you want to launch.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/sign-up?returnTo=%2Fonboarding"
                className="inline-flex items-center gap-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                Start your Presence
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/gallery"
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-950"
              >
                Explore Gallery
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-xl shadow-stone-900/5">
            <h2 className="text-2xl font-semibold text-stone-950">How beta works</h2>
            <div className="mt-6 grid gap-4">
              {[
                "Create a Presence Studio account.",
                "Complete beta onboarding.",
                "Begin in private draft.",
                "Publish only when your public world is ready.",
              ].map((step) => (
                <div key={step} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--p-accent)]" />
                  <p className="text-sm leading-6 text-stone-700">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-stone-950">
                <ShieldCheck className="h-4 w-4 text-[var(--p-accent)]" />
                Safe beta rule
              </div>
              <p className="text-sm leading-6 text-stone-600">
                New beta users do not get auto-published pages. If your account
                does not already have an assigned Presence, onboarding starts a
                private draft through the self-serve Studio flow. Assisted
                setup requests are only for users who explicitly choose manual help.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
