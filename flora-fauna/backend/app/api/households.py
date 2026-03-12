from flask import Blueprint, request

from ..models import HouseholdProfile, VerificationRecord, EvidenceAttachment, db
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user
from .utils import ok, error


households_bp = Blueprint("households", __name__, url_prefix="/households")


@households_bp.route("/verification", methods=["POST"])
@alpha_jwt_required()
def create_verification():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json(silent=True) or {}
    node_id = payload.get("node_id") or user.node_id or 1
    profile = HouseholdProfile.query.filter_by(user_id=user.id, node_id=node_id).first()
    if not profile:
        profile = HouseholdProfile(user_id=user.id, node_id=node_id, status="unverified")
        db.session.add(profile)
        db.session.commit()
    record = VerificationRecord(household_id=profile.id, status="pending")
    db.session.add(record)
    db.session.commit()
    return ok({"verification_id": record.id, "household_id": profile.id}, status=201)


@households_bp.route("/evidence/upload", methods=["POST"])
@alpha_jwt_required()
def evidence_upload():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json(silent=True) or {}
    verification_id = payload.get("verification_id")
    storage_key = payload.get("storage_key")
    if not verification_id or not storage_key:
        return error("validation_error", "verification_id and storage_key required", status=400)
    record = VerificationRecord.query.get(verification_id)
    if not record:
        return error("not_found", "Verification record not found", status=404)
    attachment = EvidenceAttachment(verification_id=record.id, storage_key=storage_key)
    db.session.add(attachment)
    db.session.commit()
    return ok({"attachment_id": attachment.id}, status=201)
