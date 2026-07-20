# BBB Studio V2 eligibility evidence

## Outcome

Path A implemented: explicit editor/private-preview eligibility for room `29 / bbbvision`.

This enables BBB to enter Studio V2 from `/studio/29/editor` when the Studio V2 global flag is enabled, without changing shared public renderer eligibility.

## What changed

- `/studio/[id]/editor` now uses `shouldUsePresenceStudioV2Editor`.
- `shouldUsePresenceStudioV2Editor` preserves the shared V2 predicate and adds an explicit editor-only allowlist for room `29 / bbbvision`.
- Private preview uses `studioV2PrivatePreviewRoomFromPresenceNode` so editor-eligible V2 rooms can preview through the V2 projection.
- Anonymous public projection still uses `studioV2PublicRoomFromPresenceNode` and the shared `shouldUsePresenceStudioV2` predicate.
- Local e2e mock now includes room `29` in the same blocker shape observed on hosted BBB: owner node lacks V2 selector fields, editor overview has V2-compatible published data, and draft is null.

## What is proven

- BBB room `29` can enter Studio V2 through an explicit editor-only eligibility predicate.
- BBB can initialize Studio V2 from published V2 editor data when no draft exists.
- Private preview can render a V2 projection for the editor-eligible BBB room.
- Public `/p/bbbvision` and `/presence/bbbvision` remain reachable in the focused local regression.
- Legacy/non-eligible room `101` still uses the non-V2 editor path.
- The focused regression made no draft-write or publish request.

## What is not proven

- Hosted BBB write/revert proof.
- Hosted deployment of this branch.
- BBB publication or launch readiness.
- Backend owner-policy changes.
- Public renderer expansion.
- Asset/media migration beyond the already available editor payload.

## Evidence files

- `EXEC_PLAN.md`
- `ELIGIBILITY_MATRIX.md`
- `route-status-comparison.md`
- `VALIDATION_RECORD.md`
- `NO_MERGE_REVIEW.md`

## Verdict

BBB Studio V2 eligibility is enabled in source. Hosted proof and any publication workflow remain separate gates.
