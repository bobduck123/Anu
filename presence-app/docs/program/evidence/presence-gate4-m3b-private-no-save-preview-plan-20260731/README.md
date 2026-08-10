# Gate 4 M3B - Atelier Private No-Save Preview Plan

Date: 2026-07-31
Status: Planned - docs/evidence only
Repo: `C:\Dev\Flora_fauna`
App: `C:\Dev\Flora_fauna\presence-app`
Reference: `C:\Dev\presence-reference\03-atelier`
Committed baseline: `e93a6e2 [presence] stage gate 4 atelier catalog baseline`

## Verdict

Plan M3B as a private, owner-only, no-save preview adapter for `brass-inlay` x `refractive-threshold`.

Do not make Atelier IDs selectable, persistable, saved, restored, public, or accepted as Gate 4 library coverage.

## Reading Reviewed

- `presence-app/.agent/PRESENCE_GATE_4_EXECPLAN.md`
- `presence-app/docs/program/evidence/presence-gate4-m2-catalog-schema-gap-20260730/README.md`
- `presence-app/docs/program/evidence/presence-gate4-m3a-atelier-private-catalog-staging-20260730/README.md`
- `presence-app/lib/presence/studio-v3/styleCatalog.ts`
- `presence-app/components/presence-studio-v3`
- `C:\Dev\presence-reference\03-atelier\presence.manifest.json`
- `C:\Dev\presence-reference\03-atelier\README.md`
- `C:\Dev\presence-reference\03-atelier\GAPS.md`
- `C:\Dev\presence-reference\03-atelier\modules\README.md`

## Placement Decision

The private no-save preview should live in the Studio V3 owner/private surface, launched from the Look controls as a separate Atelier preview action and rendered by `PresenceStudioV3Shell.tsx` in the existing private preview canvas area.

It should not live in:

- public renderer
- public route
- public projection
- backend private-state validators
- catalog selectability controls
- save/reload state hydration

The owner should be able to inspect the Atelier visual idea while the active saved Studio state remains on the existing Gate 3 catalog.

## Metadata Without Persistence

The preview may read M3A catalog definitions for labels, boundary copy, compatibility status, and visual tokens. It must convert those definitions into a pure transient preview model and keep all interactive preview state in component-local React state.

It must not write `brass-inlay`, `refractive-threshold`, `onion-inspection`, `scribe-reveal`, `measured-plate`, `drawing-sheet`, or `material-sampler` into any active saved state, private-state restore payload, save envelope, compiler output, public projection, local storage, or backend payload.

## Visual Subset Decision

The smallest truthful visual proof is:

- drawing sheet atmosphere
- six refractive threshold bodies
- brass edge/inlay language
- readable labels
- mobile and reduced-motion-safe static composition
- optional transient material sample only if it is CSS-only and reset-on-close

This is stronger than a simple static material swatch and safer than the full reference import. It proves the core pairing idea without importing WebGL, generated content, enquiry, public renderer, or backend persistence.

## Deferred Reference Parts

The following are deferred from M3B:

- WebGL refraction, cube camera, shaders, and Three.js runtime
- full threshold/body morph and 75 percent room takeover
- `blob-nav` shared geometry contract
- `js/lib/layout.js`, `outline.js`, `path.js`, `tween.js`, `dither.js`, and `plate.js` as app registry primitives
- generated measured-plate Work model
- Onion Inspection and Scribe Reveal runtime behavior
- material sampler token propagation into rasterized consumers
- enquiry widget, webhook, owner signal, and derived visitor arithmetic
- module contract validator import
- public renderer support
- backend validator support

## Required Implementation Evidence

When runtime work begins, M3B must produce:

- desktop owner/private preview screenshot
- mobile 390px screenshot
- reduced-motion screenshot or browser proof
- close/reload proof that saved active state did not change
- write-ledger or network proof that no save payload carries Atelier IDs
- public-invariance Chromium proof
- staged-file inspection proving no backend/public/auth/tenant/payment/deploy files changed

Required commands for the implementation slice:

```text
cmd /c npm run typecheck
cmd /c npm run build
cmd /c npx playwright test tests/e2e/presence-studio-v3-atelier-private-preview.spec.ts --project=chromium
cmd /c npx playwright test tests/e2e/presence-studio-v3-public-invariance.spec.ts --project=chromium
cmd /c npx playwright test tests/e2e/presence-studio-v3-mobile-accessibility.spec.ts --project=chromium --grep "mobile visual controls"
git diff --check
git diff --cached --check
```

## Public-Invariance Requirement

Public output must remain invariant because M3B is only an owner/private preview. The implementation must not touch public renderer, public routes, public payloads, projection, publish, deploy, backend validators, auth, tenant isolation, payment logic, or production data.

The public-invariance test is required even if the implementation appears owner-only.

## UX Boundary

The UI must avoid implying persistence or public support:

- use "preview" language only
- show `Private no-save preview`
- say it does not save, publish, or change public visitor routes
- keep normal Atelier selection blocked in catalog controls
- reset transient material/body state on close
- keep save controls from capturing Atelier IDs

## Exclusions

Still excluded:

- GGM conversion
- Soundings import
- `05-meridian`
- slots `06` through `10`
- Gate 5/Fable
- public launch or Gate 4 acceptance

## Files Added Or Updated By This Planning Packet

- `presence-app/.agent/PRESENCE_GATE_4_M3B_ATELIER_PRIVATE_NO_SAVE_PREVIEW_WORK_ORDER.md`
- `presence-app/docs/program/evidence/presence-gate4-m3b-private-no-save-preview-plan-20260731/README.md`
- `presence-app/.agent/PRESENCE_GATE_4_EXECPLAN.md`
- `presence-app/.agent/PRESENCE_GATE_TRACKER.md`

## Planning Acceptance

- Docs/planning only.
- No runtime code.
- No backend validator change.
- No public renderer, route, payload, projection, publish, deploy, auth, tenant, payment, production-data, merge, push, or stash operation.
- `05-meridian`, GGM, Soundings, and slots `06` through `10` remain excluded.
- Stage only the M3B planning docs/evidence/tracker files.
