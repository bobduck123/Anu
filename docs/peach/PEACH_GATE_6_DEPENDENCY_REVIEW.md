# PEACH Gate 6 Dependency Review

Date: 2026-07-30

## Current Versions

- `next`: `15.5.22`
- `react`: `19.1.0`
- `react-dom`: `19.1.0`
- `better-sqlite3`: `13.0.2`
- `typescript`: `5.8.2`

## Audit Output

`npm.cmd audit --audit-level=high` still reports three high severity vulnerabilities:

- `postcss <=8.5.17`
- `sharp <0.35.0`

Both are transitive through `next`.

## Safe Upgrade Path

No safe automatic upgrade was applied. `npm audit fix --force` still proposes `next@9.3.3`, an obsolete breaking downgrade. Registry version queries for Prisma were attempted during persistence work but hung and were stopped; the Next audit output remains the authoritative local result for this gate.

## Private Staging Impact

The advisories do not block private staging rehearsal if PEACH remains restricted to trusted adult participants, non-sensitive material, no uploads, no public traffic, and no production image pipeline.

## Public Deployment Impact

These advisories block public deployment until a safe Next release/remediation is available and verified, or a formal exception is approved with compensating controls.

## Verification

- `npm.cmd run build`: passed.
- `npm.cmd run typecheck`: passed.
- `npm audit fix --force`: not run.
