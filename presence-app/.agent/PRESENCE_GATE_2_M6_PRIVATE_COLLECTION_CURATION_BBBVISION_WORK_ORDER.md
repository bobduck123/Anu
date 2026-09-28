# Work Order: Gate 2 M6 - Private Collection Membership / Curation Overlay for BBBVision

Date: 2026-07-27

## Objective

Allow the owner to privately curate one real BBBVision Work into one real BBBVision Collection through V3 Studio without canonical Work mutation, canonical Collection mutation, publish, or public route changes.

## Authoritative Target

- App: `C:\Dev\Flora_fauna\presence-app`
- Backend: `C:\Dev\Flora_fauna\flora-fauna\backend`
- Room: `29`
- Slug: `bbbvision`
- Studio route: `/studio/29/editor`
- Work: `2901`, source ref `work:2901`, canonical title `Opening image`
- Collection: `292`, source ref `collection:292`, canonical title `Gallery Field`

## Required Posture

- Do not use direct canonical Work PATCH/POST.
- Do not use direct canonical Collection PATCH/POST.
- Do not mutate canonical Collection membership.
- Do not publish.
- Do not change public BBBVision output.
- Use the same private V3 overlay model proven in M2/M3/M5.

## Implemented Shape

M6 uses existing private placement metadata:

```json
{
  "placements": [
    {
      "sourceRef": "work:2901",
      "roomId": "gallery",
      "status": "placed",
      "collectionSourceRef": "collection:292"
    }
  ]
}
```

The canonical Work row remains canonically assigned to Collection `291`; the private overlay only says that this placed Work is curated privately as part of `collection:292` for the owner-private Studio projection.

## Evidence

See:

`docs/program/evidence/presence-gate2-m6-bbbvision-private-collection-curation-20260727/`

## Status

Accepted on 2026-07-28 after token-backed real-backend proof against local BBBVision.

The proof saved, reloaded, previewed, and preserved the private Collection curation overlay through compatible rebase. Canonical Works and Collections stayed unchanged, public BBBVision stayed unpublished/non-public, room `1` stayed isolated, and the product UI write ledger contained only owner-private V3 state save and rebase endpoints.
