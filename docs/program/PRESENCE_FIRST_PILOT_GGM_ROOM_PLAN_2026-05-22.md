# Presence First Pilot GGM Room Plan

Date: 2026-05-22  
Pilot code: `ggm`  
Stage: first controlled-launch pilot proof

## Integration Model

Keep `C:\Dev\ggm` as the external public artist portfolio. Create a tagged
Presence Room as the controlled-launch storefront and NFC/QR entry layer. This
proves pilot onboarding without rewriting or moving the GGM site.

## Room Model

| Field | Plan |
|---|---|
| Pilot name | GGM / Christina Kerkvliet Goddard |
| Room title | Christina Kerkvliet Goddard |
| Room slug | `ggm-christina-goddard` |
| Room type | Artist studio Room |
| Owner account | Tagged first-pilot owner record until the confirmed pilot owner auth handoff |
| Public description | Watercolour works across memory, colour, and lived landscape |
| Hero/media references | Reuse GGM selected work imagery only after asset ownership and hosted URL path are confirmed |
| External site CTA | Existing GGM portfolio site remains the full archive destination |
| Enquiry destination | Existing GGM contact path must be confirmed per pilot before active Presence forwarding is promised |
| Tags | `controlled_launch_pilot`, `pilot_code=ggm`, `pilot_stage=first_pilot`, `environment=hosted_controlled_launch`, `created_by=presence_first_pilot_onboarding` |
| NFC/QR RoomKey | Enabled for first-pilot proof |
| Owner analytics | Enabled and verified from owner Room analytics and Presence Node analytics |
| Rollback owner | Controlled-launch operator with pilot owner notification duty |

## Scope Decisions

| Surface | Decision | Reason |
|---|---|---|
| GGM external site | Keep separate | Existing static portfolio is the client source site and should not be rewritten for onboarding proof. |
| Presence Room | Enable | Room public route and RoomKey prove living business card entry. |
| Enquiries | Verify per Room | GGM source currently exposes a direct contact path; Presence forwarding must be explicitly configured or kept in capture-only/disabled posture. |
| Halls | Defer by default | GGM first-pilot proof needs Room, RoomKey, enquiry, and analytics before Hall scope. |
| Mood Board/Garden discovery | Defer by default | Observer discovery is not required for the first pilot Room entry proof. |
| Paths | Defer by default | Enable only after a GGM Path use case is agreed. |
| World/V2 | Hidden/forming only | Controlled launch does not expose World or promise V2. |

## Setup Flow

1. Run `backend/scripts/setup_presence_pilot_ggm.py --dry-run` against the intended DB target.
2. Confirm the owner identity, Room slug, public copy, external CTA, enquiry routing posture, support owner, and rollback authority.
3. Run `--apply` only for the intended environment. The setup writes secret RoomKey and owner-token handoff values to an ignored local env file and writes IDs/slugs only to evidence JSON.
4. Run enquiry, RoomKey, owner analytics, and combined post-onboarding smoke.
5. Attach evidence before handing a QR/NFC payload to the pilot.

## Record Tagging Contract

```json
{
  "controlled_launch_pilot": true,
  "pilot_code": "ggm",
  "pilot_stage": "first_pilot",
  "environment": "hosted_controlled_launch",
  "created_by": "presence_first_pilot_onboarding"
}
```

## Pre-Apply Questions

- Confirm the actual pilot owner who will receive Studio access.
- Confirm whether Presence enquiry routing is active for the pilot or remains disabled while the external GGM contact path is used.
- Confirm the first QR/NFC batch label and where the payload will be tested.
- Confirm that the GGM public copy and artwork references are approved for a Presence Room.
