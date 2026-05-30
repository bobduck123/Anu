# Presence Studio Editor Inspector Foundation Evidence

Date: 2026-05-29

## Scope

This pass turns `/studio/[id]/studio-room` from a saved-draft viewer into the first controlled owner editing environment for TemplateKit-created Studio Room drafts.

The draft persistence boundary remains `presence-editable-config-compat-v1`:

- Stored at `PresenceEditableConfig.content_config.studio_room_draft`.
- Saved through owner-authenticated backend routes only.
- Never published automatically.
- Not wired into public Presence routes.

## Endpoint Added

- `PATCH /api/presence/owner/studio-rooms/{room_id}/draft`

The endpoint:

- requires `alpha_jwt_required()` owner authentication,
- verifies owner access with existing owner node access checks,
- requires an existing draft `PresenceEditableConfig`,
- requires existing `content_config.studio_room_draft`,
- validates the incoming Studio Room draft contract,
- rejects restricted keys recursively,
- rejects broad/private contact fields,
- validates editable URLs,
- preserves private draft node state,
- does not create a published config.

## Editable Field Scope

Allowed in this pass:

- chamber `title` and `summary`,
- object display `label`,
- text/headline/note/image/work title/body copy,
- service title/body/price label/duration label,
- proof/testimonial title/body/quote/attribution/source,
- link/portal title/body/action label/action href/link type,
- credential/badge title/body/issuer/detail,
- CTA title/body/action label/action target,
- contact object display title/body only.

## Non-Editable / Restricted Scope

Rejected or locked:

- `schemaVersion`,
- room id/slug/state/template id,
- support state,
- chamber/object ids, types, order, required flags, mobile variants,
- theme, renderer config, mood preset, style DNA, motion config,
- `editorOnly`, `internal`, raw editable config keys,
- owner/user/auth fields,
- broad contact fields such as `email`, `phone`, `contactEmail`, `contactPhone`,
- private/public contact channel mapping,
- media/image source changes, media embeds, audio players,
- published state and public route fields.

## Editor Shell Changes

`/studio/[id]/studio-room` now includes:

- draft status and unsaved changes state,
- save draft button,
- chamber/object side panel,
- selected chamber/object inspector,
- mobile/desktop canvas toggle,
- `StudioRoomCanvas` preview from a sanitized public-style draft copy,
- explicit private-draft-only warning,
- no publish action.

## Draft / Publish Safety

On save, the backend forces:

- `status=draft`,
- `visibility=private`,
- `public_status=draft`,
- `published_at=null`.

No published `PresenceEditableConfig` is created by the save endpoint.

## Validation Results

- `python -m pytest tests\test_presence_template_kit_draft_persistence.py`: 6 passed.
- `python -m pytest tests\test_presence_studio_editor_foundation.py tests\test_presence_template_kit_draft_persistence.py`: 17 passed.
- `npx.cmd tsx --test lib/presence/uniqueness.test.ts`: passed.
- `npx.cmd tsx --test lib/presence/studio-room/*.test.ts`: 59 passed.
- `npx.cmd tsx --test lib/presence/**/*.test.ts`: 82 passed.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed. Existing Next workspace-root warning remains.
- `git diff --check`: passed.
- Runtime AI/LLM scan: no matches.
- Public route isolation grep: no matches.
- Broad contact/private field grep: only validator/test fixtures and existing owner API allowlist entries; no TemplateKit contact mapping path added broad contact fields.

## Known Limitations

- No drag/drop layout editing.
- No advanced theme/mood inspector.
- No media upload/embed/audio editing in this shell.
- No public publishing of Studio Room payloads.
- Backend and frontend still mirror the primary TemplateKit id allowlist until a shared registry contract exists.
