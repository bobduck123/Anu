"""Admin tenant provisioning API — create, list, and configure nodes."""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from .utils import ok, error
from app.extensions import db
from app.models import Node, NodeConfig, User

admin_tenants_bp = Blueprint("admin_tenants", __name__, url_prefix="/admin/tenants")


def _require_platform_admin():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    if not user or user.role != "platform_admin":
        return None, error("FORBIDDEN", "Platform admin required", 403)
    return user, None


@admin_tenants_bp.route("", methods=["GET"])
@jwt_required()
def list_tenants():
    user, err = _require_platform_admin()
    if err:
        return err
    nodes = Node.query.order_by(Node.id).all()
    payload = []
    for n in nodes:
        d = n.to_dict() if hasattr(n, "to_dict") else {"id": n.id, "name": n.name}
        member_count = User.query.filter_by(node_id=n.id).count()
        d["member_count"] = member_count
        payload.append(d)
    return ok(payload)


@admin_tenants_bp.route("", methods=["POST"])
@jwt_required()
def create_tenant():
    user, err = _require_platform_admin()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return error("VALIDATION", "name is required", 400)
    slug = data.get("slug") or name.lower().replace(" ", "-")
    existing = Node.query.filter_by(name=name).first()
    if existing:
        return error("DUPLICATE", "A node with this name already exists", 409)
    node = Node(name=name)
    if hasattr(node, "slug"):
        node.slug = slug
    if hasattr(node, "status"):
        node.status = data.get("status", "active")
    db.session.add(node)
    db.session.flush()

    # Create config if model exists
    try:
        import json
        config_data = {
            "modules": data.get("modules", {}),
            "data_policy": data.get("data_policy", 0),
            "branding": data.get("branding", {}),
        }
        cfg = NodeConfig(node_id=node.id, config_json=json.dumps(config_data))
        db.session.add(cfg)
    except Exception:
        pass

    db.session.commit()
    result = node.to_dict() if hasattr(node, "to_dict") else {"id": node.id, "name": node.name}
    return ok(result, 201)


@admin_tenants_bp.route("/<int:node_id>/modules", methods=["PATCH"])
@jwt_required()
def update_modules(node_id):
    user, err = _require_platform_admin()
    if err:
        return err
    node = Node.query.get(node_id)
    if not node:
        return error("NOT_FOUND", "Node not found", 404)
    data = request.get_json(silent=True) or {}
    import json
    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    if cfg:
        existing = json.loads(cfg.config_json) if cfg.config_json else {}
        existing["modules"] = data.get("modules", existing.get("modules", {}))
        cfg.config_json = json.dumps(existing)
    else:
        cfg = NodeConfig(node_id=node_id, config_json=json.dumps({"modules": data.get("modules", {})}))
        db.session.add(cfg)
    db.session.commit()
    return ok({"message": "Modules updated"})


@admin_tenants_bp.route("/<int:node_id>/branding", methods=["PATCH"])
@jwt_required()
def update_branding(node_id):
    user, err = _require_platform_admin()
    if err:
        return err
    node = Node.query.get(node_id)
    if not node:
        return error("NOT_FOUND", "Node not found", 404)
    data = request.get_json(silent=True) or {}
    import json
    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    if cfg:
        existing = json.loads(cfg.config_json) if cfg.config_json else {}
        existing["branding"] = data.get("branding", existing.get("branding", {}))
        cfg.config_json = json.dumps(existing)
    else:
        cfg = NodeConfig(node_id=node_id, config_json=json.dumps({"branding": data.get("branding", {})}))
        db.session.add(cfg)
    db.session.commit()
    return ok({"message": "Branding updated"})
