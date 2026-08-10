# PEACH Gate 3 Evidence

## Files Created / Edited

Created:

- `docs/peach/PEACH_GATE_3_SCAFFOLD_DECISION.md`
- `docs/peach/PEACH_PHASE_1_API_CONTRACTS.md`
- `docs/peach/PEACH_PHASE_1_SCHEMA_IMPLEMENTATION_PLAN.md`
- `docs/peach/PEACH_GATE_3_EVIDENCE.md`
- `site/index.html`
- `site/fields/studying-ourselves/index.html`
- `site/fields/studying-ourselves/contribute/index.html`
- `site/commons/index.html`
- `site/data/field-001.js`
- `site/assets/peach.js`
- `site/assets/styles.css`

No existing accepted Gate 0, Gate 1, or Gate 2 docs were rewritten.

## Scaffold Decision

Repo inspection found no existing app scaffold. The repo contained `.git` and `docs/peach/` only.

Gate 3 uses a zero-dependency static first slice under `site/`:

- Home.
- Active Field page.
- Contribution submission page.
- Commons placeholder.
- Shared Field 001 seed data.
- Shared CSS and JavaScript.

Gate 4 should choose and implement the production scaffold, preferably a TypeScript full-stack app such as Next.js unless an ANU/Presence framework is supplied.

## Implemented Routes / Components

Static routes:

- `site/index.html`
- `site/fields/studying-ourselves/index.html`
- `site/fields/studying-ourselves/contribute/index.html`
- `site/commons/index.html`

Shared static assets:

- `site/data/field-001.js`
- `site/assets/peach.js`
- `site/assets/styles.css`

Implemented public read sections:

- Seed.
- Soil.
- Vessels.
- Gatherings.
- Tending prompts.
- Support options.
- Emerging Yield.
- Commons Return plan.

Implemented contribution behavior:

- Consent-first form.
- Contribution type.
- Prompt association.
- Chosen credit.
- Contact method.
- Visibility preference.
- Consent level.
- Yield permission.
- Sensitive material flag.
- Withdrawal acknowledgement.
- Local `pending_review` record in browser `localStorage`.

No submitted Contribution displays publicly.

## Seed Data

Field 001 uses:

"What does a community learn when it studies itself as seriously as institutions study it?"

Seed data includes:

- Field metadata.
- Seed and reason-for-now.
- Soil paragraphs.
- 5 Vessels.
- 2 Gatherings.
- 3 Tending prompts.
- 4 support options.
- planned Yield.
- Commons Return plan.

## What Can Be Run Locally

Because this is a zero-dependency static slice, the pages can be opened directly:

- `site/index.html`
- `site/fields/studying-ourselves/index.html`
- `site/fields/studying-ourselves/contribute/index.html`
- `site/commons/index.html`

Optional local server:

```powershell
python -m http.server 8765 --directory site
```

Then open:

```text
http://localhost:8765/
```

## Commands Used

```powershell
rg --files docs\peach
Get-ChildItem -Force
node --check site\data\field-001.js
node --check site\assets\peach.js
rg -n "Seed|Soil|Vessels|Gatherings|Tending prompts|Support and Yield|Commons Return plan|Consent before use|pending review|No public contribution display|No storefront|No Return is claimed" site
rg -n "bookstore|product grid|cart|affiliate|dropship|social feed|public contribution display" site docs\peach\PEACH_GATE_3_SCAFFOLD_DECISION.md docs\peach\PEACH_PHASE_1_API_CONTRACTS.md docs\peach\PEACH_PHASE_1_SCHEMA_IMPLEMENTATION_PLAN.md
```

## Test Results

- `node --check site\data\field-001.js`: passed.
- `node --check site\assets\peach.js`: passed.
- Required Field section text appears in the static site.
- Contribution page states submissions are review-pending and not public.
- Search found no storefront/cart/social-feed implementation.
- The only commerce-related anti-pattern terms are in explicit prohibitions inside docs.

## Screenshots

No screenshots were captured in Gate 3. This slice is static and was verified through file inspection and syntax/content checks. Browser visual QA should be part of Gate 4 once the production scaffold is selected.

## What Remains Stubbed

- Steward/admin editor.
- Vessel manager.
- Gathering manager.
- Tending prompt manager.
- Contribution review queue.
- Consent/credit review.
- Yield editor.
- Commons Return workflow.
- Support transaction/reporting view.
- Server-side Contribution persistence.
- Server-side ConsentRecord persistence.
- Authentication.
- Payments.
- Email/update loop.
- File uploads.
- Audit log implementation.

## Risks

- Static `localStorage` contribution records are not durable and must not be used for real public launch.
- Without auth, admin routes are intentionally not implemented.
- Without backend storage, consent and support metadata are only specified, not production-enforced.
- Youth/child contribution handling remains deferred and must not be enabled until legal/safeguarding policy exists.
- A final framework decision is still required.

## Pass / Fail Against Gate 3 Requirements

| Requirement | Status |
| --- | --- |
| Clear build direction | Pass. Static slice now; TypeScript full-stack app recommended for Gate 4. |
| Phase 1 technical contracts exist | Pass. `PEACH_PHASE_1_API_CONTRACTS.md`. |
| Schema implementation plan exists | Pass. `PEACH_PHASE_1_SCHEMA_IMPLEMENTATION_PLAN.md`. |
| First active Field read experience implemented or precisely scaffolded | Pass. Implemented in `site/fields/studying-ourselves/index.html`. |
| Contribution/consent protected from public-by-default behavior | Pass. Form records local pending-review only and never displays submissions. |
| Field remains central primitive | Pass. Static pages and data are Field-first. |
| No bookstore/social-feed/event-site/generic CMS drift | Pass. No storefront, cart, social feed, or public unreviewed contribution display. |

## Gate 3 Verdict

Gate 3 passes as a first implementation slice. The repo now has a clear scaffold decision, API contracts, schema implementation plan, and a static active Field read experience that preserves PEACH's canon and consent boundaries.

