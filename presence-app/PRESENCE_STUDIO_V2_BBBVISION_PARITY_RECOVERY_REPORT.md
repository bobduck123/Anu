# Presence Studio V2 bbbvision Parity Recovery Report

Date: 2026-06-09

## Summary

The previous Presence bbbvision public renderer was technically clean but artistically wrong: it rendered threshold, gallery, and practice as a single stacked public page. This pass recovers the original bbbvision movement model as a data-driven Studio V2 public state machine:

- `threshold`: sparse black/image field with `bbb.vision` and an Enter action only.
- `gallery`: distinct entered state with active image focus, previous/next movement, progress, side image rhythm, thumbnail/orbit navigation, keyboard support, and mobile controls.
- `practice`: separate state reached deliberately, not dumped into the first view.

No hosted room data mutation was required. Room 29 remains editable Studio V2 data with preset `bbbvision-threshold-gallery`; the renderer now interprets that data with a stateful bbbvision experience.

## Gap Audit

Reference inspected:

- Local source: `C:\Dev\bbb-vision-site\index.html`, `landing.js`, `gallery.html`, `gallery.js`, image assets.
- Live source: `https://bbbvision.vercel.app/`, `https://bbbvision.vercel.app/gallery.html`.
- Previous Presence output evidence: `docs/program/evidence/presence-studio-v2-bbbvision-hosted-migration/`.

| Area | Original bbbvision | Previous Presence output | Recovery result |
| --- | --- | --- | --- |
| Threshold landing | Full-screen sparse visual field, brand mark, Enter only | Threshold plus gallery/practice visible lower on page | Initial route renders threshold only |
| Enter interaction | Ritual transition into separate gallery route | Anchor scroll to lower section | Client-side view transition to `#gallery` |
| Route/state transition | Landing and gallery feel like different states | Single scroll stack | Hash-backed `threshold/gallery/practice` states |
| Gallery layout | Black field with moving image archive | Static staged section below threshold | Active image stage with orbit/side rhythm and controls |
| Image movement | Dynamic image field, hover/focus selection | Simple grid/stage | Prev/next, keyboard arrows, animated stage motion |
| Visual depth | Layered black field, gold highlights, spatial image placement | Flat public CMS sections | Side ghosts, orbit rail, gold progress/nav, dark field |
| Typography | Sparse bbb.vision mark; low chrome | CMS-like copy visible early | Minimal threshold; captions only in gallery |
| Black/gold treatment | Strong black/gold field | Partially present but page-like | Full-state black/gold interaction surface |
| Mobile | Full-screen threshold and image-first movement | Stacked mobile page | Threshold-only mobile first state; thumb-safe gallery controls |
| Emotional feel | Entered visual world | Public content stack | Distinct room entry and gallery travel |
| Page/state travel | Visitor moves from landing to gallery | Visitor scrolls down | Visitor enters, moves image by image, can return |
| Flat-stack risk | None in source | High | Removed for bbbvision preset |

## Implementation Changes

Files changed:

- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`
- `tests/e2e/presence-studio-v2-bbbvision-pilot.spec.ts`
- `tests/e2e/presence-studio-v2-bbbvision-parity.spec.ts`
- `scripts/hosted-bbbvision-migration-smoke.mjs`

Renderer changes:

- Added `BbbVisionPublicView = "threshold" | "gallery" | "practice"`.
- Added hash/popstate syncing so `/p/bbbvision` and `/presence/bbbvision` open on threshold and Enter moves to `#gallery`.
- Added browser back support from gallery to threshold.
- Added keyboard gallery movement: left/right arrows move images, Escape returns to threshold/gallery.
- Rendered only the active bbbvision state, so gallery/practice are not present as visible stacked sections on first load.
- Kept all content sourced from sanitized `StudioV2PublicRoom` chambers/objects/CTA data.

Gallery dynamics:

- Active image stage with focused image object.
- Previous/next movement with progress index.
- Side ghost images and orbit/thumb selection layer.
- Click-to-focus artwork dialog preserved.
- Mobile gallery uses horizontal image rhythm and bottom controls.
- Reduced-motion mode disables animations while preserving state movement.

## Editability Preserved

The renderer still derives from public Studio V2 data:

- Room title and CTA/Enter label come from room/object data.
- Threshold images and gallery images come from public image objects.
- Captions/titles/meta/detail come from editable objects.
- Practice/about copy comes from room tagline and text/note/proof objects.
- S5 asset handling remains intact because image objects remain Studio V2 objects.
- Public style preset remains `bbbvision-threshold-gallery`.

No bbbvision content was hardcoded into the generic renderer. No iframe/static clone was introduced.

## Hosted Room 29

Room 29 (`bbbvision`) was not mutated in this pass.

- Owner/control: previously assigned to `e4hatu@gmail.com`.
- Public style preset: `bbbvision-threshold-gallery`.
- Data rollback: no data rollback required for this pass.
- Code rollback: redeploy the previous Vercel production deployment or revert the renderer/test/script changes in this report.
- Existing hosted backup remains: `docs/program/evidence/presence-studio-v2-bbbvision-hosted-migration/backup/room-29-bbbvision-backup.json`.

## QA Results

Passed:

- `npm.cmd run typecheck`
- `npm.cmd run build`
- `node --experimental-strip-types --test lib\presence\studio-v2\assets.test.ts`
- `node --experimental-strip-types --test lib\presence\studio-v2\feature.test.ts`
- `node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts`
- `node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts`
- `node --experimental-strip-types --test lib\presence\render\resolver.test.ts`
- `node --experimental-strip-types --test lib\editor\readiness.test.ts`
- Combined Playwright chromium regression set: 23 passed across public render, draft preview, payload hygiene, direct manipulation, inspector usability, S5 asset library, Gallery P2 quality/polish, public style presets, bbbvision pilot, and bbbvision parity.
- Focus rerun after evidence timing update: `presence-studio-v2-bbbvision-parity.spec.ts` and `presence-studio-v2-bbbvision-pilot.spec.ts`: 2 passed.

Notes:

- Next/Vercel build warns about multiple lockfiles and inferred workspace root. This is pre-existing and did not block build/deploy.
- Local dev broad `owner` payload scanning is a false positive because Next dev RSC embeds fixture text. Hosted hygiene remains strict.

## Deployment And Hosted Smoke

Deployment:

- Vercel deployment ID: `dpl_8DmBsGCqxpG4mKLDown3X7dMLdfA`
- Production alias: `https://your-presence.vercel.app`

Hosted smoke:

- `/p/bbbvision`: 200, threshold-only first state, gallery after Enter, no broken visible images.
- `/presence/bbbvision`: 200, threshold-only first state, gallery after Enter.
- Mobile `/p/bbbvision`: 200, threshold-only first state, gallery after Enter.
- Room 11 `/p/ggm-christina-goddard`: clean Studio V2 public output.
- Room 11 `/presence/ggm-christina-goddard`: clean Studio V2 public output.
- Legacy `/p/hesmaddw`: remains legacy, no Studio V2 public renderer.

Payload hygiene:

```txt
TOTAL_VIOLATIONS: 0
RUNTIME_ERRORS: 0
PASS: true
```

Hosted owner Studio/preview smoke:

- Not rerun in production because `PRESENCE_E2E_OWNER_EMAIL` and `PRESENCE_E2E_OWNER_PASSWORD` were not present in this shell.
- No fake credentials were created.
- Local owner-preview path was verified by the bbbvision parity and pilot specs.
- Existing hosted owner/control assignment remains from the completed room 29 migration.

## Evidence

Evidence directory:

`docs/program/evidence/presence-studio-v2-bbbvision-parity-recovery/`

Key files:

- `00-original-bbbvision-live-threshold.png`
- `00b-original-bbbvision-live-gallery.png`
- `02-owner-preview-threshold.png`
- `03-owner-preview-gallery-active.png`
- `04-owner-preview-gallery-next.png`
- `05-owner-preview-gallery-prev.png`
- `06-owner-preview-practice.png`
- `07-public-p-threshold.png`
- `08-public-p-gallery.png`
- `09-public-presence-threshold.png`
- `10-mobile-threshold.png`
- `11-mobile-gallery.png`
- `12-reduced-motion-gallery.png`
- `13-legacy-negative.png`
- `01-published-p-bbbvision-threshold-desktop.png`
- `02-published-p-bbbvision-gallery-desktop.png`
- `03-published-p-bbbvision-gallery-next-state.png`
- `04-published-presence-bbbvision-desktop.png`
- `05-published-p-bbbvision-mobile-threshold.png`
- `05b-published-p-bbbvision-mobile-gallery.png`
- `06-room11-regression-p-public.png`
- `07-legacy-hesmaddw-negative.png`
- `hosted_bbbvision_public_smoke_result.json`
- `hosted_bbbvision_payload_hygiene_result.txt`

## Remaining Gaps

- The original bbbvision gallery uses a custom canvas/image-field engine with loading counter, hover focus rectangle, and sliced/glitch image opening. Presence now approximates the movement with React/CSS state and editable objects, not a cloned canvas engine.
- Local mock bbbvision content has four image objects; hosted room 29 has the real source bbbvision asset set.
- Production owner Studio/preview was not rerun without secure owner credentials in environment.

## Pilot Demo Readiness

bbbvision is now ready for a controlled operator-led pilot demo from the public output perspective.

The output no longer behaves like a flat Presence page: visitors enter through a threshold, move into a distinct gallery state, navigate image-by-image, and can intentionally access practice/about. Studio editability, Gallery P2, Christina Liquid Gallery, S5 asset library, payload hygiene, Room 11, legacy routing, and S4A parking were preserved.

S4A remains parked in `stash@{0}`.
