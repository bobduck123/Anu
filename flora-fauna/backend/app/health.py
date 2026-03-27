import os
from datetime import datetime, timezone
from urllib.parse import urlparse
from flask import Blueprint, current_app, jsonify
from sqlalchemy import text

from .extensions import db

health_bp = Blueprint("health", __name__)


def _placeholder_infra() -> bool:
    return bool(
        current_app.config.get("BETA_PLACEHOLDER_DATABASE")
        or current_app.config.get("BETA_PLACEHOLDER_STRIPE")
    )


def _database_mode() -> str:
    return (
        "placeholder"
        if current_app.config.get("BETA_PLACEHOLDER_DATABASE")
        else "configured"
    )


def _stripe_mode() -> str:
    return (
        "placeholder"
        if current_app.config.get("BETA_PLACEHOLDER_STRIPE")
        else "configured"
    )


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _database_ready() -> bool:
    try:
        db.session.rollback()
    except Exception:
        try:
            db.session.remove()
        except Exception:
            pass

    try:
        with _database_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        current_app.logger.warning(
            "Database readiness probe failed via engine connect: %s",
            exc.__class__.__name__,
        )
        try:
            db.session.remove()
        except Exception:
            pass
        return False
    return True


def _database_engine():
    return db.engine


def _database_target() -> dict[str, object]:
    raw_uri = str(current_app.config.get("SQLALCHEMY_DATABASE_URI") or "").strip()
    if not raw_uri:
        return {"family": "missing", "port": None}

    if raw_uri.startswith("sqlite"):
        return {"family": "sqlite", "port": None}

    try:
        parsed = urlparse(raw_uri)
    except Exception:
        return {"family": "unparseable", "port": None}

    host = (parsed.hostname or "").lower()
    port = parsed.port
    scheme = (parsed.scheme or "").lower()

    if not scheme.startswith("postgres"):
        return {"family": "other", "port": port}

    if "supabase" in host:
        if "pooler.supabase.com" in host or port == 6543:
            return {"family": "supabase_pooler", "port": port}
        return {"family": "supabase_direct", "port": port}

    if "neon.tech" in host:
        if "-pooler." in host:
            return {"family": "neon_pooler", "port": port}
        return {"family": "neon_direct", "port": port}

    return {"family": "postgres", "port": port}


def _database_target_warning() -> str | None:
    if os.environ.get("VERCEL", "").strip().lower() not in {"1", "true", "yes"}:
        return None

    family = str(_database_target().get("family") or "")
    if family in {"supabase_direct", "neon_direct"}:
        return "database_serverless_non_pooler"
    return None


def _database_target_hint() -> str | None:
    family = str(_database_target().get("family") or "")
    if family == "supabase_direct":
        return "Serverless core backend should use the Supabase transaction pooler (port 6543), not the direct host."
    if family == "neon_direct":
        return "Serverless core backend should use the Neon pooler hostname, not the direct database host."
    return None


def _database_placeholder() -> bool:
    return bool(current_app.config.get("BETA_PLACEHOLDER_DATABASE"))


def _readiness_warnings() -> list[str]:
    warnings: list[str] = []
    if current_app.config.get("BETA_PLACEHOLDER_DATABASE"):
        warnings.append("database_placeholder")
    if current_app.config.get("BETA_PLACEHOLDER_STRIPE"):
        warnings.append("stripe_placeholder")
    target_warning = _database_target_warning()
    if target_warning:
        warnings.append(target_warning)
    return warnings


@health_bp.route("/", methods=["GET"])
def root_status():
    placeholder_infra = _placeholder_infra()
    return jsonify({
        "status": "degraded" if placeholder_infra else "ok",
        "service": "core-api",
        "brand": "Manara",
        "health": "/health",
        "healthz": "/healthz",
        "readiness": "/readiness",
        "beta_placeholder_infra": placeholder_infra,
    })


@health_bp.route("/health", methods=["GET"])
def health():
    database_target = _database_target()
    return jsonify({
        "status": "ok",
        "service": "core-api",
        "brand": "Manara",
        "database_checked": False,
        "database_mode": _database_mode(),
        "database_target": database_target,
        "stripe_mode": _stripe_mode(),
        "readiness": "/readiness",
        "timestamp": _timestamp(),
    })


@health_bp.route("/healthz", methods=["GET"])
def healthz():
    return jsonify({"status": "ok"})


@health_bp.route("/readiness", methods=["GET"])
def readiness():
    db_ok = _database_ready()
    warnings = _readiness_warnings()
    ready = db_ok and not _database_placeholder()
    database_target = _database_target()
    database_hint = _database_target_hint()
    return jsonify({
        "status": "ok" if ready else "degraded",
        "db": db_ok,
        "database_mode": _database_mode(),
        "database_target": database_target,
        "database_hint": database_hint,
        "stripe_mode": _stripe_mode(),
        "warnings": warnings,
        "timestamp": _timestamp(),
    }), 200 if ready else 503
