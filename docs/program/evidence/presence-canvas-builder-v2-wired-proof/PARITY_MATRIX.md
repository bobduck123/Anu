# Canvas Builder V2 Parity Matrix

Status values: `live` means wired through the shared model and backed by the visitor renderer; `hidden` means not offered as a usable owner control; `advanced` means retained outside the normal Canvas path.

| Control or block | Canvas draft visible | Full preview visible | Public after publish | Public before publish unchanged | RoomKey impact | Mobile support | Reduced-motion support | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Room title inline edit | Yes | Yes | Yes | E2E verified | None | Existing bottom sheet/edit flow | N/A | live |
| Statement and visible copy edit | Yes | Yes | Yes | Draft lifecycle enforced | None | Existing bottom sheet/edit flow | N/A | live |
| Heading/body font choice | Yes | Yes | Yes | Draft lifecycle enforced | GGM room typography only | Select controls are touch usable | N/A | live |
| Room background/text/accent palette | Yes | Yes | Yes | E2E verified for background | GGM room palette only | Colour inputs available | N/A | live |
| Paper Gallery / Ink Room option packs | Yes | Yes | Yes | E2E verified for Ink Room | None | Button controls available | Presets do not enable heavy motion | live |
| Gallery wall layout | Yes, current layout identified | Yes | Yes | Draft lifecycle enforced | None | No freeform placement | N/A | live |
| Alternative gallery layouts | No | No | No | Yes | None | No | N/A | hidden |
| Work-wall constrained reorder | Yes | Yes | Yes | Existing lifecycle test | None | Move up/down fallback | N/A | live |
| Image selection from existing room images | Yes | Yes | Yes | Existing lifecycle test | None | Existing bottom sheet flow | N/A | live |
| Alt text edit | Yes | Yes | Yes | Existing lifecycle test | None | Existing bottom sheet flow | N/A | live |
| Motion Still / Gentle / Living | Yes | Yes | Yes | Draft lifecycle enforced | None | Button controls available | Runtime preference honored | live |
| Heavy or immersive motion | No normal-owner control | Resolver caps unconfirmed high input | Resolver caps unconfirmed high input | Yes | None | No | Runtime preference honored | hidden |
| Invitation label | Yes | Yes | Yes | Draft lifecycle enforced | None | Existing text edit flow | N/A | live |
| RoomKey visitor copy and entry | Resolver supports draft/published separation | Supported when present | Published only; guest action overlay retained | Unit/backend/browser boundary verified | Direct | Visitor panel is touch usable; normal Canvas copy control deferred | N/A | advanced |
| Widget library listing | Existing live blocks shown | No output change | No output change | Yes | None | Drawer opens on touch | N/A | live |
| Add new widget/block | No | No | No | Yes | None | No | N/A | hidden |

## Tested Owner Path

The V2 Playwright path edits the title, changes its font, changes room background, applies Ink Room, proves the public title remains unchanged before publish, opens the gallery controls, exercises work reorder, opens the full draft preview, publishes intentionally, and proves public title and pack background after publish. The existing direct-manipulation Playwright path covers image choice, alt text, readiness handling, mobile inspector, and intentional publish.
