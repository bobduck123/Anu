# GGM Hosted Route Canonicalisation

Date: 2026-05-23

## Decision

The hosted canonical public Room slug remains:

```text
ggm-christina-goddard
```

The canonical NFC and QR entry remains the real hosted RoomKey route. The short
local demo slug `ggm` was not promoted to a hosted alias in this pass. Keeping
the stable hosted Room slug avoids introducing a second public Room identity
while the operator reviews the first pilot.

## Hosted checks

| Check | Result |
|---|---|
| Hosted public Room ID | `11` |
| Hosted public Room slug | `ggm-christina-goddard` |
| `/p/ggm-christina-goddard` | `200` |
| `/presence/ggm-christina-goddard` | `200` |
| `/p/ggm` | `404` |
| `/presence/ggm` | `404` |
| Invalid `/p/ggm-hosted-invalid-cutover-slug` | `404` |
| Public list GGM/Christina matches | one public match, Room `11` |
| Real RoomKey resolve | resolves Room `11` and slug `ggm-christina-goddard` |

## Renderer dispatch

The hosted public API now returns explicit public renderer metadata for Room
`11`. The hosted browser smoke confirmed the canonical public page and real
RoomKey page render the faithful GGM Room and reject the old generic gallery
HUD copy. Signature fallback is no longer required for the canonical hosted
Room.

## Future alias rule

If the operator wants `/p/ggm`, add alias support through the normal Room
routing model and redirect it to the canonical slug. Do not create a second
active GGM Room for the alias.
