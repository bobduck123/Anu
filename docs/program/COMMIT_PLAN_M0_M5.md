# Commit Plan — M0 to M5 (Clean Grouping)

This plan groups changes by milestone so review/rollback remains scoped.

> Run from repo root: `C:/Dev/Flora_fauna`

## 0) Pre-flight

```bash
git status --short
```

---

## 1) Commit M0 — Runtime contracts

```bash
git add \
  .github/workflows/m0-runtime-contracts.yml \
  contracts/health-readiness.contract.schema.json \
  docs/M0_RUNTIME_CONTRACT.md \
  docs/program/M0_QUEUE.md \
  docs/program/M0_COMPLETION_REPORT.md \
  flora-fauna/backend/app/health.py \
  frontend-next/src/app/'(app)'/admin/runtime-health/page.tsx \
  infra/staging/README.md \
  infra/staging/docker-compose.yml \
  scripts/smoke-core-runtime.py \
  scripts/verify-env-contract.py \
  scripts/verify-runtime-contracts.py \
  services/impact-service/src/app.ts \
  services/impact-service/src/falak/domain/schemas.ts \
  services/impact-service/src/falak/routes/registerFalakRoutes.ts \
  services/impact-service/src/routes/index.ts

git commit -m "M0: harden runtime health/readiness contracts and diagnostics"
```

---

## 2) Commit M1 — Shell + lab foundation

```bash
git add \
  .github/workflows/m1-shell-lab-gates.yml \
  docs/program/M1_QUEUE.md \
  docs/program/M1_COMPLETION_REPORT.md \
  frontend-next/src/app/'(app)'/lab/page.tsx \
  frontend-next/src/app/api/sdk/shell-metadata/route.ts \
  frontend-next/src/test/realmRegistryShellMetadata.test.ts \
  frontend-next/src/test/shellMetadataApiRoute.test.ts \
  frontend-next/src/ui-system/realms/realmRegistry.ts \
  frontend-next/src/ui-system/shell/shellMetadata.ts

git commit -m "M1: add canonical /lab route and shell metadata contract"
```

---

## 3) Commit M2 — Primitive consolidation

```bash
git add \
  .github/workflows/m2-primitive-consolidation-gates.yml \
  docs/program/M2_QUEUE.md \
  docs/program/M2_COMPLETION_REPORT.md \
  frontend-next/src/app/'(app)'/home/page.tsx \
  frontend-next/src/app/'(app)'/sandbox/page.tsx \
  frontend-next/src/app/'(app)'/sandbox/ui-lab/page.tsx \
  frontend-next/src/app/'(public)'/contact/page.tsx \
  frontend-next/src/app/api/sdk/shell-primitives/route.ts \
  frontend-next/src/app/auth/page.tsx \
  frontend-next/src/test/primitiveManifest.test.ts \
  frontend-next/src/test/shellPrimitivesApiRoute.test.ts \
  frontend-next/src/ui-system/anu/primitiveManifest.ts \
  frontend-next/src/ui-system/anu/surfacePrimitives.tsx

git commit -m "M2: consolidate ANU primitives and publish primitive manifest APIs"
```

---

## 4) Commit M3 — Chamber rollout

```bash
git add \
  .github/workflows/m3-chamber-rollout-gates.yml \
  docs/program/M3_QUEUE.md \
  docs/program/M3_COMPLETION_REPORT.md \
  frontend-next/src/app/'(app)'/community/microcosms/'[id]'/page.tsx \
  frontend-next/src/app/'(app)'/profile/page.tsx \
  frontend-next/src/app/api/sdk/chamber-metadata/route.ts \
  frontend-next/src/components/teams/TeamsView.tsx \
  frontend-next/src/test/anuSurfacePrimitives.test.tsx \
  frontend-next/src/test/chamberManifest.test.ts \
  frontend-next/src/test/chamberMetadataApiRoute.test.ts \
  frontend-next/src/ui-system/anu/chamberManifest.ts \
  frontend-next/src/ui-system/realms/realmRegistry.ts \
  frontend-next/src/ui-system/shell/shellMetadata.ts

git commit -m "M3: roll out chamber doctrine, metadata, and shared chamber primitives"
```

---

## 5) Commit M4 — Community commons rollout

```bash
git add \
  .github/workflows/m4-community-rollout-gates.yml \
  docs/program/M4_QUEUE.md \
  docs/program/M4_COMPLETION_REPORT.md \
  frontend-next/src/app/'(app)'/community/page.tsx \
  frontend-next/src/app/api/sdk/community-commons-metadata/route.ts \
  frontend-next/src/test/communityCommonsMetadataApiRoute.test.ts \
  frontend-next/src/test/communityManifest.test.ts \
  frontend-next/src/ui-system/anu/communityManifest.ts \
  frontend-next/src/ui-system/anu/surfacePrimitives.tsx \
  frontend-next/src/ui-system/shell/shellMetadata.ts

git commit -m "M4: implement community commons protocol and status-language primitives"
```

---

## 6) Commit M5 — Trust + observatory rollout

```bash
git add \
  .github/workflows/m5-trust-observatory-gates.yml \
  docs/program/M5_QUEUE.md \
  docs/program/M5_COMPLETION_REPORT.md \
  frontend-next/src/app/'(app)'/admin/runtime-health/page.tsx \
  frontend-next/src/app/'(app)'/governance/page.tsx \
  frontend-next/src/app/'(public)'/docs/page.tsx \
  frontend-next/src/app/'(public)'/transparency/page.tsx \
  frontend-next/src/app/api/sdk/observatory-metadata/route.ts \
  frontend-next/src/test/observatoryManifest.test.ts \
  frontend-next/src/test/observatoryMetadataApiRoute.test.ts \
  frontend-next/src/test/observatoryStatsRail.test.tsx \
  frontend-next/src/test/runtimeHealthPage.test.tsx \
  frontend-next/src/ui-system/anu/observatoryManifest.ts \
  frontend-next/src/ui-system/realms/labyrinth/ObservatoryStatsRail.tsx \
  frontend-next/src/ui-system/shell/shellMetadata.ts

git commit -m "M5: normalize trust and observatory surfaces with shared instrumentation"
```

---

## 7) Commit program summaries + aggressive evidence

```bash
git add \
  docs/program/M0_M5_CHANGE_SUMMARY.md \
  docs/program/M0_M5_AGGRESSIVE_MOCKDB_TEST_REPORT.md \
  docs/program/PR_M0_M5_READY_SUMMARY.md \
  docs/program/COMMIT_PLAN_M0_M5.md

git commit -m "docs: add M0-M5 program summary, PR brief, and aggressive test evidence"
```

---

## 8) Final verification (optional before push)

```bash
# quick confidence pass
cd frontend-next && npm run typecheck && npx vitest run src/test/shellMetadataApiRoute.test.ts src/test/observatoryMetadataApiRoute.test.ts && npm run build
```

---

## 9) Push and open PR

```bash
git push origin <your-branch>
```

Use `docs/program/PR_M0_M5_READY_SUMMARY.md` as the PR description body.
