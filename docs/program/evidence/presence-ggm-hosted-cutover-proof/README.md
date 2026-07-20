# Presence GGM Hosted Cutover Proof

Date: 2026-05-23

## Summary

The hosted GGM pilot cutover moved the real controlled-launch Room from the
generic GGM Presence treatment to the faithful renderer metadata path and
verified the production frontend, public GGM routes, real RoomKey entry,
aggregate analytics, enquiry posture, public redaction, World posture, and
non-GGM regression.

Final launch result: `NO-GO` until the target owner browser session proof,
operator sign-off, and commit-based redeploy trail are complete.

## Targets tested

| Target | Result |
|---|---|
| Hosted frontend alias | production Presence frontend |
| Hosted backend alias | production Presence backend |
| GGM Room | ID `11`, slug `ggm-christina-goddard` |
| Renderer key | `ggm-faithful-room-v1` |
| RoomKey | real hosted token read from ignored pilot env, never written to evidence |

## What changed

- Persisted explicit hosted GGM renderer metadata on the tagged GGM Room.
- Deployed backend public metadata redaction for internal pilot-admin
  provisioning notes.
- Tightened hosted first-pilot Playwright assertions for faithful GGM public,
  RoomKey, work-detail, gallery, World, and non-GGM routes.
- Added current hosted owner subject-token support to pilot API smoke helpers so
  ownership transfer from the old fixture owner does not invalidate safe API
  proof.
- Fixed a hosted mobile RoomKey/nav overlap and redeployed the frontend.
- Captured hosted desktop and mobile screenshot evidence.

## Evidence index

- `CLAUDE_PASS_SUMMARY.md`
- `ROUTE_CANONICALISATION.md`
- `RENDERER_METADATA.md`
- `renderer_metadata_result.json`
- `FRONTEND_DEPLOYMENT.md`
- `HOSTED_VISUAL_SMOKE.md`
- `ROOMKEY_NFC_SMOKE.md`
- `roomkey_nfc_results.json`
- `OWNER_AUTH_SMOKE.md`
- `owner_auth_results.json`
- `OWNER_ANALYTICS_SMOKE.md`
- `owner_analytics_results.json`
- `ENQUIRY_POSTURE.md`
- `enquiry_posture_results.json`
- `OWNER_OPERATOR_SIGNOFF.md`
- `go_no_go.md`
- `results.json`
- `screenshots/`

## Scores

| Gate | Score |
|---|---:|
| Hosted visual fidelity | 95% |
| Hosted RoomKey/NFC readiness | 100% |
| Hosted owner auth readiness | 65% |
| Hosted Studio readiness | 75% |
| Hosted analytics readiness | 90% |
| Hosted enquiry readiness | 85% |
| Route/canonical slug readiness | 100% |
| Backend renderer metadata readiness | 100% |
| Non-GGM regression readiness | 100% |
| First pilot launch readiness | 82% |

## Tests and smokes

- Backend `test_presence_dna_persistence.py`: passed.
- Hosted renderer metadata dry-run and apply: passed.
- Vercel backend production deploy for public metadata redaction: passed.
- Vercel frontend Git build for faithful renderer and production hotfix deploy:
  passed.
- Hosted first-pilot Playwright suite, Chromium desktop and mobile: `10`
  checks passed.
- Current-owner RoomKey smoke: passed.
- Current-owner enquiry smoke: passed with capture-only fallback.
- Current-owner analytics smoke: passed; platform-admin isolation negative is
  covered by the separate previous-fixture-owner denial in
  `owner_auth_results.json`.
- Hosted redaction probe: passed.
- Local frontend typecheck and build after hotfix: passed. One earlier
  concurrent typecheck/build attempt raced Next generated `.next` route types;
  the sequential rerun passed.

## Known limitations

- The owner browser proof for `e4hatu@gmail.com` was not run here without
  authenticated storage state or interactive credential handoff.
- Owner/operator visual sign-off is prepared, not signed.
- Enquiry forwarding is not proven; the current GGM pilot posture is capture
  only fallback with owner/admin monitoring.
- The hotfix deployments came from the local worktree; preserve them in Git
  before the next provider-triggered production deployment.
- The bounded visual limitations in `OWNER_OPERATOR_SIGNOFF.md` remain.

## Exact next action

Run the hosted owner browser checklist in `OWNER_AUTH_SMOKE.md`, record the
operator visual sign-off, commit/push the cutover changes, and re-run the
hosted first-pilot Playwright and RoomKey smokes from the committed deployment.
