# PEACH Technical Foundation V1

## Purpose

This document recommends the Phase 1 technical foundation for PEACH. It is based on repo inspection on 2026-07-30: the repository currently contains `.git` and `docs/peach/` only. There is no app scaffold, package manifest, database schema, frontend framework, backend, or deployment configuration.

Do not implement the scaffold as part of Gate 2 unless explicitly requested later.

## Framework Assumptions Based On Repo Inspection

Because there is no existing scaffold, Gate 3 should choose the simplest web app foundation that can support:

- public pages for one active Field and Commons;
- steward/admin routes;
- structured Contribution and ConsentRecord writes;
- file uploads or external file references;
- email/update hooks;
- external/manual support links with metadata;
- audit logging.

Recommended default if no broader ANU/Presence app constraints are introduced:

- Next.js or similar React full-stack framework.
- TypeScript.
- Postgres for structured records.
- Object storage for uploaded Contribution files and Yield artifacts.
- Server-side route handlers or API layer for Contribution, admin, support metadata, and Return workflows.
- Role-based auth for stewards/admins.

If the ANU/Presence ecosystem already has a preferred framework, Gate 3 should map PEACH into that stack instead of creating a separate island.

## Frontend Surfaces

Public:

- Home.
- Active Field page.
- Commons page.
- Membership/support page.
- Contribution submission page or modal.
- Gathering detail or RSVP surface.
- About/canon page.

Steward/admin:

- Field editor.
- Vessel manager.
- Gathering manager.
- Tending prompt manager.
- Contribution review queue.
- Consent/credit review.
- Yield editor.
- Commons Return workflow.
- Support transaction/reporting view.

Frontend constraints:

- Do not build storefront, cart, product grid, affiliate bookstore, or social feed.
- Field status should drive visible actions.
- Contribution submission must show consent/review before submit.
- Admin actions that affect public visibility or consent require confirmation.

## Backend/API Needs

Minimum APIs or server actions:

- read active public Field;
- read public Field by slug;
- read public CommonsEntry list/detail;
- submit Contribution and create ConsentRecord;
- submit RSVP or external RSVP metadata;
- record update/signup interest;
- create/update Field, Seed, Soil, Vessels, Gatherings, prompts;
- review Contribution and update review status;
- create/supersede ConsentRecord;
- create/update Yield;
- create/publish CommonsEntry;
- record SupportTransaction metadata;
- create audit event for sensitive/admin actions.

API rules:

- Public reads filter by visibility and status.
- Public writes are limited to contribution, RSVP/signup, and support inquiry/metadata.
- Admin writes require steward/admin role.
- Consent checks must gate publication, Yield release, and Commons Return.

## Auth Assumptions

Phase 1 roles:

- Visitor: unauthenticated public reader.
- Witness/Reader: update subscriber or RSVP participant; no public profile required.
- Contributor: submits Contribution; may be unauthenticated if contact/consent are captured.
- Supporter/Patron: supports PEACH/Field/Yield; no editorial permissions.
- Steward: authenticated operator for one or more Fields.
- Admin: can manage stewards, settings, and all Fields.

Auth recommendation:

- Require auth for steward/admin routes.
- Do not require full account creation for public Contribution in Phase 1 unless the chosen platform makes lightweight accounts simpler and safer.
- Keep contributor identity separate from public profile and supporter identity unless explicitly linked by the user.

## Role Model

| Role | Capabilities |
| --- | --- |
| Visitor | Read public pages and returned Commons entries. |
| Witness/Reader | Receive updates or RSVP where allowed. |
| Contributor | Submit Contributions, choose consent/credit, request withdrawal/correction. |
| Supporter/Patron | Support membership/access/Field/Yield/institutional paths; receive confirmation. |
| Steward | Edit assigned Field, manage Vessels/Gatherings/prompts, review Contributions, manage consent/credit, update Yield, complete Return. |
| Admin | All steward capabilities plus role management, support reporting, system settings. |

## Storage Needs For Contributions

Structured database storage:

- Contribution metadata.
- ConsentRecord.
- Contributor contact/credit.
- Review status.
- Audit events.

Object/file storage:

- uploaded images/audio/files/artworks/archive fragments;
- Yield artifacts;
- optional transcripts or Gathering recordings.

Storage requirements:

- private by default for Contribution files;
- signed/private access for steward review;
- public access only after review and consent;
- file metadata stored with Contribution;
- retention and deletion process for withdrawn material.

## File Upload Needs

Phase 1 accepted upload/link types may include:

- image;
- audio;
- PDF/document;
- archive fragment;
- artwork;
- external video link;
- external file link.

Minimum checks:

- max file size configured;
- allowed MIME types configured;
- virus/malware scan or trusted storage provider scan before steward download;
- private access by default;
- clear contributor statement that they have rights/permission to share;
- youth/sensitive material flag.

## Email/Communications Needs

Minimum emails or equivalent manual confirmations:

- Contribution received and pending review.
- RSVP/access details.
- Support confirmation.
- Steward follow-up for consent Level 6.
- Field update to opted-in participants.
- Yield release/Commons Return notification.
- Takedown/withdrawal acknowledgement.

Phase 1 can use an external email tool if sends are trackable enough for support and consent-sensitive follow-up.

## Payment Provider Decision Points

Gate 2 does not choose or implement payments. Gate 3 should decide:

- external payment links vs native provider integration;
- one-off support vs recurring membership;
- tax/receipt requirements;
- currency and geography;
- refund handling;
- sponsor/invoice workflows;
- webhook reliability and SupportTransaction metadata mapping.

Minimum rule: payment settlement can be manual/external, but support metadata must be stored consistently.

## Analytics Needs

Use privacy-respecting analytics only.

Useful events:

- Field page viewed;
- Vessel opened;
- Gathering RSVP started/completed;
- Contribution started/submitted;
- support path opened/completed externally if knowable;
- CommonsEntry viewed;
- Yield artifact opened/downloaded.

Do not optimize Phase 1 around feed engagement, likes, shares, or retail conversion.

## Audit/Logging Needs

Audit required for:

- Field status/visibility changes;
- Seed revisions;
- prompt changes after submissions;
- Contribution review decisions;
- ConsentRecord creation/supersession/withdrawal;
- credit changes;
- file publication;
- Yield release;
- Commons Return;
- support metadata edits;
- exports;
- admin role changes.

Audit record minimum:

- actor;
- action;
- object type/id;
- timestamp;
- previous state summary;
- new state summary;
- reason, when required.

## Environment Variables Likely Required

Exact names depend on scaffold, but expect:

- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_BASE_URL`
- `STORAGE_BUCKET`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`
- `STORAGE_REGION`
- `EMAIL_PROVIDER_API_KEY`
- `EMAIL_FROM`
- `PAYMENT_PROVIDER_SECRET`
- `PAYMENT_WEBHOOK_SECRET`
- `SUPPORT_NOTIFICATION_EMAIL`
- `ADMIN_INVITE_SECRET`
- `ANALYTICS_KEY`

Payment variables are decision points, not required until payment integration is chosen.

## Security And Privacy Risks

- Private Contributions accidentally exposed publicly.
- ConsentRecord overwritten rather than versioned.
- Level 6 follow-up-required material published too early.
- Sponsor/supporter access to private Contribution data.
- Youth/child material collected without appropriate safeguarding.
- Uploaded files containing malware or private metadata.
- Field updates leaking private material.
- Support/payment reports exposing private financial data.
- Public profiles exposing contributors who chose anonymity.
- Commons Return including material that was withdrawn or not consented.

## Implementation Sequence

1. Confirm scaffold and deployment target.
2. Implement core data model and enums.
3. Implement public read for one active Field.
4. Implement steward auth and Field editing.
5. Implement Vessels/Gatherings/prompts management.
6. Implement Contribution submission with ConsentRecord creation.
7. Implement Contribution review and consent/credit review.
8. Implement support metadata and external/manual support hooks.
9. Implement Yield editor and release checklist.
10. Implement Commons Return workflow.
11. Implement email/update loop.
12. Run internal pilot with non-sensitive test Contributions.
13. Launch one Field.

## Gate 3 Scaffold Recommendation

If no existing ANU/Presence scaffold is provided, create a small TypeScript full-stack app with:

- route structure matching `PEACH_PHASE_1_ROUTES.md`;
- schema matching `PEACH_DATA_MODEL_V1_SPEC.md`;
- auth for steward/admin only;
- public forms for contribution and RSVP/support inquiry;
- private object storage;
- audit logging from the start.

