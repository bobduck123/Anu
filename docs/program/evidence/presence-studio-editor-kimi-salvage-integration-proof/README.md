# Presence Studio Editor Kimi Salvage Integration Proof

Date: 2026-05-24

## Summary

This pass treated the Kimi bundle as an untrusted reference and selectively salvaged compatible frontend/product ideas into the existing Codex-built Presence Studio editor. No Kimi backend model, migration, token preview store, or public draft preview endpoint was applied.

## What Was Kept From Kimi

- Asset safety validator concept, rewritten for the repo's editor contract.
- Draft-vs-published comparison concept, rewritten for `PresenceEditableConfig`.
- Readiness scoring and grouped issue language, rewritten for the actual scene/style/motion/assets/enquiry shape.
- Full-screen draft preview UX pattern, implemented through the existing owner-only authenticated preview endpoint.
- Publish confirmation modal pattern, wired to the existing owner publish endpoint.
- Room DNA preset concept, limited to renderer-visible GGM palette/typography/liquid motion tokens.

## What Was Rejected From Kimi

- `migration_20260523.sql`.
- Simplified `PresenceEditableConfig.config_json` backend model.
- `presence_editor.py` backend replacement.
- `presence_preview_token_store.py`.
- Public token preview endpoint.
- Full-file backend snapshots.
- Flattened `EditorConfig` assumptions.
- Any preset/control that did not map to visible renderer behavior.

## Files Changed

- `presence-app/app/(studio)/studio/[id]/editor/preview/page.tsx`
- `presence-app/components/studio/editor/PresenceStudioEditorApp.tsx`
- `presence-app/components/studio/editor/PresenceDraftPreviewPage.tsx`
- `presence-app/components/studio/editor/BeforeAfterComparison.tsx`
- `presence-app/components/studio/editor/PublishConfirmDialog.tsx`
- `presence-app/components/studio/editor/ReadinessPanel.tsx`
- `presence-app/lib/editor/assetValidator.ts`
- `presence-app/lib/editor/diffEngine.ts`
- `presence-app/lib/editor/readiness.ts`
- `presence-app/lib/editor/presets.ts`
- `presence-app/components/presence/ggm/GgmMotionContext.tsx`
- `presence-app/components/presence/ggm/GgmStage.tsx`
- `presence-app/components/presence/ggm/ggm.module.css`
- `presence-app/tests/e2e/mock-presence-api.mjs`
- `presence-app/tests/e2e/presence-studio-editor.spec.ts`
- `presence-app/lib/editor/assetValidator.test.ts`
- `presence-app/lib/editor/diffEngine.test.ts`
- `docs/program/evidence/presence-style-motion-wiring-audit.md`

## Schema Compatibility

All salvaged logic uses the existing backend contract:

- `renderer_key`
- `scene_config`
- `style_dna`
- `motion_config`
- `asset_config`
- `content_config`
- `roomkey_config`
- `enquiry_config`
- `locked_fields`

No `config_json` model was introduced.

## Preview Implementation

Added `/studio/[id]/editor/preview`.

- Owner-only through `useOwnerNode`.
- Uses `POST /api/presence/owner/rooms/<room_id>/editor/preview`.
- Renders draft config through the existing public renderer locally inside the authenticated route.
- Displays fixed "Draft preview not public" label.
- Supports desktop/mobile viewport modes.
- Supports back to editor.
- Supports publish with explicit confirmation.
- Page metadata is `noindex`.

## Asset Safety

Added `presence-app/lib/editor/assetValidator.ts`.

Blocks:

- local filesystem paths
- `file:`
- `data:`
- localhost/internal hosts
- traversal
- script-like content
- raw secrets/tokens/signed credentials in asset URLs

The Assets tab keeps safe public URL attach/select behavior and shows a disabled upload placeholder. Existing node media upload was not wired because it mutates live node/work media rather than draft-scoped editor assets.

## Draft Comparison

Added `BeforeAfterComparison` using `diffEditableConfigs`.

Compared groups:

- Scenes and copy
- Works and assets
- Style DNA
- Motion and texture
- RoomKey
- Enquiry and actions
- Renderer

## Readiness Panel

Readiness now shows:

- percentage
- Critical issues
- Recommended improvements
- Polish suggestions
- improvement tips

Checks include missing title, primary image, primary invitation, enquiry routing, empty work wall, alt text, unsafe assets, external links, heavy motion, no published config, unpublished changes, and mobile preview review state.

## Style / Motion

See `docs/program/evidence/presence-style-motion-wiring-audit.md`.

Enabled controls are renderer-visible. Unwired controls are disabled or explicitly labelled coming soon.

## Security Checks

- No public draft preview endpoint added.
- Draft preview remains under `/studio`.
- Inline preview status no longer renders preview URL/token values in the Studio UI.
- Public renderer still consumes only active published `node.editable_config`.
- RoomKey mock now attaches published editable config only.
- Non-owner mock flow returns 403.
- No hard-coded owner email added.
- No `platform_admin`, `internal_lifetime_free`, auth subject, audit metadata, or local filesystem path exposure added.

## Tests Run

- `cmd /c npm run typecheck` - passed.
- `cmd /c npm run build` - passed.
- `node --test --experimental-strip-types lib\api\editor.test.ts lib\api\presenceGraph.test.ts lib\editor\assetValidator.test.ts lib\editor\diffEngine.test.ts` - 7 passed.
- `npx playwright test tests/e2e/presence-studio-editor.spec.ts` - 1 passed.
- `python -m pytest tests\test_presence_studio_editor_foundation.py tests\test_presence_pass_paths.py -q` - 9 passed.

Known warnings:

- Next.js workspace root warning due multiple lockfiles.
- Node module type warning for TypeScript test files.
- SQLAlchemy legacy query warnings in backend tests.
- Pytest cache permission warning.

## Screenshots

See `SCREENSHOTS.md`.

## Known Limitations

See `KNOWN_LIMITATIONS.md`.
