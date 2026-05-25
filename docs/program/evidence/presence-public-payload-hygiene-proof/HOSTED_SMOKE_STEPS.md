# Hosted Smoke Steps

Run after deploying this public payload mapping.

1. Open an anonymous browser session and view source for `/presence/ggm-christina-goddard`.
2. Search the HTML source for every restricted term listed in `results.json`; each must be absent.
3. Log in as the owner and open `/studio/11/editor`.
4. Upload or choose a non-sensitive test image and assign it to a visible draft image.
5. Add a unique marker and alt text, then save the Draft room.
6. Open the anonymous public room and confirm the draft marker/image change is not visible.
7. View source again and confirm restricted terms remain absent.
8. Open private draft preview and confirm the marker/image and alt text are present.
9. Open the room to visitors through the explicit confirmation.
10. Open the anonymous public room and confirm the published marker/image is now visible.
11. View source again and confirm restricted terms remain absent after publish.
12. Open RoomKey and confirm only the published room is visible and no private/internal content is displayed.
13. Restore the original image/title/copy, save, publish cleanup, and confirm the test marker is removed publicly.

Do not use private, confidential or sensitive uploaded media in this smoke because private draft object storage is outside this pass.
