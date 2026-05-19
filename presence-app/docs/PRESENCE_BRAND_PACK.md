# Presence Studio — Brand Pack

> Tokens, layout primitives, and editorial rules for the Presence
> Studio onboarding flow at `/presence-chooser`.
>
> All tokens are CSS custom properties on `:root`, appended to
> `app/globals.css` (~line 4180+). They sit alongside the existing
> Presence world tokens (no collisions — every studio token is
> `--studio-*` prefixed).

---

## 1. Editorial principles

| Principle | Why |
| --- | --- |
| **The product is a frame, not a feed.** | Copy never promises content, growth, or reach. It promises a place. |
| **"Not a profile. A place people can enter."** | The product line. Lives on the welcome step and on the meta description. |
| **Editorial, not technical.** | No internal vocabulary in any user-facing surface. No "manifests", "payloads", "schemas", "atmosphere packs", or backend ids (`chamber_walk`, `orbit_constellation`, etc.). |
| **Honest about what's hand-finished.** | The four `TrustCard` tones — auto / hand / editable / you — say plainly which work the studio team takes on, which is editable later, and what we'll ask the client for. |
| **Nothing is public yet.** | The submit and confirmation screens repeat this on purpose. The flow is a setup request, not a publish action. |

### Banned terms in UI (enforced by test)

`manifest`, `payload`, `schema`, `data marker`, `customisation snapshot`,
`brand pack`, `mission [abc]`, `chamber_walk`, `orbit_constellation`,
`object_tableau`, `portal_cascade`, `rooms-gallery-painter`,
`rooms-underground-dj`, `rooms-material-carpenter`.

The test (`lib/presence/studio/studio.test.ts`) walks every string in
`LOCAL_STUDIO_MANIFEST` (skipping `backendId`, `id`, `version`, `source`,
`demoHref`) and asserts that none of these regex patterns match. A
substring check was rejected because it false-positives on "Commission
Card" (→ matches "mission c"); the test uses `\b` word boundaries.

---

## 2. Colour tokens

```css
:root {
  /* Surface */
  --studio-cream:        #f5efe2;   /* page ground */
  --studio-cream-2:      #ede4d1;   /* rail gradient end */
  --studio-card:         #fdfaf2;   /* option card surface */
  --studio-bone:         #fbf6ea;   /* inverted text on ink */

  /* Ink */
  --studio-ink:          #1b1714;   /* primary text */
  --studio-mute:         #6a5f4d;   /* secondary text */

  /* Rules */
  --studio-rule:         #d8cdb6;   /* hairlines */
  --studio-rule-strong:  #b1a585;   /* card borders */

  /* Accent (copper) */
  --studio-copper:       oklch(0.62 0.13 38);
  --studio-copper-soft:  oklch(0.86 0.06 60);
}
```

The palette is intentionally narrow: a cream ground, a single warm
accent (copper), and tiers of ink/rule. The deck's photographic
references (gallery north-light, warm workshop, nocturnal venue) live
inside the world tiles themselves — not in the chrome.

### Why copper, not gold or amber

- Gold reads "luxury brand" — wrong tone for a studio commission.
- Amber reads "casual / hospitality" — too warm.
- Copper carries craft and quietness, sits well on cream, and
  transitions cleanly to dark stages (the world tiles flip to ink
  surfaces when the mood is nocturnal or cinematic without the accent
  losing legibility).

---

## 3. Type stack

```css
:root {
  --studio-mono: ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace;
}
```

The page body uses the system sans stack
(`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`).
Eyebrows, step numbers, and meta lines use `--studio-mono` for
editorial counterpoint.

### Type rules

- **Stage headlines** carry an italic emphasis word (`<em>`) coloured
  in copper. Used sparingly — one per headline.
- **Eyebrows** are uppercase, `--studio-mono`, letter-spaced 0.18em,
  copper colour.
- **Direction line** on the submit step is the only place where two
  italicised values appear in one sentence — it is the studio's read
  of the client's direction and deserves the emphasis.

---

## 4. Shape language

| Surface | Rule |
| --- | --- |
| Cards | 2px border-radius (paper-thin, editorial). Never pill-shaped. |
| Buttons | 2px border-radius. Primary is ink on cream; ghost is bordered. |
| Pills / chips | Pill-shaped (`border-radius: 999px`). Only for status (`● live`, `● not public yet`). |
| Vignettes | Square or 3:2. Always inside a 2px-rounded frame. |

Pill-shape is reserved for status / metadata. It must not appear on
primary actions or content cards.

---

## 5. Shadow tiers

```css
--studio-shadow-1: 0 1px 0 rgba(27, 23, 20, 0.04);
--studio-shadow-2: 0 6px 18px -10px rgba(27, 23, 20, 0.18);
--studio-shadow-3: 0 14px 28px -16px rgba(27, 23, 20, 0.22);
```

- Tier 1 — at-rest cards. Almost invisible; just enough to lift from
  the cream.
- Tier 2 — hover state.
- Tier 3 — selected state. Combines with a 1px inset ink ring so the
  selection reads even with shadows disabled by reduced-motion media
  queries.

---

## 6. Layout primitives

### Frame

```
.presence-studio-frame
  desktop  → grid: rail 280px / stage 1fr / preview 360px
  ≤1024px  → grid: stage 1fr
```

The breakpoint is hard-coded at 1024px and the matchMedia listener
in `PresenceStudio.tsx` toggles the rail/preview vs chips/drawer
arrangement at runtime.

### Rail (desktop)

Sticky, full viewport height, with a step list. Each step is a
button with `data-state="done|current|pending"`. The current step
shows the copper accent ring on its number badge. Done steps replace
the number with `✓` and turn copper-coloured.

### Stage

Centre column. Holds the active step component. Includes a top
chip-strip on mobile (same gating as the rail) and a bottom
Back / Continue pair on desktop.

### Preview (desktop) / Drawer (mobile)

Live preview reads from `resolved` (the derived selection) and
shows:

- A mini vignette themed by the mood wash + world accent + movement
  motif (rooms / orbit / bench / doors).
- A caption strip with the world label + movement label.
- A 5-row summary (Practice, Place, Movement, Mood, Material).

The mobile drawer always shows the world label and accent dot,
even when collapsed. Expansion is by tap on the handle.

---

## 7. Component inventory

| Component | Props | Notes |
| --- | --- | --- |
| `StepEnter` | `onBegin` | Welcome stage. The product line is here. |
| `StepIdentity` | `manifest, value, onChange` | 5-card identity grid. |
| `StepWorlds` | `manifest, identity, value, onChange` | 3 worlds. Recommended world (from identity) shows a "Recommended" pill. |
| `StepMovement` | `manifest, world, value, onChange` | 4 dynamics. Each card carries `first10s` + `feelsLike` + `demoHref`. |
| `StepMoodMaterial` | `manifest, moodValue, materialValue, onMood, onMaterial` | Combined stage. 5 moods + 6 materials. |
| `DeepRefinementPanel` | `manifest, resolved, onPace, onContact, onTone` | Inline on submit. Optional. |
| `StepSubmit` | `manifest, resolved, refineOpen, onToggleRefine, onPace, onContact, onTone, onSubmitted` | Direction-line card + setup form + send. |
| `SubmissionConfirmation` | `result, resolved, onReset` | Differs by `submitted` vs `saved_locally`. |
| `PreviewStage` | `resolved` | Mini vignette + caption strip. |
| `PreviewSummary` | `resolved` | 5-row direction summary. |
| `MobilePreviewDrawer` | `resolved, open, onToggle` | Sticky bottom sheet. |
| `Field` | `label, hint?, error?, children` | Form field with `aria-describedby`. |
| `ConsentRow` | `checked, onChange, error?, children` | Checkbox + label + error. |
| `TrustCard` | `tone, title, items` | Editorial trust strip on confirmation. |

All option cards expose `role="button"` semantics and use
`aria-selected` so screen readers announce the current pick.

---

## 8. Motion + accessibility

### Easing

```css
transition: all 320ms cubic-bezier(0.22, 0.88, 0.24, 1);
```

Studio-wide. The curve is deliberately slow and decelerating —
editorial pacing, not utility-app snap.

### Reduced motion

Every transform / transition / animation is gated by:

```css
@media (prefers-reduced-motion: reduce) {
  /* set duration to 1ms, transform to none */
}
```

Selected state still shows a ring + shadow tier 3, so the
visual hierarchy survives motion suppression.

### Focus

Every interactive surface gets a copper outline at
`:focus-visible`. The keyboard journey from welcome →
identity → world → movement → mood / material → submit is
fully traversable.

---

## 9. Naming conventions

### CSS

- All studio classes are `presence-studio-*` or `studio-*` (no
  unqualified `card` / `chip` classes that could collide with the
  existing Presence world styles).
- Tokens are `--studio-*`.
- State on a step / chip / card uses `data-state="done|current|pending"`
  rather than a class so the state transitions are easy to test for in
  DevTools.

### TypeScript

- Anything ending in `Id` is a **human id** (e.g. `"artist"`,
  `"rooms"`, `"north-light"`).
- Anything on a `backendId` field is the value submitted to the API.
- The two never cross. `buildSetupRequestPayload` is the single
  point that maps one to the other.
- `Resolved*` types (`ResolvedSelection`) carry the full row, not
  the id. Components consume resolved objects so labels stay close to
  the data.

---

## 10. Editorial copy library

Strings that recur in the UI. Treat these as canon — small tweaks
should be made deliberately, not absent-mindedly.

| Surface | Copy |
| --- | --- |
| Meta title | "Presence Studio — Set the direction" |
| Welcome headline | "Not a profile. A place people can enter." |
| Refine toggle | "Refine further" with secondary "Pace · Contact · Tone · References" |
| Submit primary button | "Send setup request →" |
| Submit button (in flight) | "Sending…" |
| Direction line template | "The {world} for the {identity}, moving as {movement}." |
| Confirmation headline | "We've got your direction." |
| Confirmation (submitted) | "Our studio team will pick this up from here. We'll be in touch by email…" |
| Confirmation (saved locally) | "We couldn't reach the studio just now — your direction is safely held on this device." |
| Trust card titles | "What's automated" · "What our team refines" · "Editable later, always" · "What we'll ask you for" |
| Status chip (form) | "● not public yet" |
| Status chip (confirmation) | "● thread open" / "● thread saved" |

---

## 11. Where to extend the brand

- New identity → add a row to `LOCAL_STUDIO_MANIFEST.identities` with
  a `backendId` for the API, `recommended_*` defaults, and a
  variant in `vignettes.tsx → IdentityVignette`.
- New world → add a row to `worlds` + create the demo route at
  `/p/<slug>` + add `demoHref`. The studio will pick it up on the
  next mount.
- New movement (engagement dynamic) → add a row to `movements` +
  build the renderer at `/dynamics/<slug>` + add `demoHref`. The
  preview's `mov === "<id>"` branch in `PreviewStage` needs a new
  motif.
- New mood / material → add a row with `swatches` and (for mood)
  a `wash` gradient. The preview vignette will pick it up
  automatically.

All four extension points are tested against the banned-term regex
on every test run; if you accidentally smuggle an internal id into a
label, the test fails before the change ships.
