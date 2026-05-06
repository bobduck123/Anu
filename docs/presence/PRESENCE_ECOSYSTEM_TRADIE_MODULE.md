# Presence Ecosystem Tradie Module

The tradie/field-service alpha is a structured public profile and operating foundation, not a full field-service suite.

## Public Experience

- `display_mode`: `tradie_profile` or `field_service_profile`.
- Shows trade profile, service area, services, public credentials/licences, proof ledger, before/after portfolio, quote request form, QR/share/vCard controls.
- Quote request captures job type, suburb/area, urgency, preferred date, description, access notes, budget, contact details, consent, and NFC/QR source.

## Control Experience

- NFC tag manager.
- Relationship Ledger.
- Quote foundation records and line items.
- Variation records.
- Invoice support records for external invoice links/manual accounting.
- Work handover records for before/after, work notes, materials, warranty, customer acceptance.

## Privacy

- Anonymous NFC/QR scans do not create named contacts.
- Named relationship ledger entries are created only after public submitted details or admin entry.
- Ledger, quotes, variations, invoice support, and handovers are never public API fields.

## Future Work

- Customer portal tokens.
- Native job scheduling.
- Native payment processing.
- ServiceM8/Tradify/Fergus/simPRO/AroFlo integration.
- Deeper Xero/MYOB/QuickBooks sync.
- Review/referral automations.
