"""Mode guard middleware for systemic shock preparedness."""
from __future__ import annotations

from functools import wraps
from flask import g

from ..services.systemic_mode_service import get_system_state, MODE_BLACK_SWAN
from ..services.trust_score_service import get_trust_score
from .policy import get_current_user
from flask import jsonify


def _error(code, message, status=400):
    payload = {"ok": False, "error": {"code": code, "message": message}}
    return jsonify(payload), status


ADMIN_ROLES = {"board_member", "node_admin", "platform_admin", "treasury_guardian"}


def require_mode_allows(action: str):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            node_id = getattr(g, "node_id", None) or (user.node_id if user else None)
            if not node_id:
                return _error("unauthorized", "Unauthorized", status=401)
            state = get_system_state(node_id)
            if state.current_mode != MODE_BLACK_SWAN:
                return fn(*args, **kwargs)

            if action in {"privilege_escalation", "constellation_amplification"}:
                return _error("restricted", "Action restricted in Black Swan mode", status=403)

            if action in {"onboarding"}:
                # Onboarding restricted to observer tier in Black Swan
                return fn(*args, **kwargs)

            if action in {"microcosm_create", "event_create"}:
                if user and user.role in ADMIN_ROLES:
                    return fn(*args, **kwargs)
                trust = get_trust_score(user.id) if user else None
                if trust and trust.composite_score >= 70:
                    return fn(*args, **kwargs)
                return _error("restricted", "Creation restricted to high-trust or steward tiers", status=403)

            return fn(*args, **kwargs)
        return wrapper
    return decorator
