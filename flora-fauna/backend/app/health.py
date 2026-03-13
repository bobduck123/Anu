from datetime import datetime
from flask import Blueprint, current_app, jsonify
from sqlalchemy import text

from .extensions import db

health_bp = Blueprint("health", __name__)


@health_bp.route("/", methods=["GET"])
def root_status():
    placeholder_infra = bool(
        current_app.config.get("BETA_PLACEHOLDER_DATABASE")
        or current_app.config.get("BETA_PLACEHOLDER_STRIPE")
    )
    return jsonify({
        "status": "degraded" if placeholder_infra else "ok",
        "service": "core-api",
        "brand": "Manara",
        "health": "/health",
        "beta_placeholder_infra": placeholder_infra,
    })


@health_bp.route("/health", methods=["GET"])
def health():
    db_ok = True
    try:
        db.session.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    placeholder_infra = bool(
        current_app.config.get("BETA_PLACEHOLDER_DATABASE")
        or current_app.config.get("BETA_PLACEHOLDER_STRIPE")
    )
    return jsonify({
        "status": "ok" if db_ok and not placeholder_infra else "degraded",
        "db": db_ok,
        "database_mode": (
            "placeholder"
            if current_app.config.get("BETA_PLACEHOLDER_DATABASE")
            else "configured"
        ),
        "stripe_mode": (
            "placeholder"
            if current_app.config.get("BETA_PLACEHOLDER_STRIPE")
            else "configured"
        ),
        "timestamp": datetime.utcnow().isoformat() + "Z",
    })


@health_bp.route("/healthz", methods=["GET"])
def healthz():
    return jsonify({"status": "ok"})
