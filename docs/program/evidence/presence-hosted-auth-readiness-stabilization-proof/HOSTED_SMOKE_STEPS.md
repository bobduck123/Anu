# Hosted Re-Smoke Steps

Run only after this change set is deployed to `https://your-presence.vercel.app`.

## Preparation

1. Record the original public hero title/copy for room `11`.
2. Prepare a unique marker: `HOSTED PUBLISH TEST [timestamp]`.
3. Open an authenticated owner browser context and a separate anonymous context.

## Auth and Warm-Up

1. As owner, open `/studio/11/editor?debug=1`.
2. Confirm the diagnostics panel reports `hosted-auth-readiness-stabilization`.
3. On a cold first load, record any safe retry log, status, and whether the editor recovers.
4. Confirm Canvas loads rather than leaving a stale access/error state.

## Draft Boundary and Preview

1. Edit the hero title to the unique marker and save the draft.
2. In the anonymous context, open `/presence/ggm-christina-goddard`.
3. Confirm the marker is not visible publicly.
4. As owner, open `/studio/11/editor/preview`.
5. Confirm the room renders with the marker and a `Draft preview - not public` label or equivalent.
6. Confirm the page is `noindex`.
7. Open `/studio/11/editor/preview` anonymously.
8. Confirm access is denied and the marker is absent.

## Readiness and Publish

1. Return to the owner editor.
2. Confirm the visible hero image does not trigger `Primary artwork or hero image is missing.`
3. Confirm `Open room to visitors` is enabled, or capture the exact remaining legitimate blocker.
4. Click the visible primary button normally.
5. Confirm a dialog says the draft will become the live room.
6. Click `Open to visitors`.
7. Confirm success feedback and an observed publish network request.

## Public and RoomKey

1. Refresh the anonymous public room and confirm the marker is now visible.
2. Open `/room/11/key`.
3. Confirm it remains operational and exposes only the published state.
4. Scan public HTML for absence of `owner_user_id`, `auth_subject`, `platform_admin`, `internal_lifetime_free`, `preview_token`, and `draft_config`.

## Cleanup

1. Restore the original title/copy in Canvas.
2. Save the restore draft.
3. Preview the restore.
4. Open it to visitors with explicit confirmation.
5. Verify the public room again contains the original title/copy and not the test marker.
6. Record evidence in `CLEANUP.md`.
