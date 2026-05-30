# Presence Studio Owner Lifecycle Smoke Evidence

Date: 2026-05-29

## Scope

This pass removes the backend/frontend TemplateKit owner-creatable drift point and proves the first complete private Studio Room draft lifecycle:

1. Owner selects a primary TemplateKit.
2. Backend creates a private draft PresenceNode.
3. Draft PresenceEditableConfig stores `content_config.studio_room_draft` under `presence-editable-config-compat-v1`.
4. Owner editor route can load the persisted draft.
5. Owner applies a safe content edit.
6. Save persists the updated draft.
7. Reload returns the edited value.
8. Public route remains hidden and unpublished.

## Shared Contract

Contract path:

- `flora-fauna/backend/app/data/presence_studio_template_kits.json`

The backend now derives `PRIMARY_TEMPLATE_KITS` and candidate/non-owner-creatable kit rejection from the contract. The frontend registry remains TypeScript-native, with a test that validates registry ids, display names, support states, owner-creatable flags, and Studio Room schema versions against the shared contract.

Primary owner-creatable kits:

- `gallery-artist`
- `cultural-community-artist`
- `material-tradie-proof-card`
- `healing-practitioner`
- `consultant-contractor`

Candidate/internal kit:

- `underground-dj-portal`

## Lifecycle Coverage

Backend lifecycle tests now cover:

- owner-creatable contract summary,
- all five primary kits creating private/unpublished drafts,
- candidate kit rejection,
- unauthenticated creation rejection,
- persisted editor draft load,
- safe owner edit save,
- save/reload proving edited value persistence,
- no published config creation,
- `status=draft`, `visibility=private`, `public_status=draft`,
- public route returning 404 for the draft slug,
- unsafe URL rejection,
- restricted/editor/private field rejection,
- broad contact field rejection.

Frontend tests now cover:

- frontend owner-creatable list matching the shared contract,
- `underground-dj-portal` remaining candidate/internal,
- owner starter request shape,
- editor shell source gates,
- public route import isolation,
- Studio Room draft save request serialization,
- URL policy helper alignment.

## Safety Results

- Draft/publish separation: preserved. No auto-publish path was added.
- Public route isolation: public route tests/grep remain focused on rejecting Studio Room editor/canvas/template imports.
- Payload hygiene: persisted draft remains inside owner draft config and public serialization strips `studio_room_draft`.
- Private contact protection: broad contact keys remain rejected recursively by backend validation and absent from frontend save/start payloads.
- Runtime AI: no runtime AI/LLM code paths were introduced.

## Validation Results

- `python -m pytest tests\test_presence_dna_persistence.py tests\test_presence_template_kit_draft_persistence.py tests\test_presence_studio_editor_foundation.py`: pass, 29 tests.
- `npx.cmd tsx --test lib\presence\uniqueness.test.ts`: pass.
- `npx.cmd tsx --test lib\presence\studio-room\*.test.ts`: pass, 59 tests.
- `npx.cmd tsx --test lib\presence\**\*.test.ts`: pass, 82 tests.
- `npm.cmd run typecheck`: pass.
- `npm.cmd run build`: pass, with existing Next workspace-root warning.
- `git diff --check`: pass.
- Runtime AI/LLM scan over changed runtime areas: no matches.
- Backend `published_state` validation tightened (`and` → `or`) to correctly reject drafts that include published state under either snake_case or camelCase key.
- Public route isolation grep: no matches.
- Broad contact/private field grep: expected validator/test/public-only semantic adapter references only.

## Known Limitations

- The shared contract is JSON plus tests, not generated from the frontend registry at build time.
- Browser E2E was not added in this API lifecycle pass; it is now covered by `docs/program/evidence/presence-studio-browser-owner-lifecycle-smoke/`.
- Studio Room public publishing remains intentionally deferred.
- Advanced inspector controls, mobile renderer polish, and Studio Guide remain out of scope.
