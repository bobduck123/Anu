# Presence V3 bbbvision Canvas Hosted Smoke Report

**Date:** 2026-06-11
**Branch:** `feature/presence-ecosystem-alpha`
**Production alias:** `https://your-presence.vercel.app`
**Deployment URL:** `https://presence-lwmmryqq1-emadhatu-2110s-projects.vercel.app`
**Deployment ID:** `dpl_3799dWREJvcSkuRyVR36qD9KAqFD`
**Deployment target:** production
**Baseline commit deployed:** `3b8134fedeff4aae37091c42ad270c951bf96ec6`
**Implementation commit:** `e600153`
**Audit/evidence commit:** `3b8134f`
**Remote HEAD before deploy:** `3b8134fedeff4aae37091c42ad270c951bf96ec6`

## Deploy

Deploy method:

```txt
npx.cmd vercel@latest --prod
```

The first Vercel upload attempt failed before deployment creation with a Vercel API `Internal Server` upload response. The retry succeeded.

Vercel inspect reported:

- Deployment status: `Ready`
- Target: `production`
- Alias: `https://your-presence.vercel.app`
- Additional aliases: `https://presence-emadhatu-2110s-projects.vercel.app`, `https://presence-emadhatu-2110-emadhatu-2110s-projects.vercel.app`
- Deployment URL: `https://presence-lwmmryqq1-emadhatu-2110s-projects.vercel.app`

Vercel inspect did not expose a Git source commit. The deployment was run from a clean local tree whose local HEAD and remote branch HEAD were both `3b8134fedeff4aae37091c42ad270c951bf96ec6`.

## Hosted Smoke

Command:

```txt
node scripts\hosted-bbbvision-migration-smoke.mjs
```

Result:

```txt
TOTAL_VIOLATIONS: 0
RUNTIME_ERRORS: 0
PASS: true
```

The hosted smoke script was hardened after deploy to use normal desktop/mobile browser user agents and bounded Enter retries. The product deployment source remained `3b8134f`; only smoke verification code changed post-deploy.

Verified production routes:

- `/p/bbbvision`
- `/presence/bbbvision`
- `/presence/bbbvision#gallery`
- `/p/bbbvision#gallery`
- `/p/bbbvision` mobile
- `/presence/bbbvision#gallery` reduced motion
- `/p/ggm-christina-goddard`
- `/presence/ggm-christina-goddard`
- `/p/hesmaddw`

## Results

- bbbvision threshold: PASS.
- Threshold Enter gallery: PASS.
- Direct `#gallery`: PASS on `/presence/bbbvision#gallery` and `/p/bbbvision#gallery`.
- Canvas gallery present: PASS, `presence-public-bbbvision-constellation` found.
- Loader does not stall: PASS, canvas shell reached `data-loader-state="ready"`.
- Focus/open overlay: PASS, focus overlay count `1`.
- Mobile gallery: PASS.
- Reduced motion gallery/focus: PASS.
- Public payload hygiene: PASS, `TOTAL_VIOLATIONS: 0`.
- Runtime errors: PASS, `0`.
- Room 11 regression: PASS on `/p/ggm-christina-goddard` and `/presence/ggm-christina-goddard`.
- Legacy negative: PASS, `/p/hesmaddw` remains outside Studio V2 public output.

## Owner / Editor Caveat

Credential-bound owner browser smoke was not run because `PRESENCE_E2E_OWNER_EMAIL` and `PRESENCE_E2E_OWNER_PASSWORD` were not present in process env. No owner credentials were printed or committed.

Coverage retained:

- Local owner/editor canvas gallery tests passed before deploy.
- Hosted anonymous/public smoke passed.
- Hosted public payload hygiene passed.
- The hosted smoke did not mutate room data.

## Evidence

Evidence path:

```txt
docs/program/evidence/presence-v3-bbbvision-canvas-hosted-smoke/
```

Key evidence:

- `01-published-p-bbbvision-threshold-desktop.png`
- `02a-published-p-bbbvision-canvas-ready.png`
- `02-published-p-bbbvision-gallery-desktop.png`
- `03a-published-p-bbbvision-focus-overlay.png`
- `04-published-presence-bbbvision-desktop.png`
- `08-presence-bbbvision-direct-gallery.png`
- `09-p-bbbvision-direct-gallery.png`
- `10-presence-bbbvision-focus-overlay.png`
- `05b-published-p-bbbvision-mobile-gallery.png`
- `11-presence-bbbvision-reduced-motion-gallery.png`
- `12-presence-bbbvision-reduced-motion-focus.png`
- `06-room11-regression-p-public.png`
- `07-legacy-hesmaddw-negative.png`
- `hosted_bbbvision_payload_hygiene_result.txt`
- `hosted_bbbvision_public_smoke_result.json`

## Remaining Non-Blocking Notes

- Orphaned `.v2-bbb-star` CSS and `constellationStarStyle()` dead code remain future polish.
- 256 shapes may still be heavy on entry-level mobile; adaptive capping can be added after measured need.
- No video/GIF of hosted strip burst was captured; hosted screenshot sequence covers ready, focus overlay, mobile, and reduced motion.
- Public self-serve onboarding is still not ready.

## Verdict

bbbvision canvas gallery is ready for controlled pilot presentation.

Do not call this public self-serve ready.

**PASS  hosted bbbvision canvas gallery ready for controlled pilot presentation**
