# Presence Studio Cross-Browser Owner Lifecycle Smoke Evidence

Date: 2026-05-30

## Scope

This pass extends the existing Studio Room owner lifecycle browser smoke from Chromium-only coverage to Chromium, Firefox, and WebKit.

No product feature, public route, Studio Room public rendering, publish flow, media/audio/embed support, visual redesign, advanced inspector control, or runtime AI path was added.

## Playwright Configuration

Browser projects configured in `presence-app/playwright.config.ts`:

- `chromium` using `Desktop Chrome`
- `firefox` using `Desktop Firefox`
- `webkit` using `Desktop Safari`

The existing lifecycle spec remains:

- `presence-app/tests/e2e/presence-studio-room-owner-lifecycle.spec.ts`

No assertions were weakened and the spec was not browser-skipped.

## Browser Install / Environment

Initial Firefox execution failed because the local Playwright Firefox binary was missing:

- missing executable: `C:\Users\emadh\AppData\Local\ms-playwright\firefox-1511\firefox\firefox.exe`

Resolution:

- ran `npx playwright install firefox webkit`
- Firefox and WebKit binaries installed successfully
- no product code changes were required for browser behavior

## Assertions Preserved

The cross-browser smoke still checks:

- owner auth mock can access `/studio/template-kits`
- five primary owner-creatable kits are visible
- `underground-dj-portal` is hidden from starter UI
- `cultural-community-artist` draft creation calls `POST /api/presence/owner/studio-rooms/from-template-kit`
- created payload is private/draft/unpublished
- redirect lands on `/studio/[id]/studio-room`
- editor shell shows draft-only warning, chamber panel, inspector, preview panel, Studio Room canvas, and save button
- publish button is absent
- public `/p/*` and `/presence/*` draft links are absent from the editor shell
- safe chamber summary edit updates preview
- save calls `PATCH /api/presence/owner/studio-rooms/{room_id}/draft`
- saved payload remains private/draft/unpublished with no published config
- dirty state clears after save
- reload preserves the edited value
- public API for draft slug returns 404
- public page does not expose edited draft content
- direct candidate kit creation is rejected
- request log contains no publish calls

## Results

- Chromium: pass, 1 test
- Firefox: pass, 1 test
- WebKit: pass, 1 test

All three browser runs emitted the pre-existing Next.js multiple-lockfile workspace-root warning. This did not affect test results.

## Safety Results

- Public route isolation grep: pass, no Studio Room/editor/template draft imports in public route surfaces.
- Runtime AI/LLM changed-hunk scan: pass, no changed OpenAI/Anthropic/langchain/AI SDK/chatbot/model-inference references.
- Broad contact/private changed-hunk scan: pass, no matches in this pass.
- Active demo overlay dependency grep: pass, no active overlay dependency.
- Generated artifacts: Playwright output was not tracked; `.next` and backend static uploads remain ignored.

## Validation Results

- `npx playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=chromium`: pass, 1 test.
- `npx playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=firefox`: pass, 1 test after browser install.
- `npx playwright test tests/e2e/presence-studio-room-owner-lifecycle.spec.ts --project=webkit`: pass, 1 test after browser install.
- `python -m pytest tests\test_presence_dna_persistence.py tests\test_presence_template_kit_draft_persistence.py tests\test_presence_studio_editor_foundation.py`: pass, 30 tests.
- `npx.cmd tsx --test lib\presence\uniqueness.test.ts`: pass.
- `npx.cmd tsx --test lib\presence\studio-room\*.test.ts`: pass, 59 tests.
- `npx.cmd tsx --test lib\presence\**\*.test.ts`: pass, 84 tests.
- `npm.cmd run typecheck`: pass.
- `npm.cmd run build`: pass.
- `git diff --check`: pass.
- `git diff --cached --check`: pass.

Backend pytest emitted existing SQLAlchemy legacy warnings and a local pytest cache permission warning; tests still exited green.

## Known Limitations

- The smoke still uses the deterministic local mock API/auth harness rather than a real hosted backend session.
- It covers one primary kit end-to-end in-browser; API lifecycle tests cover all five primary kits.
- Real-backend/hosted owner lifecycle smoke remains a separate release-readiness pass.
