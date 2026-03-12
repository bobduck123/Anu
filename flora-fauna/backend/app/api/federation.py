from flask import Blueprint, request

from ..models import NodeRecognitionMapping, MutualAidFlag, FederationProtocolVersion, AuditRecord, db
from ..security.policy import get_current_user, require_permission
from ..services.feature_flag_service import is_enabled
from ..services.federation_metrics_service import compute_cross_node_metrics
from .utils import ok, error


federation_bp = Blueprint("federation", __name__, url_prefix="/federation")


@federation_bp.route("/metrics", methods=["POST"])
@require_permission("federation:read")
def compute_metrics():
    if not is_enabled("federation_metrics"):
        return error("disabled", "Federation metrics disabled", status=403)
    snapshot = compute_cross_node_metrics()
    return ok({
        "snapshot": {
            "total_nodes": snapshot.total_nodes,
            "total_treasury_cents": snapshot.total_treasury_cents,
            "total_users": snapshot.total_users,
            "total_certified_users": snapshot.total_certified_users,
            "average_sovereignty_index": snapshot.average_sovereignty_index,
            "mutual_aid_pairs": snapshot.mutual_aid_pairs,
            "protocol_versions": snapshot.protocol_versions or {},
            "created_at": snapshot.created_at.isoformat() if snapshot.created_at else None,
        }
    }, status=201)


@federation_bp.route("/recognitions", methods=["GET", "POST"])
@require_permission("federation:manage")
def recognitions():
    if not is_enabled("federation_metrics"):
        return error("disabled", "Federation metrics disabled", status=403)
    if request.method == "GET":
        items = NodeRecognitionMapping.query.all()
        payload = [{
            "from_node_id": item.from_node_id,
            "to_node_id": item.to_node_id,
            "recognition_level": item.recognition_level,
            "active": item.active,
            "notes": item.notes,
        } for item in items]
        return ok({"recognitions": payload})
    payload = request.get_json() or {}
    mapping = NodeRecognitionMapping.query.filter_by(
        from_node_id=payload.get("from_node_id"),
        to_node_id=payload.get("to_node_id"),
    ).first()
    if not mapping:
        mapping = NodeRecognitionMapping(
            from_node_id=payload.get("from_node_id"),
            to_node_id=payload.get("to_node_id"),
        )
        db.session.add(mapping)
    mapping.recognition_level = payload.get("recognition_level", mapping.recognition_level)
    mapping.active = bool(payload.get("active", True))
    mapping.notes = payload.get("notes")
    db.session.add(AuditRecord(
        actor_id=get_current_user().id if get_current_user() else None,
        action="node_recognition_updated",
        entity_type="node_recognition_mapping",
        entity_id=f"{mapping.from_node_id}:{mapping.to_node_id}",
    ))
    db.session.commit()
    return ok({"recognition": {
        "from_node_id": mapping.from_node_id,
        "to_node_id": mapping.to_node_id,
        "recognition_level": mapping.recognition_level,
        "active": mapping.active,
    }})


@federation_bp.route("/mutual-aid", methods=["GET", "POST"])
@require_permission("federation:manage")
def mutual_aid():
    if not is_enabled("federation_metrics"):
        return error("disabled", "Federation metrics disabled", status=403)
    if request.method == "GET":
        items = MutualAidFlag.query.all()
        payload = [{
            "from_node_id": item.from_node_id,
            "to_node_id": item.to_node_id,
            "status": item.status,
            "notes": item.notes,
        } for item in items]
        return ok({"mutual_aid": payload})
    payload = request.get_json() or {}
    flag = MutualAidFlag(
        from_node_id=payload.get("from_node_id"),
        to_node_id=payload.get("to_node_id"),
        status=payload.get("status", "active"),
        notes=payload.get("notes"),
    )
    db.session.add(flag)
    db.session.add(AuditRecord(
        actor_id=get_current_user().id if get_current_user() else None,
        action="mutual_aid_flag_created",
        entity_type="mutual_aid_flag",
        entity_id=f"{flag.from_node_id}:{flag.to_node_id}",
    ))
    db.session.commit()
    return ok({"id": flag.id}, status=201)


@federation_bp.route("/protocols", methods=["POST"])
@require_permission("federation:manage")
def set_protocol():
    if not is_enabled("federation_metrics"):
        return error("disabled", "Federation metrics disabled", status=403)
    payload = request.get_json() or {}
    node_id = payload.get("node_id")
    version_label = payload.get("version_label")
    if not node_id or not version_label:
        return error("validation_error", "node_id and version_label required", status=400)
    FederationProtocolVersion.query.filter_by(node_id=node_id).update({"active": False})
    record = FederationProtocolVersion(node_id=node_id, version_label=version_label, active=True)
    db.session.add(record)
    db.session.add(AuditRecord(
        actor_id=get_current_user().id if get_current_user() else None,
        action="federation_protocol_set",
        entity_type="federation_protocol_version",
        entity_id=str(node_id),
        payload={"version_label": version_label},
    ))
    db.session.commit()
    return ok({"node_id": node_id, "version_label": version_label})
