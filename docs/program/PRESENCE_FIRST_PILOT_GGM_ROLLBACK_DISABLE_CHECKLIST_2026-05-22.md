# Presence First Pilot GGM Rollback And Disable Checklist

Date: 2026-05-22  
Pilot code: `ggm`

## Disable Sequence

1. Confirm rollback authority, pilot notification owner, and reason.
2. Disable public GGM Presence Room by changing visibility/public status through the approved owner or control path.
3. Revoke active GGM RoomKey tokens for NFC, QR, and direct entry.
4. Disable Presence enquiry forwarding for the Room or keep the route in explicit disabled-state handling.
5. Archive or hide any GGM pilot Hall if one was enabled.
6. Hide or remove the pilot from beta gallery/public discovery if it was listed.
7. Remove or disable owner Studio access only when the access issue requires it.
8. Preserve analytics, setup results, smoke JSON, and incident evidence.
9. Preserve audit trail of records and deployment/env changes.
10. Notify the pilot owner with the current external-site behavior and support path.
11. Restore previous external GGM site behavior when any link or handoff was altered.
12. Roll back deployment only when a deployment regression caused the incident and DB compatibility is confirmed.
13. Smoke the disabled state before closing rollback.
14. Record the re-enable path if the pilot resumes.

## Rollback Smoke Checklist

- [ ] Disabled Room is not public when hidden.
- [ ] Revoked RoomKey returns a safe disabled/revoked response.
- [ ] Enquiry route is disabled or answers with intentional safe state.
- [ ] Owner access behaves as the rollback decision requires.
- [ ] Evidence remains accessible to operators.

## Re-Enable Path

1. Reconfirm owner, support, enquiry routing, and Room copy.
2. Re-enable or republish the Room through approved control path.
3. Issue new RoomKey tokens when revoked tokens were distributed.
4. Re-run GGM RoomKey, enquiry, owner analytics, and post-onboarding smoke.
