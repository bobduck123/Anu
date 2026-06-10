# Presence V3 bbbvision Canvas Engine Report

**Date:** 2026-06-10
**Current pass:** Canvas Conditional Fix Pass
**Baseline:** `c318847`

## Status

The Canvas 2D gallery engine remains the active bbbvision gallery renderer. This pass closes the three Kimi conditional-pass gaps without rewriting the engine:

- first-frame loader,
- canvas-native focus strip burst,
- deterministic but more random-feeling image scatter.

## Engine Properties Preserved

- 16x16 spherical field / 256 shapes.
- Original-style sine/cosine grid projection.
- Back-face culling.
- Depth sort, alpha, and scale.
- Canvas thumbnails.
- Wheel/touch rotation.
- Gold focus rectangle.
- Glitch effect.
- DPR-aware sizing.
- Reduced-motion handling.
- Accessible canvas target.

## Conditional Fixes

- Loader: black/gold line/dot field with `Loading field`, fades after thumbnail readiness.
- Focus: selected image thumbnail strips scatter/expand on canvas before the focus overlay opens.
- Scatter: image assignment, crop anchors, and angular jitter are generated from stable editable room work IDs.

## Guardrails

- No hardcoded bbbvision URLs/lists.
- No hosted data mutation.
- No deploy.
- Desktop shape count not downgraded.
- Mobile DPR and glitch cost capped.
- RAF pauses on hidden documents and cleans up on unmount.

## QA

See `PRESENCE_V3_BBBVISION_CANVAS_CONDITIONAL_FIXES_REPORT.md` for full command results and evidence.

## Verdict

**PASS  ready for Kimi re-audit before deploy**

---

## Hosted Production Addendum - 2026-06-11

Kimi re-audit passed and the canvas baseline was deployed to production.

- Baseline commit deployed: `3b8134fedeff4aae37091c42ad270c951bf96ec6`
- Deployment ID: `dpl_3799dWREJvcSkuRyVR36qD9KAqFD`
- Production alias: `https://your-presence.vercel.app`
- Deployment URL: `https://presence-lwmmryqq1-emadhatu-2110s-projects.vercel.app`
- Hosted smoke: PASS
- Payload hygiene: PASS, `TOTAL_VIOLATIONS: 0`
- Hosted direct `#gallery`: PASS
- Hosted focus overlay: PASS
- Hosted mobile: PASS
- Hosted reduced motion: PASS
- Room 11 and legacy regressions: PASS

Evidence:

```txt
docs/program/evidence/presence-v3-bbbvision-canvas-hosted-smoke/
```

Updated verdict:

**PASS  hosted bbbvision canvas gallery ready for controlled pilot presentation**
