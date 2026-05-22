# Presence First Pilot Onboarding Checklist

Date: 2026-05-22  
Use: reusable controlled-launch onboarding checklist for the first pilot and later supervised pilot Rooms

## Pre-Onboarding

- [ ] Confirm pilot owner and operator.
- [ ] Confirm Room name, slug, type, and public visibility.
- [ ] Confirm public copy and any claims that will appear live.
- [ ] Confirm images/assets and usage rights.
- [ ] Confirm enquiry destination or intentional disabled posture.
- [ ] Confirm support owner and support contact path.
- [ ] Confirm rollback authority.
- [ ] Confirm pricing/package note when applicable.

## Technical Setup

- [ ] Create or verify owner account.
- [ ] Create or verify Presence Room with controlled-launch pilot tags.
- [ ] Create or verify active RoomKey.
- [ ] Create or verify QR target and physical NFC payload route.
- [ ] Create or verify per-Room enquiry configuration.
- [ ] Create or verify owner analytics access.
- [ ] Record Hall status if used or deferred.
- [ ] Record Path status if used or deferred.

## Smoke Tests

- [ ] Public Room loads for a guest.
- [ ] RoomKey resolves from the canonical RoomKey route.
- [ ] NFC/QR simulated entry opens the Room.
- [ ] Invalid and revoked RoomKey paths fail safely when supported.
- [ ] Enquiry route accepts a safe test or proves intentional disabled state.
- [ ] Owner analytics reflects pilot interactions without private identity leak.
- [ ] Garden/Observer save works if enabled.
- [ ] Path route works if enabled.
- [ ] World remains hidden/forming and does not promise V2.

## Pilot Launch

- [ ] Share pilot public URL.
- [ ] Share tested QR/NFC payload or test asset.
- [ ] Confirm owner can access Studio and analytics.
- [ ] Confirm support process and response owner.
- [ ] Confirm incident process.

## Post-Launch

- [ ] Check backend and frontend logs.
- [ ] Check Room analytics after first controlled interactions.
- [ ] Collect owner and visitor feedback.
- [ ] Record issues and containment actions.
- [ ] Decide continue, rollback, or iterate.

## Rollback

- [ ] Disable Room or remove public visibility.
- [ ] Revoke RoomKeys for NFC/QR entry.
- [ ] Hide or unpublish pilot surface.
- [ ] Disable enquiries or forwarding.
- [ ] Archive Halls when used.
- [ ] Preserve evidence and audit trail.
