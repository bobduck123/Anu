# Presence Studio V2 - Studio Recovery S1 Hosted Smoke

Date: 2026-06-05

## Deployment

- Production alias: `https://your-presence.vercel.app`
- Deployment URL: `https://presence-8ynedjq8j-emadhatu-2110s-projects.vercel.app`
- Deployment ID: `dpl_EEh5vdTqXMis3nTy8wmP6LYdwNqC`
- Vercel inspector: `https://vercel.com/emadhatu-2110s-projects/presence/EEh5vdTqXMis3nTy8wmP6LYdwNqC`
- Git commit at deploy time: `f81fca829742939ad24865521d5c2d52f3a4bdfb`
- Deployment command: `npx vercel@latest --prod --yes`

Note: the deployed build was created from the current local working tree, which includes uncommitted S1/P1 changes and evidence/report files.

## Pre-Deploy Sanity

Passed:

```powershell
git status
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\feature.test.ts
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
node --experimental-strip-types --test lib\editor\readiness.test.ts
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
```

Local note:

- `presence-studio-v2-draft-preview.spec.ts` now ignores local sandbox `net::ERR_NAME_NOT_RESOLVED` resource-load noise from the legacy GGM fallback renderer while still failing on page errors and real console errors.
- Node direct TypeScript tests still emit `MODULE_TYPELESS_PACKAGE_JSON`.
- Next build/Playwright still emit the known Turbopack workspace-root warning due to multiple lockfiles.

## Hosted Read-Only Verification

Script:

```powershell
node scripts\hosted-studio-recovery-s1-smoke.mjs
```

First run failed immediately after deploy because the production alias had not yet served the V2 public marker. A curl recheck shortly after showed `.presence-studio-v2-public`, and the second read-only run passed.

Passed checks:

- `/p/ggm-christina-goddard` renders V2 public room.
- `/presence/ggm-christina-goddard` renders V2 public room.
- mobile `/p/ggm-christina-goddard` renders V2 public room.
- `/studio/11/editor` renders `presence-studio-v2-root`.
- S1 top chrome appears.
- S1 left outline appears.
- S1 persistent inspector appears.
- Threshold / Chamber / Studio Archive tabs appear.
- Chamber tabs appear.
- Legacy Canvas editor shell absent for Room 11.
- `/studio/11/editor/preview` renders sanitized V2 public room.
- Room 1 remains legacy and does not render V2 root.
- `/room/11/key` returns safely with no restricted config leakage.
- No page/console errors in read-only owner editor check.

## Full Hosted Lifecycle

Spec:

```powershell
npx.cmd playwright test tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Initial attempt:

- Timed out during the broader edit/save phase.
- Failure snapshot showed smoke objects in the editor with unsaved state.
- Public `/p` and `/presence` did not contain smoke markers.
- Cleanup script confirmed no smoke-marker draft residue:

```json
{
  "roomId": 11,
  "hadSmokeDraft": false,
  "action": "no smoke draft residue found"
}
```

Stabilisation:

- The lifecycle mutation path was narrowed to S1-critical coverage:
  - add visible object
  - add hidden-public object
  - save draft
  - reload persistence
  - owner preview
  - publish
  - anonymous public render
  - payload hygiene
  - room key safety
  - cleanup/restoration
- Moodboard/Skin Lab mutation remains covered by local tests and editor UI smoke; it is not part of the hosted lifecycle mutation path after this stabilisation.

Final result:

- Hosted lifecycle smoke passed: `1 passed (19.7s)`.
- Cleanup/restoration completed through the spec `finally` path.
- Post-smoke public marker checks found no smoke-marker content on `/p` or `/presence`.

## Payload Hygiene

Script:

```powershell
node scripts\hosted-payload-hygiene.mjs
```

Result:

- Public `/p` HTML: clean.
- Public `/p` text: clean.
- Public `/presence` HTML: clean.
- `/room/11/key`: clean.
- Mobile public HTML: clean.
- Total violations: `0`.

Restricted terms checked included:

```txt
style_dna
scene_config
motion_config
asset_config
content_config
roomkey_config
enquiry_config
editable_config
owner
draft
locked
pinned
hiddenPublic
hiddenMobile
WILD TRANSFORM SUSPENDED
localStorage
TemplateKit
presence-studio-v2-toolbar
presence-studio-v2-panel
auth/session/token strings
private media URLs
internal/control-plane API paths
```

## Evidence

Screenshots:

```txt
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room11-full-s1-cockpit.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room11-left-outline-rail.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room11-inspector-content-tab.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room11-inspector-style-tab.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room11-inspector-motion-tab.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room11-threshold-tab.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room11-chamber-tab.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room11-studio-archive-tab.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room11-public-desktop.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room11-public-mobile.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room11-owner-preview.png
docs/program/evidence/presence-studio-v2-studio-recovery-s1-hosted/hosted-room1-legacy-negative.png
```

## Issues

P0:

- None found.

P1:

- None blocking hosted Room 11 S1 readiness.

P2:

- Hosted lifecycle mutation was narrowed after one timeout; add a separate non-destructive hosted UI smoke for Skin Lab and Moodboard if desired.
- Current S1 still lacks S2 direct manipulation.
- Deployment was made from a dirty local working tree; commit/push should follow before treating this as a durable release baseline.

## Verdicts

- Hosted S1 editor readiness: ready for Room 11.
- Hosted owner preview readiness: ready.
- Hosted public render readiness: ready.
- Hosted lifecycle readiness: passed.
- Controlled operator-led pilot readiness: ready with operator support.
- Public self-serve onboarding readiness: not ready. S2 direct manipulation and further usability work remain required.
