from datetime import datetime, timedelta

from ..models import (
    OrganiserCompetencyProfile,
    CompetencyEvidence,
    PeerEndorsement,
    Certification,
    OrganiserPerformanceSnapshot,
    SkillDecayRecord,
    AuditRecord,
    db,
)
from ..services.trust_score_service import get_trust_score
from ..services.formula_registry_service import resolve_params, log_run
from ..services.posterior_registry_service import update_posterior
from ..services.replay_engine_service import _snapshot_hash


def _default_params():
    return {
        "cert_weight": 10.0,
        "performance_weight": 0.5,
        "endorsement_weight": 2.0,
        "endorsement_cap": 5,
        "decay_rate_monthly": 0.03,
        "trust_multiplier": 1.0,
    }


def compute_profile(user_id, node_id, actor_id=None):
    params, version = resolve_params("competency_proficiency_v1", node_id=node_id)
    cfg = {**_default_params(), **(params or {})}

    certs = Certification.query.filter_by(user_id=user_id, status="active").count()
    performance = OrganiserPerformanceSnapshot.query.filter_by(
        user_id=user_id, node_id=node_id
    ).order_by(OrganiserPerformanceSnapshot.created_at.desc()).first()
    performance_score = (performance.completion_rate if performance else 0.0) * 100

    endorsements = PeerEndorsement.query.filter_by(endorsed_user_id=user_id, node_id=node_id).all()
    capped_endorsements = endorsements[: int(cfg["endorsement_cap"])]
    endorsement_score = sum(e.rating for e in capped_endorsements) * cfg["endorsement_weight"]

    trust = get_trust_score(user_id)
    trust_multiplier = (trust.composite_score / 100.0) * cfg["trust_multiplier"]

    base = (certs * cfg["cert_weight"]) + (performance_score * cfg["performance_weight"]) + endorsement_score
    proficiency = base * max(trust_multiplier, 0.2)

    last_decay = SkillDecayRecord.query.filter_by(user_id=user_id, node_id=node_id).order_by(
        SkillDecayRecord.created_at.desc()
    ).first()
    if last_decay and last_decay.created_at:
        months = max(1, (datetime.utcnow() - last_decay.created_at).days / 30)
    else:
        months = 1
    decay_amount = proficiency * (cfg["decay_rate_monthly"] * months)
    proficiency = max(0.0, proficiency - decay_amount)

    profile = OrganiserCompetencyProfile.query.filter_by(user_id=user_id, node_id=node_id).first()
    if not profile:
        profile = OrganiserCompetencyProfile(user_id=user_id, node_id=node_id)
        db.session.add(profile)
    profile.proficiency_level = round(proficiency, 3)
    profile.confidence_score = min(1.0, (len(capped_endorsements) / max(cfg["endorsement_cap"], 1)))
    profile.details_json = {
        "certs": certs,
        "performance_score": performance_score,
        "endorsement_score": endorsement_score,
        "trust_multiplier": trust_multiplier,
    }
    db.session.add(SkillDecayRecord(
        user_id=user_id,
        node_id=node_id,
        decay_amount=decay_amount,
        formula_version=version,
    ))
    db.session.add(AuditRecord(
        actor_id=actor_id,
        action="competency_profile_recalculated",
        entity_type="organiser_competency_profile",
        entity_id=str(user_id),
        payload={"node_id": node_id, "formula_version": version},
    ))
    db.session.commit()
    from ..models import PosteriorRecord
    existing = PosteriorRecord.query.filter_by(posterior_key="competency", subject_id=user_id).first()
    prior = existing.params_json if existing else {}
    delta = {
        "proficiency": profile.proficiency_level - float(prior.get("proficiency", 0)),
        "confidence": profile.confidence_score - float(prior.get("confidence", 0)),
    }
    evidence_hash = _snapshot_hash({"certs": certs, "endorsements": len(capped_endorsements)})
    update_posterior(
        model_key="competency_proficiency_v1",
        posterior_key="competency",
        subject_id=user_id,
        node_id=node_id,
        formula_version=version,
        delta_params=delta,
        evidence_hash=evidence_hash,
        actor_id=actor_id,
    )
    log_run("competency_proficiency_v1", version, {"user_id": user_id, "node_id": node_id}, actor_id)
    return profile


def add_evidence(user_id, node_id, evidence_type, ref_type, ref_id, weight):
    evidence = CompetencyEvidence(
        user_id=user_id,
        node_id=node_id,
        evidence_type=evidence_type,
        ref_type=ref_type,
        ref_id=str(ref_id) if ref_id is not None else None,
        weight=weight,
    )
    db.session.add(evidence)
    db.session.commit()
    return evidence
