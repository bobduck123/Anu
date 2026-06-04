# Presence Studio V2 Hosted Smoke

Date: 2026-06-03

## Current Status

Hosted Studio V2 lifecycle smoke was run against the provided hosted URLs and failed before mutation.

Initial failure reason: the supplied pilot room ID `11` was not a hosted Studio V2 room. It rendered the existing Canvas/GGM editor and had published renderer `ggm-faithful-room-v1`.

**Subsequent conversion pass (Kimi):**
- Room 11 backend data was converted to V2 via the owner editor API.
- Published config now has `renderer_key: presence-studio-v2-room` (version 27).
- Node metadata updated to `custom_renderer_key: presence-studio-v2-room`.
- Frontend metadata fallback fix added to `lib/presence/studio-v2/feature.ts`.
- **Blocked on:** Vercel env var confirmation + frontend redeployment.

No draft save, publish, public content change, or cleanup was required during the smoke attempt.

## Hosted Environment Used

```txt
PRESENCE_HOSTED_SMOKE=1
PRESENCE_E2E_BASE_URL=https://your-presence.vercel.app
PRESENCE_E2E_API_URL=https://anu-back-end.vercel.app
PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID=11
```

## Room Verification

Read-only verification confirmed:

```txt
Room ID: 11
Slug: ggm-christina-goddard
Display name: Christina Kerkvliet Goddard
Status: published
Draft renderer: none
Published renderer: ggm-faithful-room-v1
Studio V2 root visible: false
```

Owner room scan:

- 28 owner rooms were inspected.
- No room had `presence-studio-v2-room` as node, draft, or published renderer.
- TemplateKit draft rooms exist, but they use `studio-room-template-kit-v1`.

## Command Run

```powershell
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result:

```txt
1 failed
```

Failing assertion:

```txt
getByTestId('presence-studio-v2-root') was not visible
```

The test stopped before all mutating steps.

## Evidence

```txt
test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium/error-context.md
test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium-retry1/error-context.md
```

## Smoke Flow Status

Passed:

1. Hosted owner sign-in.
2. Owner session/token extraction.
3. Anonymous visitor did not see the V2 editor root on owner editor route.
4. Owner editor route for room `11` loaded.
5. Owner editor API returned `200`.

Failed:

1. V2 editor mount for room `11`.

Not reached:

1. Edit/save.
2. Reload persistence.
3. Owner V2 preview.
4. Real publish.
5. Anonymous V2 public render.
6. Hosted payload hygiene after publish.
7. Cleanup/restoration mutation.

## Required For Next Run

Create or identify a real hosted Studio V2 pilot room:

```txt
renderer_key=presence-studio-v2-room
```

Then configure hosted V2 gating for that ID/slug:

```txt
NEXT_PUBLIC_PRESENCE_STUDIO_V2=1
NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS=<v2-room-id-or-slug>
```

Server-side, if used:

```txt
PRESENCE_STUDIO_V2_ENABLED=1
PRESENCE_STUDIO_V2_PILOT_IDS=<v2-room-id-or-slug>
```

Rerun:

```powershell
$env:PRESENCE_HOSTED_SMOKE="1"
$env:PRESENCE_E2E_BASE_URL="https://your-presence.vercel.app"
$env:PRESENCE_E2E_API_URL="https://anu-back-end.vercel.app"
$env:PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID="<actual-v2-room-id>"
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

## Readiness

- Local integration: ready.
- Hosted V2 editor: blocked; no V2 pilot room mounted.
- Hosted owner preview: blocked.
- Hosted public render: blocked.
- Controlled operator-led pilot: not ready until hosted lifecycle passes.
- Public self-serve onboarding: not ready.

---

## 2026-05-31 — Hosted Smoke Attempt Result

**Status:** BLOCKED at Step 1 (open V2 owner editor)

**Finding:** `NEXT_PUBLIC_PRESENCE_STUDIO_V2` is absent from the deployed production build.

**Consequence:**
- `/studio/11/editor` renders legacy editor, not V2
- `presence-studio-v2-root` testid not found
- Playwright fails with timeout on V2 root visibility
- No edits, saves, or publishes attempted
- No hosted content modified

**Fix required:**
- Confirm env vars in Vercel **production** environment
- Run `vercel --prod` to force fresh build
- Verify env strings exist in deployed chunks
- Re-run smoke

**Report:** `docs/program/evidence/PRESENCE_STUDIO_V2_PHASE_E_HOSTED_SMOKE_AUDIT.md`


---

## 2026-05-31 — Second Hosted Smoke Attempt Result

**Status:** Stage 1 partially passes. Full smoke blocked.

**Public render:** ✅ Room 11 now renders V2 publicly (`presence-studio-v2-public` class confirmed in SSR HTML).

**Editor:** ❌ Still renders legacy editor. Missing `NEXT_PUBLIC_PRESENCE_STUDIO_V2` from client bundle.

**Fix required:** Add `NEXT_PUBLIC_*` variants to Vercel production env, rebuild, re-run Stage 1.

**No hosted content modified.**



---

## 2026-06-03 — Final Hosted Smoke (POST-ENV-FIX)

**Status:** ✅ **PASSED**

### What Changed

`lib/presence/studio-v2/feature.ts` client env alias bug fixed. `NEXT_PUBLIC_PRESENCE_STUDIO_V2` and `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS` are now correctly inlined by Next.js at build time because the code accesses them directly as `process.env.VAR_NAME` instead of through an alias parameter.

### Stage 1 Fast Gate

```
V2_ROOT:          1
V2_SAVE:          1
LEGACY_CANVAS:    0
LEGACY_INSPECTOR: 0
ERRORS:           none
```

- Room 11 editor renders V2
- Room 1 editor still renders legacy (negative check passed)
- Anonymous users blocked

### Stage 2 Full Lifecycle Smoke

Playwright `presence-studio-v2-hosted-lifecycle.spec.ts` — **1 passed** (17.7s).

- Owner sign-in ✅
- V2 editor mount ✅
- Edit/save/persist ✅
- Draft preview ✅
- Publish ✅
- Public render `/p/` ✅
- Public render `/presence/` ✅
- Mobile viewport ✅
- Payload hygiene ✅
- Room key safety ✅
- Cleanup/restoration ✅

### Payload Hygiene

Zero violations across all scanned surfaces.

### Verdict

**Room 11 is ready for controlled operator-led pilot.**


---

## 2026-06-03 — Hosted Visual Verification

The visual parity pass has been deployed and verified on hosted Room 11.

**Visual smoke results:**
- Public desktop `/p/` — V2 renders, threshold cinematic
- Public mobile `/p/` — V2 renders, designed stack
- Public `/presence/` — V2 renders
- Editor `/studio/11/editor` — V2 cockpit mounts, dark premium shell
- Owner preview — V2 draft preview renders
- Legacy Room 1 — still legacy, no V2 pollution

**Payload hygiene:** 0 violations

**Lifecycle sanity:** Read-only specs 7/7 pass. Full smoke timed out (test fragility from CSS class changes; needs selector update pass).

**Verdict:** Deployed visual pass verified. Room 11 ready for controlled pilot.

See: `PRESENCE_STUDIO_V2_HOSTED_VISUAL_SMOKE_REPORT.md`

---

## 2026-06-04 - P1 Selector Maintenance Attempt

The full hosted lifecycle smoke selector fragility has been fixed in source:

- `presence-studio-v2-hosted-lifecycle.spec.ts` now uses Studio V2 test IDs for Add, Moodboard, Skin Lab, and sheet close interactions.
- Missing V2 editor/panel test IDs were added.
- The brittle `.v2-side-panel .v2-field` helper was removed.

Hosted rerun status:

- Attempted against `https://your-presence.vercel.app` with Room 11.
- The test reached the V2 editor but timed out before edit/save/publish because the live deployed build does not yet include the new test IDs.
- Timeout evidence: `test-results/presence-studio-v2-hosted--16269--a-flagged-V2-room-publicly-chromium/error-context.md`.
- The snapshot showed Save Draft disabled and no smoke marker objects visible.
- A post-timeout public HTML check did not contain `Phase E V2 hosted smoke`.

Current requirement before claiming a fresh full hosted lifecycle pass:

1. Deploy the P1 selector/test-ID patch.
2. Re-run `presence-studio-v2-hosted-lifecycle.spec.ts`.
3. Re-run hosted visual smoke and verify `/p/ggm-christina-goddard` and `/presence/ggm-christina-goddard` still render V2 publicly.

No self-serve readiness is claimed.

---

## 2026-06-05 - Studio Recovery S1 Hosted Smoke

Studio Recovery S1 was deployed and verified on hosted Room 11.

Deployment:

```txt
Production URL: https://your-presence.vercel.app
Deployment URL: https://presence-8ynedjq8j-emadhatu-2110s-projects.vercel.app
Deployment ID: dpl_EEh5vdTqXMis3nTy8wmP6LYdwNqC
```

Read-only hosted verification passed:

- `/studio/11/editor` renders V2 root and S1 cockpit.
- Top chrome, left outline, persistent inspector, Threshold/Chamber/Studio Archive tabs, and chamber tabs are present.
- `/studio/11/editor/preview` renders V2 owner preview with no editor chrome.
- `/p/ggm-christina-goddard` and `/presence/ggm-christina-goddard` render V2 publicly.
- Mobile public route remains usable.
- Room 1 legacy negative remains legacy.
- `/room/11/key` remains clean.

Full hosted lifecycle smoke:

```powershell
npx.cmd playwright test tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result: `1 passed (19.7s)`.

Payload hygiene:

- Hosted payload hygiene script passed.
- Total violations: `0`.

Cleanup/restoration:

- First lifecycle attempt timed out before save/publish and public marker checks were clean.
- Cleanup script found no smoke-marker draft residue.
- Final passing lifecycle completed its cleanup/restoration path.
- Post-smoke public marker checks found no smoke content on `/p` or `/presence`.

Evidence:

```txt
PRESENCE_STUDIO_V2_STUDIO_RECOVERY_S1_HOSTED_SMOKE.md
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/
```

Verdict: Room 11 remains ready for controlled operator-led pilot use. Public self-serve onboarding is still not ready.

Release baseline:

- Baseline product commit: `7a27ec30abebf871f13ccda3830378542f16115d`.
- Deployment `dpl_EEh5vdTqXMis3nTy8wmP6LYdwNqC` was originally created from dirty local state based on `f81fca829742939ad24865521d5c2d52f3a4bdfb`.
- The baseline commit records the deployed S1 product code, tests, reports, smoke scripts, and safe evidence in Git.
