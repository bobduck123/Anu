# Presence Studio Room Real-Room Comparison Proof

Date: 2026-05-29

## Summary

Added an internal real-room comparison path for the preview-only Studio Room renderer. The route loads a room through the same owner Studio bearer-token access pattern used by the existing editor, resolves the current draft where available, adapts it into Studio Room, sanitizes the public-style payload, and renders the Studio Room preview with diagnostics.

This does not replace public Presence routes, Canvas Builder, or Presence World graph navigation.

## Route

- `/internal/studio-room-comparison/[roomRef]`

`roomRef` can be a numeric room id or an owned room slug. Slug lookup is performed only through the protected owner node list.

## Gate Model

- Anonymous users see the existing owner access gate.
- Non-owners are blocked by the existing protected owner room/editor endpoints.
- Owners or staff with valid Studio access can load the comparison.
- The route does not use query-param auth and does not treat debug flags as bypasses.
- The route is hidden from normal navigation.

## What The Route Shows

- Internal warning banner.
- Existing render model summary.
- Sanitized Studio Room preview.
- Adapter diagnostics: room identity, draft/published mode, scene/widget count, chamber/object count, semantic mapped counts, blocked private field counts, sanitized restricted-key counts, mobile CTA presence, media count, and missing/absent/deferred semantic fields.

## What The Route Does Not Show

- Raw `editable_config`.
- Raw owner/auth fields.
- Private contact fields.
- Editor-only metadata.
- Internal public-route payload keys.
- Draft data to anonymous visitors.

## Contact Privacy

Contact mapping remains restricted to explicitly public contact fields:

- `public_email`
- `publicEmail`
- `public_phone`
- `publicPhone`

Broad/private fields such as `email`, `phone`, `contactEmail`, and `contactPhone` are counted for diagnostics but not mapped or displayed.

## Tests Run

- `cmd /c npx tsx lib\presence\studio-room\studioRoom.test.ts` - pass
- `cmd /c npx tsx lib\presence\studio-room\studioRoomAdapters.test.ts` - pass
- `cmd /c npx tsx lib\presence\studio-room\studioRoomSemanticAdapter.test.ts` - pass
- `cmd /c npx tsx lib\presence\studio-room\studioRoomAssessment.test.ts` - pass
- `cmd /c npx tsx lib\presence\studio-room\studioRoomInternalPreview.test.ts` - pass
- `cmd /c npx tsx lib\presence\studio-room\studioRoomPublicRender.test.ts` - pass
- `cmd /c npx tsx lib\presence\world\navigator.test.ts` - pass
- `cmd /c npm run typecheck` - pass
- `cmd /c npm run build` - pass
- `git diff --check` - pass
- Scoped AI/LLM runtime scan - no matches
- Full local `*.test.ts` sweep except `lib/presence/uniqueness.test.ts` - pass

## Residual Test Issue

`lib/presence/uniqueness.test.ts` fails independently of this route because the current demo set reports `rooms-gallery-painter` and `ggm-christina-goddard` as too similar. I did not change those DNA/demo fixtures in this pass because they are outside the real-room comparison/auth/privacy scope.

## Decision

The comparison route is suitable for internal owner/staff inspection of real rooms. It remains preview-only and should not be linked from normal owner navigation until a product decision is made.
