# Presence Studio TemplateKit Draft Flow Proof

Date: 2026-05-29

## Summary

Added an owner-authenticated experimental TemplateKit starter route for creating deterministic Studio Room draft payloads from the four primary TemplateKits.

This does not persist to the backend yet and does not publish. The route produces a staged, saveable Studio Room draft payload for a future backend persistence endpoint.

## Route

- `/studio/template-kits`

The route is hidden from normal navigation and requires a valid Studio owner session before showing TemplateKit starters.

## Exposed Kits

Normal owner creation exposes only primary kits:

- `gallery-artist`
- `material-tradie-proof-card`
- `healing-practitioner`
- `consultant-contractor`

The candidate kit `underground-dj-portal` remains internal-only and is not available for owner draft creation.

## Draft Instantiation

The draft adapter:

- instantiates a valid Studio Room from the TemplateKit,
- scrubs source candidate identity/contact/media values,
- replaces content with deterministic placeholders and copy scaffolds,
- keeps ThemeTokens, MoodPreset pairing, chambers, objects, mobile variants, CTA strategy, required fields, and optional fields,
- creates an `EditorDraft` with `state: draft`,
- leaves `published` as `null`,
- marks persistence as `staged-only`.

## Persistence Boundary

Persistence is staged in this pass. The existing production editor API persists `PresenceEditableConfig`; Studio Room draft persistence needs a deliberate backend contract rather than flattening Room data into current public/editor config fields.

## Preview

The owner starter route renders the staged draft with `StudioRoomCanvas`. Internal TemplateKit previews remain available only through production-gated internal routes.

## Security / Privacy

- Public routes are unchanged.
- Public route files do not import the TemplateKit starter or StudioRoomCanvas.
- Candidate kits are hidden from owner creation.
- Broad/private contact fields are not mapped.
- Source candidate public emails and names are scrubbed from owner starter payloads.
- No runtime AI/LLM code was added.

## Tests

- `studioRoomTemplateDrafts.test.ts` covers owner kit filtering, candidate hiding, draft instantiation, draft/published separation, payload sanitization, route isolation, auth source presence, and uniqueness guard preservation.
- Studio Room, TemplateKit, semantic adapter, assessment, public render, and internal preview tests pass.
- `npm run typecheck` passes.
- `npm run build` passes.
- Full local `*.test.ts` sweep passes when excluding the existing `lib/presence/uniqueness.test.ts` demo fixture failure.
- `lib/presence/uniqueness.test.ts` still fails because `rooms-gallery-painter` and `ggm-christina-goddard` remain too similar. This was not weakened or changed.
- Scoped AI/LLM runtime scan returned no matches.
