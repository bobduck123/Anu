# Presence Ecosystem NFC and Relationship Ledger

## NFC / QR Source Tracking

Source examples:

- `/p/joe-electrician?source=nfc-card`
- `/p/joe-electrician?source=van-sticker`
- `/p/joe-electrician?nfc=nfc-card`
- Public API: `POST /api/presence/public/<slug>/nfc-hit`

The frontend `PresenceSourceTracker` reads `source` or `nfc` query params and records a source hit once per browser session/source.

## Anonymous Scan Rule

NFC/QR scans create:

- `presence_interaction` with `interaction_type` `nfc_scanned` or `qr_scanned`
- `presence_analytics_event` for source analytics

NFC/QR scans do not create:

- `presence_connection`
- named contacts
- public profile changes

## Named Connection Rule

Named connection is created only when:

- public enquiry includes contact details
- public quote request includes contact details
- admin manually creates a connection

## Relationship Ledger

Control-only ledger sources:

- NFC scan
- QR scan
- enquiry submitted
- quote requested
- quote sent/approved
- variation requested/approved
- invoice link added
- handover created
- review/referral/manual note extension points

The ledger helps owners remember prior interactions and convert real-world relationships without exposing those records publicly.
