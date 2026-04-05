# M0 Runtime Contract (Health + Readiness)

Contract version: `m0.2026-04-01`

This contract standardises runtime truth signals across ANU services so staging and production gates can reason about availability and dependency state consistently.

## Required fields

- `status`: `ok | degraded | not_ready`
- `service`: service identifier
- `component`: `frontend | core | impact`
- `contract_version`: `m0.2026-04-01`
- `timestamp`: ISO-8601 UTC string
- `dependencies`: object containing at least:
  - `database`
  - `redis`
  - `stripe`
  - `postgis`

## Optional fields

- `protocol`
- `version`
- `ready` (boolean)
- `checks` (readiness details)
- `warnings`

## Dependency status vocabulary

- `ok`
- `error`
- `placeholder`
- `skipped`

## Check status vocabulary

- `ok`
- `error`
- `skipped`

## Contract schema

JSON schema source:

- `contracts/health-readiness.contract.schema.json`

## Endpoint mapping

### Core API (Flask)

- `GET /health` (lightweight)
- `GET /readiness` (active dependency probe)

### Impact/Falak API (Fastify)

- `GET /v1/health` (service-level health)
- `GET /v1/falak/health` (operational detail)
- `GET /v1/falak/readiness` (readiness contract)

## CI and local verification

Run runtime contract checks locally:

```bash
python scripts/verify-runtime-contracts.py
```

Run environment contract checks:

```bash
python scripts/verify-env-contract.py
```
