# Presence Studio v1 — Implementation Report

> **Pass 7** · Translates the Claude Design handoff package
> (`Presence (2).zip`) into the production onboarding experience served
> at `/presence-chooser`.
>
> Product line: **"Not a profile. A place people can enter."**
> Product principle: **Presence is the frame. The client is the world.**

---

## 1. What shipped

A production onboarding flow at `/presence-chooser` that walks a new
client through five quick decisions (practice, place, movement, mood,
material), previews their direction live, optionally accepts deeper
refinements (pace, contact style, tone, references), and submits a
setup request to the backend with full offline resilience.

The flow is deliberately not a configurator. It is an editorial setup
conversation between the client and the studio. Visitors are told
explicitly: nothing is public, the studio team takes it from here.

---

## 2. Files changed

### New library code (`lib/presence/studio/`)

| File | Purpose |
| --- | --- |
| `manifest.ts` | Typed `StudioManifest` interface + `LOCAL_STUDIO_MANIFEST` fallback. All user-facing labels live here; backend ids live on `backendId` only. |
| `adapter.ts` | `loadStudioManifest()` fetches `/api/presence/customisation/manifest` and falls back to local; `submitSetupRequest()` posts to `/api/presence/setup-requests` with `submitted` / `validation_error` / `saved_locally` states; localStorage draft save/load/clear helpers. |
| `useStudioState.ts` | The `useStudioState()` hook (single source of truth) + `buildSetupRequestPayload()` (maps human ids → backend ids in payload). |
| `studio.test.ts` | 7 tests covering manifest shape, label hygiene, payload mapping, optional-field omission. |

### New components (`components/presence/studio/`)

| File | Purpose |
| --- | --- |
| `PresenceStudio.tsx` | Shell — 3-column desktop / mobile drawer layout, step routing, mobile breakpoint listener. |
| `steps.tsx` | `StepEnter`, `StepIdentity`, `StepWorlds`, `StepMovement`, `StepMoodMaterial`, `DeepRefinementPanel`. |
| `StepSubmit.tsx` | Stage 5 — direction-line card, refine toggle, setup-request form with validation. |
| `SubmissionConfirmation.tsx` | The "we&apos;ve got your direction" screen, with copy that differs for `submitted` vs `saved_locally`. |
| `PreviewStage.tsx` | Desktop preview vignette + 5-row summary. Used by drawer too. |
| `MobilePreviewDrawer.tsx` | Sticky bottom sheet — always shows world label + accent dot, expandable to full preview. |
| `vignettes.tsx` | SVG/CSS composites for identity, world, movement, material, mood, pace, contact tiles. |
| `formHelpers.tsx` | `Field`, `ConsentRow`, `TrustCard` (auto/hand/editable/you tones). |

### Routes touched

| File | Change |
| --- | --- |
| `app/(public)/presence-chooser/page.tsx` | Replaced legacy `PresenceWorldChooser` import with `PresenceStudio`. Updated metadata title to "Presence Studio — Set the direction". |

### Styles

| File | Change |
| --- | --- |
| `app/globals.css` | Appended ~480 lines of studio brand CSS at the end of the file. Tokens, layout, components, mobile drawer, reduced-motion safeguards. See PRESENCE_BRAND_PACK.md for the token list. |

### Demos preserved (not changed)

- `/p/rooms-gallery-painter` (engine shell + 4 chambers)
- `/p/rooms-underground-dj` (sound room)
- `/p/rooms-material-carpenter` (material studio)
- `/dynamics/orbit` (orbit_constellation)
- `/dynamics/tableau` (object_tableau)
- `/dynamics/cascade` (portal_cascade)

All six demo routes remain wired and reachable from the studio
manifest via `demoHref` fields.

---

## 3. How the handoff was translated

The design package shipped as a static HTML/CSS deck plus a tokens
JSON. The translation strategy:

1. **Tokens** were imported into `app/globals.css` as CSS custom
   properties prefixed `--studio-*` (cream, copper, ink, mute, rule,
   card, paper, shadow tiers, mono font stack). This kept them
   side-by-side with the existing Presence world tokens without
   collisions.
2. **Layout** was rebuilt in React from the deck's three-column rail
   / stage / preview grid. The fixed grid collapses to single-column
   below 1024px and exposes the preview through a sticky bottom
   drawer.
3. **Component shapes** (option cards, trust cards, chips, primary
   button) became reusable components with `aria-selected`,
   `aria-current`, and `aria-live` annotations attached at the
   component level so accessibility is built in rather than retro-fit.
4. **Editorial copy** from the deck was preserved verbatim where the
   tone-of-voice mattered (the welcome screen, the trust cards on the
   confirmation screen). Where the deck used internal vocabulary
   (chamber_walk, atmosphere pack, etc.), it was replaced with human
   language and the internal id moved to `backendId` only.
5. **The handoff's "missions" list** (Mission A/B/C, etc.) was
   treated as an internal planning artefact and never reached the UI
   — verified by an automated test that scans every user-facing
   string for banned regex patterns.

---

## 4. Quick path behaviour

Six stages. The rail counts five working stages plus the welcome step.

| # | Stage | Required input | Continue is enabled when… |
| --- | --- | --- | --- |
| 0 | Welcome | — | always (CTA button advances) |
| 1 | What kind of practice | identityId | identity is picked |
| 2 | The place itself | worldId | world is picked |
| 3 | How they move | movementId | movement is picked |
| 4 | Mood &amp; material | moodId + materialId | both are picked |
| 5 | Preview &amp; send | (form validation) | form is submitted (Continue button is replaced with Send) |

### Recommendation cascade

When the user picks an **identity**, the hook (`useStudioState.setIdentity`)
fills any **unset** downstream choice with that identity's recommended
default. Already-chosen values are preserved. The user can still
override every choice on its own step. Example:

- Pick "Artist" → world becomes "The Quiet Gallery", movement becomes
  "Walk the Rooms", mood becomes "North Light", material becomes
  "Paper & Wall", pace becomes "Still", contact becomes "Open
  Enquiry".
- Pick "Sound artist" instead → updates the same six fields to the
  Sound Room recommended set.

### Step gating

The rail's step buttons (and the mobile chips) only let the user jump
**back** to a completed step, or **forward by one** to the next step.
Skipping ahead by more than one step is prevented by
`i &lt;= stepIdx + 1 &amp;&amp; setStepIdx(i)`. This stops the user
landing on a step that has unmet dependencies and keeps the recommendation
cascade meaningful.

---

## 5. Deep refinement behaviour

Deep refinement is a single collapsible panel rendered inline on the
Submit step, opened by an explicit toggle (`Refine further →`). When
open it surfaces three optional fields:

- **Pace** — 4 options (Still, Tactile, Cinematic, Drifting). Each
  carries an `ease` curve and `strength` value that the renderer can
  consume.
- **Contact style** — 4 options (Open Enquiry, Direct Booking,
  Calendar Slot, Commission Card). Each shows `bestFor` chips and
  `previewFields` so the client sees the kind of intake form that
  will be wired up.
- **Tone** — free text input (preview-only). Sent as `copy_tone`.

The panel never blocks submission. All three deep refinements are
optional fields on the payload; they are omitted if empty.

---

## 6. Mobile behaviour

A `matchMedia("(max-width: 1024px)")` listener flips the shell
between desktop and mobile layouts at runtime (no SSR mismatch — the
default is desktop and the listener corrects on mount).

**Mobile layout:**

- The 3-column frame collapses to single column.
- The rail is replaced by a horizontal chip strip at the top of the
  stage (one chip per quick stage, same gating rules as the rail).
- The preview column is replaced by a sticky bottom drawer
  (`MobilePreviewDrawer`). The drawer **always** shows the world
  label and the accent dot. Tapping the handle expands the drawer to
  show the full preview vignette + 5-row summary.
- A second sticky bar at the very bottom shows the Back / Continue
  pair so the user is not scrolling to find primary actions.

The mobile preview is never hidden — the rule "no hidden preview on
mobile" is enforced by the drawer always being visible at minimum
height with the world label rendered.

---

## 7. Manifest adapter behaviour

`loadStudioManifest()` runs on the studio's first mount inside a
`useEffect` with an `AbortController` for cleanup.

### Resolution order

1. **GET `/api/presence/customisation/manifest`**. If the response is
   200 and parses as JSON, the response is passed to
   `normaliseBackendManifest()`. That function:
   - Starts from `LOCAL_STUDIO_MANIFEST` (deep-cloned).
   - For each array key (`identities`, `worlds`, `movements`, `moods`,
     `paces`, `materials`, `contacts`) accepts an incoming array only
     if non-empty.
   - Per row, requires `id` + (`label` or `name`) and merges with the
     local row at the same index. Backend fields override local
     fields. Rows missing the minimum are skipped, keeping the local
     row.
   - Stamps `source = "backend"` and uses `data.version` (or
     `"studio-v1-backend"`) for the manifest version.
2. **Any failure** (network error, non-2xx status, JSON parse error,
   missing arrays) → `LOCAL_STUDIO_MANIFEST` is returned unchanged
   with `source: "local"` and `version: "studio-v1-local-fallback"`.

The shell carries `data-source` on its root element so the provenance
is visible to test tooling without exposing it in the UI.

### Why merge rather than replace

The backend has freedom to evolve the manifest at its own pace —
adding new option rows, tweaking labels, surfacing different
recommendations per archetype — without the frontend breaking when a
field is missing. The local fallback is also the ground truth that
ships with the build, so it's safe to render on the very first
request before the backend has answered.

---

## 8. Setup request payload shape

`buildSetupRequestPayload(fields, resolved, manifest)` returns:

```ts
{
  display_name: string,           // trimmed
  contact_name: string,           // trimmed
  email:        string,           // trimmed
  phone?:       string,           // omitted when empty
  what_youre_building: string,    // trimmed
  notes?:       string,           // omitted when empty
  references?:  string[],         // empties filtered, undefined if none
  do_not_wants?:string,
  consent_to_contact: boolean,

  archetype?:            string,  // identity.backendId (e.g. "artist")
  room_world?:           string,  // world.backendId    (e.g. "rooms-gallery-painter")
  engagement_dynamic?:   string,  // movement.backendId (e.g. "chamber_walk")
  motion_profile?:       string,  // pace.backendId     (e.g. "still")
  object_skin_pack?:     string,  // material.backendId
  atmosphere_pack?:      string,  // mood.backendId
  contact_style?:        string,  // contact.backendId
  copy_tone?:            string,

  customisation_manifest_version: string,
  customisation_snapshot: {
    identity:  { id, label } | null,
    world:     { id, label } | null,
    movement:  { id, label } | null,
    mood:      { id, label } | null,
    pace:      { id, label } | null,
    material:  { id, label } | null,
    contact:   { id, label } | null,
    tone:      string | null,
  },
}
```

The snapshot embeds human labels so a backend reader can render the
client's direction without re-joining against the manifest version.

### Submission state machine

`submitSetupRequest()` returns one of:

| State | When | UI does |
| --- | --- | --- |
| `submitted` | 2xx response | Confirmation screen with reference number; local draft cleared. |
| `validation_error` | 400 / 422 with `details` | Errors merged into the form; banner shown; user can correct and resubmit. Local draft preserved. |
| `saved_locally` | Network failure, 5xx, or any unknown response | Confirmation screen with "Saved on this device · awaiting send" banner; local draft preserved for retry. |

**The local draft is always saved before the network attempt.** A
backend outage cannot lose the user's work; on the next visit, the
draft can be inspected with `loadLocalDraft()`.

---

## 9. Tests run

### Unit tests (`npx tsx`)

```
Presence Studio — local manifest + adapter:
  ✓ local manifest has the four engagement dynamics mapped to friendly labels
  ✓ user-facing labels contain no banned internal terms
  ✓ identity recommendations point to real worlds/movements
  ✓ each demo route the studio links to has a corresponding backendId

Setup request payload shape:
  ✓ buildSetupRequestPayload maps human IDs to backend IDs
  ✓ snapshot includes friendly labels for every chosen field
  ✓ optional fields are omitted when empty

7 Presence Studio tests passed ✓
```

### Regression suites (still green)

- **Dynamics**: 7 tests (orbit / tableau / cascade renderers)
- **Navigator**: 13 tests (room graph + 5-directional moves)
- **Audio**: 7 tests (registry, lifecycle, reduced-motion)
- **Uniqueness**: presence DNA generation invariants

### Build + type-check

- `npm run typecheck` — green
- `npm run build` — green (Turbopack)

### Browser verification (manual via Claude Preview)

- `/presence-chooser` mounts with `data-source="local"` (backend
  down → fallback)
- Welcome headline reads: "Not a profile. A place people can
  enter."
- Identity cascade verified: Artist → Quiet Gallery → Walk the Rooms
  populates the preview without further user input
- Submit step direction line reads: "The Quiet Gallery for the
  artist, moving as walk the rooms."
- Saved-locally confirmation banner reads: "Saved on this device ·
  awaiting send" — `localStorage` contains `archetype: "artist"`,
  `engagement_dynamic: "chamber_walk"`, etc.
- Mobile at 375px: chips visible, drawer mounted at bottom, action
  bar present, rail hidden
- All six demo routes still resolve (post-Pass 7 regression):
  - `/p/rooms-gallery-painter` → `{engine_shell: true, chamber: "threshold"}`
  - `/dynamics/orbit` → `{orbit_present: true, sat_count: 12}`

---

## 10. Known limitations

- **No live backend exists yet.** The studio works fully on the
  local fallback. Once the backend is up, the merge logic in
  `normaliseBackendManifest` accepts whatever shape the API ships
  with — but the contract above is what the frontend expects.
- **Tone is free text, not a curated list.** The handoff suggested
  three preset tones (Plain, Editorial, Direct) but didn't lock the
  vocabulary. The current input lets the user type their own term;
  switching to a select is a one-line change.
- **The deep refinement preview is informational.** Pace and contact
  style changes are submitted in the payload but don't yet re-render
  the live preview vignette. Pace especially deserves a visual
  representation in a follow-up.
- **No A/B test on the welcome copy.** "Not a profile. A place
  people can enter." is set in stone for v1. The deck explored
  alternatives but the chosen line is locked.
- **No analytics events** are wired yet. The state hook is the
  natural attachment point — `setIdentity`, `setWorld`,
  `setMovement` etc. should emit step-completion events when the
  tracking plan lands.
- **Synthetic keyboard tests are unreliable.** The browser-driving
  preview tool sometimes drops dispatched key events; manual
  keyboard navigation works correctly. Live regression coverage of
  the keyboard interaction model is best done with a real e2e
  harness (Playwright / Cypress) which is out of scope for this
  pass.

---

## 11. Next recommendations

In rough priority order:

1. **Stand up `/api/presence/customisation/manifest`** so backend
   provenance and version stamping flow through. The frontend is
   ready and the contract is documented above.
2. **Stand up `POST /api/presence/setup-requests`** with the payload
   shape in §8. Until then every submission goes through the
   `saved_locally` branch — fine for demo but not for live clients.
3. **Wire the analytics plan** at the `useStudioState` boundary: one
   event per step entered, one per option selected, one per
   submission attempt with state.
4. **Re-render the preview on pace/contact changes** so the deep
   refinement panel feels generative, not informational.
5. **Add a real e2e suite** (Playwright) that covers the quick path
   and the local-fallback submission path. The current unit tests
   cover the payload mapping; they don't cover the navigation graph.
6. **Iterate on the trust copy.** The four `TrustCard` strips on the
   confirmation screen are a placeholder honest about what's
   automated vs hand-finished vs editable vs requested-from-client.
   These should be reviewed with the studio team and tuned.
7. **Decide on a tone vocabulary** (see §10).
8. **Consider surfacing the draft on return**: today, draft state is
   stored but the studio doesn't surface it after a `saved_locally`
   path completes. A small "Resume your direction" banner on
   re-entry would close that loop.

---

## Appendix — verification commands

```bash
# Studio unit tests
npx --yes tsx lib/presence/studio/studio.test.ts

# Type check
npm run typecheck

# Full build
npm run build

# Dev server (Turbopack)
npm run dev
```

Routes to inspect manually:

- `/presence-chooser` — the studio
- `/p/rooms-gallery-painter`, `/p/rooms-underground-dj`,
  `/p/rooms-material-carpenter` — demo rooms
- `/dynamics/orbit`, `/dynamics/tableau`, `/dynamics/cascade` — demo
  dynamics
