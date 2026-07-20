# Presence Studio TemplateKit Persistence Evidence

Date: 2026-05-29

## Scope

This pass turns the deterministic TemplateKit starter flow into the first real owner draft creation path.

Persistence boundary chosen: `presence-editable-config-compat-v1`. The backend creates a private draft `PresenceNode` and stores the source-scrubbed Studio Room payload inside a draft `PresenceEditableConfig.content_config.studio_room_draft`. No database migration was required.

## Added Owner Surfaces

- Backend endpoint: `POST /api/presence/owner/studio-rooms/from-template-kit`
- Owner shell route: `/studio/[id]/studio-room`
- Starter integration: `/studio/template-kits` now creates a saved draft and redirects to the owner shell.

## Auth And Exposure

- Endpoint uses existing `alpha_jwt_required()` owner authentication.
- Draft ownership is assigned from the resolved owner user, not from request payload.
- New Studio Room shell uses `useOwnerNode()` and `StudioNodeGate`.
- Candidate/internal kits are rejected by the endpoint and remain hidden from normal owner creation.
- `underground-dj-portal` remains candidate/internal only.

## Owner-Creatable Kits

- `gallery-artist`
- `cultural-community-artist`
- `material-tradie-proof-card`
- `healing-practitioner`
- `consultant-contractor`

## Draft/Publish Separation

- Created nodes are forced to `status=draft`, `visibility=private`, `public_status=draft`.
- `published_at` remains null.
- No published `PresenceEditableConfig` is created.
- Create response returns `published=null` and `base_published_version=0`.
- The Studio Room shell has no publish action.
- Public Presence routes were not modified and do not import Studio Room editor or TemplateKit persistence code.

## Payload Hygiene

- Backend rejects broad/private contact keys such as `email`, `phone`, `contactEmail`, `contactPhone`, `ownerEmail`, and `authSubject` inside TemplateKit draft payloads.
- Backend rejects unsafe/local URLs through the existing editor config sanitizer.
- Persisted Studio Room payload uses `studio_room_draft`, which the public editable-config sanitizer redacts.
- Owner shell renders `StudioRoomCanvas` from `toPublicRoomPayload()` rather than raw editable config.

## Runtime AI Scan

No runtime AI/LLM references were introduced in changed code areas. Scan covered new TemplateKit persistence client, starter, owner shell, persisted draft helper, backend route, and backend service.

## Validation Results

- `python -m pytest tests\test_presence_template_kit_draft_persistence.py`: 3 passed.
- `python -m pytest tests\test_presence_studio_editor_foundation.py tests\test_presence_template_kit_draft_persistence.py`: 14 passed.
- `npx.cmd tsx --test lib/presence/uniqueness.test.ts`: passed.
- `npx.cmd tsx --test lib/presence/studio-room/*.test.ts`: 56 passed.
- `npx.cmd tsx --test lib/presence/**/*.test.ts`: 79 passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed. Existing Next workspace-root warning remains.
- `git diff --check`: passed.
- Public route isolation grep: no matches.
- Runtime AI/LLM scan: no matches.
- Broad contact/private field grep: only validator/test fixtures and existing owner API allowlist entries; no TemplateKit mapping path added broad contact fields.

## Known Limitations

- The shell is a preview/editing foundation only; no chamber inspector or drag/drop editor is included.
- Full Studio Room draft editing still needs a narrowed save/update contract for individual chamber/object edits.
- Public publishing of Studio Room payloads remains intentionally out of scope; current public routes remain on the existing Presence renderer path.
- Backend allowlist mirrors the frontend primary TemplateKit ids until a shared registry contract exists.
