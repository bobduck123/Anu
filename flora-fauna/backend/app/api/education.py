from datetime import datetime
import hashlib
import uuid

from flask import Blueprint, request, Response

from ..extensions import db
from ..models import (
    LearningTrack,
    Module,
    Lesson,
    Assessment,
    Certification,
    CertificationSkillTag,
    CompletionRecord,
    RiskTier,
    CompetencyProfile,
    GovernanceEligibilityLink,
    AuditRecord,
    VersionHistory,
    ExternalReviewer,
    ExternalValidationRecord,
)
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user, require_permission
from ..services.feature_flag_service import is_enabled
from ..services import credential_ladder_service
from ..services import credit_engine_service
from .utils import ok, error


education_bp = Blueprint("education", __name__, url_prefix="/education")


PILLARS = [
    "Civic Literacy",
    "Sovereignty & Systems Literacy",
    "Personal & Community Capacity",
]


@education_bp.route("/pillars", methods=["GET"])
def list_pillars():
    return ok({"pillars": PILLARS})


@education_bp.route("/tracks", methods=["GET"])
def list_tracks():
    tracks = LearningTrack.query.filter_by(is_active=True).order_by(LearningTrack.created_at.desc()).all()
    payload = [{
        "id": track.id,
        "pillar": track.pillar,
        "title": track.title,
        "description": track.description,
        "jurisdiction_default": track.jurisdiction_default,
        "version": track.version,
    } for track in tracks]
    return ok({"tracks": payload})


@education_bp.route("/tracks/<int:track_id>", methods=["GET"])
def get_track(track_id):
    track = LearningTrack.query.get_or_404(track_id)
    modules = Module.query.filter_by(track_id=track.id, is_active=True).order_by(Module.sequence.asc()).all()
    payload = {
        "track": {
            "id": track.id,
            "pillar": track.pillar,
            "title": track.title,
            "description": track.description,
            "jurisdiction_default": track.jurisdiction_default,
            "version": track.version,
        },
        "modules": [{
            "id": module.id,
            "title": module.title,
            "description": module.description,
            "sequence": module.sequence,
            "completion_threshold": module.completion_threshold,
            "retake_limit": module.retake_limit,
            "expiry_months": module.expiry_months,
            "version": module.version,
        } for module in modules],
    }
    return ok(payload)


@education_bp.route("/modules/<int:module_id>", methods=["GET"])
def get_module(module_id):
    module = Module.query.get_or_404(module_id)
    lessons = Lesson.query.filter_by(module_id=module.id, is_active=True).order_by(Lesson.sequence.asc()).all()
    assessment = Assessment.query.filter_by(module_id=module.id, is_active=True).first()
    payload = {
        "module": {
            "id": module.id,
            "title": module.title,
            "description": module.description,
            "sequence": module.sequence,
            "completion_threshold": module.completion_threshold,
            "retake_limit": module.retake_limit,
            "expiry_months": module.expiry_months,
            "version": module.version,
        },
        "lessons": [{
            "id": lesson.id,
            "title": lesson.title,
            "delivery_type": lesson.delivery_type,
            "content_ref": lesson.content_ref,
            "sequence": lesson.sequence,
            "version": lesson.version,
        } for lesson in lessons],
        "assessment": {
            "id": assessment.id,
            "title": assessment.title,
            "pass_score": assessment.pass_score,
            "retake_limit": assessment.retake_limit,
            "version": assessment.version,
        } if assessment else None,
    }
    return ok(payload)


@education_bp.route("/lessons/<int:lesson_id>", methods=["GET"])
def get_lesson(lesson_id):
    lesson = Lesson.query.get_or_404(lesson_id)
    payload = {
        "id": lesson.id,
        "module_id": lesson.module_id,
        "title": lesson.title,
        "delivery_type": lesson.delivery_type,
        "content_ref": lesson.content_ref,
        "sequence": lesson.sequence,
        "version": lesson.version,
    }
    return ok(payload)


@education_bp.route("/assessments/<int:assessment_id>", methods=["GET"])
def get_assessment(assessment_id):
    assessment = Assessment.query.get_or_404(assessment_id)
    payload = {
        "id": assessment.id,
        "module_id": assessment.module_id,
        "title": assessment.title,
        "pass_score": assessment.pass_score,
        "retake_limit": assessment.retake_limit,
        "version": assessment.version,
    }
    return ok(payload)


@education_bp.route("/progress", methods=["GET"])
@alpha_jwt_required()
def get_progress():
    user = get_current_user()
    if not user:
        return ok({"records": []})
    records = CompletionRecord.query.filter_by(user_id=user.id).all()
    payload = [{
        "id": record.id,
        "entity_type": record.entity_type,
        "entity_id": record.entity_id,
        "progress_percent": record.progress_percent,
        "completed_at": record.completed_at.isoformat() if record.completed_at else None,
        "score": record.score,
    } for record in records]
    return ok({"records": payload})


@education_bp.route("/progress", methods=["POST"])
@alpha_jwt_required()
def upsert_progress():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    entity_type = payload.get("entity_type")
    entity_id = payload.get("entity_id")
    progress = int(payload.get("progress_percent") or 0)
    if entity_type not in {"lesson", "module", "assessment"} or not entity_id:
        return error("validation_error", "Invalid progress payload", status=400)
    record = CompletionRecord.query.filter_by(user_id=user.id, entity_type=entity_type, entity_id=entity_id).first()
    if not record:
        record = CompletionRecord(user_id=user.id, entity_type=entity_type, entity_id=entity_id)
        db.session.add(record)
    record.progress_percent = max(record.progress_percent, min(100, progress))
    if record.progress_percent >= 100 and record.completed_at is None:
        record.completed_at = datetime.utcnow()
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="education_progress_update",
        entity_type=entity_type,
        entity_id=str(entity_id),
        payload={"progress_percent": record.progress_percent},
    ))
    db.session.commit()
    return ok({"id": record.id, "progress_percent": record.progress_percent, "completed_at": record.completed_at.isoformat() if record.completed_at else None})


@education_bp.route("/certifications", methods=["GET"])
@alpha_jwt_required()
def list_certifications():
    user = get_current_user()
    if not user:
        return ok({"certifications": []})
    certs = Certification.query.filter_by(user_id=user.id).order_by(Certification.issued_at.desc()).all()
    payload = [{
        "id": cert.id,
        "certificate_uid": cert.certificate_uid,
        "module_id": cert.module_id,
        "module_version": cert.module_version,
        "issued_at": cert.issued_at.isoformat() if cert.issued_at else None,
        "expires_at": cert.expires_at.isoformat() if cert.expires_at else None,
        "revoked_at": cert.revoked_at.isoformat() if cert.revoked_at else None,
        "revoke_reason": cert.revoke_reason,
        "status": cert.status,
        "public_visible": cert.public_visible,
        "signature_hash": cert.signature_hash,
    } for cert in certs]
    return ok({"certifications": payload})


@education_bp.route("/certifications/issue", methods=["POST"])
@alpha_jwt_required()
def issue_certificate():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    module_id = payload.get("module_id")
    if not module_id:
        return error("validation_error", "module_id is required", status=400)
    module = Module.query.get(module_id)
    if not module:
        return error("not_found", "Module not found", status=404)
    eligible, reason = credential_ladder_service.is_eligible_for_module(user.id, module.id)
    if not eligible:
        return error("forbidden", reason or "Prerequisite not met", status=403)
    existing = Certification.query.filter_by(user_id=user.id, module_id=module_id, status="active").first()
    if existing:
        return ok({
            "certificate_uid": existing.certificate_uid,
            "module_id": existing.module_id,
            "module_version": existing.module_version,
            "issued_at": existing.issued_at.isoformat() if existing.issued_at else None,
            "status": existing.status,
        })
    signature_input = f"{user.id}:{module.id}:{module.version}:{datetime.utcnow().isoformat()}:{uuid.uuid4()}"
    signature_hash = hashlib.sha256(signature_input.encode("utf-8")).hexdigest()
    cert = Certification(
        certificate_uid=str(uuid.uuid4()),
        user_id=user.id,
        module_id=int(module_id),
        module_version=module.version,
        issued_at=datetime.utcnow(),
        public_visible=bool(payload.get("public_visible", False)),
        signature_hash=signature_hash,
        status="active",
    )
    db.session.add(cert)
    if is_enabled("civic_credit_engine"):
        credit_engine_service.award_credit(
            user_id=user.id,
            node_id=user.node_id or 1,
            amount=10,
            source_type="certification",
            description="Certification completion credit",
            reference_id=str(cert.certificate_uid),
        )
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="education_certificate_issued",
        entity_type="certification",
        entity_id=cert.certificate_uid,
    ))
    db.session.commit()
    return ok({
        "certificate_uid": cert.certificate_uid,
        "module_id": cert.module_id,
        "module_version": cert.module_version,
        "signature_hash": cert.signature_hash,
        "issued_at": cert.issued_at.isoformat() if cert.issued_at else None,
        "status": cert.status,
    }, status=201)


@education_bp.route("/certifications/verify/<certificate_uid>", methods=["GET"])
def verify_certificate(certificate_uid):
    cert = Certification.query.filter_by(certificate_uid=certificate_uid).first()
    if not cert:
        return error("not_found", "Certificate not found", status=404)
    if not cert.public_visible:
        return error("private", "Certificate is private", status=403)
    validation = ExternalValidationRecord.query.filter_by(certification_id=cert.id).order_by(
        ExternalValidationRecord.created_at.desc()
    ).first()
    return ok({
        "certificate_uid": cert.certificate_uid,
        "module_id": cert.module_id,
        "module_version": cert.module_version,
        "issued_at": cert.issued_at.isoformat() if cert.issued_at else None,
        "expires_at": cert.expires_at.isoformat() if cert.expires_at else None,
        "revoked_at": cert.revoked_at.isoformat() if cert.revoked_at else None,
        "revoke_reason": cert.revoke_reason,
        "status": cert.status,
        "signature_hash": cert.signature_hash,
        "external_validation": {
            "status": validation.status,
            "validated_at": validation.validated_at.isoformat() if validation.validated_at else None,
        } if validation else None,
    })


@education_bp.route("/certifications/public", methods=["GET"])
def public_registry():
    if not is_enabled("credential_registry"):
        return error("disabled", "Credential registry is disabled", status=403)
    module_id = request.args.get("module_id")
    query = Certification.query.filter_by(public_visible=True)
    if module_id:
        query = query.filter_by(module_id=int(module_id))
    certs = query.order_by(Certification.issued_at.desc()).limit(200).all()
    payload = [{
        "certificate_uid": cert.certificate_uid,
        "module_id": cert.module_id,
        "module_version": cert.module_version,
        "issued_at": cert.issued_at.isoformat() if cert.issued_at else None,
        "status": cert.status,
        "signature_hash": cert.signature_hash,
    } for cert in certs]
    return ok({"certifications": payload})


@education_bp.route("/certifications/<certificate_uid>/revoke", methods=["POST"])
@require_permission("education:manage")
def revoke_certificate(certificate_uid):
    if not is_enabled("credential_registry"):
        return error("disabled", "Credential registry is disabled", status=403)
    user = get_current_user()
    payload = request.get_json() or {}
    reason = payload.get("reason") or "revoked"
    cert = Certification.query.filter_by(certificate_uid=certificate_uid).first()
    if not cert:
        return error("not_found", "Certificate not found", status=404)
    cert.status = "revoked"
    cert.revoked_at = datetime.utcnow()
    cert.revoke_reason = reason
    db.session.add(AuditRecord(
        actor_id=user.id if user else None,
        action="education_certificate_revoked",
        entity_type="certification",
        entity_id=cert.certificate_uid,
        payload={"reason": reason},
    ))
    db.session.commit()
    return ok({"certificate_uid": cert.certificate_uid, "status": cert.status, "revoked_at": cert.revoked_at.isoformat()})


@education_bp.route("/ladder", methods=["GET"])
def ladder_stages():
    if not is_enabled("credential_ladder"):
        return error("disabled", "Credential ladder is disabled", status=403)
    stages = credential_ladder_service.get_ladder_stages()
    payload = [{
        "id": stage.id,
        "slug": stage.slug,
        "title": stage.title,
        "level": stage.level,
        "required_module_ids": stage.required_module_ids or [],
    } for stage in stages]
    return ok({"stages": payload})


@education_bp.route("/ladder/status", methods=["GET"])
@alpha_jwt_required()
def ladder_status():
    if not is_enabled("credential_ladder"):
        return error("disabled", "Credential ladder is disabled", status=403)
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    status = credential_ladder_service.ladder_status(user.id)
    current = status["current_stage"]
    next_stage = status["next_stage"]
    credential_ladder_service.record_stage_audit(user.id, current)
    return ok({
        "current_stage": {
            "id": current.id,
            "slug": current.slug,
            "title": current.title,
            "level": current.level,
        } if current else None,
        "next_stage": {
            "id": next_stage.id,
            "slug": next_stage.slug,
            "title": next_stage.title,
            "level": next_stage.level,
        } if next_stage else None,
        "missing_module_ids": status["missing_module_ids"],
    })


@education_bp.route("/external-reviewers", methods=["GET", "POST"])
@require_permission("education:manage")
def external_reviewers():
    if not is_enabled("external_recognition"):
        return error("disabled", "External recognition is disabled", status=403)
    if request.method == "GET":
        reviewers = ExternalReviewer.query.order_by(ExternalReviewer.created_at.desc()).all()
        payload = [{
            "id": reviewer.id,
            "name": reviewer.name,
            "organization": reviewer.organization,
            "email": reviewer.email,
            "active": reviewer.active,
        } for reviewer in reviewers]
        return ok({"reviewers": payload})
    payload = request.get_json() or {}
    reviewer = ExternalReviewer(
        name=payload.get("name"),
        organization=payload.get("organization"),
        email=payload.get("email"),
        active=bool(payload.get("active", True)),
    )
    db.session.add(reviewer)
    db.session.add(AuditRecord(
        actor_id=get_current_user().id if get_current_user() else None,
        action="external_reviewer_created",
        entity_type="external_reviewer",
        entity_id=str(reviewer.email),
    ))
    db.session.commit()
    return ok({"id": reviewer.id}, status=201)


@education_bp.route("/certifications/<certificate_uid>/external-validate", methods=["POST"])
@require_permission("education:manage")
def external_validate(certificate_uid):
    if not is_enabled("external_recognition"):
        return error("disabled", "External recognition is disabled", status=403)
    payload = request.get_json() or {}
    reviewer_id = payload.get("reviewer_id")
    status = payload.get("status", "approved")
    cert = Certification.query.filter_by(certificate_uid=certificate_uid).first()
    if not cert:
        return error("not_found", "Certificate not found", status=404)
    record = ExternalValidationRecord(
        certification_id=cert.id,
        reviewer_id=reviewer_id,
        status=status,
        notes=payload.get("notes"),
        validated_at=datetime.utcnow() if status == "approved" else None,
    )
    db.session.add(record)
    db.session.add(AuditRecord(
        actor_id=get_current_user().id if get_current_user() else None,
        action="external_validation_recorded",
        entity_type="external_validation_record",
        entity_id=str(cert.certificate_uid),
        payload={"status": status},
    ))
    db.session.commit()
    return ok({"id": record.id, "status": record.status}, status=201)


@education_bp.route("/certifications/<certificate_uid>/skills", methods=["POST"])
@require_permission("education:manage")
def add_skill_tags(certificate_uid):
    payload = request.get_json() or {}
    tags = payload.get("tags") or []
    cert = Certification.query.filter_by(certificate_uid=certificate_uid).first()
    if not cert:
        return error("not_found", "Certificate not found", status=404)
    for tag in tags:
        db.session.add(CertificationSkillTag(certification_id=cert.id, skill_tag=tag))
    db.session.commit()
    return ok({"tags": tags})


@education_bp.route("/transcript", methods=["GET"])
@alpha_jwt_required()
def transcript_export():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    format_type = request.args.get("format", "json")
    certs = Certification.query.filter_by(user_id=user.id).order_by(Certification.issued_at.desc()).all()
    payload = [{
        "certificate_uid": cert.certificate_uid,
        "module_id": cert.module_id,
        "module_version": cert.module_version,
        "status": cert.status,
        "issued_at": cert.issued_at.isoformat() if cert.issued_at else None,
    } for cert in certs]
    if format_type == "pdf":
        text = "Commons Credential Transcript\n\n" + "\n".join(
            f"{c['certificate_uid']} | Module {c['module_id']} | {c['status']}" for c in payload
        )
        pdf_bytes = _simple_pdf(text)
        return Response(pdf_bytes, mimetype="application/pdf")
    return ok({"transcript": payload})


def _simple_pdf(text):
    # Minimal PDF generator, content-neutral
    content = text.replace("(", "[").replace(")", "]")
    stream = f"BT /F1 12 Tf 72 720 Td ({content}) Tj ET"
    objects = [
        b"%PDF-1.4\n",
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
        f"4 0 obj << /Length {len(stream)} >> stream\n{stream}\nendstream endobj\n".encode("utf-8"),
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    ]
    xref_positions = []
    output = b""
    for obj in objects:
        xref_positions.append(len(output))
        output += obj
    xref_start = len(output)
    output += b"xref\n0 6\n0000000000 65535 f \n"
    for pos in xref_positions:
        output += f"{pos:010} 00000 n \n".encode("utf-8")
    output += b"trailer << /Size 6 /Root 1 0 R >>\nstartxref\n"
    output += f"{xref_start}\n%%EOF".encode("utf-8")
    return output


@education_bp.route("/risk-tiers", methods=["GET"])
def list_risk_tiers():
    tiers = RiskTier.query.order_by(RiskTier.level.asc()).all()
    payload = [{
        "id": tier.id,
        "name": tier.name,
        "description": tier.description,
        "level": tier.level,
        "min_cert_level": tier.min_cert_level,
        "compliance_required": tier.compliance_required,
    } for tier in tiers]
    return ok({"risk_tiers": payload})


@education_bp.route("/competency-profile", methods=["GET"])
@alpha_jwt_required()
def get_competency_profile():
    user = get_current_user()
    if not user:
        return ok({"profile": None})
    profile = CompetencyProfile.query.filter_by(user_id=user.id).first()
    payload = {
        "user_id": user.id,
        "competency_matrix": profile.competency_matrix if profile else {},
    }
    return ok({"profile": payload})


@education_bp.route("/governance-eligibility", methods=["GET"])
def governance_eligibility_links():
    links = GovernanceEligibilityLink.query.order_by(GovernanceEligibilityLink.role_key.asc()).all()
    payload = [{
        "role_key": link.role_key,
        "required_cert_level": link.required_cert_level,
        "required_competency": link.required_competency,
    } for link in links]
    return ok({"links": payload})


@education_bp.route("/audit/export", methods=["GET"])
@alpha_jwt_required()
def audit_export():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    records = AuditRecord.query.order_by(AuditRecord.created_at.desc()).limit(200).all()
    payload = [{
        "id": record.id,
        "actor_id": record.actor_id,
        "action": record.action,
        "entity_type": record.entity_type,
        "entity_id": record.entity_id,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    } for record in records]
    return ok({"records": payload})


@education_bp.route("/versions", methods=["GET"])
def version_history():
    entity_type = request.args.get("entity_type")
    entity_id = request.args.get("entity_id")
    query = VersionHistory.query
    if entity_type:
        query = query.filter_by(entity_type=entity_type)
    if entity_id:
        query = query.filter_by(entity_id=int(entity_id))
    history = query.order_by(VersionHistory.created_at.desc()).limit(100).all()
    payload = [{
        "entity_type": row.entity_type,
        "entity_id": row.entity_id,
        "version": row.version,
        "change_summary": row.change_summary,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    } for row in history]
    return ok({"history": payload})
