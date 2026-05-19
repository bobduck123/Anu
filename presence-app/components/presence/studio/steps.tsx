"use client";

// The five Quick Path step components. Kept in a single file so the
// step shell can import them cheaply and so each step can share the
// common card / vignette primitives without ceremony.

import type { StudioIdentity, StudioManifest, StudioWorld } from "@/lib/presence/studio/manifest";
import { ContactPreview, IdentityVignette, MaterialVignette, MoodSwatch, MovementVignette, PaceTrack, WorldVignette } from "./vignettes";
import type { ResolvedSelection } from "@/lib/presence/studio/useStudioState";

// ---------------------------------------------------------------------------
// 0 — Welcome
// ---------------------------------------------------------------------------
export function StepEnter({ onBegin }: { onBegin: () => void }) {
  return (
    <section className="presence-studio-enter">
      <p className="enter-eyebrow">Welcome</p>
      <h2 className="enter-headline">
        Not a profile.<br />
        <em>A place</em> people can enter.
      </h2>
      <p className="enter-prose">
        Welcome to the studio. In the next five stages you&apos;ll set the
        direction for your Presence — the space your visitors enter, how
        they move through it, and how they reach you. You&apos;ll see every
        choice before you make it. Nothing is published until you say so.
      </p>

      <div className="enter-host">
        <span className="host-mark">A</span>
        <span>
          <strong>I&apos;m Anouk, your studio director.</strong>{" "}
          <span>— These five stages give us your direction. Our team takes it from there: real photography, real copy, real rooms. We&apos;ll be in touch by email about next steps.</span>
        </span>
      </div>

      <ol className="enter-steps">
        {[
          { k: "01", t: "Tell us who", s: "What kind of practice this is." },
          { k: "02", t: "Try worlds", s: "Three places. Walk into each." },
          { k: "03", t: "Set direction", s: "Movement, mood, materials." },
          { k: "04", t: "We refine", s: "Studio team takes it from there." },
        ].map((it) => (
          <li key={it.k}>
            <span className="num">{it.k}</span>
            <span className="title">{it.t}</span>
            <span className="sub">{it.s}</span>
          </li>
        ))}
      </ol>

      <div className="enter-actions">
        <button type="button" className="studio-btn studio-btn-primary" onClick={onBegin}>Begin →</button>
      </div>

      <p className="enter-meta">Ten to fifteen minutes · saved on this device · everything editable later</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 1 — Identity
// ---------------------------------------------------------------------------
export function StepIdentity({ manifest, value, onChange }: {
  manifest: StudioManifest;
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <section>
      <header className="studio-stage-head">
        <p className="stage-eyebrow">Stage 1 · Identity</p>
        <h2>What <em>kind of practice</em> is this?</h2>
        <p className="stage-lede">Pick the closest fit. This shapes which worlds we&apos;ll recommend — but you&apos;re free to explore any of them.</p>
      </header>

      <div className="studio-grid studio-grid-2">
        {manifest.identities.map((id) => {
          const isSel = id.id === value;
          return (
            <button
              key={id.id}
              type="button"
              className="studio-option-card"
              aria-selected={isSel}
              onClick={() => onChange(id.id)}
            >
              <div className="card-art" style={{ aspectRatio: "16/7" }}>
                <IdentityVignette id={id.id} />
              </div>
              <span className="card-tick" aria-hidden>✓</span>
              <div className="card-body">
                <p className="card-name">{id.label}</p>
                <p className="card-quote">&ldquo;{id.tagline}&rdquo;</p>
                <p className="card-prose">{id.plain}</p>
                <div className="card-tags">
                  {id.practices.slice(0, 4).map((p) => <span key={p} className="studio-chip">{p}</span>)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <aside className="studio-soft-note">
        <strong>None of these quite fit?</strong> Many practices sit between two. Pick the closest — you can describe the difference to our studio team in the final step.
      </aside>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2 — Worlds
// ---------------------------------------------------------------------------
export function StepWorlds({ manifest, identity, value, onChange }: {
  manifest: StudioManifest;
  identity?: StudioIdentity;
  value: string | null;
  onChange: (id: string) => void;
}) {
  const recommended = identity?.recommended_world ?? null;
  const recommendedWorld = recommended
    ? manifest.worlds.find((w) => w.id === recommended)
    : undefined;
  return (
    <section>
      <header className="studio-stage-head">
        <p className="stage-eyebrow">Stage 2 · The place</p>
        <h2>Three places, <em>each one yours to walk into.</em></h2>
        <p className="stage-lede">
          {identity && recommendedWorld
            ? <>Based on what you do, we&apos;d start with <strong>{recommendedWorld.label}</strong>. But every world here is open. Hover to feel it. Click to choose.</>
            : <>Three places, each shaped for a different way of working. Pick the one that feels closest.</>
          }
        </p>
      </header>

      <div className="studio-grid studio-grid-3">
        {manifest.worlds.map((w) => {
          const isSel = w.id === value;
          const isRec = w.id === recommended;
          return (
            <button
              key={w.id}
              type="button"
              className="studio-option-card"
              aria-selected={isSel}
              onClick={() => onChange(w.id)}
            >
              {isRec && <span className="card-recommended">Recommended</span>}
              <div className="card-art" style={{ aspectRatio: "5/4" }}>
                <WorldVignette id={w.id} />
              </div>
              <span className="card-tick" aria-hidden>✓</span>
              <div className="card-body">
                <p className="card-name">{w.label}</p>
                <p className="card-prose card-prose-italic">{w.oneLine}</p>
                <div className="card-tags">
                  {w.rooms.map((r) => <span key={r} className="studio-chip">{r}</span>)}
                </div>
                <p className="card-best-for"><strong>Best for: </strong>{w.bestFor.join(" · ")}</p>
                {w.demoHref && (
                  <a className="card-demo-link" href={w.demoHref} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Step inside →</a>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <aside className="studio-host-band">
        <span className="host-mark">A</span>
        <span>Worlds are not templates — they&apos;re starting frames. Your photography, copy, and works fill them out. Two artists in the Quiet Gallery will not look alike.</span>
      </aside>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3 — Movement
// ---------------------------------------------------------------------------
export function StepMovement({ manifest, world, value, onChange }: {
  manifest: StudioManifest;
  world?: StudioWorld;
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <section>
      <header className="studio-stage-head">
        <p className="stage-eyebrow">Stage 3 · How visitors move</p>
        <h2>How should visitors <em>move through</em> your place?</h2>
        <p className="stage-lede">The shape of attention. Some worlds are walked through; some are circled; some are leaned into. The right one depends on what you want visitors to do first.</p>
      </header>

      <div className="studio-grid studio-grid-2">
        {manifest.movements.map((mv) => {
          const isSel = mv.id === value;
          return (
            <button
              key={mv.id}
              type="button"
              className="studio-option-card"
              aria-selected={isSel}
              onClick={() => onChange(mv.id)}
            >
              <div className="card-art" style={{ aspectRatio: "16/9", background: "#0e0d0b" }}>
                <MovementVignette id={mv.id} accent={world?.accent} />
              </div>
              <span className="card-tick" aria-hidden>✓</span>
              <div className="card-body">
                <div className="card-row">
                  <p className="card-name">{mv.label}</p>
                  <span className="studio-chip">{mv.verbs.length} verbs</span>
                </div>
                <p className="card-prose card-prose-italic">{mv.sub}</p>
                <div className="card-divider" />
                <p className="card-eyebrow">First ten seconds</p>
                <p className="card-prose">{mv.first10s}</p>
                <p className="card-feels">Feels like: {mv.feelsLike}</p>
                {mv.demoHref && (
                  <a className="card-demo-link" href={mv.demoHref} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Try the movement →</a>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4 — Mood & Material (combined)
// ---------------------------------------------------------------------------
export function StepMoodMaterial({ manifest, moodValue, materialValue, onMood, onMaterial }: {
  manifest: StudioManifest;
  moodValue: string | null;
  materialValue: string | null;
  onMood: (id: string) => void;
  onMaterial: (id: string) => void;
}) {
  return (
    <section>
      <header className="studio-stage-head">
        <p className="stage-eyebrow">Stage 4 · Mood &amp; material</p>
        <h2>The <em>light</em>, and what things are <em>made of.</em></h2>
        <p className="stage-lede">Two quick choices. The light sets the time of day; the material decides what your objects feel like to touch.</p>
      </header>

      <div className="studio-subhead">
        <p className="stage-eyebrow studio-mute">Light</p>
        <p className="studio-mute">{manifest.moods.find((m) => m.id === moodValue)?.label ?? "Pick one"}</p>
      </div>
      <div className="studio-grid studio-grid-5">
        {manifest.moods.map((m) => {
          const isSel = m.id === moodValue;
          return (
            <button
              key={m.id}
              type="button"
              className="studio-option-card studio-option-mood"
              aria-selected={isSel}
              onClick={() => onMood(m.id)}
            >
              <div className="card-art" style={{ aspectRatio: "3/4" }}>
                <MoodSwatch wash={m.wash} swatches={m.swatches} />
              </div>
              <span className="card-tick" aria-hidden>✓</span>
              <div className="card-body">
                <p className="card-name card-name-tight">{m.label}</p>
                <p className="card-prose card-prose-tight">{m.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="studio-subhead studio-subhead-spaced">
        <p className="stage-eyebrow studio-mute">Material</p>
        <p className="studio-mute">{manifest.materials.find((m) => m.id === materialValue)?.label ?? "Pick one"}</p>
      </div>
      <div className="studio-grid studio-grid-3">
        {manifest.materials.map((m) => {
          const isSel = m.id === materialValue;
          return (
            <button
              key={m.id}
              type="button"
              className="studio-option-card"
              aria-selected={isSel}
              onClick={() => onMaterial(m.id)}
            >
              <div className="card-art" style={{ aspectRatio: "16/9" }}>
                <MaterialVignette swatches={m.swatches} />
              </div>
              <span className="card-tick" aria-hidden>✓</span>
              <div className="card-body">
                <div className="card-row card-row-tight">
                  <p className="card-name">{m.label}</p>
                  <div className="material-swatches">
                    {m.swatches.map((s, i) => (
                      <span key={i} style={{ background: s }} />
                    ))}
                  </div>
                </div>
                <p className="card-prose card-prose-tight">{m.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      <aside className="studio-host-band">
        <span className="host-mark">A</span>
        <span>Both choices are editable later — including after you submit. We tune them against your actual photography in the first draft.</span>
      </aside>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Deep Refinement Panel (used on submit screen)
// ---------------------------------------------------------------------------
export function DeepRefinementPanel({ manifest, resolved, onPace, onContact, onTone }: {
  manifest: StudioManifest;
  resolved: ResolvedSelection;
  onPace: (id: string) => void;
  onContact: (id: string) => void;
  onTone: (tone: string) => void;
}) {
  return (
    <div className="presence-studio-refine">
      <p className="stage-eyebrow studio-mute">Refine further · optional</p>
      <h3 className="refine-head">Pace, contact, tone. Skip any.</h3>

      <p className="stage-eyebrow studio-mute refine-sub">Pace · how motion moves</p>
      <div className="studio-grid studio-grid-4">
        {manifest.paces.map((p) => {
          const isSel = resolved.pace?.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              className="studio-option-card studio-option-tight"
              aria-selected={isSel}
              onClick={() => onPace(p.id)}
            >
              <div className="card-art card-art-tight">
                <PaceTrack ease={p.ease} active={isSel} />
              </div>
              <span className="card-tick" aria-hidden>✓</span>
              <div className="card-body">
                <p className="card-name card-name-tight">{p.label}</p>
                <p className="card-prose card-prose-tight">{p.hint}</p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="stage-eyebrow studio-mute refine-sub">Contact · how visitors reach you</p>
      <div className="studio-grid studio-grid-4">
        {manifest.contacts.map((c) => {
          const isSel = resolved.contact?.id === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className="studio-option-card studio-option-tight"
              aria-selected={isSel}
              onClick={() => onContact(c.id)}
            >
              <div className="card-art card-art-light">
                <ContactPreview kind={c.label} fields={c.previewFields} />
              </div>
              <span className="card-tick" aria-hidden>✓</span>
              <div className="card-body">
                <p className="card-name card-name-tight">{c.label}</p>
                <p className="card-prose card-prose-tight">{c.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      <p className="stage-eyebrow studio-mute refine-sub">Copy tone</p>
      <div className="studio-tone-pills">
        {["Plain", "Editorial", "Technical", "Warm", "Spare"].map((t) => {
          const isSel = resolved.tone === t;
          return (
            <button
              key={t}
              type="button"
              className={`studio-tone-pill ${isSel ? "is-selected" : ""}`}
              aria-pressed={isSel}
              onClick={() => onTone(t)}
            >
              {t}
            </button>
          );
        })}
      </div>
      <p className="refine-foot">We use this to shape the copy in your rooms. You&apos;ll approve every line.</p>
    </div>
  );
}
