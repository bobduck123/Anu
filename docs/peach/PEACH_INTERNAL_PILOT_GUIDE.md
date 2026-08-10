# PEACH Internal Pilot Guide

Status: Gate 6 private staging rehearsal guide

## Pilot Purpose

The Gate 6 pilot rehearses whether PEACH can open Field 001 in private staging, invite trusted adult participants to contribute non-sensitive material, record consent durably, route submissions to protected steward review, capture manual support intent, record consent operation requests, and simulate Commons Return without public launch.

The pilot tests method, consent handling, steward operations, and support framing. It does not test scale, public growth, payments, youth participation, or sensitive testimony handling.

## Who May Participate

- Trusted adults invited directly by the PEACH steward.
- People who understand this is a local/internal rehearsal.
- People willing to submit non-sensitive test material.
- People comfortable being contacted manually by the steward for follow-up or withdrawal.

Recommended participant count: 5 to 12.

## Who Must Not Participate Yet

- Youth or children.
- People submitting on behalf of youth or children.
- Public visitors.
- Anonymous internet traffic.
- People needing legal, medical, therapeutic, or safeguarding support.
- People intending to submit highly sensitive testimony.

## Data Sensitivity Restrictions

Collect:

- ordinary reflections,
- general questions,
- low-risk memories,
- public or permissioned references,
- non-sensitive archive notes,
- test support enquiries.

Do not collect:

- youth or child contributions,
- trauma testimony,
- legal allegations,
- medical information,
- private third-party material,
- financial details,
- identity documents,
- real payment information,
- files or uploads.

## Pilot Roles

- Witness: reads the Field, notices whether PEACH makes sense, and reports confusion.
- Contributor: submits one non-sensitive contribution with explicit consent settings.
- Steward: reviews contribution and ConsentRecord records, updates review status, and records any operational notes outside the app.
- Supporter: records a manual support intent without payment.

One person may play more than one role during rehearsal, but the steward should review every submitted record.

## Runbook

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set `PEACH_STEWARD_PASSWORD`.
3. Prepare the local staging database in `C:\Dev\PEACH`:

```powershell
$env:DATABASE_URL="file:C:/Dev/PEACH/peach-gate6.db"
npm.cmd run db:prepare
```

4. Start local dev server:

```powershell
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

5. Open `http://127.0.0.1:3000/`.
6. Ask witnesses to read the home page and Field 001.
7. Ask contributors to use `/fields/studying-ourselves/contribute`.
8. Ask supporters to use the support intent form on `/fields/studying-ourselves`.
9. Ask one contributor to test `/consent/request`.
10. Steward logs in at `/steward/login`.
11. Steward reviews `/steward/contributions`.
12. Steward changes each contribution to `held`, `accepted_private`, or `rejected`.
13. Steward confirms audit events and consent operation requests are visible.
14. Steward confirms no contribution appears on the public Field route.
15. Steward records pilot findings in a separate note, not in public pages.

## Participant Scripts

Witness prompt:

```text
Read Field 001. What do you think PEACH is inviting you to do? What feels clear, and what feels ambiguous?
```

Contributor prompt:

```text
Submit one non-sensitive reflection, question, or memory. Do not include private third-party information, youth or child material, trauma testimony, legal allegations, medical information, or anything you would not want a trusted steward to handle during a test.
```

Supporter prompt:

```text
Choose one support path and describe the purpose you would want support to enable. No payment is taken. This is a manual enquiry rehearsal only.
```

Steward prompt:

```text
Review each contribution and consent record. Check whether the contributor's visibility preference, consent level, credit preference, and Yield permission are clear enough to decide what can happen next.
```

## Steward Checklist

- Confirm `.env.local` has a non-default `PEACH_STEWARD_PASSWORD`.
- Confirm public pages load before inviting participants.
- Confirm the steward queue is inaccessible before login.
- Confirm the steward API returns 403 without the header.
- Confirm `.peach-data/` is ignored by git.
- Confirm no uploads or payments are requested.
- Confirm no youth or sensitive material is submitted.

## Contribution Review Checklist

- Contribution type is visible.
- Body is visible only in steward route/API.
- Review status is `pending_review` at creation.
- Visibility preference is visible.
- Sensitive material flag is visible.
- Submitted and updated timestamps are visible.
- Steward can change status.
- Status change does not make anything public.

## Consent Review Checklist

- ConsentRecord exists for each Contribution.
- Consent version is present.
- Consent level is separate from review status.
- Credit preference is visible.
- Visibility preference is visible.
- Permission for Yield is visible.
- Steward review timestamp updates after status change.

## Support-Intent Review Checklist

- Support path is one of membership, one-off support, sponsor access, sponsor Field, sponsor Yield.
- Support purpose is recorded.
- Field/Yield relationship is recorded.
- Status is `manual_enquiry`.
- Response and page copy state no payment is taken.
- There is no cart, checkout, product grid, or fake payment success.

## Evidence To Collect

- Typecheck result.
- Build result.
- Route status checks.
- One contribution API response.
- Matching ConsentRecord proof.
- Steward unauthenticated block proof.
- Steward authenticated listing proof.
- Steward review status change proof.
- Public non-display proof.
- One support intent proof.
- Participant confusion notes.
- Steward operational notes.

## Evidence Not To Collect

- Real sensitive stories.
- Youth or child information.
- Payment details.
- Private third-party details.
- Files or images.
- Medical/legal/therapeutic disclosures.

## Rollback And Reset

For Gate 6 local staging data, stop the dev server and remove the SQLite files in `C:\Dev\PEACH`.

PowerShell:

```powershell
Remove-Item -LiteralPath C:\Dev\PEACH\peach-gate6.db -Force
Remove-Item -LiteralPath C:\Dev\PEACH\peach-gate6.db-shm -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath C:\Dev\PEACH\peach-gate6.db-wal -Force -ErrorAction SilentlyContinue
```

Before deleting, confirm the path resolves to `C:\Dev\PEACH`. The next `npm.cmd run db:prepare` recreates the schema.

## Go/No-Go After Pilot

Go to Gate 6 only if:

- participants understood the Field invitation,
- contributors understood consent choices,
- no public page displayed contribution bodies,
- steward could review and change status,
- support intent remained non-payment,
- no sensitive or youth material was collected,
- audit/security blockers remain documented.

No-go if:

- participants think PEACH is a bookstore, event site, social feed, or Patreon clone,
- contribution bodies appear publicly,
- consent choices are confusing,
- steward review is too error-prone,
- anyone submits sensitive/youth material,
- payments are implied or collected,
- dependency/security risks are ignored.

## Explicit Limits

- No youth or child contribution collection.
- No highly sensitive testimony.
- No public launch.
- No real payments.
- No public contribution display.
