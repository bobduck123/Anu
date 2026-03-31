from datetime import datetime, timezone
from flask import Blueprint, current_app, jsonify
from sqlalchemy import text

from .extensions import db

health_bp = Blueprint("health", __name__)

CONTRACT_VERSION = "m0.2026-04-01"


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


def _dependency_snapshot(*, database: str) -> dict[str, str]:
    stripe = "placeholder" if current_app.config.get("BETA_PLACEHOLDER_STRIPE") else "skipped"
    return {
        "database": database,
        "redis": "skipped",
        "stripe": stripe,
        "postgis": "skipped",
    }


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


def _database_placeholder() -> bool:
    return bool(current_app.config.get("BETA_PLACEHOLDER_DATABASE"))


def _readiness_warnings() -> list[str]:
    warnings: list[str] = []
    if current_app.config.get("BETA_PLACEHOLDER_DATABASE"):
        warnings.append("database_placeholder")
    if current_app.config.get("BETA_PLACEHOLDER_STRIPE"):
        warnings.append("stripe_placeholder")
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
    placeholder_database = _database_placeholder()
    status = "degraded" if placeholder_database else "ok"

    return jsonify({
        "status": status,
        "service": "core-api",
        "component": "core",
        "brand": "Manara",
        "version": current_app.config.get("APP_VERSION", "dev"),
        "contract_version": CONTRACT_VERSION,
        "database_checked": False,
        "database_mode": _database_mode(),
        "stripe_mode": _stripe_mode(),
        "dependencies": _dependency_snapshot(database="placeholder" if placeholder_database else "ok"),
        "ready": not placeholder_database,
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
    placeholder_database = _database_placeholder()
    ready = db_ok and not placeholder_database

    return jsonify({
        "status": "ok" if ready else "degraded",
        "service": "core-api",
        "component": "core",
        "contract_version": CONTRACT_VERSION,
        "timestamp": _timestamp(),
        "ready": ready,
        "db": db_ok,
        "database_mode": _database_mode(),
        "stripe_mode": _stripe_mode(),
        "dependencies": _dependency_snapshot(database="ok" if db_ok else "error"),
        "checks": {
            "database": "ok" if db_ok else "error",
            "postgis": "skipped",
            "redis": "skipped",
            "stripe": "skipped" if not current_app.config.get("BETA_PLACEHOLDER_STRIPE") else "error",
        },
        "warnings": warnings,
    }), 200 if ready else 503
