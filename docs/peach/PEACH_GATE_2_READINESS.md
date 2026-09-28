# PEACH Gate 2 Readiness

## Gate 2 Summary

Gate 2 completes the Phase 1 product/data/technical foundation for PEACH.

PEACH remains anchored in the thesis: "PEACH cultivates society's interest in itself." The Field remains the central primitive. Phase 1 remains one excellent Field, not a bookstore, book club, social feed, content platform, event site, or ecommerce storefront.

## What Gate 2 Completed

- Implementation-ready Phase 1 data model in `PEACH_DATA_MODEL_V1_SPEC.md`.
- Clear object relationship map in `PEACH_RELATIONSHIP_MAP.md`.
- Absolute minimum launch schema in `PEACH_PHASE_1_SCHEMA_MINIMUM.md`.
- Public and steward/admin route specification in `PEACH_PHASE_1_ROUTES.md`.
- Core public, contributor, supporter, and steward user flows in `PEACH_PHASE_1_USER_FLOWS.md`.
- Recommended technical foundation in `PEACH_TECH_FOUNDATION_V1.md`.
- Build sequence from scaffold confirmation to public launch in `PEACH_BUILD_SEQUENCE_V1.md`.

## What Is Now Implementation-Ready

- One active Field can be modeled as the root product object.
- Seed, Soil, Vessels, Gatherings, TendingPrompts, Contributions, ConsentRecords, Yield, CommonsEntry, SupportTransactions, and steward/admin ownership are specified.
- Public reads and admin writes are scoped.
- Status and visibility enums are defined.
- Contribution consent must be structured and tied to each Contribution.
- Support can launch through external/manual payment paths while retaining metadata.
- Commons Return has a required structure and gating checks.
- Phase 1 routes and flows are defined enough for product/UI build specification.
- Build milestones define minimum passing requirements and rollback conditions.

## What Remains Unknown

- Final application framework and deployment target.
- Whether PEACH should live inside an existing ANU/Presence app or a new scaffold.
- Payment provider and whether Phase 1 uses external links, invoices, or native checkout.
- Email provider and update subscription mechanism.
- Object/file storage provider and malware scanning approach.
- Jurisdiction-specific privacy, youth, child, and safeguarding requirements.
- Final Field 001 content, steward, maker, launch date, and support amounts.

## Implementation Risks

- Building many Fields before one Field has successfully Returned.
- Treating `Field` as a generic CMS page instead of root object.
- Underbuilding admin/steward workflow and forcing critical decisions into private chat.
- Failing to audit status, consent, review, Yield release, and Return actions.
- Creating UI before data and consent rules are enforced.
- Overfitting to the first Field in ways that block repeatable Field format.

## Legal And Safeguarding Risks

- Youth/child material requires jurisdiction-aware policy before publication.
- Oral histories, images, and archive fragments may carry rights and privacy obligations.
- Contributors need clear withdrawal/takedown language.
- Sensitive prompts can become extractive if not stewarded carefully.
- Guardian consent and participant consent may both be needed for youth-related material.

## Payment Risks

- External/manual payments can create reporting gaps if metadata is not captured.
- Sponsorship language can imply influence if not tightly written.
- Refund/tax/receipt obligations depend on provider and jurisdiction.
- Membership can drift into discount-perk framing if support copy is weak.
- Field/Yield funding restrictions need clear records.

## Consent And Privacy Risks

- Raw ConsentRecords should not be publicly readable.
- Consent should be append-only or versioned; overwriting is unsafe.
- Accepted Contributions must not become public automatically.
- Level 6 follow-up-required material must block publication and Yield use until resolved.
- Sponsor/supporter data must stay separate from contributor private data.
- Public profiles are not needed for Phase 1 and increase exposure risk.

## Gate 3 Focus

Gate 3 should produce the build specification and initial scaffold decision:

1. Confirm whether PEACH maps into an existing ANU/Presence app or starts a new app scaffold.
2. Choose framework, database, auth, storage, email, and payment-support approach.
3. Turn `PEACH_DATA_MODEL_V1_SPEC.md` into technical schema/API contracts.
4. Design the Phase 1 public Field page and admin/steward surfaces.
5. Implement the B0-B3 foundation first: scaffold, static shell, data model, active Field public read.
6. Implement contribution/consent before any public contribution display.
7. Run an internal pilot before public launch.

## Readiness Verdict

Gate 2 passes if the next implementation agent can build the Phase 1 foundation without guessing:

- what a Field is;
- which objects are required;
- how objects relate;
- what must be public or private;
- how consent gates publication and Yield use;
- how support remains values-aligned;
- how Return completes the loop.

This condition is met.

## Final Gate 2 Position

PEACH is ready for UI/product build specification and technical implementation planning. It is not yet ready for public launch, payment implementation, or live contribution collection until Gate 3 turns these specifications into a working scaffold with tested consent, review, and audit behavior.

