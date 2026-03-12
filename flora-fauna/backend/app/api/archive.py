from flask import Blueprint, request

from ..security.policy import require_permission, get_current_user
from ..security.alpha import alpha_jwt_required
from ..models import CulturalArchiveEntry, db
from .utils import ok, error

archive_bp = Blueprint("archive", __name__, url_prefix="/archive")


@archive_bp.route("", methods=["GET"])
@alpha_jwt_required()
def list_entries():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    entry_type = request.args.get("type")
    tag = request.args.get("tag")
    query = CulturalArchiveEntry.query.filter_by(node_id=user.node_id)
    if entry_type:
        query = query.filter_by(entry_type=entry_type)
    entries = query.order_by(CulturalArchiveEntry.created_at.desc()).limit(50).all()
    results = []
    for e in entries:
        if tag and e.tags and tag not in e.tags:
            continue
        results.append({
            "id": e.id,
            "entry_type": e.entry_type,
            "title": e.title,
            "description": e.description,
            "storage_ref": e.storage_ref,
            "tags": e.tags,
            "is_immutable": e.is_immutable,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })
    return ok({"entries": results})


@archive_bp.route("", methods=["POST"])
@require_permission("archive:manage")
def create_entry():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    entry = CulturalArchiveEntry(
        node_id=user.node_id,
        entry_type=payload.get("entry_type", "cultural_artifact"),
        title=payload.get("title", ""),
        description=payload.get("description"),
        storage_ref=payload.get("storage_ref"),
        tags=payload.get("tags"),
        metadata_json=payload.get("metadata"),
        is_immutable=payload.get("is_immutable", True),
        created_by=user.id,
    )
    db.session.add(entry)
    db.session.commit()
    return ok({"id": entry.id}, status=201)
