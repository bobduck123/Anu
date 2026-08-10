# PEACH Gate 12 Staging Mode Decision

Date: 2026-07-31

## Decision

Use staging-equivalent PostgreSQL for Gate 12 because hosted PEACH staging credentials were not available locally.

## Database target

`postgresql://postgres:***@127.0.0.1:55432/peach_gate12_stage`

Host container:

`presence-contract-postgres`

PostgreSQL version observed:

`PostgreSQL 16.13`

## Backend target

ANU Flask backend app configured by the Gate 12 rehearsal script to use the disposable PostgreSQL database.

The rehearsal used the backend routes directly through a Flask test client so contribution creation, consent record persistence, steward control protection, steward review, support intent creation, consent operation updates, audit logging, and database constraints could be verified against PostgreSQL.

## Frontend target

Local Next server:

`http://localhost:3333`

Command:

`npm run dev -- -p 3333`

## Why this satisfies Gate 12 fallback

The Gate 12 instruction allowed staging-equivalent PostgreSQL if real staging infrastructure was unavailable, provided the hosted staging hold was documented. This run uses that fallback and records the hosted gap explicitly.

## What remains for Gate 13

Gate 13 should run the same rehearsal on actual hosted private staging with:

- hosted frontend and backend URLs;
- hosted PostgreSQL credentials;
- deployed migrations;
- real hosted control-plane secret/token flow;
- captured hosted route/API and screenshot evidence.
