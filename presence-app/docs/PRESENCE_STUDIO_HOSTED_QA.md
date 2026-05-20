# Presence Studio — Hosted QA Report (Pass 8)

> Surgical hosted-frontend QA pass against the live deployment.
> Frontend production host: `https://your-presence.vercel.app`
> Backend production host (discovered): `https://anu-back-end.vercel.app`
>
> Run date: 2026-05-20
> Branch: `feature/presence-ecosystem-alpha`
> Tested against commits `0ec6fd0` / `86dded0`

---

## 1. Tested live URL

Primary: `https://your-presence.vercel.app/`

Backend (POST/GET endpoints): `https://anu-back-end.vercel.app/api/presence/*`

The frontend bundle has `NEXT_PUBLIC_API_BASE` baked in at build time,
pointing at the backend host above. (Confirmed by capturing the
`fetch` URL at submission time in the local dev build with the same
code — see §5.)

---

## 2. Route matrix

All 14 required routes returned HTTP 200 from
`https://your-presence.vercel.app`:

| Route | Status | Notes |
| --- | --- | --- |
| `/` | 200 | Headline "Presence builds public worlds for cultural work." CTA "Start your Presence" → `/presence-chooser`. |
| `/presence-chooser` | 200 | Studio mounts (data-source="local" — see §7). |
| `/onboarding` | 200 | Resolves to the same Studio surface as `/presence-chooser`. |
| `/studio` | 200 | Owner workspace ("Sign out" link visible — clearly distinct from public chooser). |
| `/auth/sign-up` | 200 | Title "Create account | Presence". No legacy `returnTo=/onboarding` link surfaced. |
| `/p/rooms-gallery-painter` | 200 | engine_shell: true, chamber: "threshold" |
| `/p/rooms-underground-dj` | 200 | — |
| `/p/rooms-material-carpenter` | 200 | — |
| `/p/rooms-local-carpenter` | 200 | — |
| `/p/rooms-community-healer` | 200 | — |
| `/p/rooms-sharp-consultant` | 200 | — |
| `/dynamics/orbit` | 200 | orbit_present: true, 12 satellites |
| `/dynamics/tableau` | 200 | — |
| `/dynamics/cascade` | 200 | — |

### Backend customisation endpoints

Hit directly against `anu-back-end.vercel.app`:

| Endpoint | Status |
| --- | --- |
| `GET /api/presence/customisation/manifest` | 200 |
| `GET /api/presence/customisation/room-worlds` | 200 |
| `POST /api/presence/setup-requests` | **201** (labeled QA test accepted, see §5) |

Probing those endpoints on `your-presence.vercel.app` returns 404
(expected — the frontend domain only serves the React app, not the
Python API).

---

## 3. Desktop QA notes (1280 × 820)

Walked the entire flow on the local dev build (same code as deployed).

| Step | Verified |
| --- | --- |
| Welcome | Headline "Not a profile. A place people can enter." Anouk introduction line. 4-step pre-flight. "Begin →" CTA. Meta line. |
| Identity | 5 cards (Artist · Sound artist · Maker · Practitioner · Venue or programme). Picking "Artist" triggers the recommendation cascade — Quiet Gallery / Walk the Rooms / North Light / Paper & Wall / Still / Open Enquiry. `localStorage["presence-studio:selection"]` updates immediately. Continue button enables. |
| Worlds | 3 cards. "Recommended" badge correctly appears on The Quiet Gallery (artist's recommended_world). "Step inside →" demo links to `/p/rooms-gallery-painter`, `/p/rooms-underground-dj`, `/p/rooms-material-carpenter`. |
| Movement | 4 cards. "Walk the Rooms" pre-selected from cascade. "Try the movement →" demo links to `/p/rooms-gallery-painter` + `/dynamics/orbit|tableau|cascade`. |
| Mood & material | 5 moods + 6 materials. North Light + Paper & Wall pre-selected from cascade. |
| Submit | Direction-line: "The Quiet Gallery for the artist, moving as walk the rooms." Direction-meta now reads cleanly (see §10 fix). Refinement opens to 4 paces + 4 contacts + 5 tone pills. |
| Submit (local fallback) | Form validation works (display name, contact name, email, what-you-building, two consent checkboxes). Submit triggers POST. Backend unreachable on local dev → `saved_locally` path. Confirmation banner reads "thread saved · We couldn't reach the studio just now — your direction is safely held on this device." Draft persisted to `localStorage["presence-studio:setup-request-draft"]`. Selection retained. |

Live preview column updates on every selection. 5-row direction
summary (Practice · Place · Movement · Mood · Material) renders.
Mini-vignette themed by mood wash + world accent + movement motif.

---

## 4. Mobile QA notes

Tested at **375 × 812** and **768 × 1024**. Breakpoint is 1024px so
both use the mobile layout (chip strip + drawer + actions bar).

### Found (and fixed)

**Bug: mobile action bar was hidden behind the drawer handle.**

- Drawer (`z-index: 46`, `bottom: 0`) shows its 56px handle band at
  the bottom of the viewport even when collapsed.
- Action bar (Back / Continue) was `position: fixed; bottom: 0;
  z-index: 40` — i.e. occupying the same bottom band but with a
  lower z-index, so the drawer fully covered it.
- Measured at 375×812 before fix: drawer top=756 bottom=812
  (visible 56px); actions top=744 bottom=812. **User could not see
  or tap Continue on mobile.**
- Fix: raise action bar to `bottom: 56px` (just above the visible
  drawer handle) and `z-index: 47` (above the drawer). Drop the
  redundant safe-area-inset-bottom padding from the actions bar —
  the drawer at `bottom: 0` already consumes that area via its own
  padding.
- Verified after fix: actions y=688-756, drawer y=756-812. Cleanly
  stacked, both tappable, no overlap.

### Verified

- 6 chips in the top strip (Welcome · Practice · Place · Movement ·
  Mood · Submit) with `data-state` of `done|current|pending`. Chip
  strip scrolls horizontally on 375px width
  (scrollWidth=536, clientWidth=335) — by design, no page-level
  overflow.
- Drawer handle always shows world label + accent dot. Verified
  with "Live preview · The Quiet Gallery" after cascade.
- No horizontal overflow at 375 or 768.
- Identity cards render full-width on 375px (335px each).
- `presence-studio-stage` has `padding-bottom: 160px` on mobile —
  enough to clear both bottom bars (56 + 68 = 124 + safe area).

---

## 5. Setup request result (live backend)

Sent a labeled QA POST against the live backend (`anu-back-end.vercel.app`):

```json
{
  "display_name": "Presence Hosted QA Test",
  "contact_name": "Presence Hosted QA",
  "email": "test+presence-hosted-qa@example.com",
  "what_youre_building": "hosted frontend QA test; safe to archive",
  "notes": "hosted frontend QA test; safe to archive",
  "do_not_wants": "do not publish; test only",
  "consent_to_contact": true,
  "archetype": "artist",
  "room_world": "rooms-gallery-painter",
  "engagement_dynamic": "chamber_walk",
  "motion_profile": "still",
  "object_skin_pack": "paper-wall",
  "atmosphere_pack": "north-light",
  "contact_style": "enquiry",
  "copy_tone": "Plain",
  "customisation_manifest_version": "studio-v1-local-fallback",
  "customisation_snapshot": { … }
}
```

**Response: HTTP 201**, body excerpt:

```json
{
  "ok": true,
  "request_id": "0e23ee4d-f21e-4c6c-bddd-f86e60ab5617",
  "data": {
    "id": 5,
    "status": "submitted",
    "presence_status": "setup_request",
    "beta_mode": "setup_request",
    "archetype": "artist",
    "room_world": "rooms-gallery-painter",
    "engagement_dynamic": "chamber_walk",
    "motion_profile": "calm",
    "object_skin_pack": "gallery_frame_pack",
    "atmosphere_pack": "quiet_gallery",
    "customisation": {
      "selected_raw": { "atmosphere_pack": "north-light", "object_skin_pack": "paper-wall", … },
      "resolved":     { "atmosphere_pack": "quiet_gallery", "object_skin_pack": "gallery_frame_pack", … }
    }
  }
}
```

Highlights:
- ✓ Request accepted with `status: "submitted"` and DB `id: 5`.
- ✓ `presence_status: "setup_request"` — explicit marker this is a
  request, not a published Presence.
- ✓ Backend echoes BOTH the raw values we sent (`selected_raw`) AND
  the resolved canonical values it mapped them to (`resolved`). So
  even though our local manifest uses different ids than the
  backend's vocabulary, the backend tolerates and remaps them.
- ✓ Adapter exposes a reference number via `data.id`. The Studio's
  `submitSetupRequest()` falls back to `PS-${data.id}` when
  `data.reference` is absent, so the confirmation banner shows
  "**#PS-5**".

---

## 6. Local draft / backend-unavailable result

Verified on local dev with `NEXT_PUBLIC_API_BASE=http://localhost:5000`
and no backend running:

- Fetch URL captured: `POST http://localhost:5000/api/presence/setup-requests`
- Network failure → `submitSetupRequest()` returned
  `{ state: "saved_locally", message: "Your request is saved on this
  device. We'll keep trying to send it." }`
- Draft persisted to
  `localStorage["presence-studio:setup-request-draft"]` (full payload
  serialised).
- Selection retained in
  `localStorage["presence-studio:selection"]`.
- Confirmation banner reads:
  - Chip: **"● thread saved"**
  - Eyebrow: **"Saved on this device · awaiting send"**
  - Headline: **"We've got your direction."**
  - Prose: "We couldn't reach the studio just now — your direction
    is safely held on this device. Refresh later and we'll try to
    send it again."
- ✓ No scary technical error or stack trace surfaced.
- ✓ Repeated clicks on Send button — button disables to `"Sending…"`
  during the in-flight POST, so duplicate submissions are not
  possible.

---

## 7. Accessibility / reduced-motion notes

| Check | Result |
| --- | --- |
| Keyboard tab traversal | 7 focusable elements on welcome step (6 rail steps + Begin button). Order: rail first, then stage button — reasonable persistent-nav-first pattern. |
| `aria-selected` on option cards | Present on every studio option card. |
| `aria-current="true"` on rail step | Present on the current step. |
| `aria-expanded` on refine + more toggles | Present. |
| `aria-label` on rail / preview / drawer | Present ("Studio progress", "Live preview"). |
| `aria-live="polite"` on preview | Present (so screen readers announce updates as the visitor picks). |
| Form errors associated with fields | `Field` component renders errors inside the same label, so they are announced with the field. |
| `prefers-reduced-motion: reduce` | CSS guard at `app/globals.css` line 4434 disables transitions on cards, buttons, and the mobile drawer. |
| Colour contrast | Cream / ink palette tested visually; copper accent only on borders + small status pills. Stage body is ink-on-cream (high contrast). |
| Escape / back | Back button on rail and mobile actions is non-destructive (purely navigational); refine toggle is stateful (toggles open). |

No reduced-motion regressions found.

---

## 8. Copy / internal-language audit

Live HTML (curl, both `/` and `/presence-chooser`) scanned with the
regex set:

```
manifest, payload, schema, mock, customisation_snapshot, backend,
data marker, chamber_walk, orbit_constellation, object_tableau,
portal_cascade, brand pack, mission [abc], presence-gilt
```

**Findings:**

- One match for `manifest` on both pages — context: standard PWA
  `<link rel="manifest" href="/manifest.webmanifest">` link tag.
  This is a Web App Manifest declaration that Next.js emits by
  default. It is not user-visible copy. **No remediation needed.**
- Zero matches for any other banned term in either page's HTML.
- Zero `presence-gilt` references in live HTML.

The `lib/presence/url.ts` helper defensively remaps the legacy
`presence-gilt.vercel.app` origin to `your-presence.vercel.app` if
encountered (URL-helper test still passes 2/2).

New test added (`it("component sources do not leak high-signal
internal terms")`) scans all `.tsx` files in
`components/presence/studio/` for unambiguous internal terms
(backend ids with underscores, multi-word internal phrases). Passes.

---

## 9. Links / canonical check

| Check | Result |
| --- | --- |
| Public homepage "Start your Presence" CTA | `→ /presence-chooser` ✓ |
| Homepage footer route matrix | `/p/your-slug`, `/presence-chooser`, `/studio`, `/plans` — no stale paths. |
| Owner login link | `→ /auth/sign-in` ✓ |
| `/onboarding` route still resolves | 200, same content as `/presence-chooser` ✓ |
| Demo links inside Studio | All 6 `demoHref` values resolved 200 (3 `/p/rooms-*`, 3 `/dynamics/*`). |
| `presence-gilt` in deployed UI | None found. |
| Canonical / URL helpers | `PRESENCE_PUBLIC_ORIGIN` resolves to `your-presence.vercel.app`. Legacy host actively remapped. |

**README finding (fixed):** the Supabase config block in README.md
listed 5 stale URLs pointing operators at `presence-gilt.vercel.app`,
plus a sixth pointing the redirect to the retired `/onboarding` path.
Both updated to `your-presence.vercel.app` + `/presence-chooser` with
a note about the legacy remap. This isn't user-facing, but stale
config docs would break the next Supabase redeploy.

---

## 10. Files changed (surgical polish)

| File | Change | Reason |
| --- | --- | --- |
| `app/globals.css` | `.presence-studio-mobile-actions { bottom: 56px; z-index: 47; padding: 12px 16px; }` (was `bottom: 0; z-index: 40; padding: 12px 16px calc(env(safe-area-inset-bottom, 0) + 12px); }`) | Mobile action bar was hidden behind the drawer handle. Lifted above the 56px visible handle band and raised the z-index above the drawer. Drawer keeps the safe-area inset. |
| `components/presence/studio/PreviewStage.tsx` | `For ${identity.label.toLowerCase()}.` → `For the ${identity.label.toLowerCase()}.` | "For artist." was awkward; "For the artist." reads naturally for every identity label. |
| `components/presence/studio/StepSubmit.tsx` | Direction-meta: drop `" light"` and `" materials"` suffixes (`{mood.label} light · {material.label.toLowerCase()} materials` → `{mood.label} · {material.label.toLowerCase()}`) | "North Light light · paper & wall materials" was redundant for mood labels that already contain a substantive noun (Light, Workshop). New form: "North Light · paper & wall · still pace · open enquiry." |
| `components/presence/studio/SubmissionConfirmation.tsx` | Recall line: `a {world.label}` → `{world.label}`, plus add `the` before identity | Old read "For our records: a The Quiet Gallery for artist…" with double article and missing article. New: "For our records: The Quiet Gallery for the artist…" |
| `README.md` | 5 × `presence-gilt.vercel.app` → `your-presence.vercel.app`; redirect to `/presence-chooser` not `/onboarding`; new note about the remap | Stale operator configuration. |
| `lib/presence/studio/studio.test.ts` | New test: `component sources do not leak high-signal internal terms`. Walks `components/presence/studio/*.tsx` and scans for backend ids + multi-word internal phrases. Imports + comments stripped before scan. | Recommended in brief. Existing test only scanned manifest data; this catches leaks in JSX text / props / template literals. |
| `.claude/launch.json` | Added (idempotent) — `presence-dev` config for Claude Preview QA. | Local QA needed a launch config (existing one named `presence-app` was reused). |

No backend code touched. No demos removed. No routing changes.

---

## 11. Tests run

After polish, full local suite green:

```
==STUDIO==          8 tests passed ✓  (was 7; +1 component-source scan)
==URL HELPER==      2 tests passed ✓
==DYNAMIC REGISTRY==7 tests passed ✓
==NAVIGATOR==      13 tests passed ✓
==AUDIO==           7 tests passed ✓
==UNIQUENESS==      passes ✓
==typecheck==       clean
==build==           green (Turbopack)
```

Commands:

```bash
npm run typecheck
npm run build
npx tsx lib/presence/studio/studio.test.ts
npx tsx lib/presence/url.test.ts
npx tsx lib/presence/world/dynamicRegistry.test.ts
npx tsx lib/presence/world/navigator.test.ts
npx tsx lib/presence/world/audioRegistry.test.ts
npx tsx lib/presence/uniqueness.test.ts
```

---

## 12. Remaining issues (out of scope for this surgical pass)

| Severity | Issue | Notes |
| --- | --- | --- |
| Medium | **Live backend manifest is silently dropped by the frontend normaliser.** | `loadStudioManifest()` GETs `/api/presence/customisation/manifest` (200). The response uses keys like `archetypes`, `room_worlds`, and ids like `quiet_gallery`, `nocturnal_signal`, `gallery_frame_pack`. Our `normaliseBackendManifest()` looks for `identities`, `worlds`, `movements` (the UI shape), so the response is dropped and `LOCAL_STUDIO_MANIFEST` is used. Confirmed by `data-source="local"` on live HTML. **The submission still works** because the backend tolerates and intelligently remaps our local-shape ids (see §5 — `selected_raw` → `resolved`). A proper integration would map backend keys → UI keys inside the normaliser. Out of scope for this surgical pass; flagged for a future integration pass. |
| Low | The deep refinement preview is informational. | Pace and contact-style changes submit in the payload but don't yet re-render the preview vignette. Pace especially deserves a visual representation. |
| Low | No re-entry banner for saved drafts. | Today, if a visitor's submission falls back to `saved_locally`, they leave, and come back, the draft is in `localStorage` but the UI does not announce it. A small "Resume your direction" banner on next mount would close the loop. |
| Informational | Synthetic preview-tool resize doesn't trigger matchMedia change events. | A reload is required after resizing. Real user browsers fire `change` correctly. Not a code bug; a tool quirk. |

---

## 13. Go / no-go judgement

**GO for controlled public intake pilots.**

Justifications:

- ✓ Live homepage cleanly reaches Presence Studio. CTA destination is correct.
- ✓ `/presence-chooser` feels like the public Studio, not a demo index.
- ✓ A visitor can complete the full flow (Welcome → Identity → Worlds → Movement → Mood/Material → Submit) and successfully POST a setup request to the live backend (verified, id=5 returned).
- ✓ Mobile preview remains visible at 375 and 768 (drawer always shows world label + accent dot). The mobile action-bar overlap bug is fixed.
- ✓ All three submission states are clear: `submitted` (#PS-N), `validation_error` (errors merged into form), `saved_locally` ("saved on this device · awaiting send").
- ✓ Zero internal/backend terms in user-visible UI (the lone `manifest` HTML hit is the standard PWA link tag).
- ✓ No public links point to `presence-gilt.vercel.app`. The legacy origin is defensively remapped if encountered, and the stale README config block is corrected.
- ✓ All six demo worlds and all three dynamics routes return 200.
- ✓ Typecheck + build + 8 test suites green.

Caveats:

- The deployed Studio is showing the **local fallback manifest**, not
  the backend manifest, due to the key-shape mismatch (§12). This is
  not visible to visitors (the local manifest is fully populated and
  shipped with the build) and submissions still succeed, but the
  long-term plan should be to align manifest shapes.
- This QA was performed on the frontend only. Backend ops /
  control-plane auth is still blocked (per brief) and was not
  exercised in this pass.

---

## Appendix — verification commands

```bash
# Live route matrix
for r in / /presence-chooser /onboarding /studio /auth/sign-up \
         /p/rooms-gallery-painter /p/rooms-underground-dj \
         /p/rooms-material-carpenter /p/rooms-local-carpenter \
         /p/rooms-community-healer /p/rooms-sharp-consultant \
         /dynamics/orbit /dynamics/tableau /dynamics/cascade; do
  curl -sS -o /dev/null -w "%{http_code} %{url_effective}\n" \
    -L "https://your-presence.vercel.app$r"
done

# Live backend probe
curl -sS -o /dev/null -w "%{http_code}\n" \
  https://anu-back-end.vercel.app/api/presence/customisation/manifest

# Labeled QA POST (replace body file)
curl -sS -X POST https://anu-back-end.vercel.app/api/presence/setup-requests \
  -H "Content-Type: application/json" --data @qa_body.json

# Banned-term sweep on live HTML
curl -sS https://your-presence.vercel.app/presence-chooser \
  | grep -oiE 'manifest|payload|schema|chamber_walk|orbit_constellation|object_tableau|portal_cascade|customisation_snapshot|data marker|brand pack|mission [abc]|backend|presence-gilt'

# Test suite
npm run typecheck && npm run build
for t in lib/presence/studio/studio lib/presence/url \
         lib/presence/world/dynamicRegistry lib/presence/world/navigator \
         lib/presence/world/audioRegistry lib/presence/uniqueness; do
  echo "== $t ==" && npx tsx "$t.test.ts"
done
```
