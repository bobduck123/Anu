# Cleanup Record

## Local Verification

The automated publish proof used the resettable local mock room and the marker:

`P0 Publish Marker - Local Proof`

No production or hosted Presence room was changed. Local mock state is reset at test start and has no persistent public cleanup requirement.

## Hosted Verification Cleanup Required

Hosted re-smoke must use:

`HOSTED PUBLISH TEST [timestamp]`

Before testing, record the live title/copy. After proof of public publication and RoomKey published-only behavior:

1. Restore the original title/copy in Canvas.
2. Save the restoration draft.
3. Explicitly open the restored version to visitors.
4. Verify public room and RoomKey no longer show the test marker.
5. Capture restored-state screenshot and record timestamp/operator.

Current hosted cleanup status: **NOT APPLICABLE - HOSTED RE-SMOKE NOT RUN**.
