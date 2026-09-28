# PEACH Standalone Status After ANU Migration

Status: historical proof/reference
Date: 2026-07-30
Repo: C:\Dev\PEACH

## Decision

The standalone PEACH repo remains intact as the accepted Gate 0-6 proof, reference implementation, and evidence archive. It is not the production PEACH application target after Gate 7.

## Production Source Of Truth

Future PEACH production work belongs in:

C:\Dev\Flora_fauna

ANU migration docs now live in:

C:\Dev\Flora_fauna\docs\peach

## What This Repo Still Provides

- Gate 0-6 PEACH canon, scope, glossary, anti-patterns, and specs.
- Field 001 proof data.
- Private-staging implementation reference for Field page, contribution intake, consent records, support intents, steward review, audit logging, and local persistence.
- Evidence of why standalone was safe only for private staging.

## What This Repo Must Not Become

- Public PEACH production app.
- Real payment surface.
- Public contribution feed.
- Youth/sensitive-material intake system.
- Bookstore/cart/store implementation.
- Canonical ANU data model.

## Handoff

All PEACH_*.md docs from this repo were imported into ANU docs/peach on 2026-07-30. Future deltas should be made in ANU unless explicitly preserving historical evidence here.
