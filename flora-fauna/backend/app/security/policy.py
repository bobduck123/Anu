from functools import wraps
from flask import current_app, jsonify, g
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from ..models import User
from .alpha import alpha_jwt_required


ALL_ROLES = [
    "participant", "organizer", "validator", "case_worker", "relief_moderator",
    "auditor", "board_member", "partner_admin", "node_admin", "indigenous_council",
    "platform_admin", "treasury_guardian", "governance_observer", "node_curator",
]

ADMIN_ROLES = ["node_admin", "platform_admin"]
GOVERNANCE_ROLES = ["board_member", "node_admin", "platform_admin", "treasury_guardian", "node_curator"]

PERMISSIONS = {
    # Existing
    "membership:manage": ALL_ROLES,
    "pools:view": ALL_ROLES,
    "ledger:read": ["board_member", "node_admin", "platform_admin", "auditor", "treasury_guardian"],
    "pools:manage": ADMIN_ROLES,
    "relief:queue": ["validator", "case_worker", "relief_moderator", "platform_admin", "node_admin"],
    "relief:vote": ["validator", "platform_admin", "node_admin"],
    "relief:approve": ["case_worker", "board_member", "platform_admin", "node_admin"],
    "relief:disburse": ["case_worker", "platform_admin", "node_admin"],
    "consent:manage": ALL_ROLES,

    # Governance (Req 1)
    "governance:manage": GOVERNANCE_ROLES,
    "governance:vote": ALL_ROLES,

    # Escrow (Req 5)
    "escrow:read": ["organizer", "board_member", "node_admin", "platform_admin", "auditor", "treasury_guardian"],
    "escrow:create": ["organizer", "node_admin", "platform_admin"],
    "escrow:release": ["board_member", "node_admin", "platform_admin", "treasury_guardian"],
    "escrow:freeze": ["board_member", "node_admin", "platform_admin", "treasury_guardian"],

    # Incidents (Req 3)
    "incidents:read": ["organizer", "validator", "case_worker", "board_member", "node_admin", "platform_admin", "auditor", "governance_observer"],
    "incidents:create": ["organizer", "validator", "case_worker", "board_member", "node_admin", "platform_admin"],
    "incidents:resolve": ["board_member", "node_admin", "platform_admin"],

    # Crisis mode (Req 19)
    "crisis:read": ALL_ROLES,
    "crisis:manage": ["board_member", "node_admin", "platform_admin"],
    "system_modes:read": ["board_member", "node_admin", "platform_admin", "auditor", "treasury_guardian"],
    "system_modes:manage": ["board_member", "node_admin", "platform_admin"],
    "systemic_sim:run": ["board_member", "node_admin", "platform_admin", "treasury_guardian"],

    # Feature flags (Req 23)
    "feature_flags:read": ADMIN_ROLES + ["auditor"],
    "feature_flags:manage": ADMIN_ROLES,

    # Audit export (Req 20)
    "audit:export": ["auditor", "board_member", "node_admin", "platform_admin", "treasury_guardian"],

    # Vendors & Assets (Req 13, 14, 15, 16)
    "vendors:manage": ADMIN_ROLES + ["organizer"],
    "assets:manage": ADMIN_ROLES,

    # Archive (Req 18)
    "archive:manage": ADMIN_ROLES + ["governance_observer"],

    # Capital intelligence
    "capital:read": ["board_member", "node_admin", "platform_admin", "treasury_guardian", "auditor"],
    "capital:simulate": ["board_member", "node_admin", "platform_admin", "treasury_guardian"],
    "capital:export": ["auditor", "board_member", "node_admin", "platform_admin", "treasury_guardian"],

    # Transparency
    "transparency:manage": ["board_member", "node_admin", "platform_admin"],

    # Credits + influence
    "credits:manage": ["node_admin", "platform_admin", "treasury_guardian"],

    # Conflict of interest
    "coi:manage": GOVERNANCE_ROLES,

    # Education registry + ladder
    "education:manage": GOVERNANCE_ROLES + ["auditor"],

    # Sovereignty index
    "sovereignty_index:read": ["board_member", "node_admin", "platform_admin", "treasury_guardian", "auditor"],
    "sovereignty_index:manage": ["board_member", "node_admin", "platform_admin", "treasury_guardian"],

    # Organiser load index
    "organizer_load:read": ["board_member", "node_admin", "platform_admin", "auditor"],

    # Governance simulations
    "governance_simulations:run": ALL_ROLES,
    "governance_simulations:manage": GOVERNANCE_ROLES,

    # Federation metrics
    "federation:read": ["board_member", "node_admin", "platform_admin", "auditor"],
    "federation:manage": ["board_member", "node_admin", "platform_admin"],

    # Institutional mode
    "institutional:read": ["board_member", "node_admin", "platform_admin", "auditor", "governance_observer"],
    "institutional:manage": ["board_member", "node_admin", "platform_admin"],

    # Organiser Intelligence Layer
    "formulas:read": ["board_member", "node_admin", "platform_admin", "auditor"],
    "formulas:manage": ["board_member", "node_admin", "platform_admin"],
    "competency:manage": ["board_member", "node_admin", "platform_admin", "treasury_guardian"],
    "needs:manage": ["board_member", "node_admin", "platform_admin", "treasury_guardian"],
    "organiser_analytics:manage": ["board_member", "node_admin", "platform_admin", "auditor"],
    "collision:review": ["board_member", "node_admin", "platform_admin", "treasury_guardian"],
    "needs:manage": ["board_member", "node_admin", "platform_admin", "treasury_guardian"],

    # Timebank + assets + insights + merchants + risk pools
    "timebank:read": ALL_ROLES,
    "timebank:verify": ["organizer", "node_admin", "platform_admin"],
    "assets:manage": ADMIN_ROLES,
    "assets:bookings": ALL_ROLES,
    "insights:verify": ["organizer", "node_admin", "platform_admin"],
    "merchants:manage": ADMIN_ROLES + ["organizer"],
    "treasury:draw": ["board_member", "node_admin", "platform_admin", "treasury_guardian"],

    # Crisis simulation
    "crisis_sim:run": ["board_member", "node_admin", "platform_admin"],

    # Hell / Earth / Heaven
    "needs:create": ALL_ROLES,
    "needs:verify": ["validator", "case_worker", "organizer", "relief_moderator", "board_member", "node_admin", "platform_admin", "treasury_guardian", "node_curator", "auditor"],
    "offers:create": ALL_ROLES,
    "offers:accept": ["organizer", "case_worker", "validator", "board_member", "node_admin", "platform_admin", "relief_moderator"],
    "offers:confirm": ["organizer", "case_worker", "validator", "board_member", "node_admin", "platform_admin", "relief_moderator"],
    "microcosms:create": ["organizer", "board_member", "node_admin", "platform_admin", "relief_moderator", "node_curator"],
    "reliability:read": ALL_ROLES,
    "coverage:read": ALL_ROLES,
    "impact:footprint:read": ALL_ROLES,
    "universe:read": ALL_ROLES,

    # WCLE — Phase 1 Weekly Cost-Lowering Engine
    "wcle:run:read": ALL_ROLES,
    "wcle:run:create": ["organizer", "node_admin", "platform_admin"],
    "wcle:run:manage": ["organizer", "node_admin", "platform_admin"],
    "wcle:pledge:create": ALL_ROLES,
    "wcle:pledge:manage": ALL_ROLES,
    "wcle:receipt:create": ["organizer", "node_admin", "platform_admin"],
    "wcle:baseline:manage": ["organizer", "node_admin", "platform_admin", "auditor"],
    "wcle:savings:read": ALL_ROLES,

    # Presence Nodes
    "presence.node.create": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.node.read": ["organizer", "publisher", "node_admin", "platform_admin", "auditor"],
    "presence.node.update": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.node.delete": ["node_admin", "platform_admin"],
    "presence.node.publish": ["publisher", "node_admin", "platform_admin"],
    "presence.node.suspend": ["node_admin", "platform_admin"],
    "presence.node.archive": ["node_admin", "platform_admin"],
    "presence.enquiry.read": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.enquiry.update": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.template.manage": ["node_admin", "platform_admin"],
    "presence.analytics.read": ["organizer", "publisher", "node_admin", "platform_admin", "auditor"],
    "presence.organisation.manage": ["node_admin", "platform_admin"],
    "presence.collection.manage": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.work.manage": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.service.manage": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.proof.manage": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.procurement.manage": ["publisher", "node_admin", "platform_admin"],
    "presence.nfc.manage": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.connection.read": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.connection.update": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.quote.manage": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.variation.manage": ["organizer", "publisher", "node_admin", "platform_admin"],
    "presence.handover.manage": ["organizer", "publisher", "node_admin", "platform_admin"],
}


def get_current_user():
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        pass

    try:
        identity = get_jwt_identity()
    except RuntimeError:
        identity = None

    try:
        claims = get_jwt() or {}
    except Exception:
        claims = {}

    candidates: list[str] = []

    if isinstance(identity, dict):
        for key in ("username", "email", "sub"):
            value = identity.get(key)
            if isinstance(value, str) and value.strip():
                candidates.append(value.strip())
    elif isinstance(identity, str) and identity.strip():
        candidates.append(identity.strip())

    for key in ("username", "preferred_username", "email", "sub"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            candidates.append(value.strip())

    normalized_candidates: list[str] = []
    for candidate in candidates:
        normalized = (
            candidate.split("control::", 1)[1]
            if candidate.startswith("control::")
            else candidate
        )
        if normalized and normalized not in normalized_candidates:
            normalized_candidates.append(normalized)

    # 1) Username match
    for candidate in normalized_candidates:
        user = User.query.filter_by(username=candidate).first()
        if user:
            return user

    # 2) Email match
    for candidate in normalized_candidates:
        if "@" in candidate:
            user = User.query.filter_by(email=candidate).first()
            if user:
                return user

    # 3) Global subject ID (Supabase sub) match
    for candidate in normalized_candidates:
        user = User.query.filter_by(global_subject_id=candidate).first()
        if user:
            return user

    if current_app.config.get("ALPHA_PUBLIC") and current_app.config.get("ALPHA_AUTH_OPTIONAL"):
        username = current_app.config.get("ALPHA_DEFAULT_USERNAME", "alpha_public")
        return User.query.filter_by(username=username).first()

    return None


def require_role(*roles):
    def decorator(fn):
        @wraps(fn)
        @alpha_jwt_required()
        def wrapper(*args, **kwargs):
            if current_app.config.get("ALPHA_PUBLIC") and current_app.config.get("ALPHA_AUTH_OPTIONAL"):
                return fn(*args, **kwargs)
            user = get_current_user()
            if not user or user.role not in roles:
                return jsonify({"ok": False, "error": {"code": "forbidden", "message": "Insufficient role"}, "request_id": getattr(g, "request_id", None)}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_permission(permission):
    def decorator(fn):
        @wraps(fn)
        @alpha_jwt_required()
        def wrapper(*args, **kwargs):
            if current_app.config.get("ALPHA_PUBLIC") and current_app.config.get("ALPHA_AUTH_OPTIONAL"):
                return fn(*args, **kwargs)
            user = get_current_user()
            allowed = PERMISSIONS.get(permission, [])
            if not user or user.role not in allowed:
                return jsonify({"ok": False, "error": {"code": "forbidden", "message": "Insufficient permission"}, "request_id": getattr(g, "request_id", None)}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_node_access(node_id):
    def decorator(fn):
        @wraps(fn)
        @alpha_jwt_required()
        def wrapper(*args, **kwargs):
            if current_app.config.get("ALPHA_PUBLIC") and current_app.config.get("ALPHA_AUTH_OPTIONAL"):
                return fn(*args, **kwargs)
            user = get_current_user()
            if not user:
                return jsonify({"ok": False, "error": {"code": "unauthorized", "message": "Unauthorized"}, "request_id": getattr(g, "request_id", None)}), 401
            if user.role == "platform_admin":
                return fn(*args, **kwargs)
            if user.node_id != node_id:
                return jsonify({"ok": False, "error": {"code": "forbidden", "message": "Node access denied"}, "request_id": getattr(g, "request_id", None)}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
