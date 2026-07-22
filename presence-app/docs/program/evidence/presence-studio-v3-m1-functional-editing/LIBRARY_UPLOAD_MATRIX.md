# Studio V3 M1 Library and upload matrix

Status: implemented; final non-publish backend safety rerun passed

| Capability | Source/read path | M1 state | Write path | Boundary |
|---|---|---|---|---|
| Room-native BBB Pieces | V3 hydration from renderer objects | Enabled and labelled | None unless private override saved | Never fabricated as Works |
| Canonical Works | Authenticated owner Works read | Enabled, inspect/place/unplace | Private V3 metadata only | Canonical row unchanged |
| Canonical Collections | Authenticated owner Collections read | Enabled, inspect/place/unplace | Private V3 metadata only | No synthetic fallback Collection |
| Existing authorized media | Piece/runtime media index | Enabled | Stable ref in private metadata | URL remains runtime-only |
| Upload image | Owner Room media endpoint with `inventory_only=1` | Enabled only when private storage + migration capability are verified | Create owner-scoped `draft_uploaded` media record | No draft attachment/replacement/public change |
| Create Work | Existing canonical API | Disabled with adjacent reason | None | Deferred because canonical mutation may affect the live Library |
| Edit canonical Work fields | Existing canonical API | Deferred | None | M1 edits are presentation overrides only |
| Collection membership/reorder | Existing canonical API | Deferred | None | No presentation override is misrepresented as canonical mutation |
| Permanent Work delete | Existing canonical API | Deferred | None | Requires a separate impact-confirmation contract |

## Upload contract

- accepts JPG/PNG/WEBP within the existing 8 MiB limit after extension/MIME/header validation;
- requires existing owner/Room authorization and rejects anonymous/foreign owner access;
- requires verified private-draft storage and media-record availability;
- returns exact `storage_policy: private_draft_inventory_only`, a private `uploaded_asset`, and an unchanged or null draft;
- never calls draft attachment, draft replacement, canonical Work mutation, publish, or public mutation;
- V3 persists only the stable `media_id`; signed previews stay runtime-only;
- async validation/upload is fenced by upload token, sheet session, load epoch, owner subject and owner partition.

## Truthful unavailable states

If capability checks fail, Upload remains disabled and explains why. Create Work always remains visible but disabled in M1. Hidden/missing sources cannot be newly placed, but a prior private placement can still be unplaced for cleanup.

Remaining limit: a reviewed canonical Library-draft contract is still required before Create/edit/delete Work, Collection membership mutation, or Collection reorder can be enabled.
