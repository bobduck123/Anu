# Presence Public Output Recovery P1 Report

Date: 2026-06-06
Branch: `feature/presence-ecosystem-alpha`
Scope: Gallery / GGM public room output recovery, based on the hosted-verified S3 baseline.

## Executive Verdict

Public Output Recovery P1 is locally complete and ready for Kimi art-direction audit.

The Gallery/GGM public renderer is materially closer to a threshold experience: the room now opens with a full-viewport image-led entry, reduced chrome, spatial title composition, and an exhibition-path chamber rhythm. The pass did not touch editor behavior, backend contracts, feature gating, or public payload shape.

S4A chamber-management work was found in the working tree at preflight and parked in a named stash before this pass:

```txt
stash: park S4A chamber management safety-audited local work
```

No deploy was run. No hosted data was mutated.

## Public Output Weaknesses Addressed

- Replaced the contained rounded threshold panel with a full-viewport Gallery threshold.
- Uses the first suitable public image as an atmospheric room entry field.
- Reduced visible system vocabulary: removed object-count pseudo text and no longer renders `image`, `text`, `note`, `link`, or same-as-type role labels.
- Hid Gallery object role labels visually, including non-essential labels like `work` and `proof`.
- Removed the generic `Proof` stamp pseudo-label from public object cards.
- Reworked Gallery chambers from framed panels into unframed exhibition-path bands.
- Replaced the generic Gallery object grid with a 12-column editorial/exhibition rhythm on desktop.
- Upgraded Gallery image treatment to sharp museum-frame images with `object-fit: contain`.
- Added hover/focus detail reveal for Gallery objects; mobile keeps detail visible for readability.
- Reworked Gallery moodboard references into scattered influence fragments.
- Reworked Gallery trace strip into marginal residue instead of metric chips.
- Reworked CTA treatment into a low-chrome threshold portal style.
- Improved mobile Gallery threshold and chamber readability.

## bbbvision Lessons Translated

- Threshold first: the first viewport now behaves as an entry state, not a hero card.
- Minimal chrome: secondary metadata is quiet, and mobile hides the extra world-surface line.
- Gallery immersion: public images lead the room and are allowed to become monumental.
- Simple action: CTA reads as a spatial entry mark rather than a SaaS button.
- Memorable navigation: threshold index remains as a quiet object path instead of a dashboard list.

This pass does not copy bbbvision literally and does not add canvas/WebGL/glitch behavior.

## Files Changed

Product:

- `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx`
- `components/presence-studio-v2/presence-studio-v2-public.css`

Tests/evidence:

- `tests/e2e/presence-public-output-gallery-quality.spec.ts`
- `tests/e2e/presence-public-output-recovery-p1-capture.spec.ts`
- `docs/program/evidence/presence-public-output-recovery-p1/`

Reports:

- `PRESENCE_PUBLIC_OUTPUT_RECOVERY_P1_REPORT.md`
- `docs/program/presence-studio-v2-public-output-quality/PRESENCE_PUBLIC_ROOM_OUTPUT_QUALITY_AUDIT.md`
- `PRESENCE_STUDIO_V2_LOCAL_QA.md`
- `PRESENCE_STUDIO_V2_PROTOTYPE_SUPERIORITY_AUDIT.md`

## Tests Run

Passed:

```powershell
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
npx.cmd playwright test presence-public-output-gallery-quality.spec.ts --project=chromium
```

Results:

- Typecheck: passed.
- Build: passed.
- Feature tests: 8 passed.
- Studio V2 adapter tests: 14 passed.
- Public payload tests: 5 passed.
- Resolver tests: 8 passed.
- Editor readiness tests: 5 passed.
- V2 public render Playwright: 3 passed.
- V2 draft preview Playwright: 2 passed.
- Public payload hygiene Playwright: 2 passed.
- New Gallery quality Playwright: 3 passed.

Evidence capture:

```powershell
$env:PRESENCE_VISUAL_CAPTURE='1'
$env:PRESENCE_VISUAL_CAPTURE_OUT='docs/program/evidence/presence-public-output-recovery-p1'
npx.cmd playwright test presence-public-output-recovery-p1-capture.spec.ts --project=chromium --workers=1
```

The capture test body reported `ok` and wrote screenshots. The shell command timed out during Playwright web-server teardown, matching the prior local capture teardown behavior. The screenshots are present and timestamped.

## Evidence Path

```txt
docs/program/evidence/presence-public-output-recovery-p1/
```

Screenshots:

- `01-gallery-threshold-desktop.png`
- `02-gallery-chamber-desktop.png`
- `03-artwork-image-treatment.png`
- `04-threshold-cta-portal-treatment.png`
- `05-moodboard-influence-layer.png`
- `06-traces-residue-treatment.png`
- `07-gallery-mobile-threshold.png`
- `08-gallery-mobile-chamber.png`
- `09-owner-preview-clean.png`
- `10-legacy-negative.png`

## Payload Hygiene

Payload hygiene passed through:

- `lib/presence/render/publicPayload.test.ts`
- `tests/e2e/presence-public-payload-hygiene.spec.ts`
- `tests/e2e/presence-studio-v2-public-render.spec.ts`
- `tests/e2e/presence-studio-v2-draft-preview.spec.ts`
- `tests/e2e/presence-public-output-gallery-quality.spec.ts`

No restricted editor/control-plane terms were exposed in public output.

## Remaining Visual Gaps

- Full artwork focus mode remains P2; P1 uses hover/focus detail reveal and mobile-visible details.
- The Gallery threshold uses the first public image; future pilot quality depends on curated public-safe imagery.
- Non-gallery worlds were intentionally not deeply redesigned in this pass.
- Local evidence screenshots include the normal Next dev indicator because screenshots were captured through Playwright dev server, not hosted production.
- The original Kimi audit document path was absent on the clean S3 baseline, so this pass creates the expected audit path with the known audit findings and P1 status.

## Recommendation

Safe for Kimi art-direction audit.

Safe to deploy after audit if the reviewer agrees the Gallery/GGM public output now meets the minimum threshold-room standard. Hosted lifecycle should be rerun after deployment because this changes the public renderer CSS/markup, even though local public/preview/payload gates passed.
