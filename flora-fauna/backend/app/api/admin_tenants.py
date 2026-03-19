"""
Admin Tenant Provisioning API - Full White-Label Site Management

Provides endpoints for:
- Creating and configuring tenant nodes
- Setting up custom domains with Vercel integration
- Managing tenant branding and module access
- Provisioning complete white-label deployments
"""

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import json

from .utils import ok, error
from ..extensions import db
from ..models import Node, NodeConfig, NodeDomain, User

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


@admin_tenants_bp.route("/provision", methods=["POST"])
@jwt_required()
def provision_tenant():
    """
    Full white-label tenant provisioning endpoint.
    
    Creates a new tenant with:
    - Node record
    - NodeConfig with branding and modules
    - Custom domain(s) with Vercel integration
    - White-label configuration
    
    Body:
        - name: Tenant display name (required)
        - slug: URL-friendly identifier (auto-generated if not provided)
        - domains: List of custom domains to provision
        - branding: {primary_color, secondary_color, logo_url, favicon_url, custom_css}
        - modules: {marketplace: true, calendar: true, ...}
        - white_label: {enabled: true, hide_platform_branding: true}
        - admin_email: Email for the first admin user (optional)
    """
    user, err = _require_platform_admin()
    if err:
        return err
    
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return error("VALIDATION", "name is required", 400)
    
    slug = data.get("slug") or name.lower().replace(" ", "-").replace("_", "-")
    
    # Check for existing node
    existing = Node.query.filter((Node.name == name) | (Node.slug == slug)).first()
    if existing:
        return error("DUPLICATE", "A tenant with this name or slug already exists", 409)
    
    # Create node
    node = Node(name=name)
    if hasattr(node, "slug"):
        node.slug = slug
    if hasattr(node, "status"):
        node.status = "active"
    db.session.add(node)
    db.session.flush()
    
    # Create comprehensive config
    config_data = {
        "modules": data.get("modules", {
            "marketplace": True,
            "calendar": True,
            "education": True,
            "community": True,
            "costLowering": True,
            "impact": True,
            "relief": True,
            "governance": True,
        }),
        "data_policy": data.get("data_policy", 0),
        "branding": data.get("branding", {}),
        "white_label": data.get("white_label", {"enabled": False}),
        "calendar": data.get("calendar", {"mode": "events"}),
    }
    cfg = NodeConfig(node_id=node.id, config_json=json.dumps(config_data))
    db.session.add(cfg)
    
    # Provision domains
    domains_provisioned = []
    domains_failed = []
    domains = data.get("domains", [])
    
    for domain in domains:
        domain = domain.lower().strip()
        if not domain:
            continue
        
        # Check for duplicate domain
        existing_domain = NodeDomain.query.filter_by(domain=domain).first()
        if existing_domain:
            domains_failed.append({"domain": domain, "error": "Domain already registered"})
            continue
        
        # Create domain record
        node_domain = NodeDomain(
            node_id=node.id,
            domain=domain,
            status="pending",
            tls_ready=False,
        )
        db.session.add(node_domain)
        
        # Provision on Vercel
        from .domain_resolution import _provision_vercel_domain
        vercel_result = _provision_vercel_domain(domain, slug)
        
        if vercel_result.get("success"):
            node_domain.status = "active"
            node_domain.tls_ready = vercel_result.get("tls_ready", False)
            domains_provisioned.append({
                "domain": domain,
                "status": "active",
                "tls_ready": node_domain.tls_ready,
                "verification": vercel_result.get("verification", []),
            })
        else:
            node_domain.status = "verification_pending"
            domains_provisioned.append({
                "domain": domain,
                "status": "verification_pending",
                "error": vercel_result.get("error"),
                "verification": vercel_result.get("verification", []),
            })
    
    # Create admin user if email provided
    admin_user_created = False
    admin_email = data.get("admin_email")
    if admin_email:
        from werkzeug.security import generate_password_hash
        import secrets
        
        existing_user = User.query.filter_by(email=admin_email).first()
        if not existing_user:
            temp_password = secrets.token_urlsafe(12)
            admin_user = User(
                username=f"{slug}_admin",
                email=admin_email,
                pseudonym=f"{name} Admin",
                password=generate_password_hash(temp_password, method="pbkdf2:sha256"),
                role="organizer",
                node_id=node.id,
                points=0,
                level=1,
                points_to_level_up=100,
            )
            db.session.add(admin_user)
            admin_user_created = True
    
    db.session.commit()
    
    result = {
        "node": {
            "id": node.id,
            "name": node.name,
            "slug": getattr(node, "slug", slug),
            "status": getattr(node, "status", "active"),
        },
        "config": config_data,
        "domains": {
            "provisioned": domains_provisioned,
            "failed": domains_failed,
        },
        "admin_user_created": admin_user_created,
    }
    
    return ok(result, 201)


@admin_tenants_bp.route("/<int:node_id>", methods=["GET"])
@jwt_required()
def get_tenant(node_id):
    """Get detailed tenant information including domains and config."""
    user, err = _require_platform_admin()
    if err:
        return err
    
    node = Node.query.get(node_id)
    if not node:
        return error("NOT_FOUND", "Node not found", 404)
    
    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    config_data = json.loads(cfg.config_json) if cfg and cfg.config_json else {}
    
    domains = NodeDomain.query.filter_by(node_id=node_id).all()
    member_count = User.query.filter_by(node_id=node_id).count()
    
    result = {
        "node": {
            "id": node.id,
            "name": node.name,
            "slug": getattr(node, "slug", ""),
            "status": getattr(node, "status", "active"),
            "is_default": getattr(node, "is_default", False),
            "created_at": node.created_at.isoformat() if hasattr(node, "created_at") and node.created_at else None,
        },
        "config": config_data,
        "domains": [
            {
                "id": d.id,
                "domain": d.domain,
                "status": d.status,
                "tls_ready": d.tls_ready,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in domains
        ],
        "member_count": member_count,
    }
    
    return ok(result)


@admin_tenants_bp.route("/<int:node_id>/white-label", methods=["PATCH"])
@jwt_required()
def update_white_label(node_id):
    """Enable or configure white-label settings for a tenant."""
    user, err = _require_platform_admin()
    if err:
        return err
    
    node = Node.query.get(node_id)
    if not node:
        return error("NOT_FOUND", "Node not found", 404)
    
    data = request.get_json(silent=True) or {}
    
    cfg = NodeConfig.query.filter_by(node_id=node_id).first()
    if cfg:
        existing = json.loads(cfg.config_json) if cfg.config_json else {}
        existing["white_label"] = {
            **existing.get("white_label", {}),
            **data.get("white_label", {}),
        }
        cfg.config_json = json.dumps(existing)
    else:
        cfg = NodeConfig(
            node_id=node_id,
            config_json=json.dumps({"white_label": data.get("white_label", {"enabled": True})})
        )
        db.session.add(cfg)
    
    db.session.commit()
    return ok({"message": "White-label settings updated"})
