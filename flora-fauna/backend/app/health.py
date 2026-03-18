from datetime import datetime, timezone
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
        db.session.execute(text("SELECT 1"))
    except Exception:
        return False
    return True


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
    return jsonify({
        "status": "ok",
        "service": "core-api",
        "brand": "Manara",
        "database_checked": False,
        "database_mode": _database_mode(),
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
    placeholder_infra = _placeholder_infra()
    ready = db_ok and not placeholder_infra
    return jsonify({
        "status": "ok" if ready else "degraded",
        "db": db_ok,
        "database_mode": _database_mode(),
        "stripe_mode": _stripe_mode(),
        "timestamp": _timestamp(),
    }), 200 if ready else 503
