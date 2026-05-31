# Presence Studio Hosted Multi-Kit Lifecycle Smoke

Date: 2026-05-31

## Scope

Hosted release-gate pass extending the single-kit hosted smoke to all five primary owner-creatable TemplateKits. This spec executes against the real hosted Presence deployment without adding product features, public rendering, publishing, runtime AI, or unsafe cleanup.

## Files Changed

- `presence-app/tests/e2e/presence-studio-room-hosted-multi-kit-lifecycle.spec.ts` (new)

## Hosted Environment

- Frontend domain: `your-presence.vercel.app`
- Backend API domain: `anu-back-end.vercel.app`
- Auth: real Supabase email/password sign-in via `/auth/sign-in`
- Token extraction: cookie-based (`sb-<ref>-auth-token.0/.1` cookies with `base64-` prefix)

## Kits Tested

All five primary kits passed the hosted lifecycle:

1. **gallery-artist** — 17.6s
2. **cultural-community-artist** — 17.0s
3. **material-tradie-proof-card** — 16.9s
4. **healing-practitioner** — 15.9s
5. **consultant-contractor** — 17.8s

Total suite time: ~85s (1.4m with overhead)

## Per-Kit Lifecycle Assertions

For each primary kit, the spec verifies:

- ✅ Kit appears in `/studio/template-kits`
- ✅ `underground-dj-portal` remains hidden from starter UI
- ✅ Draft creation returns 201 with `status: draft`, `visibility: private`, `published: null`
- ✅ Browser redirects to `/studio/[id]/studio-room`
- ✅ Editor shell loads
- ✅ Studio Guide panel renders with ≥1 deterministic guide item
- ✅ Chamber panel, inspector, preview, and canvas load
- ✅ `data-template-kit-id` matches the kit
- ✅ Mobile primary CTA and sticky CTA visible
- ✅ Safe field edit works (chamber summary)
- ✅ Save returns draft/private with `published_config_present: false`
- ✅ Dirty state clears after save
- ✅ Reload persists the edited marker
- ✅ No publish button exists
- ✅ No publish requests observed
- ✅ No public `/p/*` or `/presence/*` editor links
- ✅ Public API returns 404 for draft slug
- ✅ Public `/p/[slug]` page shows "Presence not public yet"
- ✅ Candidate kit (`underground-dj-portal`) direct creation returns 403 (tested once in final kit)

## Studio Guide Visibility

Studio Guide panel visible for all five kits on hosted. Each kit produced a distinct set of deterministic guide items based on `KIT_GUIDANCE_RULES`:

- `gallery-artist`: flagged missing proof, missing contact, thin gallery (placeholder images)
- `cultural-community-artist`: flagged missing portal, missing proof, missing contact
- `material-tradie-proof-card`: flagged missing proof, missing services, missing contact
- `healing-practitioner`: flagged missing proof, missing services, missing contact
- `consultant-contractor`: flagged missing proof, missing services, missing contact

## Cleanup Result

No automatic cleanup performed. `PRESENCE_E2E_CLEANUP_STRATEGY=control-delete` and control credentials were not provided.

Five hosted test drafts were created (one per kit). Each room id and slug is annotated in the Playwright test output under:
- `hosted-created-room-id`
- `hosted-created-room-slug`

Manual cleanup required for all five created drafts.

## Local Regression Results

- `npx playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=chromium` — pass, 1 test
- `npx playwright test tests/e2e/presence-studio-room-multi-kit-lifecycle.spec.ts --project=chromium` — pass, 5 tests
- `npx tsx --test "lib/**/*.test.ts" tests/presence/studio-room/studioGuide.test.ts` — pass, 157 tests
- `npm run typecheck` — pass
- `npm run build` — pass

## Safety Results

- Public route isolation: unchanged
- No publish flow: verified (no button, no requests)
- Runtime AI/LLM: none
- Secret exposure: none (credentials passed via env vars only)
- Broad private contact mapping: none
- Candidate kit exposure: hidden from UI, rejected by API (403)

## Worktree / Release Hygiene

```
 M tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts
 M docs/program/evidence/presence-studio-hosted-owner-lifecycle-smoke/README.md
 M docs/program/evidence/presence-studio-hosted-owner-lifecycle-smoke/results.json
?? tests/e2e/presence-studio-room-hosted-multi-kit-lifecycle.spec.ts
?? docs/program/evidence/presence-studio-hosted-multi-kit-lifecycle-smoke/
```

- `git diff --check`: clean
- No secrets committed or logged

## Remaining Limitations

- Five manual cleanup items (one per kit). Non-blocking for pilot readiness.
- Hosted coverage is Chromium-only. Cross-browser hosted smoke is a future pass.
- Existing Next.js multiple-lockfile workspace-root warning remains.

## Release Decision

**GO for pilot-ready hosted deployment.**

All five primary kits passed the hosted multi-kit lifecycle. Studio Guide renders deterministically per kit. No publish path exists. Public routes remain isolated. Candidate kits are rejected. Local regressions remain green.

## Recommended Next Pass

1. **A) Pilot-ready hosted deployment** — proceed with operator pilot runbook and monitoring.
2. **B) Operator pilot runbook** — document env setup, manual cleanup steps, and escalation paths.
3. **C) Production cleanup/monitoring pass** — set up control-delete credentials for automatic cleanup, or schedule manual cleanup of test drafts.
