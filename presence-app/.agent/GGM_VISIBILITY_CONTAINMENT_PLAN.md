# GGM Visibility Containment Plan

## Status

- GGM private proof is not ready.
- Candidate A is the intended GGM backend record.
- Candidate A is currently listed by the backend public-gallery API.
- Owner and control credentials available to the prior diagnostic are expired or stale. They must be rotated or reissued outside chat.
- No migration, Studio proof, preview, save/reload proof, or public claim may proceed until backend containment, owner-access restoration, and frontend fallback handling are complete.
- This document records a containment plan only. It does not authorise or perform a backend mutation, credential rotation, publication change, or frontend fallback change.

## Candidate identification

| Candidate | Redacted node ref | Match confidence | Evidence | Current visibility | Risk | Safe next check |
|---|---|---|---|---|---|---|
| Candidate A | `[GGM_CANDIDATE_A]` | High | Exact configured pilot-reference match, artist-identity match, GGM signature match, compatible room mode, and a published timestamp in the completed backend gallery scan | Published/public inferred from the gallery contract | High: contradicts the private-working-proof rule | After credential reissue, perform an authorised control-plane GET and reconfirm the same redacted identity signals before any mutation |

The completed gallery scan found one candidate only. Candidate A is the confirmed intended target for a later containment operation. No IDs, slugs, account references, URLs, content, media, or draft data belong in this document.

## Visibility risk

The backend gallery API returns only records that meet its published/public visibility criteria. Candidate A appears in that API, so the backend record is publicly gallery-listed.

This does not establish owner-bound Studio access or a persisted private draft. It does establish a visibility conflict with the current GGM boundary: GGM is private working proof and must not be public launch material.

Backend containment alone will not remove the existing GGM-specific frontend fallback. The fallback can synthesize GGM content when the backend does not return a room. It must not be used as migration evidence, visibility proof, or proof that a backend room exists.

## Owner-access failure

The prior owner GET-only diagnostic returned 401 for the available owner credential. Local read-only inspection found that credential expired. Its audience shape was compatible with the backend, so expiry is confirmed while environment mismatch, an old pilot account, an incompatible Supabase project, or different room ownership remain possible contributing causes.

The locally available control credential is also expired. A later containment task must not use either expired credential or any credential supplied in chat.

Owner-access restoration path:

1. Rotate or reissue owner access outside chat through the approved identity channel.
2. Confirm the frontend, Supabase, and backend are the intended controlled pilot environment.
3. Confirm the owner identity already exists without creating a new identity.
4. Run the owner GET-only diagnostic again.
5. Require owner list, node detail, editor overview, and draft read to return 200 before claiming Studio proof.

## Proposed containment operation

This operation requires a separate high-blast-radius approval. It is not authorised by this document.

### Preconditions

- Human confirmation of Candidate A remains in force.
- A new, private control-plane credential has been issued outside chat with active grant, MFA claim, correct control audience and host, `presence.node.read`, and `presence.node.update` scope.
- The control-plane shared secret is supplied only through the private environment.
- A control-plane GET confirms Candidate A's redacted identity signals and current public state immediately before mutation. Any mismatch stops the operation.

### One-record operation

Use the audited control-plane update route for Candidate A only:

```text
PATCH /api/control/presence/nodes/[GGM_CANDIDATE_A]
{
  "status": "draft",
  "visibility": "private",
  "public_status": "private"
}
```

This is the smallest validated state transition available in the current backend. It must not alter the owner, tenant, slug, media, content, renderer, persistence model, or historical publication timestamp. The control-plane route provides scope enforcement, tenant access checks, validation, and an audit event.

### Verification and rollback

Before the update, retain a private redacted metadata snapshot containing only state fields, candidate-match reasons, timestamp, and response hash. Do not retain screenshots, payload content, private URLs, or credentials.

After the update:

1. Control-plane GET confirms `draft` / `private` / `private` state.
2. Complete public-gallery pagination confirms Candidate A is absent.
3. Do not call the production public-detail endpoint: a successful response records analytics. Field state plus gallery absence and the documented backend query contract are the non-mutating backend proof.
4. After owner credential repair, rerun owner list/detail/editor/draft, anonymous, and cross-owner GET-only checks.

Rollback is manual and separately approved. If the pre-mutation identity check later proves the wrong record was changed, apply the recorded prior `status`, `visibility`, and `public_status` through the same control-plane route. Never automatically republish a room.

## Acceptance criteria for containment

- [ ] Candidate A is reconfirmed immediately before mutation using redacted evidence.
- [ ] Only Candidate A is changed.
- [ ] Candidate A is `draft`, `private`, and `private` for status, visibility, and public status.
- [ ] Candidate A is absent from the backend public gallery.
- [ ] No direct public-detail call is used where it could create analytics state.
- [ ] Owner access has been repaired using credentials issued outside chat.
- [ ] Owner list, detail, editor overview, and draft read return 200.
- [ ] Anonymous owner access returns 401.
- [ ] Foreign-owner access returns 403.
- [ ] No public `/p/[slug]` route or frontend gallery fallback is used as proof.
- [ ] No owner reassignment, tenant change, content edit, media change, or deletion occurs.

## Frontend fallback follow-up

After backend containment, create a separately approved Builder/Reviewer work order to remove the GGM-specific public fallback. That task must be reviewed independently because it changes public renderer and gallery behaviour.

Its acceptance criteria must prove that a missing or private backend GGM room is not synthesized into the public gallery or public route, while unrelated demo fixtures retain their documented behaviour. This documentation task does not modify fallback behaviour.

## Human decisions required

- Candidate A has been confirmed as the intended target; reconfirm it immediately before mutation.
- Authorise owner and control credential rotation or reissue outside chat.
- Authorise the one-record private containment mutation.
- Confirm whether the redacted metadata snapshot is sufficient audit evidence before containment.
- Approve the separate GGM frontend-fallback removal work order after backend containment.

## Next work orders

1. Rotate or reissue owner and control credentials outside chat.
2. Reconfirm Candidate A through an authorised control-plane GET.
3. Execute the separately approved GGM backend visibility-containment mutation.
4. Remove the GGM-specific frontend public fallback in a separate Builder/Reviewer task.
5. Rerun the GET-only owner-bound diagnostic.
6. Capture private Studio proof only after all containment gates pass.
