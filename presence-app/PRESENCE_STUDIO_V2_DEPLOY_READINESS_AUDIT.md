# Presence Studio V2 — Deploy Readiness Audit

**Audit date:** 2026-05-31  
**Auditor:** Kimi (security-minded deployment readiness auditor)  
**Scope:** `presence-app/` — secret hygiene, git status, deployment readiness, env vars, local tests  
**Room 11 status:** Converted server-side to Studio V2. Rollback script ready.  
**Policy:** Do not mutate hosted content. Do not broaden rollout.

---

## 1. Secret Hygiene Verdict

### 🔴 CRITICAL FINDING — Credentials Redacted

Hardcoded owner credentials were found in **3 untracked working files**:

| File | Finding | Action Taken |
|------|---------|--------------|
| `scripts/backup-room-11.mjs` | `const EMAIL = "<OWNER_EMAIL>"; const PASSWORD = "<OWNER_PASSWORD>";` | **Redacted** — changed to read from `PRESENCE_E2E_OWNER_EMAIL` / `PRESENCE_E2E_OWNER_PASSWORD` env vars |
| `scripts/get-hosted-token.mjs` | `const EMAIL = "<OWNER_EMAIL>"; const PASSWORD = "<OWNER_PASSWORD>";` | **Redacted** — changed to read from env vars |
| `PRESENCE_STUDIO_V2_ROOM_11_CONVERSION_REPORT.md` | `$env:PRESENCE_E2E_OWNER_EMAIL="<OWNER_EMAIL>"` / `$env:PRESENCE_E2E_OWNER_PASSWORD="<OWNER_PASSWORD>"` | **Redacted** — replaced with `<OWNER_EMAIL>` / `<OWNER_PASSWORD>` placeholders |

### ✅ Safe Items

| Check | Result |
|-------|--------|
| `.env.local` | Gitignored ✅ |
| `.env.presence-controlled-launch.frontend-production.local` | Gitignored ✅ |
| `PRESENCE_E2E_OWNER_PASSWORD` in source | Only referenced as env var name, never a value ✅ |
| `PRESENCE_E2E_OWNER_EMAIL` in source | Only referenced as env var name, never a value ✅ |
| `ROOM11_OWNER_TOKEN` in source | Only referenced as env var name, never a value ✅ |
| Bearer token literals in code | Only variable interpolations (`Bearer ${token}`) ✅ |
| Access tokens in tracked files | None found ✅ |
| Supabase tokens in tracked files | None found ✅ |
| Vercel tokens in tracked files | None found ✅ |
| Test artifacts (`test-results/`) | Clean — only `.last-run.json` with `"status": "passed"` ✅ |
| Log files (`.next-start-*.log`, `debug.log`) | No secrets ✅ |
| Backup JSON files | No secrets — only room data and manifest ✅ |

### 🟡 Password Rotation Recommendation

**RECOMMENDED:** Rotate the owner account password used during this audit.

Rationale: Although the password was only in untracked working files (not committed), it may have been exposed through:
- Shell command history on the local machine
- Agent conversation logs / context windows
- Clipboard during copy-paste operations
- Playwright traces or screen recordings during local test runs

Rotation is a low-cost mitigation against the possibility of exposure beyond the local execution context.

---

## 2. Git Status / Diff Review

### Tracked Modified Files (6)

```
M  PRESENCE_STUDIO_V2_HOSTED_SMOKE.md
M  PRESENCE_STUDIO_V2_LOCAL_QA.md
M  PRESENCE_STUDIO_V2_PHASE_E_HOSTED_SMOKE_REPORT.md
M  lib/presence/studio-v2/feature.ts
M  tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts
M  tsconfig.json
```

**Verdict:** All modified tracked files are safe. The 3 markdown reports contain only env var names, not values. `feature.ts` and the e2e spec contain only code. `tsconfig.json` is a config change.

### Untracked Files (9)

```
??  ../docs/program/evidence/PRESENCE_STUDIO_V2_DESIGN_DIRECTION_AUDIT.md
??  PRESENCE_STUDIO_V2_ROOM_11_CONVERSION_REPORT.md       ← secrets now redacted
??  docs/program/evidence/studio-v2-hosted-room-11-backup/
??  lib/presence/studio-v2/feature.test.ts
??  scripts/backup-room-11.mjs                             ← secrets now redacted
??  scripts/convert-room-11-to-v2.mts
??  scripts/get-hosted-token.mjs                           ← secrets now redacted
??  scripts/restore-room-11-from-backup.mts
```

**Verdict:** None of the untracked files should be committed as-is. The conversion report and scripts are operational tools. The backup directory contains room data snapshots. The design audit is documentation. `feature.test.ts` is a test file that should be considered for commit.

### Files That Should Be Committed Before Deploy

| File | Why |
|------|-----|
| `lib/presence/studio-v2/feature.test.ts` | Unit tests for metadata fallback — part of the feature |

### Files That Should NOT Be Committed

| File | Why |
|------|-----|
| `scripts/backup-room-11.mjs` | Operational script, contains env var patterns |
| `scripts/get-hosted-token.mjs` | Operational script, auth extraction tool |
| `scripts/convert-room-11-to-v2.mts` | One-time conversion script |
| `scripts/restore-room-11-from-backup.mts` | One-time rollback script |
| `PRESENCE_STUDIO_V2_ROOM_11_CONVERSION_REPORT.md` | Operational report |
| `docs/program/evidence/studio-v2-hosted-room-11-backup/` | Backup data — may contain PII |
| `../docs/program/evidence/PRESENCE_STUDIO_V2_DESIGN_DIRECTION_AUDIT.md` | Design audit (external evidence) |

---

## 3. Deployment Readiness — Required Files Verification

| Requirement | File | Status |
|-------------|------|--------|
| Metadata fallback for `renderer_key` | `lib/presence/studio-v2/feature.ts` | ✅ Present — checks `metadata.custom_renderer_key` and `metadata.custom_presence.renderer_key` |
| Feature gating unit tests | `lib/presence/studio-v2/feature.test.ts` | ✅ Present — 8 tests |
| V2 owner editor | `components/presence-studio-v2/PresenceStudioV2Editor.tsx` | ✅ Present |
| V2 public renderer | `components/presence-studio-v2/PresenceStudioV2PublicRoom.tsx` | ✅ Present |
| V2 draft preview bridge | `components/portfolio/PortfolioRenderer.tsx` | ✅ Present — `studioV2Room` prop short-circuit |
| Public payload builder + sanitizer | `lib/presence/render/publicPayload.ts` | ✅ Present — 37 restricted keys, 13 value fragments |
| Bidirectional config adapters | `lib/presence/studio-v2/adapters.ts` | ✅ Present |
| Room 11 conversion report | `PRESENCE_STUDIO_V2_ROOM_11_CONVERSION_REPORT.md` | ✅ Present |
| Room 11 rollback script | `scripts/restore-room-11-from-backup.mts` | ✅ Present |
| Hosted smoke e2e spec | `tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts` | ✅ Present |
| V2 schema + model | `lib/presence/studio-v2/model.ts` | ✅ Present |
| World kits registry | `components/presence-studio-v2/worlds.ts` | ✅ Present |
| Public renderer CSS | `components/presence-studio-v2/presence-studio-v2-public.css` | ✅ Present |
| V2 sanitize | `lib/presence/studio-v2/sanitize.ts` | ✅ Present |

---

## 4. Environment Variable Checklist

### Frontend Vercel Environment Variables (REQUIRED — redeploy needed)

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_PRESENCE_STUDIO_V2` | `1` | Global V2 feature enablement |
| `NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS` | `11` | Comma-separated pilot room IDs |

**These are the ONLY vars that require a frontend redeploy.** `NEXT_PUBLIC_*` vars are baked into the bundle at build time.

### Server-Side / Runtime Environment Variables (OPTIONAL — no redeploy)

| Variable | Value | Purpose |
|----------|-------|---------|
| `PRESENCE_STUDIO_V2_ENABLED` | `1` | Fallback server-side global enable |
| `PRESENCE_STUDIO_V2_PILOT_IDS` | `11` | Fallback server-side pilot list |

These are read by `isPresenceStudioV2GloballyEnabled()` and `isPresenceStudioV2PilotEligible()` at runtime. If only `NEXT_PUBLIC_*` vars are set, the server-side fallbacks are not needed. However, setting both provides defense in depth.

### Local Development / Test Environment Variables (NEVER deploy)

| Variable | Used By | Status |
|----------|---------|--------|
| `PRESENCE_E2E_OWNER_EMAIL` | E2E tests, scripts | Set locally only |
| `PRESENCE_E2E_OWNER_PASSWORD` | E2E tests, scripts | Set locally only |
| `ROOM11_OWNER_TOKEN` | Conversion/restore scripts | Set locally only, runtime only |

---

## 5. Local Test Results

### Typecheck
```
> tsc --noEmit
✅ PASS — 0 errors
```

### Build
```
> next build
✅ PASS — build completed successfully
```

### Unit Tests (Node `--experimental-strip-types`)

| Test File | Tests | Passed | Failed |
|-----------|-------|--------|--------|
| `lib/presence/studio-v2/feature.test.ts` | 8 | 8 | 0 |
| `lib/presence/studio-v2/studioV2Adapters.test.ts` | 14 | 14 | 0 |
| `lib/presence/render/publicPayload.test.ts` | 5 | 5 | 0 |
| `lib/presence/render/resolver.test.ts` | 8 | 8 | 0 |
| `lib/editor/readiness.test.ts` | 5 | 5 | 0 |
| **Unit Total** | **40** | **40** | **0** |

### E2E Tests (Playwright Chromium)

| Test File | Tests | Passed | Failed |
|-----------|-------|--------|--------|
| `presence-studio-v2-public-render.spec.ts` | 3 | 3 | 0 |
| `presence-studio-v2-draft-preview.spec.ts` | 2 | 2 | 0 |
| `presence-public-payload-hygiene.spec.ts` | 2 | 2 | 0 |
| **E2E Total** | **7** | **7** | **0** |

### Combined Total
**47/47 tests passed (40 unit + 7 e2e)**

---

## 6. Deploy Instructions

### Step 1: Commit the test file (optional but recommended)
```bash
git add lib/presence/studio-v2/feature.test.ts
git commit -m "test(studio-v2): add feature gating unit tests for metadata fallback"
```

### Step 2: Set Vercel environment variables
```bash
# Via Vercel CLI or dashboard
vercel env add NEXT_PUBLIC_PRESENCE_STUDIO_V2 production
# Value: 1

vercel env add NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS production
# Value: 11
```

### Step 3: Redeploy frontend
```bash
vercel --prod
```

### Step 4: Verify deployment
```bash
# Confirm env vars are in the build
curl -s https://your-presence.vercel.app | head

# Run hosted smoke
npx playwright test tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium
```

### Step 5: Rotate password (recommended)
- Sign in to the hosted environment as the owner
- Change the account password
- Update local env vars with the new password
- Do not commit the new password

---

## 7. Blockers Assessment

| Blocker | Status | Resolution |
|---------|--------|------------|
| Secrets in working files | ✅ **RESOLVED** | Redacted 3 files |
| Env vars not set on Vercel | ⏳ **PENDING** | Requires manual dashboard/CLI action |
| Frontend redeploy | ⏳ **PENDING** | Blocked on env vars |
| Hosted smoke execution | ⏳ **PENDING** | Blocked on redeploy |
| Password rotation | 🟡 **RECOMMENDED** | Manual action after deploy |

**No code blockers remain.** The repository is safe to deploy once the Vercel env vars are set.

---

## 8. Risk Summary

| Risk | Level | Mitigation |
|------|-------|------------|
| Accidental commit of operational scripts | Medium | All 4 scripts are untracked; add to `.gitignore` if desired |
| Backup data contains PII | Low | Backup dir is untracked and outside commit scope |
| Password exposure in shell history | Medium | Rotate password post-deploy |
| `NEXT_PUBLIC_*` vars expose pilot list | Low | Pilot list is not sensitive (just room IDs) |
| Missing server-side env vars | Low | Frontend vars are sufficient; server vars are fallback only |

---

## 9. Next Command / Pass to Run

**Immediate next step:**

```bash
# In presence-app/ directory, commit the test file, then deploy:
git add lib/presence/studio-v2/feature.test.ts
git commit -m "test(studio-v2): feature gating tests for metadata fallback"
vercel env add NEXT_PUBLIC_PRESENCE_STUDIO_V2 production  # value: 1
vercel env add NEXT_PUBLIC_PRESENCE_STUDIO_V2_PILOT_IDS production  # value: 11
vercel --prod
```

**After deploy succeeds:**

```bash
npx playwright test tests/e2e/presence-studio-v2-hosted-lifecycle.spec.ts --project=chromium
```

**Then:** Rotate the owner password and update local `.env.local`.

---

*Audit complete. Repository is safe to deploy. No secrets in tracked files. 47/47 tests pass.*
