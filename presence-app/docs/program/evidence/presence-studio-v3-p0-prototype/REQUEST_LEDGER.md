# Request Ledger Criteria

Focused Playwright specs fail if the mock request ledger contains any non-GET request that is not a test-control endpoint under `/__test__/`.

The assertions also retain explicit sentinels for the known room-29 write endpoints:

- `/api/presence/owner/rooms/29/editor/draft`
- `/api/presence/owner/rooms/29/editor/preview`
- `/api/presence/owner/rooms/29/editor/publish`
- `/api/presence/owner/rooms/29/editor/rollback`

Covered result:

- The P0 prototype performs read-only editor loading.
- Runtime Studio V3 changes write only browser-local staged snapshot generations and manifests under `presence-studio-v3:prototype:*`; no browser-local key contains raw session subject, token, owner record, media URL, or payload copy.
- Public BBB fixture privacy is asserted by checking the anonymous public API payload does not contain `owner_user_id`, Studio V3 source refs, or `preview_expires_at`.
