# Presence Studio Multi-Kit Browser Lifecycle Smoke

Date: 2026-05-31

## Scope

Browser coverage pass for Presence Studio owner-created Studio Room drafts after the design-elevation pass. This pass adds browser automation coverage only. It does not add product features, public Studio Room rendering, publishing, hosted testing, runtime model calls, media embeds, audio, or broad private contact mapping.

## BMAD / Protocols Used

- `bmad-quick-dev` was used for implementation workflow discipline.
- Protocol files inspected: `C:\Dev\AGENTS.md`, `presence-app\AGENTS.md`, `_bmad\bmm\config.yaml`.
- Applied methods: browser coverage mapping, lifecycle matrix planning, safety/risk review, acceptance audit, evidence capture, and release hygiene.
- Formal BMAD planning was adapted because the repository already had a large staged/dirty worktree and the user explicitly asked to handle that state.

## Files Inspected

- `presence-app/tests/e2e/presence-studio-room-owner-lifecycle.spec.ts`
- `presence-app/playwright.config.ts`
- `presence-app/tests/e2e/mock-presence-api.mjs`
- `presence-app/lib/presence/studio-room/templateKits.ts`
- `presence-app/lib/presence/studio-room/templateDrafts.ts`
- `presence-app/lib/api/studioRoomTemplates.ts`
- `flora-fauna/backend/app/data/presence_studio_template_kits.json`
- `presence-app/components/presence-studio/StudioRoomOwnerEditorShell.tsx`
- `presence-app/components/presence-studio/StudioRoomCanvas.ts`
- `presence-app/components/presence-studio/StudioRoomRenderer.ts`
- `docs/program/evidence/presence-studio-design-artifact-implementation/`
- `docs/program/evidence/presence-studio-editor-renderer-polish/`
- `presence-app/tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts`

No dedicated current Kimi review artifact was found in the evidence tree during this pass; the user-provided Kimi summary was used as the review finding input.

## Multi-Kit Browser Strategy

Added `presence-app/tests/e2e/presence-studio-room-multi-kit-lifecycle.spec.ts`.

The new spec keeps the existing single-kit cross-browser smoke intact and adds five independent tests, one per primary owner-creatable TemplateKit. Each test resets the mock API state before the kit case so drafts, request logs, and ids do not leak across kits.

The multi-kit matrix is intended to run on Chromium for practical release-speed coverage. The existing owner lifecycle spec remains the Chromium, Firefox, and WebKit browser compatibility gate.

## Kits Covered

- `gallery-artist`
- `cultural-community-artist`
- `material-tradie-proof-card`
- `healing-practitioner`
- `consultant-contractor`

The candidate/internal `underground-dj-portal` remains hidden from the starter UI and direct API creation returns 403 in each kit case.

## Lifecycle Assertions Covered

For each primary kit, the browser smoke verifies:

- `/studio/template-kits` loads the owner starter.
- Exactly five TemplateKit cards are visible.
- All five primary kit cards are visible.
- `underground-dj-portal` card and label are absent.
- The selected kit can create a saved private draft.
- Create response is 201 with `support_state: primary`, `visibility: private`, `public_status: draft`, `published: null`, and kit-specific id/name.
- Browser redirects to `/studio/[id]/studio-room`.
- Editor shell, draft/private warning, chamber panel, inspector panel, preview panel, and canvas shell load.
- Renderer article includes `data-template-kit-id` for the selected kit.
- Mobile primary CTA and sticky mobile CTA are present.
- Save button starts disabled.
- No publish-named button exists.
- No editor link to `/p/*` or `/presence/*` exists.
- A safe chamber summary edit updates the live canvas.
- Save PATCH succeeds and returns draft/private response with `published_config_present: false`.
- Dirty state clears and save button disables.
- Reload preserves the edit and kit-specific renderer identity.
- Public API for the draft slug returns 404.
- Public `/p/[slug]` page remains non-public and does not show the marker.
- Direct candidate kit creation returns 403.
- Mock request log contains no publish request.

## Browser / Project Coverage

- Existing single-kit owner lifecycle: Chromium, Firefox, WebKit.
- New multi-kit lifecycle matrix: Chromium.
- Hosted testing intentionally not run in this pass.

## Safety Results

- Public route isolation grep: clean; no Studio Room editor/canvas/template draft imports in public route files.
- Publish path/button grep: clean in product Studio Room/editor/template-kit source.
- Runtime AI/LLM grep: clean in product Studio Room/editor/template-kit source and new e2e spec.
- Broad private contact grep: only existing sanitizer deny-list and real-room comparison diagnostics matched; no exposed editor fields or new mapping.
- Active demo overlay dependency grep: clean in app/component/lib source.

## Validation Results

- `npx.cmd playwright test tests/e2e/presence-studio-room-multi-kit-lifecycle.spec.ts --project=chromium` - pass, 5 tests.
- `npx.cmd playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=chromium` - pass, 1 test.
- `npx.cmd playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=firefox` - pass, 1 test.
- `npx.cmd playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=webkit` - pass, 1 test.
- `npx.cmd tsx --test "lib/presence/studio-room/*.test.ts"` - pass, 84 tests.
- `npx.cmd tsx --test lib/presence/uniqueness.test.ts` - pass, 1 test.
- `npx.cmd tsx --test "lib/presence/**/*.test.ts"` - pass, 109 tests.
- `npm.cmd run typecheck` - pass.
- `npm.cmd run build` - pass. Next.js emitted the existing multiple-lockfile workspace-root warning.
- `git diff --check` - pass.
- `git diff --cached --check` - pass.

Backend DNA and TemplateKit lifecycle pytest were not run because this pass did not touch backend code.

## Worktree / Release Hygiene

Intended files for this pass are staged:

- `docs/program/evidence/presence-studio-multi-kit-browser-lifecycle-smoke/README.md`
- `docs/program/evidence/presence-studio-multi-kit-browser-lifecycle-smoke/results.json`
- `presence-app/tests/e2e/presence-studio-room-multi-kit-lifecycle.spec.ts`

The working tree already contained many staged/dirty Presence Studio changes before this pass. The hosted lifecycle scaffold at `presence-app/tests/e2e/presence-studio-room-hosted-lifecycle.spec.ts` remains untracked and was inspected/documented but not staged because hosted testing is explicitly out of scope for this pass.

## Remaining Limitations

- Multi-kit browser matrix was run on Chromium only.
- Existing cross-browser smoke still covers one representative kit, `cultural-community-artist`.
- No hosted smoke was run.
- No visual snapshot testing was added.
- Existing Next.js multiple-lockfile workspace-root warning remains.

## Recommended Next Pass

A. Hosted owner lifecycle smoke.
B. Deterministic Studio Guide.
C. Hosted multi-kit smoke.
D. Pilot-ready hosted deployment.
