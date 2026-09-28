# PEACH Gate 7 ANU Migration Evidence

Status: evidence recorded
Date: 2026-07-30

## Repositories Inspected

- C:\Dev\PEACH
- C:\Dev\Flora_fauna

## Standalone Evidence

Standalone PEACH contains a Next app with local SQLite durability, checked-in migration scripts, PEACH types, pilot data, private-staging auth, CSRF/same-origin checks, rate limits, steward review scaffolding, consent operation request scaffolding, support intent records, and Gate 0-6 docs.

Gate 6 readiness states the standalone proof is ready for private staging rehearsal only and blocks public deployment because production identity, hosted database, distributed rate limits, consent operation completion, email, uploads, youth/sensitive workflows, public Commons/Yield publication, and Presence/ANU integration remain incomplete.

## ANU Evidence

ANU is a multi-service platform using a single Supabase PostgreSQL database with public and falak schemas:

- flora-fauna/backend: Flask/SQLAlchemy core platform service for public schema;
- services/impact-service: Node/Fastify/Prisma service for impact and Falak surfaces;
- frontend-next: Next.js frontend using Supabase Auth, public app routes, and service proxy/API conventions.

ANU docs define node tenancy, white-label public manifests, control-plane separation, and public node configuration contracts. This is the correct host architecture for PEACH as an ANU vertical.

## Files Imported

All PEACH_*.md files from C:\Dev\PEACH\docs\peach were copied to C:\Dev\Flora_fauna\docs\peach.

## Files Created In ANU

- docs/peach/PEACH_GATE_7_ANU_MIGRATION_DECISION.md
- docs/peach/PEACH_DOCS_IMPORTED_FROM_STANDALONE.md
- docs/peach/PEACH_ANU_PRIMITIVE_MAPPING.md
- docs/peach/PEACH_ANU_DATA_API_SPEC.md
- docs/peach/PEACH_GATE_7_ANU_MIGRATION_EVIDENCE.md
- docs/peach/PEACH_GATE_7_ANU_READINESS.md
- frontend-next/src/data/peach/field001.ts
- frontend-next/src/app/(app)/peach/page.tsx

## Held Work

- No database migrations were added.
- No mutating PEACH API routes were added.
- No public contribution display was added.
- No support/payment checkout was added.
- No upload flow was added.
- No youth or sensitive-material workflow was enabled.
- No Commons/Yield publication workflow was enabled.

## Verification Commands

- rg --files C:\Dev\PEACH
- rg --files C:\Dev\Flora_fauna
- PowerShell reads of ANU service/schema docs and frontend route conventions
- Copy-Item import from standalone docs/peach into ANU docs/peach
- npm run typecheck from C:\Dev\Flora_fauna\frontend-next passed

Typecheck/build verification is recorded in PEACH_GATE_7_ANU_READINESS.md.

