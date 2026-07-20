# Presence Controlled Launch Hosted Proof

Date: 2026-05-22
Decision: **GO** for controlled paid pilots

## 1. Summary

Presence passed the hosted controlled-launch gates after the blocker pass.
This is a controlled pilot GO only:

- selected early clients
- supervised onboarding
- small Room and Hall count
- World hidden/forming
- V2 previews remain prototype/preview only
- no realtime or spatial multiplayer claim beyond the live V1 contract

The tested hosted backend and frontend are Vercel production aliases backed by
tagged smoke fixtures and hosted Supabase/Postgres. The final hosted backend
smoke passed `49` steps. The final hosted Chromium Playwright run passed `20`
desktop/mobile checks against the deployed frontend and backend.

| Metric | Result |
|---|---:|
| Controlled launch readiness | 100% |
| V1 readiness | 94% |
| V2 readiness | 15% |

## 2. Gate Scores

| Gate | Score | Hosted result |
|---|---:|---|
| Deployment correctness | 100 | Production backend and frontend targets, deployment IDs, aliases, build logs, and tested SHA provenance captured. |
| Env correctness | 100 | Provider env inventory audited without values; backend safe lengths checked; frontend build-time API/auth vars redeployed and proven by hosted behavior. |
| DB/migration readiness | 100 | Hosted pooled Postgres schema/table/index inventory and Hall activity table proven; no destructive migration was run. |
| Backend health | 100 | Health, CORS, invalid auth, safe 404, admin negatives, and control-positive smoke passed. |
| API contract readiness | 100 | Fixture-backed public, Observer, Hall/Path, Owner, and control smoke passed. |
| Frontend/backend integration | 100 | Deployed frontend routes use the hosted backend in Chromium desktop/mobile. |
| Public Room/NFC entry readiness | 100 | Public Room and RoomKey resolve fixture paths passed hosted API and frontend smoke. |
| Garden readiness | 100 | Garden, Mask, Observation, Echo, Seed, Mood Board, privacy, and upgrade guard proof passed. |
| Hall readiness | 100 | Hall list/detail/participant privacy/activity/path/analytics/owner draft cleanup passed. |
| Owner Studio readiness | 100 | Owner Hall list/detail/analytics/isolation and hosted sign-in configured gate passed. |
| Safety/privacy readiness | 100 | World/admin isolation, private Garden/Hall non-leakage, participant identity check, moderation report, and no-mock checks passed. |
| Observability readiness | 90 | Vercel deployment/build/function logs and smoke evidence are available; Supabase DB log console and Sentry state are follow-up observability work. |
| Browser/mobile readiness | 95 | Chromium desktop/mobile hosted smoke passed; Firefox/WebKit were attempted but local Playwright browsers were unavailable. |
| Pilot operations readiness | 100 | Internal pilot checklist, support path, limitations, incident template, package note placeholder, and onboarding sequence recorded. |
| Rollback readiness | 100 | Deployment IDs, stop/disable steps, fixture archive path, and provider DB restore plan recorded. |

## 3. Deployment Targets Tested

| Target | URL | Environment | Commit | Branch | Deployment ID | Protection | Notes |
|---|---|---|---|---|---|---|---|
| Presence backend | `https://anu-back-end.vercel.app` | Vercel production alias | Local CLI deployment from committed tree at `8948ce5` | `feature/presence-ecosystem-alpha` local HEAD/pushed branch | `dpl_4jFrV9vH1ZqaBr4qTD53G62eodUD` | Public production smoke required no bypass | Provider inspect resolved URL `https://anu-back-iaz41iurx-emadhatu-2110s-projects.vercel.app`. |
| Presence frontend | `https://your-presence.vercel.app` | Vercel production alias | `8948ce5` | `feature/presence-ecosystem-alpha` | `dpl_EbGwYZZKhDpQCEVv8oUqb7TtnVVW` | Public production smoke required no bypass | Provider build log cloned Git SHA `8948ce5`; provider inspect resolved URL `https://presence-3g9imnyzw-emadhatu-2110s-projects.vercel.app`. |

Provider metadata verified:

- backend project name: `anu-back-end`
- frontend project name: `presence`
- backend runtime build: Vercel Python 3.12, `uv`, function in `iad1`
- frontend runtime build: Next.js 16.2.4 production build in Vercel `iad1`
- both production aliases reported `Ready`
- frontend production redeploy was required after build-time API/auth env updates

The backend production build was triggered with Vercel CLI from the linked
backend root. Its Vercel build log therefore shows deployment-file upload and
build output instead of a provider Git clone line. The committed and pushed
source tree used for that deploy was `8948ce5`.

## 4. Hosted Env Audit

No secret values were printed in console output or evidence.

### Provider inventory

Provider-side `vercel env ls production` was run for both projects.

Backend production inventory includes:

- `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`
- `SECRET_KEY`, `JWT_SECRET_KEY`, `PUBLIC_JWT_SECRET_KEY`,
  `CONTROL_JWT_SECRET_KEY`, `CONTROL_PLANE_SHARED_SECRET`
- `FLASK_ENV`, `DEBUG`, `AUTO_CREATE_ALL`, `FORCE_HTTPS`
- `CORS_ORIGINS`, `FRONTEND_BASE_URL`, `PRESENCE_PUBLIC_ORIGIN`
- Supabase URL/key/JWT families
- control-plane host, role, audience, grant, and token-use settings

Frontend production inventory includes:

- `NEXT_PUBLIC_API_BASE`
- `NEXT_PUBLIC_PRESENCE_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- provider Supabase/Postgres secret families

### Safe value checks

| Surface | Check | Result | Build/runtime |
|---|---|---|---|
| Backend DB URL family | `DATABASE_URL` literal missing; Supabase pooled/non-pooled Postgres URL family present | Pass because backend config and hosted health use the Postgres URL family; no local/mock pattern in pulled production metadata | Runtime |
| Backend secrets | `SECRET_KEY`, JWT split secrets, and control secret present | Pulled safe lengths exceeded local policy threshold; no placeholder/local-only pattern detected | Runtime |
| Backend flags | Flask/debug/autocreate flags present | Hosted responses and provider audit showed production deployment; debug/trace output did not leak publicly | Runtime |
| Backend CORS | Frontend origin allow and unapproved-origin negative | Hosted OPTIONS passed exact active frontend origin; unapproved origin not reflected | Runtime |
| Frontend API base | Provider vars present and updated | Redeployed production frontend issued Hall API traffic to `https://anu-back-end.vercel.app`, not localhost/mock | Build time |
| Frontend auth | Supabase public URL/anon family updated | Hosted sign-in route did not render the "authentication is not configured" state after redeploy | Build time |
| World/V2 | Live World route and design-lab copy | `/world` stayed forming; design-lab copy states V2 previews are non-production | Build time |

Vercel's pulled frontend env audit copy continued to redact the public frontend
env bodies as empty-looking quoted values after update. That representation was
not used as the sole proof. Provider env update succeeded, production was
redeployed, and hosted route behavior proved API binding and configured auth.

## 5. Hosted DB And Migration Proof

Target proof:

- provider family: Supabase/PostgreSQL
- application connection path used for safe hosted schema proof: Supabase
  pooled Postgres target
- safe identity recorded from the connection: database `postgres`, schema
  `public`, pooled port family `6543`
- direct non-pooling target was not used from this local network path

Hosted read-only schema inventory proved these Gardens/Halls objects exist:

```text
presence_garden
observation
observation_echo
garden_seed
garden_nurture
garden_prune
shared_space
presence_hall
hall_session
hall_participant
hall_zone
hall_portal
hall_stall
hall_moderation_action
hall_activity_event
```

Hosted index/constraint inventory included the migration-critical Hall/Garden
indexes and unique forms, including:

```text
ix_hall_activity_event_hall
ix_hall_activity_event_portal
ix_hall_activity_event_stall
ix_hall_activity_event_type
uq_garden_seed_target
uq_hall_stall_room
uq_presence_garden_default_observer
uq_presence_garden_slug
uq_presence_hall_slug
```

Local migration path:

`flora-fauna/backend/migrations/versions/20260521_presence_gardens_halls_backend.sql`

That migration was already tested locally against Postgres in
`docs/program/evidence/presence-gardens-halls-postgres-contract-proof/`.
It is additive and has no destructive down script. No hosted reset or
destructive migration was run in this pass. The hosted schema proof ran before
fixture provisioning and the hosted app boot/query paths then passed smoke.

Backup/restore plan:

1. Before any future hosted SQL migration, use the Supabase project backup or
   point-in-time recovery path available for the target project and record the
   restore point in the release note.
2. Apply only additive reviewed SQL after local Postgres proof.
3. If data risk is found, stop pilot entry and restore through the provider
   backup/PITR path rather than resetting hosted Postgres.

## 6. Blocker Root Causes And Fixes

### Hosted `/api/halls` 500

The failing hosted Vercel function log showed:

`psycopg2.errors.UndefinedTable: relation "presence_hall" does not exist`

That was a hosted deployment/schema-drift failure surface, not a public CORS
failure. The current controlled-launch DB target was then safely inspected and
proved to contain the Gardens/Halls objects and Hall activity table. The current
backend deployment was rebuilt from the controlled-launch branch and the same
hosted `GET /api/halls` route now returns the canonical `200` list envelope.

Regression coverage added earlier in this blocker pass covers:

- unauthenticated empty Hall list returns a safe list contract
- seeded public Hall list returns canonical shape
- Hall serializer tolerates missing optional zone/session/stall/portal rows
- unauthenticated public Hall list contract

### Hosted auth hardening

The previous hosted malformed Garden bearer returned Flask-JWT `422`.
`backend/app/__init__.py` now keeps Presence Garden/Hall/Mask/Path/Observer
aliases on the canonical Presence auth error path. Hosted smoke now verifies
invalid Garden bearer behavior as `401`.

### Hosted control token 500

Authenticated World-readiness smoke exposed a Vercel function error comparing
offset-aware and offset-naive control-token grant expiration timestamps.
`backend/app/security/control_plane.py` now normalizes grant expiry to UTC-naive
before comparison, matching the backend DB time convention. Focused regression
coverage uses an aware hosted-style expiry and the hosted admin-positive smoke
now returns `200`.

### Smoke fixture draft Hall payload

The first owner draft Hall smoke sent invalid Hall type `studio`. The hosted
smoke now uses the canonical `studio_hall` value and archives the test Hall
through owner API cleanup after proving create.

## 7. Fixture Provisioning

Repeatable provisioner:

`flora-fauna/backend/scripts/provision_presence_controlled_launch_hosted.py`

Ignored handoff file written locally:

`.env.presence-controlled-launch.hosted.local`

Fixture family:

- tagged smoke observer and second private observer
- public Mask alias and private Mask alias
- public/default Garden and private Garden
- smoke owner, owner Room, RoomKey token, owner token
- public Hall with zones, stall, portal, session, Hall path trailhead
- foreign private Hall/Room for owner isolation and public privacy checks
- Mood Board and plantable Mood Board item
- smoke admin/control token for positive control proof

The provisioner tags fixture metadata with controlled-launch smoke markers where
the model supports metadata and provides an archive mode. Token values remain
only in ignored local env handoff and were not committed.

## 8. Hosted Backend Smoke

Artifacts:

- `hosted-backend-smoke.json`
- `hosted-backend-smoke.md`

Final target:

- backend: `https://anu-back-end.vercel.app`
- allowed frontend origin: `https://your-presence.vercel.app`
- final result: `49 pass`

Final pass set includes:

- health, healthz, CORS preflight coverage, disallowed-origin negative, safe
  404, invalid bearer auth
- public Halls list/detail/participants identity safety, public Mask/Garden,
  private Mask/Garden/Hall non-leakage, public Room, RoomKey resolve
- public World/admin negative
- Observer Garden home, Observation, Echo commentary, moderation report,
  self-promotion upgrade guard, Seeds, Nurture, Prune, Mood Board plant
- Hall join, Hall observation, leave, portal click, stall visit, Path from Hall,
  generated Path, Hall activity metrics
- owner Halls list/detail/analytics, draft Hall create/archive cleanup, owner
  isolation
- unauthenticated admin denial and authenticated World-readiness control proof

## 9. Hosted Frontend Playwright Smoke

Config/spec:

- `presence-app/playwright.controlled-launch.config.ts`
- `presence-app/tests/e2e/controlled-launch-hosted.spec.ts`

Final hosted Chromium run:

- projects: `chromium-desktop`, `chromium-mobile`
- result: `20 passed`
- target frontend: `https://your-presence.vercel.app`
- target backend env expectation: `https://anu-back-end.vercel.app`

Routes covered:

- landing
- gallery
- `/auth/sign-in` configured auth gate
- `/r/[token]`
- `/presence/[slug]`
- `/observer/garden`
- `/m/[alias]`
- `/halls`
- `/halls/[slug]`
- `/paths/from-hall/[hallId]`
- `/studio/[id]/halls`
- `/world`

The smoke asserts no fatal route response, no fatal console/page error storm,
no horizontal overflow beyond tolerance, World forming copy, signed-out Studio
Hall posture, and browser Hall API request origin bound to hosted backend.

Firefox and WebKit were attempted by the full config. Playwright reported their
browser executables were unavailable locally. That is recorded as browser
coverage follow-up and is not a controlled-launch blocker for this supervised
pilot.

## 10. Safety And Privacy

| Check | Result |
|---|---|
| World remains hidden/forming | Pass in hosted frontend and public backend negative |
| V2 prototypes marked preview | Pass in design-lab/live copy review |
| No fake realtime/multiplayer claim | Pass for live route proof and design-lab disclaimer |
| Observer Mask cannot self-promote | Pass, hosted upgrade guard rejects smoke promo Observation |
| Private Garden does not leak | Pass, private Mask/Garden alias public requests returned 404 |
| Private Hall does not leak | Pass, private Hall detail public request returned 403 |
| Public participant list avoids raw email/user id | Pass, hosted Hall participant smoke rejects those keys |
| Owner route isolation | Pass, owner token received 403 for foreign Hall scope |
| Admin/control routes protected | Pass, unauth admin negative and control positive |
| Public World readiness internals protected | Pass |
| Test-only/mock dependency | Pass in hosted frontend API origin check; no local mock server started |
| Moderation/reporting path | Pass, smoke Observation report returns 201 on fixture content |
| No secrets in evidence/log snippets | Pass for generated artifacts in this folder |

## 11. Pilot Operations

Checklist:

`docs/program/PRESENCE_CONTROLLED_LAUNCH_PILOT_CHECKLIST_2026-05-21.md`

The checklist records:

- manual intake and supervised owner onboarding
- owner auth/Studio/Room path
- NFC/QR/RoomKey check
- enquiry/contact per-pilot enablement decision
- owner analytics proof point
- scoped Hall policy
- support owner and incident template
- rollback/disable steps
- pricing/package note requirement
- first five pilot candidate placeholder
- no V2 promise rule

## 12. Observability

Verified:

- Vercel provider inspect and build logs accessible for frontend/backend
- backend function logs accessible and used to diagnose `/api/halls` and control
  token failures
- hosted smoke JSON/Markdown persisted in evidence
- request path/status/error behavior diagnosable through smoke output and
  provider logs
- auth and CORS failures returned safe hosted responses

Limitations:

- Supabase DB console/error log visibility was not opened from this workspace;
  schema proof used safe pooled read-only inspection instead.
- Sentry or an equivalent external error sink was not proven in this pass.

## 13. Tests Run

Focused local backend:

```powershell
python -m py_compile app\security\control_plane.py tests\test_control_token_managed_node_scope.py scripts\smoke_presence_controlled_launch_hosted.py
python -m pytest tests\test_control_token_managed_node_scope.py tests\test_presence_gardens_halls.py -q
```

Hosted:

```powershell
python backend\scripts\smoke_presence_controlled_launch_hosted.py --allow-owner-draft-hall --json-out ..\docs\program\evidence\presence-controlled-launch-hosted-proof\hosted-backend-smoke.json --markdown-out ..\docs\program\evidence\presence-controlled-launch-hosted-proof\hosted-backend-smoke.md
npx.cmd playwright test --config=playwright.controlled-launch.config.ts --project=chromium-desktop --project=chromium-mobile
```

Provider:

- Vercel production inspect/env inventory/build-log checks for backend/frontend
- Vercel frontend production env updates and production redeploy

## 14. Bugs Fixed

- Presence invalid bearer responses for Garden/Hall/Mask/Path/Observer aliases
  now use canonical Presence `401` behavior when deployed.
- Hosted control-token grant expiry handles aware hosted timestamps safely.
- Hosted owner draft Hall smoke uses valid Hall type and cleanup.
- Frontend controlled-launch smoke proves hosted sign-in auth config.
- Backend hosted smoke now proves private surface non-leakage, moderation report,
  and public Hall participant privacy.
- Frontend production API/auth build env values were updated and redeployed.

## 15. Known Limitations

- This is not a broad public marketing launch or uncontrolled self-serve growth.
- World and V2 remain intentionally not launch-ready.
- Firefox/WebKit hosted smoke should be rerun when those Playwright browsers or
  devices are available.
- External monitoring/Sentry and Supabase DB log-console proof remain minimal
  observability follow-up.
- Enquiry/contact routing must be confirmed per pilot Room before promising it
  as active.

## 16. Rollback And Disable Plan

1. Stop new intake and supervised onboarding.
2. Revoke or disable affected RoomKeys/NFC/QR entry paths.
3. Hide/archive affected Room, Hall, Garden, and smoke fixture surfaces with
   scoped owner/control operations.
4. Revert frontend deployment for UI regressions; revert backend deployment for
   backend regressions after DB compatibility check.
5. For DB/data risk, use the recorded Supabase backup/PITR restore path. Do not
   run a destructive hosted reset.
6. Record request IDs, deployment IDs, pilot impact, privacy check, and owner in
   the incident template.

## 17. Exact Launch Start

1. Freeze tested deployment targets and keep backend/frontend aliases on the
   IDs above.
2. Pick the first pilot candidate from the internal checklist and record the
   package/pricing note, support owner, rollback owner, Room scope, and Hall
   scope.
3. During supervised onboarding, verify hosted auth, Studio access, one public
   Room entry, one RoomKey/NFC/QR resolve, and analytics visibility with that
   pilot owner.
4. Enable enquiry/contact only after the selected Room routing is confirmed.
5. Keep World hidden/forming and do not present V2 preview surfaces as live.
6. Re-run the hosted backend and Chromium smoke after any env, deployment, DB,
   fixture, or auth-policy change.
