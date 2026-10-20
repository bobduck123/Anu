# G2 owner draft links: backend interface

**Status:** Bounded Flask interface for never-published private drafts. This is a G2 slice, not the proposed `/api/v1` contract or G2 acceptance.

## Routes

`GET /api/presence/owner/nodes/{node_id}/links` returns all links of an owned Presence, including `is_visible: false` links that the public and general owner-detail projections omit. It requires the existing owner Bearer token. A missing token returns 401; a different owner returns 403.

`PUT /api/presence/owner/nodes/{node_id}/links` replaces the complete ordered link list of an owned Presence only when the node is private, still `draft`, and has never been published. It uses the same owner token. The array position becomes `sort_order`; supplied IDs and sort-order fields are rejected. At most 50 links are accepted. An empty list clears the private draft.

```json
{
  "links": [
    { "label": "Shop", "url": "https://example.org/shop", "link_type": "shop", "is_visible": true },
    { "label": "Preview", "url": "https://example.org/preview", "is_visible": false }
  ]
}
```

Each item accepts only `label`, `url`, `link_type`, `icon` and `is_visible`. Label and URL are required text; URL must be a public HTTP(S) URL. The optional visibility field must be a JSON boolean. The existing text cleaner removes markup and applies field lengths.

A successful GET or PUT returns the existing owner envelope `{ "ok": true, "data": [links...] }`, where each link has `id`, `label`, `url`, `link_type`, `icon`, `sort_order` and `is_visible`. Validation errors return 400 without replacing any saved links; a current or previously published node returns `409 draft_only`. Existing owner publication is a separate explicit POST. Until that action, public reads return 404 for the private draft.

## Compatibility limit

This route uses existing `PresenceLink` rows and intentionally replaces their IDs before first publication. It cannot edit published Presence links: whole-Presence draft revisions and atomic republishing remain separate G2 work. No frontend editor or SDK is included in this backend slice.
