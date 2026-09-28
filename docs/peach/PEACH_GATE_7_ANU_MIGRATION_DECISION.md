# PEACH Gate 7 ANU Migration Decision

Status: accepted for ANU migration
Date: 2026-07-30
Repos reviewed: C:\Dev\PEACH and C:\Dev\Flora_fauna

## Decision

PEACH moves into ANU as a first-class ANU vertical. The standalone PEACH app at C:\Dev\PEACH is retained as historical proof, Gate 0-6 evidence, and implementation reference only. It is no longer the intended production application surface.

The ANU source of truth is C:\Dev\Flora_fauna. PEACH documentation, primitive mapping, data/API decisions, and future implementation work now live under docs/peach in the ANU repo.

## Rationale

Gate 6 proved that PEACH can express a stewarded Field, contribution consent, support intent, audit logging, private staging authentication, and local durability. It also proved the standalone architecture is not sufficient for production because it relies on local SQLite, private-staging auth, in-memory rate limits, and incomplete hosted consent operations.

ANU already has the primitives PEACH needs to mature safely:

- node tenancy and public node semantics;
- Supabase Auth and RLS-facing frontend conventions;
- public core tables for users, nodes, events, actions, articles, comments, audit logs, and consent records;
- impact-service and Falak surfaces for governance, provenance, contribution, approval, allocation, and ledger work;
- frontend vertical-route conventions for public-readable program surfaces.

## Production Boundary

Gate 7 does not authorize public launch. It does not authorize real payments, public contribution display, youth or sensitive-material collection, open uploads, bookstore/cart/feed behavior, or a public Commons/Yield release.

## Migration Shape

PEACH becomes an ANU vertical with these phase boundaries:

- Gate 7: import accepted docs, map primitives, add a read-only ANU PEACH Field 001 route, and document held backend/API work.
- Gate 8: implement ANU-native persistence, identity, role separation, consent operations, request limits, and private-staging allowlisting.
- Later gates: activate steward workflows, reviewed contribution display, support flows, Yield/Return publication, and Commons archive behavior only after safety review.

## Implementation Decision

The smallest safe implementation slice is a read-only ANU frontend route at /peach backed by static PEACH Field 001 data inside frontend-next. This proves PEACH can sit inside ANU without introducing intake, payment, publication, or database migrations before the API and consent model are finalized.

Backend migrations, mutating APIs, contribution intake, support intent intake, steward review, and consent operation workflows are held for Gate 8.

## Verdict

VERDICT: ACCEPT GATE 7 ANU MIGRATION / BEGIN GATE 8
