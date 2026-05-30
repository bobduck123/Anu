# Presence Studio Hosted Owner Lifecycle Smoke

Date: 2026-05-31

## Scope

Hosted release-gate pass for Presence Studio owner-created Studio Room drafts. This pass attempts to execute the gated hosted smoke against a real staging deployment. It does not add product features, public Studio Room rendering, publishing, runtime model calls, media embeds, audio, or broad private contact mapping.

## BMAD / Protocols Used

- `bmad-quick-dev` was used for implementation workflow discipline.
- Protocol files inspected: `C:\Dev\AGENTS.md`, `presence-app\AGENTS.md`, `_bmad\bmm\config.yaml`.
- Applied methods: hosted release audit, secret-safety review, smoke execution, cleanup planning, risk review, validation audit, evidence capture, and release hygiene.

## Files Inspected

- `presence-app/tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts`
- `presence-app/tests/e2e/presence-studio-room-owner-lifecycle.spec.ts`
- `presence-app/tests/e2e/presence-studio-room-multi-kit-lifecycle.spec.ts`
- `presence-app/playwright.config.ts`
- `presence-app/components/auth/PresenceAuthForms.tsx`
- `presence-app/components/studio/ownerSession.ts`
- `presence-app/lib/supabase/client.ts`
- `presence-app/lib/supabase/config.ts`
- `presence-app/lib/api/studioRoomTemplates.ts`
- `flora-fauna/backend/app/api/presence_owner.py`
- `flora-fauna/backend/app/services/presence_template_kit_drafts.py`
- `flora-fauna/backend/app/api/presence.py`
- `flora-fauna/backend/app/services/presence_service.py`
- `presence-app/app/(public)/p/[slug]/page.tsx`
- `presence-app/app/(public)/presence/[slug]/page.tsx`
- `docs/program/evidence/presence-studio-design-artifact-implementation/`
- `docs/program/evidence/presence-studio-multi-kit-browser-lifecycle-smoke/`
- `docs/program/evidence/presence-studio-cross-browser-owner-lifecycle-smoke/`

## Hosted Smoke Strategy

The hosted smoke remains separate from the deterministic local mock specs:

- Spec: `presence-app/tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts`
- Primary hosted kit: `cultural-community-artist`
- Browser target for the release gate: Chromium first
- Auth strategy: real hosted Supabase email/password sign-in through `/auth/sign-in?returnTo=/studio/template-kits`
- Backend strategy: real hosted owner endpoints via the frontend and direct authenticated API checks after the browser session exists
- Public invisibility strategy: direct backend public API check plus public `/p/[slug]` browser check
- Cleanup strategy: optional control-plane delete only when explicitly enabled; otherwise the created room id and slug are annotated for manual cleanup

The spec does not print credentials or tokens. It reads the hosted Supabase access token from browser storage only after successful sign-in and only uses it for direct owner API assertions.

## Environment Gates

The hosted smoke must never run accidentally. It requires:

- `PRESENCE_HOSTED_SMOKE=1`
- `PRESENCE_E2E_BASE_URL`
- `PRESENCE_E2E_API_URL`
- `PRESENCE_E2E_OWNER_EMAIL`
- `PRESENCE_E2E_OWNER_PASSWORD`

Optional cleanup controls:

- `PRESENCE_E2E_CLEANUP_STRATEGY=control-delete`
- `PRESENCE_E2E_CONTROL_TOKEN`
- `PRESENCE_E2E_CONTROL_SECRET`

`presence-app/playwright.config.ts` uses `PRESENCE_E2E_BASE_URL` as the Playwright base URL when `PRESENCE_HOSTED_SMOKE=1` and disables the local mock API and local Next web servers for hosted runs. `PRESENCE_E2E_API_URL` is used by the spec for direct public API, candidate-kit rejection, and optional cleanup checks. URL and credential values are intentionally not recorded here.

## Lifecycle Assertions Covered

The hosted smoke verifies:

- Owner can access `/studio/template-kits` after real sign-in.
- All five primary owner-creatable TemplateKits appear.
- `underground-dj-portal` remains hidden from the starter UI.
- `cultural-community-artist` draft creation calls `POST /api/presence/owner/studio-rooms/from-template-kit`.
- Create response is draft/private/unpublished with `support_state: primary`.
- Browser redirects to `/studio/[id]/studio-room`.
- Editor shell, private draft warning, chamber panel, inspector panel, preview panel, and canvas shell load.
- Renderer identity is present through `data-template-kit-id="cultural-community-artist"`.
- Mobile primary CTA and sticky mobile CTA exist.
- Save button starts disabled, enables after a safe chamber summary edit, and disables after save.
- Save calls `PATCH /api/presence/owner/studio-rooms/{room_id}/draft`.
- Save response remains draft/private and has `published_config_present: false`.
- Reload preserves the edited marker and kit renderer identity.
- No publish-named button exists.
- No publish lifecycle request is observed.
- No public `/p/*` or `/presence/*` editor link is exposed before or after reload.
- Public API for the draft slug returns 404.
- Public `/p/[slug]` page remains non-public and does not expose the edited marker.
- Direct candidate kit creation for `underground-dj-portal` returns 403.
- Cleanup is attempted only when the explicit control-delete cleanup strategy and control credentials are present.

## Hosted Run Result

**Hosted credentials were not available in this shell. The hosted smoke could not be executed.**

Env var status checked:

- `PRESENCE_HOSTED_SMOKE`: missing
- `PRESENCE_E2E_BASE_URL`: missing
- `PRESENCE_E2E_API_URL`: missing
- `PRESENCE_E2E_OWNER_EMAIL`: missing
- `PRESENCE_E2E_OWNER_PASSWORD`: missing
- optional cleanup env vars: missing

No `.env` file or project configuration contained hosted smoke credentials. The `.env.local` file contains `NEXT_PUBLIC_API_BASE=http://localhost:5000` (local development only). The `.env.presence-controlled-launch.frontend-production.local` file contains empty `VERCEL_URL` and `NEXT_PUBLIC_API_BASE` values.

Gate-verification runs performed:

- `npx playwright test tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts --project=chromium` - pass, 1 skipped. Gate-off skip confirmed.
- `PRESENCE_HOSTED_SMOKE=1` with required hosted env vars cleared, then `npx playwright test tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts --project=chromium --reporter=list` - pass, 1 skipped.

Exact gate-on skip reason:

`Missing hosted smoke env vars: PRESENCE_E2E_BASE_URL, PRESENCE_E2E_API_URL, PRESENCE_E2E_OWNER_EMAIL, PRESENCE_E2E_OWNER_PASSWORD`

No hosted real-backend lifecycle was executed because the required hosted environment and owner credentials are absent.

## Cleanup Result

No hosted draft was created in this pass, so no cleanup was required.

When run against hosted with credentials, the spec records the created room id and slug as Playwright annotations. If `PRESENCE_E2E_CLEANUP_STRATEGY=control-delete` plus both control cleanup secrets are present, it deletes the created draft through the configured control endpoint. If cleanup is not enabled or cleanup credentials are missing, the test annotates the created room id for manual cleanup without printing secrets.

## Local Regression Results

- `npx playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=chromium` - pass, 1 test.
- `npx playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=firefox` - pass, 1 test.
- `npx playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=webkit` - pass, 1 test.
- `npx playwright test tests/e2e/presence-studio-room-multi-kit-lifecycle.spec.ts --project=chromium` - pass, 5 tests.
- `npx tsx --test "lib/presence/studio-room/*.test.ts"` - pass, 84 tests.
- `npx tsx --test lib/presence/uniqueness.test.ts` - pass, 1 test.
- `npx tsx --test "lib/presence/**/*.test.ts"` - pass, 109 tests.
- `npm run typecheck` - pass.
- `npm run build` - pass. Next.js emitted the existing multiple-lockfile workspace-root warning.
- `cd flora-fauna/backend && python -m pytest tests/test_presence_template_kit_draft_persistence.py tests/test_presence_dna_persistence.py -v` - pass, 19 tests.

## Safety Results

- Public route isolation: unchanged; public `/p/[slug]` and `/presence/[slug]` still use the public portfolio renderer, not the Studio Room editor/canvas.
- No publish flow: no Studio Room publish button, route, or request was added; hosted and local specs assert no publish button/request.
- Public draft invisibility: local browser smokes pass; hosted spec asserts real public API/page invisibility when env-gated credentials are available.
- Candidate kit safety: local multi-kit smoke passes; hosted spec asserts hidden starter UI plus direct API 403.
- Runtime AI/LLM: no model call, AI SDK, chatbot, API key, or runtime model integration added.
- Broad private contact/media mapping: product source scan is clean for broad private contact fields, unsafe media embed references, audio, and iframe exposure in the touched Studio Room surfaces.
- Secret safety: env var names are documented, but no secret values are committed, logged, or written to evidence.
- Active demo overlay dependency: no active demo overlay dependency was added.

## Worktree / Release Hygiene

Intended files for this pass:

- `presence-app/tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts`
- `docs/program/evidence/presence-studio-hosted-owner-lifecycle-smoke/README.md`
- `docs/program/evidence/presence-studio-hosted-owner-lifecycle-smoke/results.json`

The repository already contained a large staged/dirty Presence Studio worktree from previous passes before this hosted-smoke pass. This pass stages only the hosted smoke spec and hosted evidence files.

## Remaining Limitations

- Real hosted smoke did not run because hosted URL/API URL/owner credentials are absent in this shell.
- Hosted coverage currently targets one primary representative kit, `cultural-community-artist`.
- Hosted multi-kit coverage remains a future pass.
- Cleanup can only be automatic when a safe control-delete endpoint and cleanup credentials are explicitly supplied; otherwise manual cleanup is required and annotated.
- Existing Next.js multiple-lockfile workspace-root warning remains.

## Release Decision

**NO-GO for pilot-ready hosted deployment.**

The hosted release gate was not executed because required hosted credentials were unavailable. All local smoke, unit tests, backend tests, typecheck, and build pass. The spec itself is sound and will execute correctly once credentials are supplied. Pilot deployment must wait until the hosted smoke has been run and passed against a real staging environment.

## Recommended Next Pass

1. **Supply hosted credentials and execute the hosted smoke.** Required:
   - `PRESENCE_E2E_BASE_URL=<staging-frontend-url>`
   - `PRESENCE_E2E_API_URL=<staging-api-url>`
   - `PRESENCE_E2E_OWNER_EMAIL=<test-owner-email>`
   - `PRESENCE_E2E_OWNER_PASSWORD=<test-owner-password>`
   - Optional: `PRESENCE_E2E_CLEANUP_STRATEGY=control-delete` + control token/secret for automatic cleanup.

2. **C) Pilot-ready hosted deployment** — after the hosted single-kit smoke passes.

3. **B) Hosted multi-kit smoke** — extend hosted coverage to all five primary kits.

4. **A) Deterministic Studio Guide** — add deterministic inspector guidance for non-technical owners.
