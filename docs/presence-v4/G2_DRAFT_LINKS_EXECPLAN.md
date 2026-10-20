# ExecPlan: G2 private-draft link editing

## Gate

V3.4 Gate 2 owner-capability support, mapped to a bounded part of proposed V4 G2 (ID-005 and the draft-to-public flow). This does not reaccept V3.4 Gate 2 or pass V4 G2.

## Objective

A verified Presence owner can save an ordered set of safe external links to a never-published private draft through the existing Flask owner API. The public route stays hidden until the owner uses the existing explicit publish action.

## Why now

The backend already creates private beta starter nodes and publishes them intentionally, but the owner API has no link-edit route. A useful G2 profile needs owner-directed links before first publication.

## Current state

`/api/presence/owner/beta/start` creates a private draft. `PresenceLink` already stores labels, URLs, type, order and visibility. The control API can replace links, and `normalize_url` rejects non-public HTTP(S) URLs. The owner API has work and collection writes but no link write. Existing public reads filter hidden links.

## Non-goals

- No new auth, tenant, storage, migration, TypeScript service, `/api/v1` route, or frontend editor.
- No edits to a currently or previously published node; those need a whole-Presence draft/publish design.
- No change to current publish behavior, hosted rollout, billing or V4 G2 signoff.

## Scope

- Add authenticated owner `GET` and `PUT /api/presence/owner/nodes/{node_id}/links` routes. `GET` returns all owned links, including hidden ones; `PUT` accepts `{ "links": [...] }` for a never-published private draft.
- Validate the complete payload before replacing any rows. Preserve list order, visibility and safe URL rules; return owner-safe serialized links.
- Deny unauthenticated and cross-owner writes, reject unsafe input without partial persistence, and reject published or previously published nodes.
- Add synthetic end-to-end backend proof and a short client-facing contract note.

## Risks and blast radius

Medium: this adds a persisted owner write path and later feeds existing public output only after explicit publish. Replacing draft link rows changes their integer IDs before first publication. The route deliberately cannot modify existing published content. Tests must prove authorization, validation rollback and public draft isolation.

## Milestones

1. Implement the draft-only route and service validation using existing models and auth guard.
2. Prove owner start → edit → hidden public route → explicit publish → visible link, plus invalid/cross-owner/published negatives.
3. Inspect exact diff, run focused tests and document limitations.

## Files likely involved

- `flora-fauna/backend/app/api/presence_owner.py`
- `flora-fauna/backend/app/services/presence_service.py`
- `flora-fauna/backend/tests/test_presence_g2_draft_links.py`
- `docs/presence-v4/G2_DRAFT_LINKS_CONTRACT.md`
- `docs/presence-v4/G2_DRAFT_LINKS_RESULT.md`

## Tests and validation

Run the focused new test and the relevant existing owner beta/public/owner tests from `flora-fauna/backend` with a workspace `--basetemp`; run `git diff --check`. No live database or hosted deployment is in this slice.

## Rollback plan

Revert this branch. No migration is added; the route disappears and existing draft links stay in the existing `PresenceLink` table.
