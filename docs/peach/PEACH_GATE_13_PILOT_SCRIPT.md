# PEACH Gate 13 Pilot Script

Date: 2026-07-31

## Pilot mode

Internal trusted-adult pilot script for 3-5 adults.

If real trusted adults are unavailable, this script may be used for a surrogate rehearsal only. Surrogate runs must be marked clearly and must not be described as real human feedback.

## Participant invitation copy

You are invited to a private internal rehearsal of PEACH, a cultural process inside ANU.

PEACH cultivates society's interest in itself. It opens Fields around Seeds of intrigue - questions, memories, books, places, wounds, contradictions or futures - and gathers people to tend them through reading, conversation, research and making. Each Field may later produce cultural works that return to the Commons.

This is not a public launch. It is not a book club, bookstore, ecommerce storefront, social feed, or publishing platform.

The rehearsal should take about 20-30 minutes.

## Safety boundaries

Before beginning, confirm:

- you are an adult;
- you will submit non-sensitive text only;
- you will not submit youth or child material;
- you will not submit sensitive testimony;
- you will not upload files;
- no payment will be taken;
- nothing you submit will be publicly displayed;
- no Commons/Yield release will happen from this pilot;
- a steward may review your submission manually.

Stop if any participant wants to submit sensitive, youth, identifying third-party, crisis, legal, medical, or safeguarding material.

## Field 001 introduction

Field 001 is `Studying Ourselves`.

Seed:

`What does a community learn when it studies itself as seriously as institutions study it?`

Explain:

- A Field is a bounded cultural inquiry.
- A Seed is the question or tension that opens the Field.
- Contributions are private pilot material for steward review.
- A Yield is a later cultural work that might be made from consented material.
- Commons Return is the later act of returning an approved work, method, source trail, or learning back to the community.

## Contribution instructions

Ask the participant to submit one short, non-sensitive Contribution:

- a reflection;
- a question;
- a memory that does not expose sensitive or youth material;
- a research note;
- another small observation.

They must choose:

- visibility preference;
- credit preference;
- consent level;
- whether the material could later be considered for a Yield.

Remind them again:

Nothing is publicly displayed in this pilot.

## Support intent instructions

Ask at least two participants to submit a SupportIntent:

- `membership`;
- `sponsor_access` or `sponsor_yield`.

Say:

This records interest for manual follow-up only. No payment is taken here. No checkout, cart, product grid, or payment screen exists in PEACH.

## Consent operation instructions

Ask at least one participant to submit an export request.

Ask at least one participant or steward to test a withdrawal request.

Say:

These requests are manual steward review requests. They are not automatic export, deletion, publication, or withdrawal actions.

## Post-pilot feedback questions

Ask each participant:

- What do you think PEACH is?
- Did the Seed make sense?
- Did the term Field make sense?
- Did the Contribution step feel meaningful?
- Did consent feel clear or too heavy?
- Did anything feel extractive?
- Did anything feel too abstract?
- Did anything feel too form-like?
- Did SupportIntent make sense?
- Did you understand that no payment was taken?
- Did you understand that nothing is publicly displayed?
- Can you explain how a Yield or Commons Return might later emerge?
- What copy should change?
- What UI should change?
- What should not change?

## Steward script

The steward should:

1. Open `/control/peach`.
2. Confirm unauthenticated access is rejected.
3. Review all pending Contributions.
4. Confirm body, consent, credit preference, visibility preference, and Yield permission are visible only in the protected steward surface.
5. Mark at least one Contribution `held`.
6. Mark at least one Contribution `accepted_private`.
7. Mark at least one Contribution `rejected` or `held` with reason.
8. Confirm `publicDisplay` remains false.
9. Review SupportIntents and confirm `paymentTaken` remains false.
10. Review consent operation requests and update statuses.
11. Record notes for confusion, copy changes, and stop conditions.

## Stop conditions

Stop the pilot if:

- a participant attempts to submit youth or child material;
- a participant attempts to submit sensitive testimony;
- a participant believes payment was taken;
- a participant believes their contribution is public;
- a participant asks for automatic deletion/export beyond the manual process;
- a participant submits third-party identifying material without permission;
- a participant shows distress;
- a steward is unsure whether material is safe to hold.
