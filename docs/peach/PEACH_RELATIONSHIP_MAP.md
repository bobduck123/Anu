# PEACH Relationship Map

## Purpose

This document explains how PEACH objects relate in Phase 1. The map keeps the Field as the central primitive and prevents implementation drift toward books, events, posts, or products.

## Text Diagram

```text
Orchard
  -> Fields

Steward
  -> Field
  -> FieldUpdates
  -> Contribution reviews
  -> Commons Return workflow

Field
  -> Seed
  -> Soil
  -> Vessels
  -> Gatherings
  -> TendingPrompts
  -> Contributions
  -> Yield
  -> CommonsEntry
  -> SupportTransactions
  -> FieldUpdates

Contribution
  -> Contributor
  -> ConsentRecord
  -> TendingPrompt, optional
  -> Yield, only if selected and consented

Yield
  -> Field
  -> selected Contributions
  -> CommonsEntry

SupportTransaction
  -> Field, when supporting a Field
  -> Yield, when supporting a Yield
  -> Membership, when supporting PEACH membership
  -> Access support, when funding participation/access
  -> Patron/Supporter

CommonsEntry
  -> Field
  -> Yield
  -> selected consented Contributions
  -> related or descendant Fields, optional
```

## Required Relationship List

| Relationship | Meaning | Phase 1 implementation note |
| --- | --- | --- |
| Orchard -> Fields | One PEACH Orchard contains the active Field and later returned Fields. | Phase 1 can hardcode/configure one Orchard. |
| Field -> Seed | Every Field has one central intrigue/question. | Can be embedded or separate record, but must be editable and auditable. |
| Field -> Soil | Every Field has context surrounding the Seed. | Minimum one public Soil section. |
| Field -> Vessels | Vessels help participants enter the Field. | 3-5 public Vessels; books are only one possible Vessel type. |
| Field -> Gatherings | Gatherings are interpretive moments tied to the Field. | Minimum two live/digital/async Gathering surfaces. |
| Field -> TendingPrompts | Prompts invite structured Contributions. | 2-3 prompts with consent/review copy. |
| Field -> Contributions | Contributions are consented submissions into a Field. | Must be reviewed before public display or Yield use. |
| Field -> Yield | The Yield is the cultural work produced by the Field. | One planned/released Yield is enough for Phase 1. |
| Field -> CommonsEntry | Returned Field/Yield becomes a Commons entry. | Can be a returned Field page in Phase 1. |
| Contribution -> Contributor | Each Contribution has a person/group credit/contact record. | No public profiles required. |
| Contribution -> ConsentRecord | Each Contribution has versioned consent. | Consent must not be informal/manual only. |
| Yield -> Contributions | Yield may include selected Contributions. | Only selected and consent-compatible material may be used. |
| SupportTransaction -> Field/Yield/Membership/Access support | Support metadata records what money enables. | Payment settlement can be external/manual, metadata cannot be absent. |
| Steward -> Field | Steward owns care, review, publishing, and Return. | Every public Field needs an active steward. |

## Plain-English Explanation

The Orchard is the overall PEACH environment. Phase 1 only needs one Orchard.

The Field is the root product object. A Field has a Seed, Soil, Vessels, Gatherings, TendingPrompts, Contributions, a Yield, a CommonsEntry, updates, and support records. Public pages and admin tools should usually start from `Field`.

A Seed gives the Field its central question. Soil explains the surrounding context. Vessels are source materials that help people enter the Field. A book can be a Vessel, but so can an image, place, song, oral history, document, recipe, or archive fragment.

Contributions belong to a Field and a Contributor. They must have ConsentRecords. Accepted Contributions are not automatically public. Selected Contributions may enter the Yield only if consent allows.

The Yield is what the Field produces. The CommonsEntry is the returned public record of the Field/Yield, including consented material, credits, source trail, future questions, and teaching/resource links where applicable.

SupportTransactions record values-aligned support such as membership, one-off support, sponsor access, Field sponsorship, Yield sponsorship, or commissioned Field inquiry. Supporters never gain editorial control or access to private Contributions.

Stewards operate Fields. They are responsible for editing, review, consent, credits, Yield release, and Commons Return.

