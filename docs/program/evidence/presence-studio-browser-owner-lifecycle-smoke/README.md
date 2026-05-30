# Presence Studio Browser Owner Lifecycle Smoke Evidence

Date: 2026-05-30

## Scope

This pass adds browser-level Playwright proof for the owner-facing Studio Room draft lifecycle:

TemplateKit selection -> backend/mock private draft creation -> `/studio/[id]/studio-room` editor load -> safe chamber edit -> save draft -> reload preserved edit -> public route remains hidden.

No public Studio Room rendering, publishing path, media/audio/embed support, runtime AI, or advanced inspector controls were added.

## Playwright Smoke

Spec added:

- `presence-app/tests/e2e/presence-studio-room-owner-lifecycle.spec.ts`

The smoke uses the existing Presence Playwright harness:

- Next dev server from `playwright.config.ts`,
- local mock API at `http://127.0.0.1:5105`,
- existing E2E owner auth mock via `presence:e2e:access_token`.

Mock API contract expanded in `presence-app/tests/e2e/mock-presence-api.mjs`:

- accepts only primary TemplateKit creation,
- rejects `underground-dj-portal`,
- stores created Studio Room drafts as private/draft/unpublished,
- returns owner node/editor payloads with `content_config.studio_room_draft`,
- persists PATCH draft edits,
- rejects restricted keys and unsafe URLs in the mock create/save paths,
- never creates a published config for TemplateKit drafts.

## Lifecycle Coverage

Primary kit tested:

- `cultural-community-artist`

Browser checks covered:

- `/studio/template-kits` loads for mocked owner session,
- five primary owner-creatable kits are visible,
- `underground-dj-portal` is hidden,
- creating a saved draft calls `POST /api/presence/owner/studio-rooms/from-template-kit`,
- created payload is `status=draft`, `visibility=private`, `public_status=draft`, `published=null`,
- browser redirects to `/studio/[id]/studio-room`,
- editor shell shows draft/private-only warning, chamber panel, inspector panel, `StudioRoomCanvas`, and save button,
- no publish button exists,
- no public `/p/*` or `/presence/*` draft link exists from the editor shell,
- owner edits an allowed chamber summary field,
- save calls `PATCH /api/presence/owner/studio-rooms/{room_id}/draft`,
- preview reflects the edited value,
- reload preserves the saved edit,
- mock public API for the draft slug returns `404`,
- browser public route `/p/[draft-slug]` renders "Presence not public yet" and does not expose the edited value,
- request log contains no editor publish call.

## Safety Results

- Draft/publish separation: pass.
- Candidate/internal kit hidden in browser UI: pass.
- Candidate/internal kit rejected by mock backend: pass.
- Public route hidden: pass.
- Public route isolation grep: pass, no public app/component imports for Studio Room owner/editor/template internals.
- Payload hygiene regression tests: pass through Studio Room TS suite.
- Private contact protections: pass; changed-hunk contact scan only hit mock restricted-key denylist entries for `"email"` and `"phone"`.
- Runtime AI/LLM scan: pass, no matches.

## Validation Results

Re-verified on 2026-05-30.

- `npx.cmd playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=chromium`: pass, 1 test.
- `python -m pytest tests\test_presence_template_kit_draft_persistence.py tests\test_presence_studio_editor_foundation.py tests\test_presence_dna_persistence.py`: pass, 29 tests.
- `npx.cmd tsx --test lib\presence\uniqueness.test.ts`: pass.
- `npx.cmd tsx --test lib\presence\studio-room\*.test.ts`: pass, 59 tests.
- `npx.cmd tsx --test lib\presence\**\*.test.ts`: pass, 82 tests.
- `npm.cmd run typecheck`: pass.
- `npm.cmd run build`: pass; Next.js emitted the pre-existing multiple-lockfile workspace-root warning.
- `git diff --check`: pass; Git emitted an LF-to-CRLF working-copy warning for the mock API file.
- Runtime AI/LLM scan over changed areas: pass, no matches.
- Public route isolation grep: pass, no matches.
- Broad contact/private field changed-hunk grep: expected denylist-only hits for `"email"` and `"phone"` in the mock restricted-key enforcement list.

## Known Limitations

- The smoke uses the existing mock API/auth harness, not a real backend database or hosted Supabase session.
- It covers one primary kit end-to-end (`cultural-community-artist`); API tests continue to cover all five primary kits.
- It verifies a chamber summary edit in-browser. More object-type-specific browser edits remain better suited to later inspector coverage.
- The mock validates restricted keys and unsafe URLs on create/save, but is intentionally narrower than the backend validator.
