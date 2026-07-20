# Presence First Pilot GGM Onboarding Proof

Date: 2026-05-22  
Source site inspected: `C:\Dev\ggm`

## Summary

This folder records the first-pilot onboarding path for GGM as a controlled
launch Presence Room. The chosen model keeps the static GGM artist portfolio
external and uses Presence for Room entry, RoomKey NFC/QR proof, per-Room
enquiry posture, owner analytics, rollback, and repeatable evidence.

Current result: `GO` for supervised GGM first-pilot onboarding proof. Hosted
setup and pilot smokes passed on 2026-05-22. Presence enquiries are proven in
capture-only fallback posture until the pilot Room destination and forwarding
policy are confirmed.

## Pilot Identity

- Pilot code: `ggm`
- Pilot identity: GGM / Christina Kerkvliet Goddard
- Presence Room plan: `docs/program/PRESENCE_FIRST_PILOT_GGM_ROOM_PLAN_2026-05-22.md`

## Room Setup Result

- Setup script: `flora-fauna/backend/scripts/setup_presence_pilot_ggm.py`
- Machine output: `ggm_setup_result.json`
- The script supports `--dry-run`, `--apply`, local or hosted controlled-launch environments, deterministic tags, idempotent Room/RoomKey records, and an ignored private env handoff for smoke token values.
- Hosted apply verified public GGM Room slug `ggm-christina-goddard`, Room ID `11`, active QR RoomKey record ID `2`, revoked proof RoomKey record ID `3`, and deferred Hall scope.

## Verification Artifacts

| Gate | Script | Evidence |
|---|---|---|
| Enquiry | `smoke_presence_pilot_enquiry.py` | `ggm_enquiry_verification.md` and `.json` |
| NFC/QR RoomKey | `smoke_presence_pilot_roomkey.py` | `ggm_roomkey_verification.md` and `.json` |
| Owner analytics | `smoke_presence_pilot_owner_analytics.py` | `ggm_owner_analytics_verification.md` and `.json` |
| Combined post-onboarding | `smoke_presence_first_pilot_ggm.py` | `ggm_post_onboarding_smoke.md` and `.json` |
| Browser contract | `presence-app/tests/e2e/first-pilot-ggm.spec.ts` | Hosted desktop/mobile Chromium Playwright run |

Results recorded:

| Gate | Result | Evidence summary |
|---|---|---|
| Enquiry | Pass | Public Room read, safe enquiry capture, honeypot rejection, owner inbox storage |
| NFC/QR RoomKey | Pass | Active resolve, invalid 404, revoked 410, owner encounter increment, QR payload format |
| Owner analytics | Pass | Graph and Node baselines, RoomKey/view/enquiry increments, no private identity keys, cross-owner 403 |
| Post-onboarding | Pass | Health, backend/frontend Room paths, RoomKey entry, enquiry posture, analytics update, World forming, rollback checklist |
| Browser contract | Pass | 8 hosted Playwright checks across desktop and mobile Chromium |

## Rollback And Disable

The GGM rollback checklist is in
`docs/program/PRESENCE_FIRST_PILOT_GGM_ROLLBACK_DISABLE_CHECKLIST_2026-05-22.md`.
It preserves the external static site while disabling public Room, RoomKey,
enquiry, Hall, Studio access, and public discovery surfaces as scoped.

## Smoke Tests Run

Read the generated smoke Markdown and JSON in this folder. A pass requires real
hosted RoomKey resolve, real public Room API/frontend paths, explicit enquiry
routing posture, and owner analytics increment evidence.

Commands run:

```powershell
python flora-fauna\backend\scripts\setup_presence_pilot_ggm.py --dry-run --environment hosted_controlled_launch
python flora-fauna\backend\scripts\setup_presence_pilot_ggm.py --apply --environment hosted_controlled_launch
python flora-fauna\backend\scripts\smoke_presence_pilot_enquiry.py
python flora-fauna\backend\scripts\smoke_presence_pilot_roomkey.py
python flora-fauna\backend\scripts\smoke_presence_pilot_owner_analytics.py --submit-enquiry
python flora-fauna\backend\scripts\smoke_presence_first_pilot_ggm.py
npx playwright test --config=playwright.first-pilot-ggm.config.ts --project=chromium-desktop --project=chromium-mobile
```

## Known Limitations

See `known_limitations.md`.

## GO / NO-GO

See `go_no_go.md`. The GGM pilot proof is GO for supervised onboarding because
the required Room, RoomKey, enquiry posture, analytics, smoke, and rollback
gates passed. Capture-only enquiry forwarding and owner handoff remain explicit
launch notes.

## Scores

| Area | Score |
|---|---:|
| GGM discovery readiness | 100% |
| Pilot Room setup readiness | 100% |
| Enquiry readiness | 85% |
| NFC/QR readiness | 100% |
| Owner analytics readiness | 95% |
| Rollback readiness | 100% |
| Smoke evidence readiness | 100% |
| First pilot readiness | 94% |
| Reusable future-pilot onboarding readiness | 96% |

Readiness rollup:

- First pilot onboarding readiness: `94%`
- Controlled launch readiness: `100%`
- V1 readiness: `94%`
- V2 readiness: `15%`

## Exact Next Steps To Begin Onboarding

1. Review the GGM discovery note and Room plan with the operator who owns the pilot.
2. Confirm owner identity, asset/copy approval, enquiry routing posture, pricing/package note, support owner, and rollback authority.
3. Run the setup script in dry-run mode against the intended target.
4. Decide whether first-pilot enquiries remain capture-only or receive an active Room destination, then rerun enquiry smoke after any routing change.
5. Share only the tested public Presence Room URL and tested QR/NFC payload after owner handoff and support ownership are confirmed.

## Future Pilot Reuse

- Reuse the first-pilot checklist and rollback structure.
- Reuse the setup pattern: deterministic pilot tags, dry-run, non-destructive apply, ignored token env handoff, and IDs-only evidence JSON.
- Reuse the per-Room enquiry, RoomKey, owner analytics, and post-onboarding smoke structure with a different pilot code and Room plan.
