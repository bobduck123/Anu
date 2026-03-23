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
}

export function CelestialTunnel({
  intents,
  activeIntent,
  onSelectIntent,
  onEnter,
  loading = false,
}: CelestialTunnelProps) {
  const activeDefinition = intents.find((intent) => intent.id === activeIntent) ?? intents[0];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 py-10">
      <div className="pointer-events-auto w-full max-w-4xl rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(6,11,21,0.78),rgba(4,8,16,0.9))] p-6 text-white shadow-[0_35px_100px_-40px_rgba(0,0,0,0.95)] backdrop-blur-2xl md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#dfc28f]/78">Carved celestial entry</p>
            <h1 className="mt-3 text-4xl leading-[0.96] text-white md:text-[3.2rem]" style={{ fontFamily: 'var(--anu-type-display)' }}>
              Carve the chart, then let it come alive.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200/82 md:text-base">
              Choose the kind of commons trace you are looking for first. The route uses that intent to open the starfield
              around the relevant region instead of dropping you into a flat feed.
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
                      ? 'border-[#f2cf97]/40 bg-[#f2cf97]/14 text-[#f8dfb6]'
                      : 'border-white/10 bg-white/[0.04] text-slate-200/72 hover:border-white/22 hover:text-white',
                  )}
                >
                  {intent.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onEnter}
              disabled={loading}
              className="mt-6 inline-flex min-h-11 items-center rounded-full border border-[#f2cf97]/26 bg-[linear-gradient(140deg,rgba(245,210,154,0.17),rgba(245,210,154,0.07))] px-5 text-sm font-semibold text-[#f8dfb6] transition hover:border-[#f2cf97]/44 hover:bg-[rgba(245,210,154,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Preparing entry…' : 'Enter the starfield'}
            </button>
          </div>

          <div className="min-w-0 rounded-[1.6rem] border border-white/10 bg-black/22 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Active carving</p>
            <h2 className="mt-3 text-2xl text-white" style={{ fontFamily: 'var(--anu-type-display)' }}>
              {activeDefinition.label}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-200/78">{activeDefinition.description}</p>
            <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(242,207,151,0.14),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] px-5 py-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#f0d2a2]/76">Transition posture</p>
              <p className="mt-3 text-sm leading-7 text-slate-200/76">
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
