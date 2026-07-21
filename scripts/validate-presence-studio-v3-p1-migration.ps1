$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$project = "presence-v3-p1-migration-validation"
$service = "presence-contract-postgres"
$database = "presence_contract_local"
$composeFile = Join-Path $repoRoot "flora-fauna\docker-compose.presence-contract.yml"
$migrationPath = (Join-Path $repoRoot "flora-fauna\backend\migrations\versions").Replace("\", "/")
$overrideFile = Join-Path $PSScriptRoot "presence-studio-v3-p1-migration.compose.yml"
$env:PRESENCE_V3_P1_MIGRATIONS = $migrationPath
$composeArgs = @("--project-name", $project, "--file", $composeFile, "--file", $overrideFile)

function Assert-NativeSuccess([string]$label) {
    if ($LASTEXITCODE -ne 0) {
        throw "$label failed with exit code $LASTEXITCODE"
    }
    Write-Host "PASS: $label"
}

docker info | Out-Null
Assert-NativeSuccess "Docker daemon"
docker image inspect postgres:16 | Out-Null
Assert-NativeSuccess "Local postgres:16 image"

$existingContainers = @(docker ps -aq --filter "label=com.docker.compose.project=$project")
Assert-NativeSuccess "Container preflight"
$existingVolumes = @(docker volume ls -q --filter "label=com.docker.compose.project=$project")
Assert-NativeSuccess "Volume preflight"
$existingNetworks = @(docker network ls -q --filter "label=com.docker.compose.project=$project")
Assert-NativeSuccess "Network preflight"
if ($existingContainers.Count -or $existingVolumes.Count -or $existingNetworks.Count) {
    throw "Refusing to reuse Docker resources for $project"
}

$resolved = @(docker compose @composeArgs config)
Assert-NativeSuccess "Disposable Compose resolution"
$resolvedText = $resolved -join "`n"
if (
    $resolvedText -match "presence_contract_pgdata" -or
    $resolvedText -match "(?m)^\s+container_name:" -or
    $resolvedText -match "(?m)^\s+ports:" -or
    $resolvedText -notmatch "type: tmpfs"
) {
    throw "Disposable override retained persistent or colliding configuration."
}

$baselineSql = @'
CREATE TABLE "user" (
    id INTEGER PRIMARY KEY
);

CREATE TABLE presence_node (
    id BIGINT PRIMARY KEY,
    owner_user_id INTEGER REFERENCES "user"(id)
);
'@

$seedSql = @'
INSERT INTO "user" (id) VALUES (1), (2);
INSERT INTO presence_node (id, owner_user_id) VALUES (10, 1), (11, 2);

INSERT INTO presence_editable_config
    (id, room_id, version, status, renderer_key, scene_config)
VALUES
    (100, 10, 1, 'draft', 'presence-v2-bbb', '{"baseline":"draft"}'::jsonb),
    (101, 10, 2, 'published', 'presence-v2-bbb', '{"baseline":"published"}'::jsonb),
    (102, 11, 1, 'draft', 'presence-v2-bbb', '{"baseline":"second-room"}'::jsonb);
'@

$upgradeAssertions = @'
DO $validation$
DECLARE
    actual_columns text[];
    valid_state_id integer;
    violated_constraint text;
BEGIN
    IF to_regclass('public.presence_studio_v3_state') IS NULL THEN
        RAISE EXCEPTION 'presence_studio_v3_state was not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'presence_editable_config'
          AND column_name = 'revision'
          AND is_nullable = 'NO'
          AND column_default IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'revision column/default/nullability mismatch';
    END IF;

    IF (SELECT count(*) FROM presence_editable_config WHERE id IN (100, 101, 102) AND revision = 1) <> 3 THEN
        RAISE EXCEPTION 'existing editable configs did not backfill revision 1';
    END IF;

    SELECT array_agg(column_name::text ORDER BY ordinal_position)
      INTO actual_columns
      FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'presence_studio_v3_state';

    IF actual_columns IS DISTINCT FROM ARRAY[
        'id', 'owner_user_id', 'room_id', 'base_config_id',
        'base_source_kind', 'base_status', 'base_version', 'base_revision',
        'base_schema_version', 'base_fingerprint',
        'metadata_schema_version', 'metadata_revision', 'metadata',
        'created_by_user_id', 'updated_by_user_id', 'created_at', 'updated_at'
    ]::text[] THEN
        RAISE EXCEPTION 'unexpected state columns: %', actual_columns;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'presence_studio_v3_state'
          AND column_name = 'metadata'
          AND udt_name = 'jsonb'
          AND is_nullable = 'NO'
          AND column_default IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'metadata JSONB/default/nullability mismatch';
    END IF;

    IF (
        SELECT count(*) FROM pg_constraint
        WHERE conrelid = 'presence_studio_v3_state'::regclass
          AND conname = ANY (ARRAY[
              'uq_presence_studio_v3_state_owner_room',
              'ck_presence_studio_v3_state_base_status',
              'ck_presence_studio_v3_state_source_kind',
              'ck_presence_studio_v3_state_revisions',
              'ck_presence_studio_v3_state_fingerprint'
          ])
    ) <> 5 THEN
        RAISE EXCEPTION 'named state constraints are incomplete';
    END IF;

    IF (SELECT confdeltype FROM pg_constraint
        WHERE conrelid = 'presence_studio_v3_state'::regclass
          AND conname = 'presence_studio_v3_state_room_id_fkey') <> 'c' THEN
        RAISE EXCEPTION 'room FK is not ON DELETE CASCADE';
    END IF;

    IF (SELECT confdeltype FROM pg_constraint
        WHERE conrelid = 'presence_studio_v3_state'::regclass
          AND conname = 'presence_studio_v3_state_base_config_id_fkey') <> 'c' THEN
        RAISE EXCEPTION 'base-config FK is not ON DELETE CASCADE';
    END IF;

    IF to_regclass('public.ix_presence_studio_v3_state_room_base') IS NULL
       OR to_regclass('public.ix_presence_studio_v3_state_fingerprint') IS NULL THEN
        RAISE EXCEPTION 'state indexes are incomplete';
    END IF;

    INSERT INTO presence_studio_v3_state (
        owner_user_id, room_id, base_config_id,
        base_source_kind, base_status, base_version, base_revision,
        base_schema_version, base_fingerprint, metadata_schema_version
    ) VALUES (
        1, 10, 100, 'draft', 'draft', 1, 1,
        'presence-studio-v3-base-v1', repeat('a', 64),
        'presence-studio-v3-private-v1'
    ) RETURNING id INTO valid_state_id;

    IF NOT EXISTS (
        SELECT 1 FROM presence_studio_v3_state
        WHERE id = valid_state_id
          AND metadata_revision = 1
          AND metadata = '{}'::jsonb
          AND created_at IS NOT NULL
          AND updated_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'state defaults were not applied';
    END IF;

    BEGIN
        INSERT INTO presence_studio_v3_state (
            owner_user_id, room_id, base_config_id,
            base_source_kind, base_status, base_version, base_revision,
            base_schema_version, base_fingerprint, metadata_schema_version
        ) VALUES (
            1, 10, 100, 'draft', 'draft', 1, 1,
            'presence-studio-v3-base-v1', repeat('b', 64),
            'presence-studio-v3-private-v1'
        );
        RAISE EXCEPTION 'duplicate owner/room was accepted';
    EXCEPTION WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS violated_constraint = CONSTRAINT_NAME;
        IF violated_constraint <> 'uq_presence_studio_v3_state_owner_room' THEN
            RAISE EXCEPTION 'unexpected unique constraint: %', violated_constraint;
        END IF;
    END;

    BEGIN
        INSERT INTO presence_studio_v3_state (
            owner_user_id, room_id, base_config_id,
            base_source_kind, base_status, base_version, base_revision,
            base_schema_version, base_fingerprint, metadata_schema_version
        ) VALUES (
            2, 11, 102, 'draft', 'draft', 1, 1,
            'presence-studio-v3-base-v1', repeat('A', 64),
            'presence-studio-v3-private-v1'
        );
        RAISE EXCEPTION 'invalid fingerprint was accepted';
    EXCEPTION WHEN check_violation THEN
        GET STACKED DIAGNOSTICS violated_constraint = CONSTRAINT_NAME;
        IF violated_constraint <> 'ck_presence_studio_v3_state_fingerprint' THEN
            RAISE EXCEPTION 'unexpected check constraint: %', violated_constraint;
        END IF;
    END;
END
$validation$;
'@

$concurrentV3Sql = @'
BEGIN;
SELECT id FROM presence_editable_config WHERE id = 100 FOR UPDATE;
UPDATE presence_editable_config
   SET scene_config = scene_config || '{"v3_writer":"committed"}'::jsonb,
       revision = revision + 1
 WHERE id = 100;
SELECT pg_advisory_lock(930071);
SELECT pg_sleep(5);
COMMIT;
SELECT pg_advisory_unlock(930071);
'@

$concurrentLegacySql = @'
BEGIN;
SET LOCAL application_name = 'presence-v3-legacy-lock-probe';
SELECT id FROM presence_editable_config WHERE id = 100 FOR UPDATE;
UPDATE presence_editable_config
   SET content_config = COALESCE(content_config, '{}'::jsonb) || '{"legacy_writer":"serialized"}'::jsonb,
       revision = revision + 1
 WHERE id = 100;
COMMIT;
'@

$concurrencyAssertions = @'
DO $validation$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM presence_editable_config
        WHERE id = 100
          AND revision = 3
          AND scene_config ->> 'v3_writer' = 'committed'
          AND content_config ->> 'legacy_writer' = 'serialized'
    ) THEN
        RAISE EXCEPTION 'shared row lock did not serialize both writers without a lost update';
    END IF;
END
$validation$;

UPDATE presence_editable_config
   SET revision = 1,
       scene_config = '{"baseline":"draft"}'::jsonb,
       content_config = '{}'::jsonb
 WHERE id = 100;
'@

$rollbackSql = @'
BEGIN;
SET LOCAL lock_timeout = '5s';
DROP TABLE IF EXISTS presence_studio_v3_state;
ALTER TABLE presence_editable_config DROP COLUMN IF EXISTS revision;
COMMIT;
'@

$rollbackAssertions = @'
DO $validation$
BEGIN
    IF to_regclass('public.presence_studio_v3_state') IS NOT NULL THEN
        RAISE EXCEPTION 'state table survived rollback';
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'presence_editable_config'
          AND column_name = 'revision'
    ) THEN
        RAISE EXCEPTION 'revision column survived rollback';
    END IF;
    IF (SELECT count(*) FROM presence_editable_config) <> 3 THEN
        RAISE EXCEPTION 'baseline rows changed during migration cycle';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM presence_editable_config
        WHERE id = 100 AND room_id = 10 AND version = 1 AND status = 'draft'
          AND renderer_key = 'presence-v2-bbb' AND scene_config = '{"baseline":"draft"}'::jsonb
    ) OR NOT EXISTS (
        SELECT 1 FROM presence_editable_config
        WHERE id = 101 AND room_id = 10 AND version = 2 AND status = 'published'
          AND renderer_key = 'presence-v2-bbb' AND scene_config = '{"baseline":"published"}'::jsonb
    ) THEN
        RAISE EXCEPTION 'baseline identity/content did not survive rollback';
    END IF;
END
$validation$;
'@

try {
    docker compose @composeArgs up --detach --wait --wait-timeout 60 --pull never
    Assert-NativeSuccess "Disposable PostgreSQL startup"

    $baselineSql | docker compose @composeArgs exec -T $service psql -X -v ON_ERROR_STOP=1 -U postgres -d $database
    Assert-NativeSuccess "Minimal predecessor tables"

    docker compose @composeArgs exec -T $service psql -X -v ON_ERROR_STOP=1 --single-transaction -U postgres -d $database -f /migrations/20260523_presence_editable_config.sql
    Assert-NativeSuccess "Pre-P1 editable-config migration"

    $seedSql | docker compose @composeArgs exec -T $service psql -X -v ON_ERROR_STOP=1 -U postgres -d $database
    Assert-NativeSuccess "Representative pre-P1 rows"

    docker compose @composeArgs exec -T $service psql -X -v ON_ERROR_STOP=1 -U postgres -d $database -f /migrations/20260721_presence_studio_v3_p1_foundation.sql
    Assert-NativeSuccess "P1 forward migration"

    $upgradeAssertions | docker compose @composeArgs exec -T $service psql -X -v ON_ERROR_STOP=1 -U postgres -d $database
    Assert-NativeSuccess "P1 catalog/default/constraint assertions"

    $v3Job = Start-Job -ArgumentList $project, $composeFile, $overrideFile, $service, $database, $concurrentV3Sql -ScriptBlock {
        param($jobProject, $jobComposeFile, $jobOverrideFile, $jobService, $jobDatabase, $jobSql)
        $jobComposeArgs = @("--project-name", $jobProject, "--file", $jobComposeFile, "--file", $jobOverrideFile)
        $jobSql | docker compose @jobComposeArgs exec -T $jobService psql -X -v ON_ERROR_STOP=1 -U postgres -d $jobDatabase
        if ($LASTEXITCODE -ne 0) { throw "V3 concurrent writer failed with exit code $LASTEXITCODE" }
    }

    $v3LockReady = $false
    for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
        $probe = docker compose @composeArgs exec -T $service psql -X -tAc "SELECT pg_try_advisory_lock(930071);" -U postgres -d $database
        Assert-NativeSuccess "V3 row-lock readiness probe"
        if (($probe -join "").Trim() -eq "f") {
            $v3LockReady = $true
            break
        }
        Start-Sleep -Milliseconds 100
    }
    if (-not $v3LockReady) { throw "V3 writer did not acquire the row-lock readiness signal." }

    $legacyJob = Start-Job -ArgumentList $project, $composeFile, $overrideFile, $service, $database, $concurrentLegacySql -ScriptBlock {
        param($jobProject, $jobComposeFile, $jobOverrideFile, $jobService, $jobDatabase, $jobSql)
        $jobComposeArgs = @("--project-name", $jobProject, "--file", $jobComposeFile, "--file", $jobOverrideFile)
        $jobSql | docker compose @jobComposeArgs exec -T $jobService psql -X -v ON_ERROR_STOP=1 -U postgres -d $jobDatabase
        if ($LASTEXITCODE -ne 0) { throw "Legacy concurrent writer failed with exit code $LASTEXITCODE" }
    }

    $legacyBlocked = $false
    for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
        $probe = docker compose @composeArgs exec -T $service psql -X -tAc "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE application_name = 'presence-v3-legacy-lock-probe' AND wait_event_type = 'Lock');" -U postgres -d $database
        Assert-NativeSuccess "Legacy writer lock-wait probe"
        if (($probe -join "").Trim() -eq "t") {
            $legacyBlocked = $true
            break
        }
        Start-Sleep -Milliseconds 100
    }
    if (-not $legacyBlocked) { throw "Legacy writer was not observed waiting on the shared draft row lock." }

    @($v3Job, $legacyJob) | Wait-Job -Timeout 20 | Out-Null
    foreach ($job in @($v3Job, $legacyJob)) {
        $jobOutput = Receive-Job -Job $job -ErrorAction Stop
        if ($job.State -ne "Completed") { throw "Concurrent writer job ended in state $($job.State)." }
        if ($jobOutput) { $jobOutput | Write-Host }
        Remove-Job -Job $job
    }
    Write-Host "PASS: Concurrent writer jobs completed"

    $concurrencyAssertions | docker compose @composeArgs exec -T $service psql -X -v ON_ERROR_STOP=1 -U postgres -d $database
    Assert-NativeSuccess "Concurrent V3/legacy row-lock serialization"

    $rollbackSql | docker compose @composeArgs exec -T $service psql -X -v ON_ERROR_STOP=1 -U postgres -d $database
    Assert-NativeSuccess "P1 operational rollback"

    $rollbackAssertions | docker compose @composeArgs exec -T $service psql -X -v ON_ERROR_STOP=1 -U postgres -d $database
    Assert-NativeSuccess "Post-rollback integrity assertions"

    Write-Host "RESULT: PRESENCE STUDIO V3 P1 MIGRATION VALIDATION PASSED"
}
finally {
    Get-Job -ErrorAction SilentlyContinue | Where-Object { $_.State -ne "Completed" } | Stop-Job -ErrorAction SilentlyContinue
    Get-Job -ErrorAction SilentlyContinue | Remove-Job -Force -ErrorAction SilentlyContinue
    docker compose @composeArgs down --volumes --remove-orphans
    Remove-Item Env:PRESENCE_V3_P1_MIGRATIONS -ErrorAction SilentlyContinue
}
