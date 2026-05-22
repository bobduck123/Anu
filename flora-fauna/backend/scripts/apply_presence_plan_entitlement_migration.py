from __future__ import annotations

import argparse
import ast
import json
import os
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parents[1]
DEFAULT_BACKEND_ENV = BACKEND_ROOT / ".env.presence-controlled-launch.backend-production.local"
MIGRATION_PATH = BACKEND_ROOT / "migrations/versions/20260522_presence_plan_entitlements.sql"
DEFAULT_OUTPUT = REPO_ROOT / "docs/program/evidence/presence-ggm-admin-account-proof/account_entitlement_migration_result.json"
TABLE_NAME = "presence_plan_entitlement"


def _load_env_file(path: Path | None) -> None:
    if not path or not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, raw_value = line.removeprefix("export ").split("=", 1)
        value = raw_value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            try:
                value = ast.literal_eval(value)
            except (SyntaxError, ValueError):
                value = value[1:-1]
        os.environ[key.strip()] = str(value)


def _database_url(environment: str) -> str:
    names = (
        ("PRESENCE_PILOT_ADMIN_DATABASE_URL", "POSTGRES_URL", "DATABASE_URL")
        if environment == "hosted_controlled_launch"
        else ("PRESENCE_PILOT_ADMIN_DATABASE_URL", "DATABASE_URL")
    )
    raw = next((os.environ.get(name) for name in names if os.environ.get(name)), None)
    if not raw:
        raise RuntimeError(f"Set one of {', '.join(names)} before migration apply.")
    normalized = f"postgresql://{raw[len('postgres://') :]}" if raw.startswith("postgres://") else raw
    url = make_url(normalized).difference_update_query(["supa", "pgbouncer"])
    if not url.get_backend_name().startswith("postgresql"):
        raise RuntimeError("The Presence plan entitlement SQL migration requires PostgreSQL.")
    return url.render_as_string(hide_password=False)


def _safe_target(database_url: str) -> dict[str, Any]:
    url = make_url(database_url)
    return {
        "driver": url.get_backend_name(),
        "host": url.host,
        "port": url.port,
        "database": url.database,
        "password_printed": False,
    }


def _table_state(engine) -> dict[str, Any]:
    table_names = set(inspect(engine).get_table_names())
    table_exists = TABLE_NAME in table_names
    columns = []
    indexes = []
    if table_exists:
        inspector = inspect(engine)
        columns = sorted(column["name"] for column in inspector.get_columns(TABLE_NAME))
        indexes = sorted(index["name"] for index in inspector.get_indexes(TABLE_NAME))
    return {"table_exists": table_exists, "columns": columns, "indexes": indexes}


def _write_result(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Apply the additive Presence plan entitlement SQL migration.")
    parser.add_argument("--environment", choices=("local", "hosted_controlled_launch"), default="local")
    parser.add_argument("--backend-env-file", type=Path, default=DEFAULT_BACKEND_ENV)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_OUTPUT)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--dry-run", action="store_true")
    modes.add_argument("--apply", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _args(argv)
    if args.environment == "hosted_controlled_launch":
        _load_env_file(args.backend_env_file)
    if not MIGRATION_PATH.exists():
        raise RuntimeError(f"Missing migration file: {MIGRATION_PATH}")

    database_url = _database_url(args.environment)
    engine = create_engine(database_url)
    before = _table_state(engine)
    operation = "dry_run"
    if args.apply:
        operation = "apply"
        with engine.begin() as connection:
            connection.exec_driver_sql(MIGRATION_PATH.read_text(encoding="utf-8"))
            connection.execute(text("SELECT 1"))
    after = _table_state(engine)
    result = {
        "environment": args.environment,
        "operation": operation,
        "target": _safe_target(database_url),
        "migration_path": str(MIGRATION_PATH.relative_to(REPO_ROOT)),
        "before": before,
        "after": after,
        "destructive_reset_run": False,
        "secret_values_printed": False,
    }
    _write_result(args.output_json, result)
    print(json.dumps({"output_json": str(args.output_json), **result}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
