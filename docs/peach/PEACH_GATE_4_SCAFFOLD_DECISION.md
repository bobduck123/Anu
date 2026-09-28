# PEACH Gate 4 Scaffold Decision

Status: accepted for Phase 1 foundation

## Decision

Gate 4 moves PEACH from the static Gate 3 proof slice into a Next.js application with TypeScript, App Router pages, server actions, route handlers, and a local file-backed persistence layer for internal development.

This scaffold is intentionally narrow. It supports Field 001, public contribution intake, consent capture, support intent capture, and a steward review surface without introducing commerce, social feed behavior, or generic content-platform primitives.

## Implemented Shape

- Framework: Next.js 15 with React 19 and TypeScript.
- Routing: App Router under `src/app`.
- Public surfaces:
  - `/`
  - `/fields/studying-ourselves`
  - `/fields/studying-ourselves/contribute`
  - `/commons`
- Steward surfaces:
  - `/steward/login`
  - `/steward/contributions`
  - `/steward/fields/studying-ourselves`
- API routes:
  - `GET /api/public/field/active`
  - `POST /api/public/contributions`
  - `POST /api/public/support/intents`
  - `GET /api/steward/contributions`
  - `PATCH /api/steward/contributions/:id/review`
- Local persistence:
  - `.peach-data/contributions.json`
  - `.peach-data/consent-records.json`
  - `.peach-data/support-records.json`

## Why This Scaffold

PEACH Phase 1 needs a production-shaped application boundary before it needs production infrastructure. Next.js gives the project durable routing, typed data contracts, server-only persistence calls, progressive route growth, and a deployable web surface while preserving the current low-complexity Field 001 slice.

The file-backed store is a development substitute only. It proves the submission, consent, steward review, and support-intent contracts before database selection and migration work.

## Alternatives Rejected

- Keep only static HTML: rejected because Gate 4 requires contribution intake, consent persistence, steward review, and support intent capture.
- Generic CMS: rejected because PEACH has Field, Vessel, consent, Commons return, and steward workflow concepts that do not map cleanly to generic posts or pages.
- Ecommerce storefront: rejected because PEACH support is not a cart or product catalog. The support model is membership, one-off support, sponsor access, sponsor Field, and sponsor Yield.
- Social or event platform scaffold: rejected because Phase 1 is not feed-driven, booking-driven, or content-marketing-driven.
- Full database and identity stack now: deferred because Gate 4 is the contract scaffold. Production database, durable auth, rate limits, and legal-grade consent export belong in the next implementation gates.

## Static Slice Status

The previous `site/` directory remains as Gate 3 reference material. The dynamic application now lives in `src/`. Future work should treat `src/` as the active product surface and keep `site/` only as historical scaffold evidence unless explicitly migrated or removed.

## Commands

```powershell
npm install
$env:PEACH_STEWARD_PASSWORD="change-me"
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
npm.cmd run typecheck
npm.cmd run build
```

## Known Stubs

- Production database and migrations.
- Real steward identity, session expiry, CSRF protection, rate limiting, and audit log hardening.
- Payment provider integration.
- Email notifications and contributor follow-up workflows.
- Upload storage and media review.
- Youth-specific guardian and safeguarding flows.
- Multi-Field and multi-Orchard administration.
- Public Commons publication workflow.
