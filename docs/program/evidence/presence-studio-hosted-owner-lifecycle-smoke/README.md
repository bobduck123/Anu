# Presence Studio Hosted Owner Lifecycle Smoke

Date: 2026-05-31

## Scope

Hosted release-gate pass for Presence Studio owner-created Studio Room drafts. This pass executes the gated hosted smoke against a real staging deployment. It does not add product features, public Studio Room rendering, publishing, runtime model calls, media embeds, audio, or broad private contact mapping.

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
- Studio Guide panel renders with at least one deterministic guide item.
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

**Hosted smoke executed and PASSED.**

Hosted environment:
- Frontend domain: `your-presence.vercel.app`
- Backend API domain: `anu-back-end.vercel.app`
- Primary kit: `cultural-community-artist`

Auth strategy:
- Real Supabase email/password sign-in via hosted `/auth/sign-in`
- Token extraction updated to support **cookie-based auth** (production Vercel deployments store Supabase sessions in `sb-<ref>-auth-token.0` / `.1` cookies, not localStorage)
- The `readSupabaseAccessToken` helper now tries localStorage first, then falls back to cookie reconstruction (strips `base64-` prefix, concatenates parts, base64-decodes, parses JSON)

All lifecycle assertions passed:
- ✅ Sign-in successful
- ✅ Template kits visible (5 primary, 0 candidate)
- ✅ Draft created with correct kit ID, status=draft, visibility=private
- ✅ Editor shell loads with all panels
- ✅ Studio Guide panel renders with ≥1 guide item
- ✅ `data-template-kit-id="cultural-community-artist"` confirmed
- ✅ Edit → save → dirty state clears
- ✅ Reload persists edit
- ✅ No publish button
- ✅ No publish requests observed
- ✅ Public API 404
- ✅ Public page non-public
- ✅ Candidate kit rejection 403

## Cleanup Result

No automatic cleanup performed. `PRESENCE_E2E_CLEANUP_STRATEGY=control-delete` and control credentials were not provided.

The spec annotated the created room id and slug for manual cleanup:
- See Playwright test output annotations for `hosted-created-room-id` and `hosted-created-room-slug`
- Manual cleanup can be performed via the control plane or database when convenient

## Spec Fix Applied

`readSupabaseAccessToken` in `presence-app/tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts` was updated to support cookie-based Supabase auth. The previous implementation only checked `localStorage` keys starting with `sb-`. Hosted Vercel deployments split the session across cookies named `sb-<project-ref>-auth-token.0` and `.1` with a `base64-` prefixed value. The fix reconstructs the token from sorted cookie parts.

## Local Regression Results

- `npx playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=chromium` - pass, 1 test.
- `npx playwright test tests/e2e/presence-studio-room-multi-kit-lifecycle.spec.ts --project=chromium` - pass, 5 tests.
- `npx tsx --test "lib/**/*.test.ts" tests/presence/studio-room/studioGuide.test.ts` - pass, 157 tests.
- `npm run typecheck` - pass.
- `npm run build` - pass. Next.js emitted the existing multiple-lockfile workspace-root warning.

## Safety Results

- Public route isolation: unchanged; public `/p/[slug]` and `/presence/[slug]` still use the public portfolio renderer, not the Studio Room editor/canvas.
- No publish flow: no Studio Room publish button, route, or request was added; hosted and local specs assert no publish button/request.
- Public draft invisibility: hosted spec asserts real public API/page invisibility.
- Candidate kit safety: hosted spec asserts hidden starter UI plus direct API 403.
- Runtime AI/LLM: no model call, AI SDK, chatbot, API key, or runtime model integration added.
- Broad private contact/media mapping: product source scan is clean for broad private contact fields, unsafe media embed references, audio, and iframe exposure in the touched Studio Room surfaces.
- Secret safety: env var names are documented, but no secret values are committed, logged, or written to evidence.
- Active demo overlay dependency: no active demo overlay dependency was added.

## Worktree / Release Hygiene

Files changed in this pass:

- `presence-app/tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts` (cookie auth fix)
- `docs/program/evidence/presence-studio-hosted-owner-lifecycle-smoke/README.md`
- `docs/program/evidence/presence-studio-hosted-owner-lifecycle-smoke/results.json`

Git status:
- ` M tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts` (modified)
- Pre-existing staged/dirty worktree from earlier passes remains separate

## Remaining Limitations

- Hosted coverage currently targets one primary representative kit, `cultural-community-artist`.
- Hosted multi-kit coverage remains a future pass.
- Cleanup can only be automatic when a safe control-delete endpoint and cleanup credentials are explicitly supplied; otherwise manual cleanup is required and annotated.
- Existing Next.js multiple-lockfile workspace-root warning remains.

## Release Decision

**GO for pilot-ready hosted deployment.**

The hosted release gate executed successfully against the real staging environment. All lifecycle assertions passed. The deterministic Studio Guide renders in the hosted editor. No publish path exists. Public routes remain isolated. Candidate kits are rejected. Local regressions remain green.

Caveat: one manual cleanup item exists (the created test draft). This is non-blocking for pilot readiness but should be cleared before production data hygiene.

## Recommended Next Pass

1. **B) Hosted multi-kit smoke** — extend hosted coverage to all five primary kits.
2. **C) Pilot-ready hosted deployment** — proceed with operator pilot runbook and monitoring.
3. **D) Operator pilot runbook** — document manual cleanup steps, env var setup, and escalation paths.
