# Studio V3 M1 visual bottom-bar selection

Status: implemented; final capture and visual inspection complete

| Context | Functional visual surface | State cues |
|---|---|---|
| Selected text/image Piece | Edit and Arrange sheets, media thumbnails, registered placement, stepped-size, and per-Piece treatment cards | selected card, `aria-pressed`, placement readout, private override badge |
| Look | Three visual identity/atmosphere miniatures | active/previewing card, compatible Room recommendation, lock state |
| Room Style | Threshold Portal, Gallery Wall, Film Strip composition miniatures | previewing card, Before/After, compatibility accounting, Apply/Cancel |
| Facets | Background, treatment, typography/CTA and motion example cards | active card and immediate private canvas result |
| Library | Canonical Work/Collection cards, Room-native cards, placement summary, Upload/Create cards | source badges, placed/unavailable state, adjacent reason |
| Mobile | wrapped top actions and horizontally scrollable visual cards in modal bottom sheet | reachable Close/Done/Cancel, focus trap/return, no pilot-chip overlap |

Look changes identity and atmosphere. Room Style changes structure and presentation. Structural staging reports preserved locks/overrides and does not silently rewrite the active Look.

Disabled semantic actions are either actual disabled controls with adjacent explanation or focusable `aria-disabled` controls linked to a description. Modal sheets mark the background inert/hidden, trap Tab, close on Escape, and restore focus.

Advanced Creative and crop/focal controls are visibly deferred with reasons. They do not present cosmetic choices that pretend to persist unsupported transforms.

Evidence: screenshots 1, 3, 5-11, 14-15 and the mobile/reduced-motion E2E specs.
