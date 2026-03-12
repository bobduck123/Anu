from datetime import datetime

from ..models import CredentialLadderStage, CredentialDependency, Certification, Module, AuditRecord, db


def get_ladder_stages():
    return CredentialLadderStage.query.order_by(CredentialLadderStage.level.asc()).all()


def _refresh_cert_statuses(user_id):
    now = datetime.utcnow()
    updated = False
    certs = Certification.query.filter_by(user_id=user_id).all()
    for cert in certs:
        if cert.status == "active" and cert.expires_at and cert.expires_at < now:
            cert.status = "expired"
            updated = True
    if updated:
        db.session.commit()


def _active_cert_module_ids(user_id):
    _refresh_cert_statuses(user_id)
    active = Certification.query.filter_by(user_id=user_id, status="active").all()
    return {c.module_id for c in active}


def evaluate_stage_for_user(user_id):
    stages = get_ladder_stages()
    active_module_ids = _active_cert_module_ids(user_id)
    current_stage = None
    for stage in stages:
        required = set(stage.required_module_ids or [])
        if required.issubset(active_module_ids):
            current_stage = stage
    return current_stage


def is_eligible_for_module(user_id, module_id):
    module = Module.query.get(module_id)
    if not module:
        return False, "Module not found"
    stages = get_ladder_stages()
    if not stages:
        return True, None
    dependencies = CredentialDependency.query.filter_by(module_id=module_id).all()
    required_by_dependency = {d.required_module_id for d in dependencies}
    active_module_ids = _active_cert_module_ids(user_id)
    missing = required_by_dependency - active_module_ids
    if missing:
        return False, "Missing required prerequisite modules"
    # If module is referenced in any stage, ensure prerequisite stage is met
    target_stage = None
    for stage in stages:
        if module_id in (stage.required_module_ids or []):
            target_stage = stage
            break
    if not target_stage:
        return True, None
    current = evaluate_stage_for_user(user_id)
    if current and current.level >= target_stage.level:
        return True, None
    return False, f"Requires ladder stage {target_stage.title}"


def ladder_status(user_id):
    stages = get_ladder_stages()
    active_module_ids = _active_cert_module_ids(user_id)
    current = evaluate_stage_for_user(user_id)
    next_stage = None
    if current:
        for stage in stages:
            if stage.level > current.level:
                next_stage = stage
                break
    elif stages:
        next_stage = stages[0]
    missing_modules = []
    if next_stage:
        missing_modules = list(set(next_stage.required_module_ids or []) - active_module_ids)
    return {
        "current_stage": current,
        "next_stage": next_stage,
        "missing_module_ids": missing_modules,
    }


def record_stage_audit(user_id, stage):
    if not stage:
        return
    db.session.add(AuditRecord(
        actor_id=user_id,
        action="credential_ladder_stage_evaluated",
        entity_type="credential_ladder_stage",
        entity_id=str(stage.id),
        payload={"stage": stage.slug, "level": stage.level},
    ))
    db.session.commit()
