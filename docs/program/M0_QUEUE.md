# M0 Queue — Runtime Truth and Contract Repair

Status legend:
- `DONE` completed in this implementation pass
- `N/A` not required for M0 closure in this pass

## Queue

| ID | Task | Owner | Status | Evidence |
|---|---|---|---|---|
| A0-001 | Define canonical health/readiness contract | PLAT | DONE | `contracts/health-readiness.contract.schema.json`, `docs/M0_RUNTIME_CONTRACT.md` |
| A0-002 | Conform core `/health` + `/readiness` to contract fields | CORE | DONE | `flora-fauna/backend/app/health.py` |
| A0-003 | Conform impact `/v1/health`, `/v1/falak/health`, `/v1/falak/readiness` to contract fields | IMPACT | DONE | `services/impact-service/src/falak/routes/registerFalakRoutes.ts` |
| A0-004 | Add frontend runtime diagnostics surface | FE | DONE | `frontend-next/src/app/(app)/admin/runtime-health/page.tsx` |
| A0-005 | Add environment contract validator | PLAT | DONE | `scripts/verify-env-contract.py` |
| A0-006 | Add CI runtime contract gate workflow | PLAT | DONE | `.github/workflows/m0-runtime-contracts.yml` |
| A0-007 | Create OSS container staging baseline | PLAT | DONE | `infra/staging/docker-compose.yml`, `infra/staging/README.md` |
| A0-008 | Add core runtime smoke validation script | CORE/PLAT | DONE | `scripts/smoke-core-runtime.py` |
| A0-009 | Add runtime contract endpoint verifier script | PLAT/SECQA | DONE | `scripts/verify-runtime-contracts.py` |

## Completion criteria for this queue

- Contract definition exists and is versioned
- Core + Impact expose required contract fields
- CI can run type/build/smoke checks
- Local staging stack can be started with OSS services
- Runtime diagnostics available in frontend admin
