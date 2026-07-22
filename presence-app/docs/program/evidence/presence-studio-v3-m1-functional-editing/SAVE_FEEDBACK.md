# Studio V3 M1 private-save feedback

Status: implemented; final frozen-tree browser rerun passed

| State | Owner-facing truth | Action |
|---|---|---|
| Clean | Private state current | Continue editing |
| Dirty | Private changes not saved | Explicit Save available |
| Saving | Saving owner-private editor state | Duplicate submission blocked |
| Saved | Saved privately; still unpublished; visitor site unchanged | Continue editing |
| Failed | Could not save private editor state | Explicit Retry |
| Conflict/stale base | Base or metadata revision changed | No retry/rebase; guarded Reload latest |
| Incomplete canonical restore | A referenced source is unavailable; durable replacement is locked to prevent silent loss | Restore source and Reload latest |
| Memory-only | Browser recovery is memory-only | Durable claim withheld |
| Disabled | Specific missing capability/base/invalid-state reason | Save disabled |

Success is shown only after the owner-private state endpoint responds with valid normalized metadata. The submitted snapshot is normalized into the document only if no newer local edit was made during the request; newer edits remain dirty. Save/upload completions are fenced by load epoch and owner identity. Rejected durable metadata disables save and cannot be reported as restored.

Conflict Reload uses a confirmation when current metadata differs from the last saved signature, so unsaved edits are not silently discarded. Failure does not automatically retry. No save action calls draft replacement, canonical CRUD, publish, rollback, or a public endpoint.

**Discard Local Changes** is separate from conflict reload. After confirmation it fences queued snapshot writers, acquires the same owner lock, clears only the current Presence/base browser generations, and reloads durable private/base state. In memory-only mode it performs the confirmed reload without pretending a browser snapshot exists.

Evidence: screenshots `12-private-save-success.png` and `13-private-save-failure-or-conflict.png`; canonical save-state E2E scenarios; API/backend conflict tests.
