# PEACH Build Sequence V1

## Purpose

This document defines the Phase 1 build sequence. It uses gates/milestones so PEACH can move from canon/spec to a launchable product without losing the Field primitive.

## Milestones

| Milestone | Goal | Required files/surfaces | Minimum passing requirements | Tests/evidence | Rollback/failure conditions |
| --- | --- | --- | --- | --- | --- |
| B0 repo/app scaffold confirmation | Decide whether PEACH maps into an existing ANU/Presence app or needs a new scaffold. | Repo inspection; framework decision note; package/app skeleton only if approved. | Framework, deployment target, database/storage/auth direction chosen. | `rg --files`; package/app config reviewed; written scaffold decision. | Hold if existing ANU/Presence constraints are unknown or conflict. |
| B1 static canon/public shell | Publish basic PEACH shell without pretending full functionality exists. | Home; About/canon; support placeholder; active Field placeholder. | Public copy preserves thesis and Field primitive; no shop/feed/events homepage. | Screenshot/manual review; canon phrases present; anti-pattern check. | Roll back if page reads as bookstore, content site, or events site. |
| B2 Field data model | Implement Phase 1 structured records. | Schema/models for Field, Seed, Soil, Vessel, Gathering, TendingPrompt, Contribution, Contributor, ConsentRecord, Steward, Yield, CommonsEntry, SupportTransaction, audit. | Required enums and validations exist; books are Vessel type only. | Unit/schema validation; sample Field seed data. | Hold if Contribution consent is not structured. |
| B3 active Field public read | Render one active Field from data. | `/fields/[fieldSlug]`; public read API/query; status-aware sections. | Seed, Soil, Vessels, Gatherings, prompts, support, Yield, steward, Return plan render. | Browser/manual QA; data fixture test. | Roll back if public page exposes hidden/internal data or lacks Return plan. |
| B4 steward Field edit | Let steward operate Field content. | Field editor; Vessel manager; Gathering manager; prompt manager; auth/roles; audit. | Steward can edit required Field objects and preview/publish status. | Auth test; status transition test; audit event evidence. | Hold if unauthenticated writes possible or status transitions are free text. |
| B5 Gatherings/RSVP | Support interpretive Gathering entry. | Gathering detail/RSVP surface; manager; confirmation. | User can RSVP or access external RSVP; Gathering tied to Field purpose. | Form test; cancellation/empty state test. | Roll back if Gatherings become detached event platform. |
| B6 Contributions/consent | Enable safe Tending. | Contribution form/modal; ConsentRecord creation; review queue; consent/credit review. | Every Contribution creates ConsentRecord; no public display before review. | Form validation; Level 6 block test; review status test. | Hold if consent is informal/manual only or unreviewed posts can appear public. |
| B7 support/membership hooks | Add values-aligned support metadata. | Support page; Field support block; SupportTransaction/reporting; external/manual payment links. | Support paths exist; metadata captured; no editorial influence language. | Manual transaction record test; support confirmation copy review. | Roll back if storefront/affiliate commerce appears or metadata is missing. |
| B8 Yield/Commons Return | Complete the cultural production loop. | Yield editor; release checklist; Commons Return workflow; `/commons`. | Yield can be released; CommonsEntry published only after consent/credit checks. | Checklist test; private Contribution exclusion test; Commons page QA. | Hold if Return can publish unconsented/private material. |
| B9 email/update loop | Communicate progress without leaking private material. | FieldUpdate; email/manual update path; confirmation templates. | Contribution, RSVP, support, updates, and Return confirmations have a send path. | Template review; opt-in/unsubscribe check if automated. | Roll back if emails expose private Contribution/support data. |
| B10 internal pilot | Run the full Field lifecycle with internal/test participants. | All Phase 1 routes and admin workflows. | One test Field moves Draft -> Returned with test Contributions and support metadata. | End-to-end checklist; audit log; privacy review; rollback drill. | Hold launch if any consent, visibility, or Return blocker appears. |
| B11 public launch | Launch one excellent Field. | Production deployment; active Field; support; contribution; admin monitoring. | One Field is live, stewarded, supportable, contributable, and Return-ready. | Production smoke test; steward runbook; backup/export check. | Roll back if public page fails anti-pattern test or contribution safety fails. |

## Gate Dependencies

- B2 must precede B3-B8.
- B6 must precede any public display of Contributions.
- B8 must not proceed without B6 consent records.
- B7 can use external payments but must record support metadata.
- B10 must complete before B11.

## Evidence Checklist

By launch, collect:

- public Field screenshot or equivalent QA proof;
- admin Field editor proof;
- Contribution submission and review proof;
- ConsentRecord proof;
- support metadata proof;
- Yield release checklist;
- Commons Return checklist;
- audit log sample;
- anti-pattern review.

