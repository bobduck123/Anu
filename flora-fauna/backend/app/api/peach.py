from __future__ import annotations

from flask import Blueprint, g, request

from ..extensions import db, limiter
from ..models import (
    AuditLog,
    Node,
    PeachConsentOperationRequest,
    PeachConsentRecord,
    PeachContribution,
    PeachContributionReviewEvent,
    PeachSupportIntent,
)
from ..security.control_plane import control_plane_required
from ..time_utils import now_utc
from .utils import error, ok


peach_bp = Blueprint("peach", __name__, url_prefix="/peach")
peach_control_bp = Blueprint("peach_control", __name__, url_prefix="/control/peach")

FIELD_001_ID = "PEACH-FIELD-001"
FIELD_001_SLUG = "studying-ourselves"
CONSENT_VERSION = "gate9-v1"

CONTRIBUTION_TYPES = {
    "text_reflection",
    "question",
    "memory",
    "research_note",
    "archive_fragment",
    "other",
}
VISIBILITY_PREFERENCES = {
    "private",
    "internal",
    "anonymous_public",
    "credited_public",
    "yield_only",
    "follow_up_required",
}
CONSENT_LEVELS = {
    "private_to_stewards",
    "internal_discussion",
    "anonymous_quote",
    "public_credit",
    "yield_inclusion",
    "follow_up_required",
}
REVIEW_STATUSES = {"pending_review", "held", "accepted_private", "rejected"}
STEWARD_REVIEW_TARGET_STATUSES = {"held", "accepted_private", "rejected"}
CREDIT_PREFERENCES = {
    "full_name",
    "chosen_name",
    "organization",
    "pseudonym",
    "anonymous",
    "credit_withheld",
    "follow_up_before_crediting",
}
CONSENT_OPERATION_TYPES = {"export", "withdrawal"}
CONSENT_OPERATION_STATUSES = {"pending_steward_review", "in_review", "completed", "rejected"}
STEWARD_CONSENT_OPERATION_TARGET_STATUSES = {"in_review", "completed", "rejected"}
SUPPORT_TYPES = {"membership", "one_off_support", "sponsor_access", "sponsor_field", "sponsor_yield"}
SUPPORT_STATUSES = {"manual_enquiry", "pending_follow_up", "closed"}

MAX_BODY_LENGTH = 5000
MAX_SHORT_LENGTH = 240
MAX_NOTE_LENGTH = 1000
MAX_DETAIL_LENGTH = 2000


def _text(value, *, max_length=MAX_SHORT_LENGTH):
    if not isinstance(value, str):
        return ""
    return value.strip()[:max_length]


def _bool(value) -> bool:
    return value is True


def _optional_int(value) -> int | None:
    if value in (None, ""):
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _node_id_for_field() -> int | None:
    node = Node.query.filter_by(slug="anu").first()
    return node.id if node else None


def _contribution_public_payload(row: PeachContribution) -> dict:
    return {
        "id": row.id,
        "fieldId": row.field_id,
        "fieldSlug": row.field_slug,
        "reviewStatus": row.review_status,
        "publicDisplay": False,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
    }


def _consent_payload(row: PeachConsentRecord) -> dict:
    return {
        "id": row.id,
        "contributionId": row.contribution_id,
        "consentVersion": row.consent_version,
        "consentLevel": row.consent_level,
        "permissionForYield": bool(row.permission_for_yield),
        "creditPreference": row.credit_preference,
        "visibilityPreference": row.visibility_preference,
        "acceptedTerms": bool(row.accepted_terms),
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "stewardReviewedAt": row.steward_reviewed_at.isoformat() if row.steward_reviewed_at else None,
        "stewardReviewedBy": row.steward_reviewed_by,
    }


def _steward_contribution_payload(row: PeachContribution, *, include_body: bool = False) -> dict:
    consent = row.consent_records[0] if row.consent_records else None
    payload = {
        "id": row.id,
        "fieldId": row.field_id,
        "fieldSlug": row.field_slug,
        "contributionType": row.contribution_type,
        "contributorChosenCredit": row.contributor_chosen_credit,
        "contactMethod": row.contact_method,
        "visibilityPreference": row.visibility_preference,
        "creditPreference": row.credit_preference,
        "permissionForYield": bool(row.permission_for_yield),
        "sensitiveMaterialFlag": bool(row.sensitive_material_flag),
        "youthMaterialFlag": bool(row.youth_material_flag),
        "reviewStatus": row.review_status,
        "publicDisplay": False,
        "stewardNote": row.steward_note,
        "reviewedAt": row.reviewed_at.isoformat() if row.reviewed_at else None,
        "reviewedBy": row.reviewed_by,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
        "consentRecord": _consent_payload(consent) if consent else None,
    }
    if include_body:
        payload["bodyText"] = row.body_text
    return payload


def _consent_operation_public_payload(row: PeachConsentOperationRequest) -> dict:
    return {
        "id": row.id,
        "operationType": row.operation_type,
        "status": row.status,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "message": "Consent operation request received for manual steward review.",
    }


def _steward_consent_operation_payload(row: PeachConsentOperationRequest) -> dict:
    return {
        "id": row.id,
        "contributionId": row.contribution_id,
        "contributorContact": row.contributor_contact,
        "contributorCreditOrName": row.contributor_credit_or_name,
        "operationType": row.operation_type,
        "requestDetail": row.request_detail,
        "status": row.status,
        "stewardNote": row.steward_note,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
        "reviewedAt": row.reviewed_at.isoformat() if row.reviewed_at else None,
        "reviewedBy": row.reviewed_by,
    }


def _support_intent_public_payload(row: PeachSupportIntent) -> dict:
    return {
        "id": row.id,
        "fieldId": row.field_id,
        "fieldSlug": row.field_slug,
        "supportType": row.support_type,
        "paymentTaken": False,
        "status": row.status,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "message": "Support intent received for manual follow-up. No payment was taken.",
    }


def _steward_support_intent_payload(row: PeachSupportIntent) -> dict:
    return {
        "id": row.id,
        "fieldId": row.field_id,
        "fieldSlug": row.field_slug,
        "supportType": row.support_type,
        "supporterName": row.supporter_name,
        "supporterContact": row.supporter_contact,
        "amountIntent": row.amount_intent,
        "currency": row.currency,
        "note": row.note,
        "paymentTaken": False,
        "status": row.status,
        "createdAt": row.created_at.isoformat() if row.created_at else None,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
    }


def _validate_contribution_payload(payload: dict) -> tuple[dict | None, tuple | None]:
    if not isinstance(payload, dict):
        return None, error("validation_error", "JSON object payload is required", 400)

    contribution_type = _text(payload.get("contributionType"))
    visibility_preference = _text(payload.get("visibilityPreference"))
    consent_level = _text(payload.get("consentLevel"))
    credit_preference = _text(payload.get("creditPreference"))
    body_text = _text(payload.get("body"), max_length=MAX_BODY_LENGTH + 1)
    contributor_chosen_credit = _text(payload.get("contributorChosenCredit"))
    contact_method = _text(payload.get("contactMethod"))

    if contribution_type not in CONTRIBUTION_TYPES:
        return None, error("validation_error", "Invalid contribution type", 400)
    if visibility_preference not in VISIBILITY_PREFERENCES:
        return None, error("validation_error", "Invalid visibility preference", 400)
    if consent_level not in CONSENT_LEVELS:
        return None, error("validation_error", "Invalid consent level", 400)
    if credit_preference not in CREDIT_PREFERENCES:
        return None, error("validation_error", "Invalid credit preference", 400)
    if not body_text:
        return None, error("validation_error", "Contribution body is required", 400)
    if len(body_text) > MAX_BODY_LENGTH:
        return None, error("validation_error", "Contribution body is too long", 400)
    if not contributor_chosen_credit:
        return None, error("validation_error", "Chosen credit is required", 400)
    if not contact_method:
        return None, error("validation_error", "Contact method is required", 400)
    if not _bool(payload.get("adultOnly")):
        return None, error("adult_only_required", "PEACH pilot intake is adult-only private testing", 400)
    if _bool(payload.get("sensitiveMaterialFlag")):
        return None, error("sensitive_material_disabled", "Sensitive material is not accepted in PEACH pilot intake", 400)
    if _bool(payload.get("youthMaterialFlag")):
        return None, error("youth_material_disabled", "Youth or child material is not accepted in PEACH pilot intake", 400)
    if not _bool(payload.get("acceptedTerms")):
        return None, error("consent_required", "Consent terms must be accepted", 400)

    return {
        "contribution_type": contribution_type,
        "visibility_preference": visibility_preference,
        "consent_level": consent_level,
        "credit_preference": credit_preference,
        "body_text": body_text,
        "contributor_chosen_credit": contributor_chosen_credit,
        "contact_method": contact_method,
        "permission_for_yield": _bool(payload.get("permissionForYield")),
        "accepted_terms": True,
    }, None


def _validate_consent_operation_payload(payload: dict) -> tuple[dict | None, tuple | None]:
    if not isinstance(payload, dict):
        return None, error("validation_error", "JSON object payload is required", 400)

    operation_type = _text(payload.get("operationType"))
    contributor_contact = _text(payload.get("contributorContact"))
    contributor_credit_or_name = _text(payload.get("contributorCreditOrName"))
    request_detail = _text(payload.get("requestDetail"), max_length=MAX_DETAIL_LENGTH + 1)
    contribution_id = _optional_int(payload.get("contributionId"))

    if operation_type not in CONSENT_OPERATION_TYPES:
        return None, error("validation_error", "Invalid consent operation type", 400)
    if not contributor_contact:
        return None, error("validation_error", "Contributor contact is required", 400)
    if not contributor_credit_or_name:
        return None, error("validation_error", "Contributor credit or name is required", 400)
    if not request_detail:
        return None, error("validation_error", "Request detail is required", 400)
    if len(request_detail) > MAX_DETAIL_LENGTH:
        return None, error("validation_error", "Request detail is too long", 400)
    if not _bool(payload.get("adultOnly")):
        return None, error("adult_only_required", "Consent operation requests are adult-only in the PEACH pilot", 400)
    if _bool(payload.get("sensitiveMaterialFlag")):
        return None, error("sensitive_material_disabled", "Sensitive material is not accepted in PEACH consent requests", 400)
    if _bool(payload.get("youthMaterialFlag")):
        return None, error("youth_material_disabled", "Youth or child material is not accepted in PEACH consent requests", 400)
    if not _bool(payload.get("acceptedTerms")):
        return None, error("consent_required", "Manual consent operation terms must be accepted", 400)
    if contribution_id and not db.session.get(PeachContribution, contribution_id):
        return None, error("not_found", "Referenced PEACH Contribution was not found", 404)

    return {
        "operation_type": operation_type,
        "contribution_id": contribution_id,
        "contributor_contact": contributor_contact,
        "contributor_credit_or_name": contributor_credit_or_name,
        "request_detail": request_detail,
    }, None


def _validate_support_intent_payload(payload: dict) -> tuple[dict | None, tuple | None]:
    if not isinstance(payload, dict):
        return None, error("validation_error", "JSON object payload is required", 400)

    support_type = _text(payload.get("supportType"))
    supporter_name = _text(payload.get("supporterName")) or None
    supporter_contact = _text(payload.get("supporterContact")) or None
    amount_intent = _text(payload.get("amountIntent"), max_length=80) or None
    currency = _text(payload.get("currency"), max_length=12) or None
    note = _text(payload.get("note"), max_length=MAX_DETAIL_LENGTH) or None

    if support_type not in SUPPORT_TYPES:
        return None, error("validation_error", "Invalid support type", 400)
    if payload.get("paymentTaken") is True:
        return None, error("payment_forbidden", "PEACH support intents cannot take payment", 400)
    if not _bool(payload.get("adultOnly")):
        return None, error("adult_only_required", "Support intents are adult-only in the PEACH pilot", 400)
    if _bool(payload.get("sensitiveMaterialFlag")):
        return None, error("sensitive_material_disabled", "Sensitive material is not accepted in PEACH support intents", 400)
    if _bool(payload.get("youthMaterialFlag")):
        return None, error("youth_material_disabled", "Youth or child material is not accepted in PEACH support intents", 400)
    if not _bool(payload.get("acceptedTerms")):
        return None, error("consent_required", "Manual support-intent terms must be accepted", 400)

    return {
        "support_type": support_type,
        "supporter_name": supporter_name,
        "supporter_contact": supporter_contact,
        "amount_intent": amount_intent,
        "currency": currency,
        "note": note,
    }, None


@peach_bp.route("/fields/<string:slug>/contributions", methods=["POST"])
@limiter.limit("6 per minute; 30 per hour")
def submit_contribution(slug):
    if slug != FIELD_001_SLUG:
        return error("not_found", "PEACH Field not found", 404)

    data, validation_error = _validate_contribution_payload(request.get_json(silent=True) or {})
    if validation_error:
        return validation_error

    contribution = PeachContribution(
        field_id=FIELD_001_ID,
        field_slug=FIELD_001_SLUG,
        contribution_type=data["contribution_type"],
        contributor_chosen_credit=data["contributor_chosen_credit"],
        contact_method=data["contact_method"],
        body_text=data["body_text"],
        visibility_preference=data["visibility_preference"],
        credit_preference=data["credit_preference"],
        permission_for_yield=data["permission_for_yield"],
        sensitive_material_flag=False,
        youth_material_flag=False,
        review_status="pending_review",
        public_display=False,
    )
    db.session.add(contribution)
    db.session.flush()

    consent = PeachConsentRecord(
        contribution_id=contribution.id,
        consent_version=CONSENT_VERSION,
        consent_level=data["consent_level"],
        permission_for_yield=data["permission_for_yield"],
        credit_preference=data["credit_preference"],
        visibility_preference=data["visibility_preference"],
        accepted_terms=True,
    )
    db.session.add(consent)
    db.session.add(AuditLog(
        node_id=_node_id_for_field(),
        actor_id=None,
        event="peach.contribution.created",
        entity_type="PeachContribution",
        entity_id=str(contribution.id),
        metadata_json={
            "field_slug": FIELD_001_SLUG,
            "review_status": "pending_review",
            "public_display": False,
            "consent_version": CONSENT_VERSION,
        },
        sensitive_read=False,
        ip_address=request.remote_addr,
    ))
    db.session.commit()

    return ok({
        "contribution": _contribution_public_payload(contribution),
        "message": "Contribution received privately and pending steward review.",
    }, status=201)


@peach_bp.route("/consent/request", methods=["POST"])
@limiter.limit("6 per minute; 30 per hour")
def submit_consent_operation_request():
    data, validation_error = _validate_consent_operation_payload(request.get_json(silent=True) or {})
    if validation_error:
        return validation_error

    row = PeachConsentOperationRequest(
        contribution_id=data["contribution_id"],
        contributor_contact=data["contributor_contact"],
        contributor_credit_or_name=data["contributor_credit_or_name"],
        operation_type=data["operation_type"],
        request_detail=data["request_detail"],
        status="pending_steward_review",
    )
    db.session.add(row)
    db.session.flush()
    db.session.add(AuditLog(
        node_id=_node_id_for_field(),
        actor_id=None,
        event="peach.consent_operation.request_created",
        entity_type="PeachConsentOperationRequest",
        entity_id=str(row.id),
        metadata_json={
            "operation_type": row.operation_type,
            "status": row.status,
            "contribution_id": row.contribution_id,
            "public_display": False,
        },
        sensitive_read=False,
        ip_address=request.remote_addr,
    ))
    db.session.commit()

    return ok({"consentOperationRequest": _consent_operation_public_payload(row)}, status=201)


@peach_bp.route("/fields/<string:slug>/support-intents", methods=["POST"])
@limiter.limit("6 per minute; 30 per hour")
def submit_support_intent(slug):
    if slug != FIELD_001_SLUG:
        return error("not_found", "PEACH Field not found", 404)

    data, validation_error = _validate_support_intent_payload(request.get_json(silent=True) or {})
    if validation_error:
        return validation_error

    row = PeachSupportIntent(
        field_id=FIELD_001_ID,
        field_slug=FIELD_001_SLUG,
        support_type=data["support_type"],
        supporter_name=data["supporter_name"],
        supporter_contact=data["supporter_contact"],
        amount_intent=data["amount_intent"],
        currency=data["currency"],
        note=data["note"],
        payment_taken=False,
        status="manual_enquiry",
    )
    db.session.add(row)
    db.session.flush()
    db.session.add(AuditLog(
        node_id=_node_id_for_field(),
        actor_id=None,
        event="peach.support_intent.created",
        entity_type="PeachSupportIntent",
        entity_id=str(row.id),
        metadata_json={
            "field_slug": FIELD_001_SLUG,
            "support_type": row.support_type,
            "payment_taken": False,
            "status": row.status,
        },
        sensitive_read=False,
        ip_address=request.remote_addr,
    ))
    db.session.commit()

    return ok({"supportIntent": _support_intent_public_payload(row)}, status=201)


@peach_control_bp.route("/contributions", methods=["GET"])
@control_plane_required()
def list_steward_contributions():
    status = _text(request.args.get("status") or "pending_review")
    if status not in REVIEW_STATUSES:
        return error("validation_error", "Invalid review status", 400)
    rows = (
        PeachContribution.query.filter_by(review_status=status)
        .order_by(PeachContribution.created_at.asc(), PeachContribution.id.asc())
        .all()
    )
    return ok({"contributions": [_steward_contribution_payload(row, include_body=False) for row in rows]})


@peach_control_bp.route("/contributions/<int:contribution_id>", methods=["GET"])
@control_plane_required()
def read_steward_contribution(contribution_id):
    row = db.session.get(PeachContribution, contribution_id)
    if not row:
        return error("not_found", "PEACH Contribution not found", 404)
    return ok({"contribution": _steward_contribution_payload(row, include_body=True)})


@peach_control_bp.route("/contributions/<int:contribution_id>/review", methods=["PATCH"])
@control_plane_required()
def review_steward_contribution(contribution_id):
    row = db.session.get(PeachContribution, contribution_id)
    if not row:
        return error("not_found", "PEACH Contribution not found", 404)

    payload = request.get_json(silent=True) or {}
    new_status = _text(payload.get("reviewStatus"))
    steward_note = _text(payload.get("stewardNote"), max_length=MAX_NOTE_LENGTH) or None

    if new_status not in STEWARD_REVIEW_TARGET_STATUSES:
        return error("validation_error", "Invalid PEACH review status", 400)
    if payload.get("publicDisplay") is True:
        return error("public_display_forbidden", "PEACH cannot enable public contribution display", 400)

    previous_status = row.review_status
    steward_id = getattr(g, "control_user_id", None)
    now = now_utc()
    row.review_status = new_status
    row.public_display = False
    row.steward_note = steward_note
    row.reviewed_at = now
    row.reviewed_by = steward_id
    row.updated_at = now

    for consent in row.consent_records:
        consent.steward_reviewed_at = now
        consent.steward_reviewed_by = steward_id

    db.session.add(PeachContributionReviewEvent(
        contribution_id=row.id,
        previous_status=previous_status,
        new_status=new_status,
        steward_id=steward_id,
        steward_note=steward_note,
    ))
    db.session.add(AuditLog(
        node_id=_node_id_for_field(),
        actor_id=steward_id,
        event="peach.contribution.review_status_changed",
        entity_type="PeachContribution",
        entity_id=str(row.id),
        metadata_json={
            "field_slug": row.field_slug,
            "previous_status": previous_status,
            "new_status": new_status,
            "public_display": False,
        },
        sensitive_read=True,
        ip_address=request.remote_addr,
    ))
    db.session.commit()

    return ok({"contribution": _steward_contribution_payload(row, include_body=True)})


@peach_control_bp.route("/consent-operations", methods=["GET"])
@control_plane_required()
def list_steward_consent_operations():
    status = _text(request.args.get("status") or "pending_steward_review")
    if status not in CONSENT_OPERATION_STATUSES:
        return error("validation_error", "Invalid consent operation status", 400)
    rows = (
        PeachConsentOperationRequest.query.filter_by(status=status)
        .order_by(PeachConsentOperationRequest.created_at.asc(), PeachConsentOperationRequest.id.asc())
        .all()
    )
    return ok({"consentOperationRequests": [_steward_consent_operation_payload(row) for row in rows]})


@peach_control_bp.route("/consent-operations/<int:request_id>", methods=["PATCH"])
@control_plane_required()
def update_steward_consent_operation(request_id):
    row = db.session.get(PeachConsentOperationRequest, request_id)
    if not row:
        return error("not_found", "PEACH ConsentOperationRequest not found", 404)

    payload = request.get_json(silent=True) or {}
    new_status = _text(payload.get("status"))
    steward_note = _text(payload.get("stewardNote"), max_length=MAX_NOTE_LENGTH) or None

    if new_status not in STEWARD_CONSENT_OPERATION_TARGET_STATUSES:
        return error("validation_error", "Invalid consent operation status", 400)

    previous_status = row.status
    previous_note = row.steward_note
    steward_id = getattr(g, "control_user_id", None)
    now = now_utc()
    row.status = new_status
    row.steward_note = steward_note
    row.reviewed_at = now
    row.reviewed_by = steward_id
    row.updated_at = now

    if previous_status != new_status:
        db.session.add(AuditLog(
            node_id=_node_id_for_field(),
            actor_id=steward_id,
            event="peach.consent_operation.status_changed",
            entity_type="PeachConsentOperationRequest",
            entity_id=str(row.id),
            metadata_json={
                "operation_type": row.operation_type,
                "previous_status": previous_status,
                "new_status": new_status,
            },
            sensitive_read=True,
            ip_address=request.remote_addr,
        ))
    if previous_note != steward_note:
        db.session.add(AuditLog(
            node_id=_node_id_for_field(),
            actor_id=steward_id,
            event="peach.consent_operation.steward_note_changed",
            entity_type="PeachConsentOperationRequest",
            entity_id=str(row.id),
            metadata_json={
                "operation_type": row.operation_type,
                "status": new_status,
            },
            sensitive_read=True,
            ip_address=request.remote_addr,
        ))
    db.session.commit()

    return ok({"consentOperationRequest": _steward_consent_operation_payload(row)})


@peach_control_bp.route("/support-intents", methods=["GET"])
@control_plane_required()
def list_steward_support_intents():
    status = _text(request.args.get("status") or "")
    query = PeachSupportIntent.query
    if status:
        if status not in SUPPORT_STATUSES:
            return error("validation_error", "Invalid support intent status", 400)
        query = query.filter_by(status=status)
    rows = query.order_by(PeachSupportIntent.created_at.asc(), PeachSupportIntent.id.asc()).all()
    return ok({"supportIntents": [_steward_support_intent_payload(row) for row in rows]})
