from datetime import datetime, timedelta
from flask import Blueprint, request

from ..models import (
    CompetencyDomain,
    CompetencyNode,
    CompetencyEdge,
    OrganiserCompetencyProfile,
    PeerEndorsement,
    VersionHistory,
    AuditRecord,
    db,
)
from ..security.policy import get_current_user, require_permission
from ..security.alpha import alpha_jwt_required
from ..services.feature_flag_service import is_enabled
from ..services.competency_scoring_service import compute_profile
from .utils import ok, error


competency_bp = Blueprint("competency", __name__, url_prefix="/competency")


@competency_bp.route("/domains", methods=["GET", "POST"])
@require_permission("competency:manage")
def domains():
    if not is_enabled("OIL_COMPETENCY_GRAPH"):
        return error("disabled", "Competency graph disabled", status=403)
    if request.method == "GET":
        rows = CompetencyDomain.query.order_by(CompetencyDomain.created_at.desc()).all()
        return ok({"domains": [{
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "node_scope": d.node_scope,
            "node_id": d.node_id,
        } for d in rows]})
    payload = request.get_json() or {}
    domain = CompetencyDomain(
        name=payload.get("name"),
        description=payload.get("description"),
        node_scope=payload.get("node_scope", "node"),
        node_id=payload.get("node_id"),
    )
    db.session.add(domain)
    db.session.add(AuditRecord(
        actor_id=get_current_user().id if get_current_user() else None,
        action="competency_domain_created",
        entity_type="competency_domain",
        entity_id=str(domain.id),
    ))
    db.session.commit()
    return ok({"id": domain.id}, status=201)


@competency_bp.route("/domains/<int:domain_id>", methods=["PATCH"])
@require_permission("competency:manage")
def update_domain(domain_id):
    if not is_enabled("OIL_COMPETENCY_GRAPH"):
        return error("disabled", "Competency graph disabled", status=403)
    domain = CompetencyDomain.query.get_or_404(domain_id)
    payload = request.get_json() or {}
    if "name" in payload:
        domain.name = payload["name"]
    if "description" in payload:
        domain.description = payload["description"]
    if "node_scope" in payload:
        domain.node_scope = payload["node_scope"]
    db.session.add(VersionHistory(
        entity_type="competency_domain",
        entity_id=domain.id,
        version=1,
        change_summary="Domain updated",
        created_by=get_current_user().id if get_current_user() else None,
    ))
    db.session.commit()
    return ok({"id": domain.id})


@competency_bp.route("/nodes", methods=["GET", "POST"])
@require_permission("competency:manage")
def nodes():
    if not is_enabled("OIL_COMPETENCY_GRAPH"):
        return error("disabled", "Competency graph disabled", status=403)
    if request.method == "GET":
        rows = CompetencyNode.query.order_by(CompetencyNode.created_at.desc()).all()
        return ok({"nodes": [{
            "id": n.id,
            "domain_id": n.domain_id,
            "slug": n.slug,
            "title": n.title,
            "description": n.description,
            "active": n.active,
            "proficiency_scale": n.proficiency_scale,
        } for n in rows]})
    payload = request.get_json() or {}
    node = CompetencyNode(
        domain_id=payload.get("domain_id"),
        slug=payload.get("slug"),
        title=payload.get("title"),
        description=payload.get("description"),
        proficiency_scale=payload.get("proficiency_scale"),
        active=bool(payload.get("active", True)),
    )
    db.session.add(node)
    db.session.add(AuditRecord(
        actor_id=get_current_user().id if get_current_user() else None,
        action="competency_node_created",
        entity_type="competency_node",
        entity_id=str(node.id),
    ))
    db.session.commit()
    return ok({"id": node.id}, status=201)


@competency_bp.route("/nodes/<int:node_id>", methods=["PATCH"])
@require_permission("competency:manage")
def update_node(node_id):
    if not is_enabled("OIL_COMPETENCY_GRAPH"):
        return error("disabled", "Competency graph disabled", status=403)
    node = CompetencyNode.query.get_or_404(node_id)
    payload = request.get_json() or {}
    if "title" in payload:
        node.title = payload["title"]
    if "description" in payload:
        node.description = payload["description"]
    if "active" in payload:
        node.active = bool(payload["active"])
    db.session.add(VersionHistory(
        entity_type="competency_node",
        entity_id=node.id,
        version=1,
        change_summary="Competency node updated",
        created_by=get_current_user().id if get_current_user() else None,
    ))
    db.session.commit()
    return ok({"id": node.id})


@competency_bp.route("/edges", methods=["GET", "POST"])
@require_permission("competency:manage")
def edges():
    if not is_enabled("OIL_COMPETENCY_GRAPH"):
        return error("disabled", "Competency graph disabled", status=403)
    if request.method == "GET":
        rows = CompetencyEdge.query.order_by(CompetencyEdge.created_at.desc()).all()
        return ok({"edges": [{
            "id": e.id,
            "parent_node_id": e.parent_node_id,
            "child_node_id": e.child_node_id,
            "edge_type": e.edge_type,
        } for e in rows]})
    payload = request.get_json() or {}
    edge = CompetencyEdge(
        parent_node_id=payload.get("parent_node_id"),
        child_node_id=payload.get("child_node_id"),
        edge_type=payload.get("edge_type", "prerequisite"),
    )
    db.session.add(edge)
    db.session.add(AuditRecord(
        actor_id=get_current_user().id if get_current_user() else None,
        action="competency_edge_created",
        entity_type="competency_edge",
        entity_id=str(edge.id),
    ))
    db.session.commit()
    return ok({"id": edge.id}, status=201)


@competency_bp.route("/profile", methods=["GET"])
@alpha_jwt_required()
def profile():
    if not is_enabled("OIL_COMPETENCY_GRAPH"):
        return error("disabled", "Competency graph disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    profile = OrganiserCompetencyProfile.query.filter_by(user_id=user.id, node_id=user.node_id or 1).first()
    if profile:
        db.session.add(AuditRecord(
            actor_id=user.id,
            action="competency_profile_view",
            entity_type="organiser_competency_profile",
            entity_id=str(profile.id),
        ))
        db.session.commit()
    return ok({"profile": {
        "proficiency_level": profile.proficiency_level if profile else 0,
        "confidence_score": profile.confidence_score if profile else 0,
        "details": profile.details_json if profile else {},
    }})


@competency_bp.route("/recalculate", methods=["POST"])
@require_permission("competency:manage")
def recalc():
    if not is_enabled("OIL_COMPETENCY_GRAPH"):
        return error("disabled", "Competency graph disabled", status=403)
    payload = request.get_json() or {}
    user_id = payload.get("user_id")
    node_id = payload.get("node_id") or (get_current_user().node_id if get_current_user() else None) or 1
    if not user_id:
        return error("validation_error", "user_id required", status=400)
    profile = compute_profile(user_id, node_id, actor_id=get_current_user().id if get_current_user() else None)
    return ok({"proficiency_level": profile.proficiency_level, "confidence_score": profile.confidence_score})


@competency_bp.route("/endorse", methods=["POST"])
@alpha_jwt_required()
def endorse():
    if not is_enabled("OIL_COMPETENCY_GRAPH"):
        return error("disabled", "Competency graph disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    endorsed_user_id = payload.get("endorsed_user_id")
    try:
        rating = int(payload.get("rating", 3))
    except (TypeError, ValueError):
        rating = 3
    if not endorsed_user_id:
        return error("validation_error", "endorsed_user_id required", status=400)
    recent = PeerEndorsement.query.filter_by(
        endorser_user_id=user.id,
        endorsed_user_id=endorsed_user_id,
        node_id=user.node_id or 1,
    ).order_by(PeerEndorsement.created_at.desc()).first()
    if recent and (recent.created_at and (recent.created_at > (datetime.utcnow() - timedelta(days=30)))):
        return error("rate_limited", "You can endorse the same organiser once per 30 days", status=429)
    endorsement = PeerEndorsement(
        endorser_user_id=user.id,
        endorsed_user_id=endorsed_user_id,
        node_id=user.node_id or 1,
        rating=min(5, max(1, rating)),
        note=payload.get("note"),
    )
    db.session.add(endorsement)
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="peer_endorsement_created",
        entity_type="peer_endorsement",
        entity_id=str(endorsement.id),
    ))
    db.session.commit()
    return ok({"id": endorsement.id}, status=201)
