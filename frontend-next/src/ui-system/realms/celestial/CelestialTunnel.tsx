import Link from 'next/link';
import type { CommunityCelestialIntent, CommunityCelestialIntentOption } from './communityCelestialPresentation';

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

interface CelestialTunnelProps {
  intents: readonly CommunityCelestialIntentOption[];
  activeIntent: CommunityCelestialIntent;
  onSelectIntent: (intent: CommunityCelestialIntent) => void;
  onEnter: () => void;
  loading?: boolean;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
}

export function CelestialTunnel({
  intents,
  activeIntent,
  onSelectIntent,
  onEnter,
  loading = false,
  secondaryActionHref,
  secondaryActionLabel = 'Sign in to publish',
}: CelestialTunnelProps) {
  const activeDefinition = intents.find((intent) => intent.id === activeIntent) ?? intents[0];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 py-10">
      <div className="pointer-events-auto w-full max-w-4xl rounded-[2rem] border border-[color:rgba(246,212,203,0.1)] bg-[linear-gradient(180deg,rgba(30,2,39,0.78),rgba(30,2,39,0.9))] p-6 text-[var(--color-foreground)] shadow-[0_35px_100px_-40px_rgba(30,2,39,0.95)] backdrop-blur-2xl md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#f6d4cb]/78">Carved celestial entry</p>
            <h1 className="mt-3 text-4xl leading-[0.96] text-[var(--color-foreground)] md:text-[3.2rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Carve the chart, then let it come alive.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:rgba(246,212,203,0.82)] md:text-base">
              Choose the kind of commons trace you are looking for first. The route uses that intent to open the starfield
              around the relevant region instead of dropping you into a flat feed.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[color:rgba(246,212,203,0.68)]">
              Step 1: choose intent · Step 2: enter starfield
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {intents.map((intent) => (
                <button
                  key={intent.id}
                  type="button"
                  onClick={() => onSelectIntent(intent.id)}
                  className={joinClasses(
                    'rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors',
                    activeIntent === intent.id
                      ? 'border-[#f6d4cb]/40 bg-[#f6d4cb]/14 text-[#f6d4cb]'
                      : 'border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(246,212,203,0.04)] text-[color:rgba(246,212,203,0.72)] hover:border-[color:rgba(246,212,203,0.22)] hover:text-[var(--color-foreground)]',
                  )}
                >
                  {intent.label}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onEnter}
                disabled={loading}
                className="inline-flex min-h-11 items-center rounded-full border border-[#f6d4cb]/26 bg-[linear-gradient(140deg,rgba(246,212,203,0.17),rgba(246,212,203,0.07))] px-5 text-sm font-semibold text-[#f6d4cb] transition hover:border-[#f6d4cb]/44 hover:bg-[rgba(246,212,203,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Preparing entry…' : 'Enter the starfield'}
              </button>

              {secondaryActionHref ? (
                <Link
                  href={secondaryActionHref}
                  className="inline-flex min-h-11 items-center rounded-full border border-[color:rgba(246,212,203,0.16)] bg-[color:rgba(30,2,39,0.42)] px-5 text-sm font-semibold text-[color:rgba(246,212,203,0.9)] transition hover:border-[color:rgba(246,212,203,0.3)] hover:bg-[color:rgba(246,212,203,0.08)] hover:text-[var(--color-foreground)]"
                >
                  {secondaryActionLabel}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded-[1.6rem] border border-[color:rgba(246,212,203,0.1)] bg-[color:rgba(30,2,39,0.22)] p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[color:rgba(246,212,203,0.64)]">Active carving</p>
            <h2 className="mt-3 text-2xl text-[var(--color-foreground)]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              {activeDefinition.label}
            </h2>
            <p className="mt-4 text-sm leading-7 text-[color:rgba(246,212,203,0.78)]">{activeDefinition.description}</p>
            <div className="mt-6 rounded-[1.4rem] border border-[color:rgba(246,212,203,0.1)] bg-[radial-gradient(circle_at_top,rgba(246,212,203,0.14),transparent_42%),linear-gradient(180deg,rgba(246,212,203,0.05),rgba(246,212,203,0.01))] px-5 py-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#f6d4cb]/76">Transition posture</p>
              <p className="mt-3 text-sm leading-7 text-[color:rgba(246,212,203,0.76)]">
                The chart begins as inscription and becomes a navigable celestial field once the route knows which region of
                the commons you are seeking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
