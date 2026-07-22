# Studio V3 M1 editability matrix

Status: implemented; scoped final automated validation recorded in `VALIDATION_RECORD.md`

| Owner action | M1 state | Immediate preview | Durable representation | Public effect before publish |
|---|---|---|---|---|
| Title/body/caption/CTA label | Enabled where supported; required CTA cannot be blank | Yes | bounded `object_edits` | None |
| Existing Piece media | Enabled | Yes | stable `mediaSourceRef` only | None |
| Owner-private uploaded media | Capability-gated and enabled on verified private storage | Yes | stable `mediaId` only | None |
| Create/mutate canonical Work | Disabled with reason | No | None | None |
| Earlier/later | Enabled where a sibling exists | Yes | bounded placement/order | None |
| Feature/unfeature | Enabled only in registered compatible zones | Yes | registered size/feature state | None |
| Registered-zone move | Drag plus keyboard/tap card | Yes, snapped to zone | registered zone/size/treatment | None |
| Registered Piece size | Visual stepped cards limited by the active zone | Yes | bounded object-edit size | None |
| Per-Piece treatment | Visual cards limited by the active zone | Yes | bounded object-edit treatment | None |
| Show/hide | Enabled except required navigation CTA | Yes | bounded visibility | None |
| Place/unplace | Enabled for canonical Works/Collections; unavailable placed items remain removable | Yes | private placement refs | None |
| Background/surface | Visual registered cards | Yes | `layer_values` token | None |
| Image treatment/filter | Visual registered cards | Yes | `layer_values` token | None |
| Typography/CTA style | Visual registered cards | Yes | `layer_values` token | None |
| Motion intensity | Visual registered cards; lock and reduced-motion preserved | Yes | `layer_values`/lock token | None |
| Named Look | Save/restore effective registered values | Yes | bounded `named_looks` | None |
| Room Style | Preview Before/After, Apply, exact Cancel | Yes | structural state + savepoint | None |
| Simple mode | Default; guided zones, reorder, feature, safe size and treatment controls | Yes | owner-private mode preference | None |
| Advanced Creative | Disabled with a visible deferred reason; no fake transforms/depth controls | No | Retained preference only if already present | None |
| Crop/focal position | Disabled with a visible deferred reason | No | None | None |
| Review & Publish | Inert readiness sheet; executable publish is disabled | Review only | None | None |
| Discard Local Changes | Confirmed, current-Presence browser snapshot clear under the owner lock; memory-only reload supported | Reloads durable/base state | No server write | None |
| Raw URL/blob/path/code/secret/arbitrary coordinates | Rejected or absent | No | Never accepted | None |

Done accepts a valid private edit; Cancel and Escape restore the sheet-entry state while retaining newly completed owner-private media inventory. Save is explicit. A successful local/browser recovery is never labelled as durable private save unless the server state write succeeded. Canonical Work field editing, Collection membership/reorder, permanent deletion, crop/focal transforms, and Advanced Creative depth/free transforms are not implemented in this pass and remain explicit follow-ups.
