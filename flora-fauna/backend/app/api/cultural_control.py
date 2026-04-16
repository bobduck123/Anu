from __future__ import annotations

import re

from flask import Blueprint, current_app, request
from flask_jwt_extended import get_jwt
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import (
    CIGuidedJourney,
    CIGuidedJourneyModule,
    CILearningModule,
    CIQuestTemplate,
    Commitment,
    CommitmentEvidence,
    ControlAuditEvent,
)
from ..security.control_plane import control_plane_required, log_control_event
from ..security.control_tenant_scope import resolve_effective_control_managed_node_ids
from ..security.idempotency import idempotent_control_write
from ..security.policy import get_current_user
from ..time_utils import now_utc
from ..schemas import (
    ControlSiteBootstrapCreateSchema,
    ControlSiteDomainBindingsUpdateSchema,
    PublicSiteManifestAuthoringPublishSchema,
    PublicSiteManifestAuthoringUpdateSchema,
)
from ..services.public_site_authoring_service import (
    PublicSiteManifestAuthoringConflictError,
    PublicSiteManifestAuthoringNotFoundError,
    PublicSiteManifestAuthoringValidationError,
    get_public_site_manifest_authoring_payload,
    publish_public_site_manifest_authoring_draft,
    update_public_site_manifest_authoring,
)
from ..services.control_operator_assignment_service import (
    ControlOperatorAssignmentNotFoundError,
    ControlOperatorAssignmentValidationError,
    assign_control_operator_username,
    get_control_operator_assignments,
    unassign_control_operator_username,
)
from ..services.control_site_domain_service import (
    ControlSiteDomainConflictError,
    ControlSiteDomainNotFoundError,
    ControlSiteDomainValidationError,
    get_control_site_domain_bindings,
    update_control_site_domain_bindings,
)
from ..services.control_site_publish_readiness_service import (
    ControlSitePublishReadinessNotFoundError,
    evaluate_control_site_publish_readiness,
)
from ..services.control_site_bootstrap_service import (
    ControlSiteBootstrapConflictError,
    ControlSiteBootstrapValidationError,
    create_control_site_bootstrap,
)
from ..services.cultural_intel import (
    claim_next_connector_pull_job,
    connector_pull_queue_stats,
    create_patch,
    enqueue_connector_pull_job,
    ensure_default_quest_templates,
    get_connector_pull_job,
    heartbeat_connector_pull_job,
    list_connector_pull_jobs,
    list_connectors,
    list_control_audit_checkpoints,
    list_world_signing_keys,
    get_snapshot,
    process_connector_pull_job,
    publish_snapshot,
    pull_connector,
    register_connector,
    recover_stale_connector_pull_jobs,
    rotate_world_signing_key,
    export_control_audit_checkpoint,
    verify_control_audit_chain,
    verify_control_audit_checkpoint,
)
from ..services.cultural_intel.coordination import create_commitment, transition_commitment, verify_evidence
from .utils import error, ok


cultural_control_bp = Blueprint("cultural_control", __name__, url_prefix="/control")


SAFE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9._:-]{1,120}$")
MANIFEST_AUTHORING_UPDATE_SCHEMA = PublicSiteManifestAuthoringUpdateSchema()
MANIFEST_AUTHORING_PUBLISH_SCHEMA = PublicSiteManifestAuthoringPublishSchema()
SITE_DOMAIN_BINDINGS_UPDATE_SCHEMA = ControlSiteDomainBindingsUpdateSchema()
SITE_BOOTSTRAP_CREATE_SCHEMA = ControlSiteBootstrapCreateSchema()


def _is_safe_id(value: str) -> bool:
    return bool(SAFE_ID_PATTERN.match(value or ""))


def _safe_int(value, *, minimum: int | None = None, maximum: int | None = None) -> int | None:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    if minimum is not None and parsed < minimum:
        return None
    if maximum is not None and parsed > maximum:
        return None
    return parsed


def _safe_float(value, *, minimum: float | None = None, maximum: float | None = None) -> float | None:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if minimum is not None and parsed < minimum:
        return None
    if maximum is not None and parsed > maximum:
        return None
    return parsed


def _allowed_manifest_node_ids_for_request() -> set[int] | None:
    user = get_current_user()
    claims = get_jwt() or {}
    return resolve_effective_control_managed_node_ids(user=user, claims=claims)


def _require_manifest_node_scope(node_id: int):
    allowed = _allowed_manifest_node_ids_for_request()
    if allowed is None:
        return None
    if node_id in allowed:
        return None
    return error(
        "tenant_scope_forbidden",
        "Cross-tenant manifest access is not allowed for this operator.",
        403,
        details={
            "requested_node_id": node_id,
            "allowed_node_ids": sorted(allowed),
        },
    )


def _require_platform_admin_for_operator_assignments():
    user = get_current_user()
    claims = get_jwt() or {}
    role = str(claims.get("role") or getattr(user, "role", "") or "").strip().lower()
    if role != "platform_admin":
        return error(
            "platform_admin_required",
            "Platform admin role is required for operator assignment management.",
            403,
        )
    return None


def _require_platform_admin_for_site_domains():
    user = get_current_user()
    claims = get_jwt() or {}
    role = str(claims.get("role") or getattr(user, "role", "") or "").strip().lower()
    if role != "platform_admin":
        return error(
            "platform_admin_required",
            "Platform admin role is required for domain binding management.",
            403,
        )
    return None


def _require_platform_admin_for_publish_readiness():
    user = get_current_user()
    claims = get_jwt() or {}
    role = str(claims.get("role") or getattr(user, "role", "") or "").strip().lower()
    if role != "platform_admin":
        return error(
            "platform_admin_required",
            "Platform admin role is required for publish readiness checks.",
            403,
        )
    return None


def _require_platform_admin_for_site_bootstrap():
    user = get_current_user()
    claims = get_jwt() or {}
    role = str(claims.get("role") or getattr(user, "role", "") or "").strip().lower()
    if role != "platform_admin":
        return error(
            "platform_admin_required",
            "Platform admin role is required for node bootstrap.",
            403,
        )
    return None


@cultural_control_bp.route("/connectors", methods=["GET"])
@control_plane_required(scopes=["connectors:read"])
def list_control_connectors():
    return ok(list_connectors())


@cultural_control_bp.route("/sites/bootstrap", methods=["POST"])
@control_plane_required(scopes=["sites:bootstrap:write"])
@idempotent_control_write()
def create_control_site_bootstrap_route():
    role_error = _require_platform_admin_for_site_bootstrap()
    if role_error:
        return role_error

    user = get_current_user()
    incoming = request.get_json(silent=True)
    if not isinstance(incoming, dict):
        return error("validation_error", "Bootstrap payload must be a JSON object", 400)

    try:
        loaded_payload = SITE_BOOTSTRAP_CREATE_SCHEMA.load(incoming)
    except ValidationError as exc:
        return error("validation_error", "Bootstrap payload is invalid", 400, details=exc.messages)

    try:
        payload = create_control_site_bootstrap(**loaded_payload)
        db.session.commit()
    except ControlSiteBootstrapValidationError as exc:
        db.session.rollback()
        return error("validation_error", exc.message, 400, details=exc.details or {})
    except ControlSiteBootstrapConflictError as exc:
        db.session.rollback()
        error_code = "domain_binding_conflict" if (exc.details or {}).get("conflicting_domains") else "identifier_conflict"
        return error(error_code, exc.message, 409, details=exc.details or {})
    except ControlSiteDomainConflictError as exc:
        db.session.rollback()
        return error("domain_binding_conflict", exc.message, 409, details=exc.details)

    log_control_event(
        action="control_site_bootstrap_created",
        actor_id=user.id if user else None,
        target_type="node",
        target_id=str(payload.get("node", {}).get("id")),
        payload=payload.get("audit") or {},
    )
    return ok(payload, status=201)


@cultural_control_bp.route("/sites/<int:node_id>/operator-assignments", methods=["GET"])
@control_plane_required(scopes=["sites:operator-assignments:read"])
def get_control_site_operator_assignments(node_id: int):
    role_error = _require_platform_admin_for_operator_assignments()
    if role_error:
        return role_error

    try:
        payload = get_control_operator_assignments(node_id=node_id)
    except ControlOperatorAssignmentNotFoundError:
        return error("not_found", "Tenant node not found", 404)
    return ok(payload)


@cultural_control_bp.route("/sites/<int:node_id>/operator-assignments", methods=["POST"])
@control_plane_required(scopes=["sites:operator-assignments:write"])
@idempotent_control_write()
def assign_control_site_operator_assignment(node_id: int):
    role_error = _require_platform_admin_for_operator_assignments()
    if role_error:
        return role_error

    user = get_current_user()
    incoming = request.get_json(silent=True)
    if not isinstance(incoming, dict):
        return error("validation_error", "Operator assignment payload must be a JSON object", 400)

    try:
        payload = assign_control_operator_username(
            node_id=node_id,
            requested_username=str(incoming.get("username") or ""),
        )
        db.session.commit()
    except ControlOperatorAssignmentNotFoundError:
        db.session.rollback()
        return error("not_found", "Tenant node not found", 404)
    except ControlOperatorAssignmentValidationError as exc:
        db.session.rollback()
        return error("validation_error", exc.message, 400, details=exc.details)

    log_control_event(
        action="control_operator_assignment_assigned",
        actor_id=user.id if user else None,
        target_type="node",
        target_id=str(node_id),
        payload=payload.get("mutation") or {},
    )
    return ok(payload)


@cultural_control_bp.route("/sites/<int:node_id>/operator-assignments/<string:username>", methods=["DELETE"])
@control_plane_required(scopes=["sites:operator-assignments:write"])
@idempotent_control_write()
def unassign_control_site_operator_assignment(node_id: int, username: str):
    role_error = _require_platform_admin_for_operator_assignments()
    if role_error:
        return role_error

    user = get_current_user()
    try:
        payload = unassign_control_operator_username(
            node_id=node_id,
            requested_username=username,
        )
        db.session.commit()
    except ControlOperatorAssignmentNotFoundError:
        db.session.rollback()
        return error("not_found", "Tenant node not found", 404)
    except ControlOperatorAssignmentValidationError as exc:
        db.session.rollback()
        return error("validation_error", exc.message, 400, details=exc.details)

    log_control_event(
        action="control_operator_assignment_unassigned",
        actor_id=user.id if user else None,
        target_type="node",
        target_id=str(node_id),
        payload=payload.get("mutation") or {},
    )
    return ok(payload)


@cultural_control_bp.route("/sites/<int:node_id>/domain-bindings", methods=["GET"])
@control_plane_required(scopes=["sites:domains:read"])
def get_control_site_domain_bindings_route(node_id: int):
    role_error = _require_platform_admin_for_site_domains()
    if role_error:
        return role_error

    try:
        payload = get_control_site_domain_bindings(node_id=node_id)
    except ControlSiteDomainNotFoundError:
        return error("not_found", "Tenant node not found", 404)
    return ok(payload)


@cultural_control_bp.route("/sites/<int:node_id>/domain-bindings", methods=["PUT"])
@control_plane_required(scopes=["sites:domains:write"])
@idempotent_control_write()
def update_control_site_domain_bindings_route(node_id: int):
    role_error = _require_platform_admin_for_site_domains()
    if role_error:
        return role_error

    user = get_current_user()
    incoming = request.get_json(silent=True)
    if not isinstance(incoming, dict):
        return error("validation_error", "Domain binding payload must be a JSON object", 400)

    try:
        loaded_payload = SITE_DOMAIN_BINDINGS_UPDATE_SCHEMA.load(incoming)
    except ValidationError as exc:
        return error(
            "validation_error",
            "Domain binding payload is invalid",
            400,
            details=exc.messages,
        )

    try:
        payload = update_control_site_domain_bindings(
            node_id=node_id,
            canonical_domains=loaded_payload.get("canonical_domains"),
        )
        db.session.commit()
    except ControlSiteDomainNotFoundError:
        db.session.rollback()
        return error("not_found", "Tenant node not found", 404)
    except ControlSiteDomainValidationError as exc:
        db.session.rollback()
        return error("validation_error", exc.message, 400, details=exc.details)
    except ControlSiteDomainConflictError as exc:
        db.session.rollback()
        return error("domain_binding_conflict", exc.message, 409, details=exc.details)

    log_control_event(
        action="control_site_domain_bindings_updated",
        actor_id=user.id if user else None,
        target_type="node",
        target_id=str(node_id),
        payload=payload.get("mutation") or {},
    )
    return ok(payload)


@cultural_control_bp.route("/sites/<int:node_id>/publish-readiness", methods=["GET"])
@control_plane_required(scopes=["sites:publish-readiness:read"])
def get_control_site_publish_readiness_route(node_id: int):
    role_error = _require_platform_admin_for_publish_readiness()
    if role_error:
        return role_error

    try:
        payload = evaluate_control_site_publish_readiness(node_id=node_id)
    except ControlSitePublishReadinessNotFoundError:
        return error("not_found", "Tenant node not found", 404)
    return ok(payload)


@cultural_control_bp.route("/sites/<int:node_id>/manifest-authoring", methods=["GET"])
@control_plane_required(scopes=["sites:manifest:read"])
def get_control_site_manifest_authoring(node_id: int):
    scope_error = _require_manifest_node_scope(node_id)
    if scope_error:
        return scope_error
    try:
        payload = get_public_site_manifest_authoring_payload(node_id=node_id)
    except PublicSiteManifestAuthoringNotFoundError:
        return error("not_found", "Tenant node not found", 404)
    return ok(payload)


@cultural_control_bp.route("/sites/<int:node_id>/manifest-authoring", methods=["PATCH"])
@control_plane_required(scopes=["sites:manifest:write"])
@idempotent_control_write()
def update_control_site_manifest_authoring(node_id: int):
    scope_error = _require_manifest_node_scope(node_id)
    if scope_error:
        return scope_error
    user = get_current_user()
    incoming = request.get_json(silent=True)
    if not isinstance(incoming, dict):
        return error("validation_error", "Manifest authoring payload must be a JSON object", 400)

    try:
        loaded_payload = MANIFEST_AUTHORING_UPDATE_SCHEMA.load(incoming)
    except ValidationError as exc:
        return error(
            "validation_error",
            "Manifest authoring payload is invalid",
            400,
            details=exc.messages,
        )

    revision_token = str(loaded_payload.pop("revision_token", "")).strip()
    if not revision_token:
        return error(
            "validation_error",
            "revision_token is required",
            400,
            details={"revision_token": ["This field is required."]},
        )

    try:
        payload = update_public_site_manifest_authoring(
            node_id=node_id,
            patch_payload=loaded_payload,
            expected_revision_token=revision_token,
        )
        db.session.commit()
    except PublicSiteManifestAuthoringNotFoundError:
        db.session.rollback()
        return error("not_found", "Tenant node not found", 404)
    except PublicSiteManifestAuthoringValidationError as exc:
        db.session.rollback()
        return error("validation_error", exc.message, 400, details=exc.details)
    except PublicSiteManifestAuthoringConflictError as exc:
        db.session.rollback()
        return error(
            "manifest_authoring_revision_conflict",
            exc.message,
            409,
            details={
                "latest_revision_token": exc.latest_revision_token,
                "latest_payload": exc.latest_payload,
                "conflict_message": exc.message,
            },
        )

    log_control_event(
        action="public_site_manifest_authoring_updated",
        actor_id=user.id if user else None,
        target_type="node",
        target_id=str(node_id),
        payload=payload.get("audit") or {},
    )
    return ok(payload)


@cultural_control_bp.route("/sites/<int:node_id>/manifest-authoring/publish", methods=["POST"])
@control_plane_required(scopes=["sites:manifest:write"])
@idempotent_control_write()
def publish_control_site_manifest_authoring(node_id: int):
    scope_error = _require_manifest_node_scope(node_id)
    if scope_error:
        return scope_error
    user = get_current_user()
    incoming = request.get_json(silent=True)
    if not isinstance(incoming, dict):
        return error("validation_error", "Publish payload must be a JSON object", 400)

    try:
        publish_payload = MANIFEST_AUTHORING_PUBLISH_SCHEMA.load(incoming)
    except ValidationError as exc:
        return error("validation_error", "Publish payload is invalid", 400, details=exc.messages)

    revision_token = str(publish_payload.get("revision_token") or "").strip()
    if not revision_token:
        return error(
            "validation_error",
            "revision_token is required",
            400,
            details={"revision_token": ["This field is required."]},
        )

    try:
        payload = publish_public_site_manifest_authoring_draft(
            node_id=node_id,
            expected_revision_token=revision_token,
            actor_id=user.id if user else None,
            actor_username=getattr(user, "username", None) if user else None,
        )
        db.session.commit()
    except PublicSiteManifestAuthoringNotFoundError:
        db.session.rollback()
        return error("not_found", "Tenant node not found", 404)
    except PublicSiteManifestAuthoringConflictError as exc:
        db.session.rollback()
        return error(
            "manifest_publish_revision_conflict",
            exc.message,
            409,
            details={
                "latest_revision_token": exc.latest_revision_token,
                "latest_payload": exc.latest_payload,
                "conflict_message": exc.message,
            },
        )

    log_control_event(
        action="public_site_manifest_published",
        actor_id=user.id if user else None,
        target_type="node",
        target_id=str(node_id),
        payload=payload.get("audit") or {},
    )
    return ok(payload)


@cultural_control_bp.route("/connectors/register", methods=["POST"])
@control_plane_required(scopes=["connectors:write"])
@idempotent_control_write()
def register_control_connector():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    connector_type = (payload.get("connector_type") or "").strip()
    source_slug = (payload.get("source_slug") or "").strip()
    if not name or not connector_type or not source_slug:
        return error("validation_error", "name, connector_type, and source_slug are required", 400)
    if not _is_safe_id(name) or not _is_safe_id(source_slug):
        return error("validation_error", "name/source_slug contains invalid characters", 400)

    row = register_connector(
        name=name,
        connector_type=connector_type,
        source_slug=source_slug,
        config=payload.get("config") or {},
        created_by=user.id if user else None,
    )
    ensure_default_quest_templates(created_by=user.id if user else None)
    db.session.commit()
    log_control_event(
        action="connector_registered",
        actor_id=user.id if user else None,
        target_type="connector",
        target_id=str(row.id),
        payload={"name": name, "connector_type": connector_type, "source_slug": source_slug},
    )
    return ok(
        {
            "id": row.id,
            "name": row.name,
            "connector_type": row.connector_type,
            "source_slug": row.source_slug,
            "status": row.status,
            "config": row.config_json or {},
        },
        status=201,
    )


@cultural_control_bp.route("/connectors/<int:connector_id>/pull", methods=["POST"])
@control_plane_required(scopes=["connectors:pull"])
@idempotent_control_write()
def pull_control_connector(connector_id: int):
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    async_default = bool(current_app.config.get("CONTROL_CONNECTOR_PULL_ASYNC_DEFAULT", False))
    use_async = bool(payload.get("async", async_default))
    max_attempts = _safe_int(payload.get("max_attempts"), minimum=1, maximum=20) or 5

    if use_async:
        request_key = (payload.get("request_key") or "").strip()[:160] or None
        job, deduped = enqueue_connector_pull_job(
            connector_id=connector_id,
            requested_by=user.id if user else None,
            payload={"requested_via": "control_api", "request_key": request_key},
            max_attempts=max_attempts,
        )
        db.session.commit()
        log_control_event(
            action="connector_pull_queued",
            actor_id=user.id if user else None,
            target_type="connector_pull_job",
            target_id=str(job.id),
            payload={"connector_id": connector_id},
        )
        return ok(
            {
                "queued": True,
                "deduped": bool(deduped),
                "job": job.to_dict(),
            },
            status=202,
        )

    try:
        result = pull_connector(connector_id)
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return error("validation_error", str(exc), 400)

    log_control_event(
        action="connector_pull",
        actor_id=user.id if user else None,
        target_type="connector",
        target_id=str(connector_id),
        payload=result,
    )
    return ok(result)


@cultural_control_bp.route("/connectors/<int:connector_id>/pull/async", methods=["POST"])
@control_plane_required(scopes=["connectors:pull"])
@idempotent_control_write()
def pull_control_connector_async(connector_id: int):
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    max_attempts = _safe_int(payload.get("max_attempts"), minimum=1, maximum=20) or 5
    request_key = (payload.get("request_key") or "").strip()[:160] or None
    job, deduped = enqueue_connector_pull_job(
        connector_id=connector_id,
        requested_by=user.id if user else None,
        payload={"requested_via": "control_api_async", "request_key": request_key},
        max_attempts=max_attempts,
    )
    db.session.commit()
    log_control_event(
        action="connector_pull_queued",
        actor_id=user.id if user else None,
        target_type="connector_pull_job",
        target_id=str(job.id),
        payload={"connector_id": connector_id},
    )
    return ok({"queued": True, "deduped": bool(deduped), "job": job.to_dict()}, status=202)


@cultural_control_bp.route("/connectors/jobs/<int:job_id>", methods=["GET"])
@control_plane_required(scopes=["connectors:read"])
def get_control_connector_job(job_id: int):
    job = get_connector_pull_job(job_id)
    if not job:
        return error("not_found", "Connector pull job not found", 404)
    return ok(job.to_dict())


@cultural_control_bp.route("/connectors/jobs", methods=["GET"])
@control_plane_required(scopes=["connectors:read"])
def list_control_connector_jobs():
    status = (request.args.get("status") or "").strip() or None
    connector_id = _safe_int(request.args.get("connector_id"), minimum=1)
    limit = _safe_int(request.args.get("limit"), minimum=1, maximum=500) or 100
    rows = list_connector_pull_jobs(limit=limit, status=status, connector_id=connector_id)
    return ok([row.to_dict() for row in rows])


@cultural_control_bp.route("/connectors/jobs/stats", methods=["GET"])
@control_plane_required(scopes=["connectors:read"])
def list_control_connector_job_stats():
    return ok(connector_pull_queue_stats())


@cultural_control_bp.route("/connectors/jobs/process-next", methods=["POST"])
@control_plane_required(scopes=["connectors:pull"])
@idempotent_control_write()
def process_next_control_connector_job():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    worker_id = (payload.get("worker_id") or f"manual-{user.id if user else 'system'}").strip()[:120]
    if not worker_id:
        return error("validation_error", "worker_id is required", 400)
    job = claim_next_connector_pull_job(worker_id=worker_id)
    if not job:
        return ok({"processed": False, "reason": "no_available_jobs"}, status=200)
    try:
        result = process_connector_pull_job(job.id, worker_id=worker_id)
        db.session.commit()
    except Exception as exc:
        db.session.commit()
        refreshed = get_connector_pull_job(job.id)
        log_control_event(
            action="connector_pull_job_failed",
            actor_id=user.id if user else None,
            target_type="connector_pull_job",
            target_id=str(job.id),
            payload={"error": str(exc)[:500], "status": refreshed.status if refreshed else "unknown"},
        )
        return ok(
            {
                "processed": True,
                "job": refreshed.to_dict() if refreshed else {"id": job.id},
                "error": str(exc),
            },
            status=200,
        )

    log_control_event(
        action="connector_pull_job_processed",
        actor_id=user.id if user else None,
        target_type="connector_pull_job",
        target_id=str(job.id),
        payload=result,
    )
    refreshed = get_connector_pull_job(job.id)
    return ok({"processed": True, "job": refreshed.to_dict() if refreshed else None, "result": result}, status=200)


@cultural_control_bp.route("/connectors/jobs/recover-stale", methods=["POST"])
@control_plane_required(scopes=["connectors:pull"])
@idempotent_control_write()
def recover_stale_control_connector_jobs():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    stale_after_seconds = _safe_int(payload.get("stale_after_seconds"), minimum=30, maximum=86_400)
    limit = _safe_int(payload.get("limit"), minimum=1, maximum=1000) or 100
    summary = recover_stale_connector_pull_jobs(
        stale_after_seconds=stale_after_seconds,
        limit=limit,
    )
    db.session.commit()
    log_control_event(
        action="connector_pull_jobs_recovered",
        actor_id=user.id if user else None,
        target_type="connector_pull_job",
        target_id=None,
        payload=summary,
    )
    return ok(summary, status=200)


@cultural_control_bp.route("/connectors/jobs/<int:job_id>/heartbeat", methods=["POST"])
@control_plane_required(scopes=["connectors:pull"])
@idempotent_control_write()
def heartbeat_control_connector_job(job_id: int):
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    worker_id = (payload.get("worker_id") or "").strip()[:120]
    if not worker_id:
        return error("validation_error", "worker_id is required", 400)
    lease_seconds = _safe_int(payload.get("lease_seconds"), minimum=5, maximum=3600)
    row = heartbeat_connector_pull_job(
        job_id=job_id,
        worker_id=worker_id,
        lease_seconds=lease_seconds,
    )
    if not row:
        return error("not_found", "Running connector pull job not found for worker", 404)
    db.session.commit()
    log_control_event(
        action="connector_pull_job_heartbeat",
        actor_id=user.id if user else None,
        target_type="connector_pull_job",
        target_id=str(job_id),
        payload={"worker_id": worker_id, "lease_seconds": lease_seconds},
    )
    return ok(row.to_dict(), status=200)


@cultural_control_bp.route("/worlds/<string:world_id>/publish", methods=["POST"])
@control_plane_required(scopes=["worlds:publish"])
@idempotent_control_write()
def publish_world_snapshot(world_id: str):
    if not _is_safe_id(world_id):
        return error("validation_error", "world_id contains invalid characters", 400)
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    try:
        result = publish_snapshot(world_id=world_id, payload=payload, actor_id=user.id if user else None)
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return error("publish_failed", str(exc), 400)
    except Exception:
        db.session.rollback()
        return error("publish_failed", "Unable to publish world snapshot", 400)

    log_control_event(
        action="world_snapshot_published",
        actor_id=user.id if user else None,
        target_type="world_snapshot",
        target_id=str(result.get("snapshot_id")),
        payload={"world_id": world_id, "version": result.get("manifest", {}).get("version")},
    )
    return ok(result, status=201)


@cultural_control_bp.route("/worlds/<string:world_id>/patch", methods=["POST"])
@control_plane_required(scopes=["worlds:patch"])
@idempotent_control_write()
def publish_world_patch(world_id: str):
    if not _is_safe_id(world_id):
        return error("validation_error", "world_id contains invalid characters", 400)
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    from_version = _safe_int(payload.get("from_version"), minimum=0, maximum=10_000)
    to_version = _safe_int(payload.get("to_version"), minimum=1, maximum=10_000)
    operations = payload.get("operations") or []
    if from_version is None or to_version is None:
        return error("validation_error", "from_version/to_version must be valid integers", 400)
    if not isinstance(operations, list):
        return error("validation_error", "operations must be a list", 400)
    if len(operations) > 1000:
        return error("validation_error", "Too many patch operations; max is 1000", 400)
    if to_version <= from_version:
        return error("validation_error", "to_version must be greater than from_version", 400)
    patch = create_patch(
        world_id=world_id,
        from_version=from_version,
        to_version=to_version,
        operations=operations,
        actor_id=user.id if user else None,
    )
    db.session.commit()
    log_control_event(
        action="world_patch_published",
        actor_id=user.id if user else None,
        target_type="world_patch",
        target_id=str(patch.id),
        payload={"world_id": world_id, "from_version": from_version, "to_version": to_version},
    )
    return ok(patch.to_dict(), status=201)


@cultural_control_bp.route("/worlds/<string:world_id>/verify", methods=["GET"])
@control_plane_required(scopes=["worlds:keys:read"])
def verify_world_snapshot(world_id: str):
    if not _is_safe_id(world_id):
        return error("validation_error", "world_id contains invalid characters", 400)
    parsed_version = _safe_int(request.args.get("version"), minimum=1, maximum=10_000)
    snapshot = get_snapshot(world_id=world_id, version=parsed_version)
    if not snapshot:
        return error("not_found", "World snapshot not found", 404)
    return ok(snapshot)


@cultural_control_bp.route("/worlds/signing-keys", methods=["GET"])
@control_plane_required(scopes=["worlds:keys:read"])
def list_control_world_signing_keys():
    return ok(list_world_signing_keys())


@cultural_control_bp.route("/worlds/signing-keys/rotate", methods=["POST"])
@control_plane_required(scopes=["worlds:keys:rotate"])
@idempotent_control_write()
def rotate_control_world_signing_key():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    new_key_id = (payload.get("new_key_id") or "").strip()
    grace_days = _safe_int(payload.get("grace_days"), minimum=0, maximum=365) or 30
    if not new_key_id:
        return error("validation_error", "new_key_id is required", 400)
    try:
        result = rotate_world_signing_key(new_key_id=new_key_id, actor_id=user.id if user else None, grace_days=grace_days)
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return error("validation_error", str(exc), 400)
    log_control_event(
        action="world_signing_key_rotated",
        actor_id=user.id if user else None,
        target_type="world_signing_key",
        target_id=str(result.get("id")),
        payload={"key_id": result.get("key_id"), "grace_days": grace_days},
    )
    return ok(result, status=201)


@cultural_control_bp.route("/education/modules", methods=["POST"])
@control_plane_required(scopes=["education:manage"])
@idempotent_control_write()
def create_ci_learning_module():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    slug = (payload.get("slug") or "").strip()
    if not title or not slug:
        return error("validation_error", "title and slug are required", 400)
    if not _is_safe_id(slug):
        return error("validation_error", "slug contains invalid characters", 400)
    module = CILearningModule(
        slug=slug,
        title=title,
        description=payload.get("description"),
        content_json=payload.get("content") or {},
        linked_entity_id=payload.get("linked_entity_id"),
        linked_cluster_id=payload.get("linked_cluster_id"),
        status=payload.get("status") or "draft",
        created_by=user.id if user else None,
        published_at=now_utc() if (payload.get("status") == "published") else None,
    )
    db.session.add(module)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error("conflict", "A learning module with this slug already exists", 409)
    log_control_event(
        action="learning_module_created",
        actor_id=user.id if user else None,
        target_type="learning_module",
        target_id=str(module.id),
        payload={"slug": slug, "status": module.status},
    )
    return ok(module.to_dict(), status=201)


@cultural_control_bp.route("/education/journeys", methods=["POST"])
@control_plane_required(scopes=["education:manage"])
@idempotent_control_write()
def create_ci_guided_journey():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    slug = (payload.get("slug") or "").strip()
    if not title or not slug:
        return error("validation_error", "title and slug are required", 400)
    if not _is_safe_id(slug):
        return error("validation_error", "slug contains invalid characters", 400)
    journey = CIGuidedJourney(
        slug=slug,
        title=title,
        description=payload.get("description"),
        status=payload.get("status") or "draft",
        created_by=user.id if user else None,
    )
    db.session.add(journey)
    db.session.flush()
    module_ids = payload.get("module_ids") or []
    if not isinstance(module_ids, list):
        db.session.rollback()
        return error("validation_error", "module_ids must be a list of integers", 400)
    for idx, module_id in enumerate(module_ids):
        parsed_module_id = _safe_int(module_id, minimum=1)
        if parsed_module_id is None:
            db.session.rollback()
            return error("validation_error", f"module_ids[{idx}] must be a positive integer", 400)
        db.session.add(
            CIGuidedJourneyModule(
                journey_id=journey.id,
                module_id=parsed_module_id,
                sequence=idx,
            )
        )
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error("conflict", "Journey slug or module links conflict with existing records", 409)
    log_control_event(
        action="guided_journey_created",
        actor_id=user.id if user else None,
        target_type="guided_journey",
        target_id=str(journey.id),
        payload={"slug": slug, "module_count": len(module_ids)},
    )
    return ok(journey.to_dict(), status=201)


@cultural_control_bp.route("/education/quests/templates", methods=["POST"])
@control_plane_required(scopes=["education:manage"])
@idempotent_control_write()
def create_ci_quest_template():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    slug = (payload.get("slug") or "").strip()
    title = (payload.get("title") or "").strip()
    if not slug or not title:
        return error("validation_error", "slug and title are required", 400)
    if not _is_safe_id(slug):
        return error("validation_error", "slug contains invalid characters", 400)

    min_cluster_score = _safe_float(payload.get("min_cluster_score", 0.0), minimum=0.0, maximum=1.0)
    if min_cluster_score is None:
        return error("validation_error", "min_cluster_score must be a number between 0 and 1", 400)
    reward_points = _safe_int(payload.get("reward_points", 0), minimum=0, maximum=1_000_000)
    if reward_points is None:
        return error("validation_error", "reward_points must be a non-negative integer", 400)

    linked_module_id = payload.get("linked_module_id")
    parsed_linked_module_id = _safe_int(linked_module_id, minimum=1) if linked_module_id is not None else None
    if linked_module_id is not None and parsed_linked_module_id is None:
        return error("validation_error", "linked_module_id must be a positive integer", 400)

    template = CIQuestTemplate(
        slug=slug,
        title=title,
        description=payload.get("description"),
        trigger_event_type=payload.get("trigger_event_type"),
        trigger_entity_type=payload.get("trigger_entity_type"),
        min_cluster_score=min_cluster_score,
        linked_module_id=parsed_linked_module_id,
        reward_points=reward_points,
        commitment_type=payload.get("commitment_type"),
        status=payload.get("status") or "active",
        created_by=user.id if user else None,
    )
    db.session.add(template)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return error("conflict", "A quest template with this slug already exists", 409)
    log_control_event(
        action="quest_template_created",
        actor_id=user.id if user else None,
        target_type="quest_template",
        target_id=str(template.id),
        payload={"slug": slug, "status": template.status},
    )
    return ok(template.to_dict(), status=201)


@cultural_control_bp.route("/coordination/commitments", methods=["POST"])
@control_plane_required(scopes=["coordination:manage"])
@idempotent_control_write()
def create_control_commitment():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    user_id = _safe_int(payload.get("user_id"), minimum=1)
    title = (payload.get("title") or "").strip()
    if not user_id or not title:
        return error("validation_error", "user_id and title are required", 400)
    commitment = create_commitment(
        user_id=user_id,
        title=title,
        description=payload.get("description"),
        source_type=payload.get("source_type"),
        source_id=str(payload.get("source_id")) if payload.get("source_id") is not None else None,
        created_by=user.id if user else None,
    )
    if payload.get("state") and payload.get("state") in Commitment.VALID_STATES:
        transition_commitment(commitment, payload.get("state"))
    db.session.commit()
    log_control_event(
        action="commitment_created",
        actor_id=user.id if user else None,
        target_type="commitment",
        target_id=str(commitment.id),
        payload=commitment.to_dict(),
    )
    return ok(commitment.to_dict(), status=201)


@cultural_control_bp.route("/coordination/evidence/<int:evidence_id>/verify", methods=["POST"])
@control_plane_required(scopes=["coordination:manage"])
@idempotent_control_write()
def verify_commitment_evidence(evidence_id: int):
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    accepted = bool(payload.get("accepted", True))
    notes = payload.get("notes")
    try:
        evidence = verify_evidence(
            evidence_id=evidence_id,
            verifier_id=user.id if user else 0,
            accepted=accepted,
            notes=notes,
        )
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return error("validation_error", str(exc), 400)
    log_control_event(
        action="commitment_evidence_verified",
        actor_id=user.id if user else None,
        target_type="commitment_evidence",
        target_id=str(evidence.id),
        payload={"accepted": accepted},
    )
    return ok(evidence.to_dict())


@cultural_control_bp.route("/audit/events", methods=["GET"])
@control_plane_required(scopes=["audit:read"])
def list_control_audit_events():
    limit = min(500, max(1, int(request.args.get("limit", 100))))
    rows = (
        ControlAuditEvent.query.order_by(ControlAuditEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    payload = [
        {
            "id": row.id,
            "actor_id": row.actor_id,
            "action": row.action,
            "target_type": row.target_type,
            "target_id": row.target_id,
            "method": row.method,
            "route": row.route,
            "ip_address": row.ip_address,
            "payload": row.payload or {},
            "chain_index": row.chain_index,
            "prev_hash": row.prev_hash,
            "event_hash": row.event_hash,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
    return ok(payload)


@cultural_control_bp.route("/audit/checkpoints/export", methods=["POST"])
@control_plane_required(scopes=["audit:export"])
@idempotent_control_write()
def export_control_audit_checkpoint_route():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    max_events = _safe_int(payload.get("max_events"), minimum=1, maximum=5000) or 1000
    row = export_control_audit_checkpoint(
        created_by=user.id if user else None,
        max_events=max_events,
    )
    if not row:
        return ok({"exported": False, "reason": "no_new_events"}, status=200)
    db.session.commit()
    log_control_event(
        action="control_audit_checkpoint_exported",
        actor_id=user.id if user else None,
        target_type="control_audit_checkpoint",
        target_id=str(row.id),
        payload={"from_event_id": row.from_event_id, "to_event_id": row.to_event_id},
    )
    return ok({"exported": True, "checkpoint": row.to_dict()}, status=201)


@cultural_control_bp.route("/audit/checkpoints", methods=["GET"])
@control_plane_required(scopes=["audit:read"])
def list_control_audit_checkpoint_route():
    limit = _safe_int(request.args.get("limit"), minimum=1, maximum=1000) or 100
    rows = list_control_audit_checkpoints(limit=limit)
    return ok([row.to_dict() for row in rows])


@cultural_control_bp.route("/audit/checkpoints/<int:checkpoint_id>/verify", methods=["GET"])
@control_plane_required(scopes=["audit:read"])
def verify_control_audit_checkpoint_route(checkpoint_id: int):
    payload = verify_control_audit_checkpoint(checkpoint_id=checkpoint_id)
    if not payload.get("ok") and payload.get("code") == "not_found":
        return error("not_found", "Control audit checkpoint not found", 404)
    return ok(payload)


@cultural_control_bp.route("/audit/verify", methods=["GET"])
@control_plane_required(scopes=["audit:read"])
def verify_control_audit_chain_route():
    start_event_id = _safe_int(request.args.get("start_event_id"), minimum=1)
    end_event_id = _safe_int(request.args.get("end_event_id"), minimum=1)
    limit = _safe_int(request.args.get("limit"), minimum=1, maximum=100000) or 10000
    checkpoint_id = _safe_int(request.args.get("checkpoint_id"), minimum=1)
    chain_payload = verify_control_audit_chain(
        start_event_id=start_event_id,
        end_event_id=end_event_id,
        limit=limit,
    )
    result = {"chain": chain_payload}
    if checkpoint_id is not None:
        result["checkpoint"] = verify_control_audit_checkpoint(checkpoint_id=checkpoint_id)
    return ok(result)
