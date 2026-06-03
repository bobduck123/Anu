# Presence Studio V2 Phase E Hosted Smoke Report

Date: 2026-06-03

## Verdict

Phase E is locally prepared but hosted lifecycle smoke was not executed against a deployed environment.

The required hosted smoke environment variables and pilot room ID are not present in this workspace, so the new hosted lifecycle spec skipped cleanly. No production or staging rollout is claimed.

## Hosted URLs Tested

- None. Hosted base URL was not configured.

Missing hosted smoke keys:

```txt
PRESENCE_HOSTED_SMOKE
PRESENCE_E2E_BASE_URL
PRESENCE_E2E_API_URL
PRESENCE_E2E_OWNER_EMAIL
PRESENCE_E2E_OWNER_PASSWORD
PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID
```

## Feature Flags / Rollback

Repo conventions verified in `lib/presence/studio-v2/feature.ts`:

```txt
NEXT_PUBLIC_PRESENCE_STUDIO_V2
NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS
PRESENCE_STUDIO_V2_ENABLED
PRESENCE_STUDIO_V2_PILOT_IDS
```

Behavior:

- V2 requires global enablement and V2 room eligibility.
- Production with an empty pilot list blocks V2 unless `PRESENCE_STUDIO_V2_ENABLED` is explicitly enabled.
- Rollback is available by disabling the global flag or removing the pilot room ID/slug from the pilot list.
- Legacy rooms continue through the existing editor/public renderer when `studioV2Room` is absent.

## Pilot Room Tested

- None hosted. `PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID` is required for the hosted spec.

Optional hosted smoke helpers:

```txt
PRESENCE_STUDIO_V2_HOSTED_PILOT_SLUG
PRESENCE_STUDIO_V2_HOSTED_LEGACY_SLUG
PRESENCE_E2E_CLEANUP_STRATEGY=control-delete
PRESENCE_E2E_CONTROL_TOKEN
PRESENCE_E2E_CONTROL_SECRET
```

## Implementation Added

Added `tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts`.

When hosted env is available, it verifies:

1. Real hosted owner sign-in.
2. V2 editor loads behind feature flag at `/studio/[id]/editor`.
3. Legacy Studio Room editor is not mounted for the V2 pilot room.
4. Visible object add/edit.
5. Hidden-public object add/edit.
6. Moodboard reference add.
7. Skin Lab value change.
8. Save draft through `/api/presence/owner/rooms/[id]/editor/draft`.
9. Reload persistence from backend draft.
10. Owner draft preview renders `.presence-studio-v2-public`.
11. Hidden-public object is absent from preview/public projection.
12. Publish through `/api/presence/owner/rooms/[id]/editor/publish`.
13. Anonymous `/p/[slug]` and `/presence/[slug]` render V2 public room.
14. Restricted internal config/editor strings are absent from public HTML.
15. Mobile public viewport remains usable.
16. Optional legacy negative route remains non-V2.
17. `/room/[id]/key` remains safe.
18. Original published/draft config is restored when the smoke mutates a real pilot.

## Readiness Fix Required For Hosted Publish

During preflight, `buildReadinessReport` was found to still apply legacy GGM publish blockers to Studio V2 configs. A valid V2 room could be blocked for missing legacy `artwork_field`, primary image, and enquiry routing.

Fixed in `lib/editor/readiness.ts`:

- V2 configs route to a Studio V2 readiness branch.
- V2 publish readiness checks title, public objects, primary CTA, unsafe assets, draft/live diff, and mobile review posture.
- Legacy readiness remains unchanged.

Regression added in `lib/editor/readiness.test.ts`:

- `a valid Studio V2 draft is not blocked by legacy GGM scene readiness`

## Local QA Results

Passed:

```powershell
npm.cmd run typecheck
npm.cmd run build
node --experimental-strip-types --test lib\presence\studio-v2\studioV2Adapters.test.ts
node --experimental-strip-types --test lib\presence\render\publicPayload.test.ts
node --experimental-strip-types --test lib\presence\render\resolver.test.ts
node --experimental-strip-types --test lib\editor\readiness.test.ts
npx.cmd playwright test presence-studio-v2-public-render.spec.ts --project=chromium
npx.cmd playwright test presence-studio-v2-draft-preview.spec.ts --project=chromium --workers=1
npx.cmd playwright test presence-public-payload-hygiene.spec.ts --project=chromium
```

Hosted spec result:

```powershell
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Result: 1 skipped because hosted smoke env was not configured.

## Payload Hygiene

Local tests confirm sanitized V2 public payload/render output omits:

- nested editable config section names
- owner/draft/private editor state
- lock/pin/hidden editor state
- TemplateKit/internal API references
- editor chrome classes
- restricted auth/session/token strings
- hidden-public V2 objects

Hosted payload hygiene remains unproven until the gated hosted spec is run with real deployed env.

## Cleanup / Restoration Status

No hosted room was modified in this environment.

The hosted spec includes restoration logic:

- if the pilot originally had a published config, restore it by writing it as draft and publishing it again
- if the pilot was originally unpublished, unpublish after smoke
- if an original draft existed, recreate it after public restoration

## Remaining Risks

- Hosted lifecycle is not yet proven because no hosted base URL, credentials, or pilot room ID are configured.
- The hosted spec has not been exercised against real deployed auth/API behavior.
- Cleanup logic is implemented but not proven on hosted data.
- V2 editor still lacks richer title/tagline/CTA editing in the UI; this was previously accepted as non-blocking.
- Public self-serve onboarding remains out of scope.

## Readiness Verdicts

- Local integration readiness: ready.
- Hosted V2 editor readiness: blocked pending hosted smoke env and run.
- Hosted owner preview readiness: blocked pending hosted smoke env and run.
- Hosted public render readiness: blocked pending hosted smoke env and run.
- Controlled operator-led pilot readiness: blocked pending hosted smoke pass.
- Public self-serve onboarding readiness: not ready.

## Next Required Pass

Run the hosted lifecycle smoke with real staging/preview values:

```powershell
$env:PRESENCE_HOSTED_SMOKE="1"
$env:PRESENCE_E2E_BASE_URL="<hosted-frontend-url>"
$env:PRESENCE_E2E_API_URL="<hosted-api-url>"
$env:PRESENCE_E2E_OWNER_EMAIL="<owner-email>"
$env:PRESENCE_E2E_OWNER_PASSWORD="<owner-password>"
$env:PRESENCE_STUDIO_V2_HOSTED_PILOT_ROOM_ID="<pilot-room-id>"
npx.cmd playwright test presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium --workers=1
```

Do not claim hosted Phase E pass until that run succeeds and cleanup/restoration is verified.
