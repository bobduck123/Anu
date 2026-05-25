# Hosted P0 Re-Smoke Steps

Status: **NOT RUN after the source fix**. Run this after deployment with an authorized owner session.

## Target

- Room ID: `11`
- Slug: `ggm-christina-goddard`
- Owner editor: `/studio/11/editor`
- Owner preview: `/studio/11/editor/preview`
- Public room: `/presence/ggm-christina-goddard`
- RoomKey: `/room/11/key` or the confirmed active hosted RoomKey URL

## Safe Test Procedure

1. Record the current live hero title/copy and take a before screenshot.
2. Log in as the assigned owner and open `/studio/11/editor`.
3. Set the visible title to `HOSTED PUBLISH TEST [YYYY-MM-DDTHH:mm:ssZ]`.
4. Save the draft and capture the saved-state screenshot.
5. In an anonymous window, open the public room and confirm the marker is absent.
6. As the owner, open `/studio/11/editor/preview`.
7. Confirm the draft room renders the marker, shows `Draft preview not public`, and includes `noindex`.
8. In an anonymous window, open the preview URL and confirm it is denied without marker or room details.
9. Return to the owner editor and click the visible primary `Open room to visitors` button.
10. Confirm the dialog says the draft will become the live room; do not proceed if it does not.
11. Click `Open to visitors` and observe the successful owner publish request and success message.
12. Reload the anonymous public room and confirm the marker is now visible.
13. Open the active RoomKey route and confirm it reflects only the published state.
14. Restore the original live title/copy by saving a restoration draft and intentionally opening it to visitors.
15. Reload public room and RoomKey to confirm restoration, then capture cleanup proof.

## Required Captures

- Owner draft saved
- Public before publish
- Owner draft preview
- Anonymous preview denial
- Publish confirmation
- Public after publish
- RoomKey after publish
- Restored public state

## Stop Conditions

- Owner preview still gates.
- Publish button has no visible reason when disabled.
- Confirmation cannot be reached by pointer or keyboard.
- Draft marker appears publicly before publish.
- RoomKey shows draft content before publish.
- Restore step cannot be completed.

