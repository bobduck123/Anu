# Presence Controlled Launch Blocker Resolution Proof

Date: 2026-05-22
Decision after re-smoke: **GO** for controlled paid pilots

## Blockers Resolved

| Prior blocker | Resolution |
|---|---|
| Hosted `GET /api/halls` returned `500` | Vercel log showed missing `presence_hall` relation on the failing hosted surface. Current hosted Supabase/Postgres schema inventory contains Gardens/Halls tables and `hall_activity_event`; current production backend Hall list returns canonical `200`. |
| Hosted DB/migration/backup proof missing | Safe pooled hosted Postgres inventory, local Postgres migration proof reference, and Supabase backup/PITR restore plan recorded in the hosted proof report. |
| Local JWT auth hardening not hosted | Production backend smoke now proves malformed Garden bearer returns canonical `401`. |
| Hosted fixture tokens/IDs missing | Tagged fixture provisioner created observer, owner, admin/control, RoomKey, Hall/Path, Mood Board, private surface, and isolation fixtures with ignored env handoff. |
| Provider metadata/env/log audit missing | Vercel deployment IDs, build logs, provider env inventory, backend safe-length checks, frontend env redeploy, and hosted auth/API behavior proof recorded. |

## Code And Smoke Fixes

- `backend/app/security/control_plane.py` now normalizes aware hosted control
  grant expiry timestamps before UTC-naive DB comparison.
- `tests/test_control_token_managed_node_scope.py` covers aware grant expiry.
- `backend/scripts/smoke_presence_controlled_launch_hosted.py` uses valid
  draft Hall type, proves private Mask/Garden/Hall non-leakage, proves
  moderation report, and rejects raw `email` or `user_id` keys in public Hall
  participant smoke output.
- `presence-app/tests/e2e/controlled-launch-hosted.spec.ts` proves the deployed
  Studio sign-in surface is configured after frontend auth env redeploy.

## Final Proof Pointers

- Full report:
  `docs/program/evidence/presence-controlled-launch-hosted-proof/README.md`
- Machine result:
  `docs/program/evidence/presence-controlled-launch-hosted-proof/results.json`
- Backend smoke:
  `docs/program/evidence/presence-controlled-launch-hosted-proof/hosted-backend-smoke.json`
- Pilot checklist:
  `docs/program/PRESENCE_CONTROLLED_LAUNCH_PILOT_CHECKLIST_2026-05-21.md`

## Final Hosted Outcomes

- Backend production deployment:
  `dpl_4jFrV9vH1ZqaBr4qTD53G62eodUD`
- Frontend production deployment:
  `dpl_EbGwYZZKhDpQCEVv8oUqb7TtnVVW`
- Tested code provenance:
  `8948ce5` on `feature/presence-ecosystem-alpha`
- Final hosted backend smoke:
  `49 pass`
- Final hosted Chromium desktop/mobile Playwright:
  `20 pass`

Remaining follow-ups are limitations, not launch blockers for the supervised
pilot mode: Firefox/WebKit rerun when local browsers are available, external
monitoring/Sentry proof, Supabase DB log-console access, and per-pilot enquiry
routing confirmation.
