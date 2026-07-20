# Hosted Smoke Steps

This pass has local test proof only. Before a friendly pilot uses the wired Canvas, execute these checks against the hosted environment with a designated owner account and a disposable or approved pilot room.

## Preparation

1. Record the live public room title, background appearance, first two work positions, hero image alt text, and invitation label.
2. Confirm the owner account can enter `/studio/{id}/editor` and that a second anonymous session can open the public `/p/{slug}` route.
3. Confirm no unpublished production-sensitive draft is already pending.

## Draft and Preview Boundary

1. Open Studio and confirm Canvas is the default surface with Advanced controls demoted.
2. Edit the visible room title inline; change the heading font and choose Ink Room or Paper Gallery.
3. Change an existing image and add or amend its alt text.
4. Reorder two works through constrained controls.
5. Check that draft save feedback appears.
6. In the anonymous/public session, refresh the public route and verify none of those draft changes are visible.
7. Open full draft preview as the owner and verify all changed visible values match Canvas intent.
8. Verify the preview is labelled as not public and is unavailable without owner authentication.

## Publish and Visitor Surface

1. Use the explicit Open to visitors confirmation; do not publish accidentally from any control adjustment.
2. Refresh the anonymous public room and verify title, selected font/palette, image/alt behavior, and work order.
3. If the room has RoomKey, resolve an active key in a visitor session and verify it reflects the published room only.
4. Check reduced-motion browser preference and confirm motion remains comfortable.
5. Review mobile Canvas selection, bottom sheet, and move buttons on a physical touch device.

## Go / No-Go Evidence

Record screenshots, room ID/slug, operator, date/time, browser/device, publish version, failures, and any restored earlier version. Stop pilot onboarding if any public draft leak, RoomKey draft leak, unsaved loss, broken image, inaccessible control, or Canvas/preview/public published mismatch is observed.
