# Hosted GGM Visual Smoke

Date: 2026-05-23

## Result

Hosted public visual smoke passed for the public, work-detail, RoomKey, gallery,
World, and non-GGM regression surfaces after production alias promotion and the
mobile RoomKey spacing fix.

## Assertions run

`presence-app/tests/e2e/first-pilot-ggm.spec.ts` ran against the hosted frontend
and backend on Chromium desktop and Chromium mobile. The focused smoke checks:

- canonical GGM public Room contains faithful portfolio copy
- old generic gallery HUD copy is absent from the GGM public page
- real RoomKey route contains faithful opened-via/portfolio copy and rejects the
  generic HUD copy
- work detail for `willow-of-port-arthur-2019` renders the GGM detail surface
- gallery contains the GGM first-pilot card link
- a non-GGM Room does not inherit GGM content
- `/world` remains forming
- public and RoomKey API calls use the hosted backend, not localhost/mock

## Screenshot set

The screenshot set under `screenshots/` contains:

- `hosted-ggm-room-{desktop,mobile}.png`
- `hosted-ggm-work-detail-{desktop,mobile}.png`
- `hosted-ggm-roomkey-entry-{desktop,mobile}.png`
- `hosted-gallery-card-{desktop,mobile}.png`
- `hosted-non-ggm-room-regression-{desktop,mobile}.png`
- `hosted-world-forming-{desktop,mobile}.png`

## Bug found and fixed

The first hosted mobile RoomKey screenshot showed the extra paper chip
overlapping the fixed GGM nav. The narrow-viewport CSS now hides that redundant
chip; the hero keeps the visible `Opened via QR code` context. The frontend was
rebuilt, redeployed, re-smoked, and re-captured after the fix.
