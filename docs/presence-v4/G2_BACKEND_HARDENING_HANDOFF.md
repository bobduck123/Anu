# G2 draft links backend hardening handoff

**Status:** proposed stacked backend patch on PR #27. This supersedes the link PUT details in `G2_DRAFT_LINKS_CONTRACT.md` once integrated. It does not accept G2 or authorize hosting.

## Owner API

`GET /api/presence/owner/nodes/{id}/links` still returns all owned links, including hidden links, in `data`, ordered by `(sort_order,id)`. It now adds `meta`:

```json
{"editable":true,"lock_reason":null,"max_links":50,"revision":"\"links-1\""}
```

`lock_reason` is `null`, `archived`, `previously_published`, `published`, `not_private`, or `not_draft`, in that priority order. `revision` is opaque. Clients must send its exact value in `If-Match` on every `PUT /api/presence/owner/nodes/{id}/links`. The server locks the node, checks eligibility and revision, then validates and writes the list in one transaction. A successful PUT repeats `data` and `meta` with a new revision.

```json
{"links":[
  {"id":123,"label":"Shop","url":"https://example.org/shop","link_type":"shop","icon":null,"is_visible":true},
  {"label":"New","url":"https://example.org/new","is_visible":false}
]}
```

An `id` must belong to this node's current links and occur once at most. It retains that row's identity through edits and reordering. No `id` creates a new link; omitted existing IDs are deleted. The order in the array becomes `sort_order`. The F1 frontend currently omits IDs, so its saves replace identities until it stores and resends server IDs for retained rows. Client-only React keys need not change. PostgreSQL `BIGSERIAL` and a fresh SQLite schema do not reuse a deleted ID for a different link.

At most 50 links are accepted. Each item accepts only `id`, `label`, `url`, `link_type`, `icon`, `is_visible`; `sort_order`, `node_id`, and other fields are rejected. URL must be public HTTP(S). Text over `label` 120, `url` 700, `link_type` or `icon` 80 is rejected, not truncated. Accepted label markup is stripped. `is_visible` must be a JSON boolean. Full validation precedes changes, so rejected writes preserve rows and revision.

## Errors and client adaptation

Errors keep `{ "ok": false, "error": { "code": "...", "message": "...", "details": {...} } }`. Missing `If-Match` yields 428 `precondition_required`; mismatch yields 409 `stale_draft` with `details.current_revision`. Ineligible node yields 409 `draft_only` with `details.lock_reason`, even if the revision is stale. An invalid list yields 400 `validation_error`; item errors include `details.field_errors: [{index,field,reason,max?}]`. Existing 401, 403, 404, request-ID, CORS and 429 behavior is otherwise unchanged. Preserve unsaved edits on either 409; offer reload/copy, and do not retry PUT automatically.

Owner `PATCH /api/presence/owner/nodes/{id}` rejects `public_status: "public"` with 400. Use explicit `POST .../publish`, which stamps `published_at`. Generic node updates reject direct publication. Owner PATCH of `public_status: "private"` remains accepted for compatibility but does not clear publication history. A published and then unpublished node remains ineligible for this link editor. Public reads remain hidden until explicit publication.

## Migration and rollback

Apply `flora-fauna/backend/migrations/versions/20261026_presence_owner_links_revision.sql` to PostgreSQL before starting this code. It adds `links_revision` with default 1 and stamps currently public/published rows that lack history. Rows published then returned to private with no stamp cannot be inferred from current state; audit those legacy rows before treating them as never published. Existing persistent SQLite databases need a table rebuild for SQLite `AUTOINCREMENT`; disposable test databases use `AUTO_CREATE_ALL`.

Coordinate backend and F1 client updates: the current F1 transport does not send `If-Match` and will receive 428 until it forwards `meta.revision`. It should also forward retained IDs. On code rollback, leave the additive column and repaired publication stamps in place. No production migration or hosted check was run in this task.
