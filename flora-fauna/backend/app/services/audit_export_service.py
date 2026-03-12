"""Audit export service.

Provides timestamped, versioned exports of:
- Treasury CSV+JSON
- Certification logs
- Governance votes
- Incident logs
- Asset registry
- Role rotation history
"""
import csv
import io
import json
from datetime import datetime

from ..models import (
    ImpactLedgerEntry, ImpactPool, Certification, GovernanceVote,
    Incident, EquipmentAsset, InfrastructureAsset,
    GovernanceRoleAssignment, AuditLog,
    NeedsSignal, OrganiserCompetencyProfile, Guild, GuildMembership,
    FormulaConfig, CollisionCheck, OrganiserBurnoutSnapshot, CollisionReview,
    MetricDefinition, ModelConfig, db,
)


def export_treasury(node_id):
    """Export treasury ledger entries as JSON."""
    entries = ImpactLedgerEntry.query.filter_by(node_id=node_id).order_by(
        ImpactLedgerEntry.created_at.desc()
    ).all()
    pools = {p.id: p.slug for p in ImpactPool.query.filter_by(node_id=node_id).all()}
    data = [{
        "id": e.id,
        "pool": pools.get(e.pool_id, "unknown"),
        "entry_type": e.entry_type,
        "amount_cents": e.amount_cents,
        "description": e.description,
        "reference_id": e.reference_id,
        "reference_type": e.reference_type,
        "reversal_of": e.reversal_of,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    } for e in entries]
    return {
        "export_type": "treasury",
        "node_id": node_id,
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(data),
        "records": data,
    }


def export_treasury_csv(node_id):
    """Export treasury ledger as CSV string."""
    export = export_treasury(node_id)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "id", "pool", "entry_type", "amount_cents", "description",
        "reference_id", "reference_type", "reversal_of", "created_at",
    ])
    writer.writeheader()
    for record in export["records"]:
        writer.writerow(record)
    return output.getvalue()


def export_certifications():
    """Export certification logs."""
    certs = Certification.query.order_by(Certification.issued_at.desc()).all()
    return {
        "export_type": "certifications",
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(certs),
        "records": [{
            "id": c.id,
            "certificate_uid": c.certificate_uid,
            "user_id": c.user_id,
            "module_id": c.module_id,
            "issued_at": c.issued_at.isoformat() if c.issued_at else None,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "status": c.status,
        } for c in certs],
    }


def export_governance_votes():
    """Export governance vote records."""
    votes = GovernanceVote.query.order_by(GovernanceVote.created_at.desc()).all()
    return {
        "export_type": "governance_votes",
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(votes),
        "records": [{
            "id": v.id,
            "proposal_type": v.proposal_type,
            "proposal_id": v.proposal_id,
            "voter_id": v.voter_id,
            "vote": v.vote,
            "reason": v.reason,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        } for v in votes],
    }


def export_incidents(node_id):
    """Export incident logs."""
    incidents = Incident.query.filter_by(node_id=node_id).order_by(
        Incident.created_at.desc()
    ).all()
    return {
        "export_type": "incidents",
        "node_id": node_id,
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(incidents),
        "records": [{
            "id": i.id,
            "severity": i.severity,
            "title": i.title,
            "status": i.status,
            "event_frozen": i.event_frozen,
            "escrow_frozen": i.escrow_frozen,
            "organizer_suspended": i.organizer_suspended,
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
        } for i in incidents],
    }


def export_asset_registry(node_id):
    """Export equipment and infrastructure asset registry."""
    equipment = EquipmentAsset.query.filter_by(node_id=node_id).all()
    infrastructure = InfrastructureAsset.query.filter_by(node_id=node_id).all()
    return {
        "export_type": "asset_registry",
        "node_id": node_id,
        "exported_at": datetime.utcnow().isoformat(),
        "equipment": [{
            "id": e.id,
            "asset_type": e.asset_type,
            "name": e.name,
            "value_cents": e.value_cents,
            "status": e.status,
        } for e in equipment],
        "infrastructure": [{
            "id": i.id,
            "asset_type": i.asset_type,
            "name": i.name,
            "capex_cents": i.capex_cents,
            "status": i.status,
        } for i in infrastructure],
    }


def export_role_rotation():
    """Export governance role rotation history."""
    assignments = GovernanceRoleAssignment.query.order_by(
        GovernanceRoleAssignment.created_at.desc()
    ).all()
    return {
        "export_type": "role_rotation",
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(assignments),
        "records": [{
            "id": a.id,
            "user_id": a.user_id,
            "role_type": a.role_type,
            "is_active": a.is_active,
            "starts_at": a.starts_at.isoformat() if a.starts_at else None,
            "ends_at": a.ends_at.isoformat() if a.ends_at else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        } for a in assignments],
    }


def export_needs_signals(node_id):
    signals = NeedsSignal.query.filter_by(node_id=node_id).order_by(NeedsSignal.created_at.desc()).all()
    return {
        "export_type": "needs_signals",
        "node_id": node_id,
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(signals),
        "records": [{
            "id": s.id,
            "severity_0_100": s.severity_0_100,
            "reason_codes": s.reason_codes_json or [],
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "resolved_at": s.resolved_at.isoformat() if s.resolved_at else None,
            "visible_level": s.visible_level,
        } for s in signals],
    }


def export_competency_profiles(node_id):
    profiles = OrganiserCompetencyProfile.query.filter_by(node_id=node_id).all()
    return {
        "export_type": "competency_profiles",
        "node_id": node_id,
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(profiles),
        "records": [{
            "user_id": p.user_id,
            "proficiency_level": p.proficiency_level,
            "confidence_score": p.confidence_score,
            "last_updated_at": p.last_updated_at.isoformat() if p.last_updated_at else None,
        } for p in profiles],
    }


def export_guilds(node_id):
    guilds = Guild.query.filter_by(node_id=node_id).all()
    memberships = GuildMembership.query.all()
    return {
        "export_type": "guilds",
        "node_id": node_id,
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(guilds),
        "guilds": [{
            "id": g.id,
            "name": g.name,
            "type": g.type,
            "active": g.active,
        } for g in guilds],
        "memberships": [{
            "guild_id": m.guild_id,
            "user_id": m.user_id,
            "role": m.role_in_guild,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            "left_at": m.left_at.isoformat() if m.left_at else None,
        } for m in memberships],
    }


def export_formula_configs():
    configs = FormulaConfig.query.order_by(FormulaConfig.activated_at.desc()).all()
    return {
        "export_type": "formula_configs",
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(configs),
        "records": [{
            "key": c.key,
            "version": c.version,
            "node_id": c.node_id,
            "params": c.params_json,
            "activated_at": c.activated_at.isoformat() if c.activated_at else None,
        } for c in configs],
    }


def export_metric_definitions():
    metrics = MetricDefinition.query.order_by(MetricDefinition.key.asc()).all()
    return {
        "export_type": "metric_definitions",
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(metrics),
        "records": [{
            "key": m.key,
            "version": m.version,
            "required_event_types": m.required_event_types,
            "output_units": m.output_units,
            "confidence_method": m.confidence_method,
        } for m in metrics],
    }


def export_model_configs():
    configs = ModelConfig.query.order_by(ModelConfig.activated_at.desc()).all()
    return {
        "export_type": "model_configs",
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(configs),
        "records": [{
            "key": c.key,
            "version": c.version,
            "node_id": c.node_id,
            "params": c.params_json,
            "activated_at": c.activated_at.isoformat() if c.activated_at else None,
            "cooling_until": c.cooling_until.isoformat() if c.cooling_until else None,
        } for c in configs],
    }


def export_collision_checks(node_id=None):
    query = CollisionCheck.query
    checks = query.order_by(CollisionCheck.created_at.desc()).all()
    return {
        "export_type": "collision_checks",
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(checks),
        "records": [{
            "event_id": c.event_id,
            "score": c.score,
            "reasons": c.reasons_json or [],
            "formula_version": c.formula_version,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "acknowledged_by_user_id": c.acknowledged_by_user_id,
        } for c in checks],
    }


def export_collision_reviews():
    reviews = CollisionReview.query.order_by(CollisionReview.created_at.desc()).all()
    return {
        "export_type": "collision_reviews",
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(reviews),
        "records": [{
            "event_id": r.event_id,
            "status": r.status,
            "reviewer_user_id": r.reviewer_user_id,
            "notes": r.notes,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in reviews],
    }


def export_burnout_snapshots(node_id):
    snaps = OrganiserBurnoutSnapshot.query.filter_by(node_id=node_id).order_by(
        OrganiserBurnoutSnapshot.created_at.desc()
    ).all()
    return {
        "export_type": "burnout_snapshots",
        "node_id": node_id,
        "exported_at": datetime.utcnow().isoformat(),
        "record_count": len(snaps),
        "records": [{
            "user_id": s.user_id,
            "load_score": s.load_score,
            "burnout_risk": s.burnout_risk,
            "formula_version": s.formula_version,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        } for s in snaps],
    }
