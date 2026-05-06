# Presence Nodes QA Acceptance

## Backend Acceptance

Covered by `flora-fauna/backend/tests/test_presence_nodes.py`:

- create node
- create Basic Node
- create Premium/Practitioner Node
- create Artist Presence Node
- edit node
- publish node
- unpublish node
- public published node visible
- unpublished/private/suspended/archived hidden publicly
- slug uniqueness
- tenant scoping
- owner/admin access paths
- unauthorised control access blocked
- enquiry submission
- enquiry spam honeypot baseline
- enquiry status update
- template fetch
- selected works create/update/hide
- collections create/update/hide
- analytics event capture
- vCard route
- QR route

## Frontend Acceptance

Covered by `frontend-next/src/test/presenceNodes.test.tsx`:

- public page renders profile, organisation, availability, services, portfolio, share, vCard, and enquiry controls
- Basic, Premium/Practitioner, Artist Gallery, and Minimal Portal display modes render with different public layouts
- missing/unpublished public node returns not found
- enquiry form validation and success state
- editor loads existing data and saves changes
- editor supports portal settings, statements, selected works, and collections
- publish controls run
- admin list filters run

## Manual Smoke

Run `scripts/presence_nodes_smoke.py` against a local or hosted backend with a valid control token. The script verifies:

1. create node
2. publish node
3. view public node
4. submit enquiry
5. view enquiry in control API
6. update enquiry status
7. create collection
8. create selected work
9. confirm artist/gallery public payload includes collection and work
10. fetch vCard and QR
11. unpublish node
12. confirm public node is hidden

## Residual Risks

- Full scanner acceptance for QR should be added before open signup.
- Visual regression screenshots should be captured once a stable pilot node and production media assets exist.
- Dedicated organisation model integration remains future work.
