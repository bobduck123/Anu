from collections import defaultdict
from datetime import datetime

from flask import Blueprint, request
from sqlalchemy import func

from ..extensions import db
from ..models import (
    Action,
    AuditRecord,
    CompletionRecord,
    EducationBadge,
    EducationBadgeAward,
    EducationInteractiveExperience,
    EducationProgram,
    EducationProgramModule,
    EducationReflection,
    EducationRegenerationLink,
    EducationRegenerationLog,
    EducationTopic,
    EducationUserProgress,
    IndigenousPlantKnowledge,
    KnowledgeApprovalRecord,
    KnowledgeAuditLog,
    KnowledgeLineage,
    Module,
    Notification,
    PlantEcologicalRelationship,
    PlantLandscapeState,
    PlantMediaAsset,
    User,
)
from ..security.alpha import alpha_jwt_required
from ..security.policy import get_current_user, require_permission
from .utils import error, ok


education_stack_bp = Blueprint("education_stack", __name__, url_prefix="/education")

SENSITIVITY_ORDER = {"public": 0, "community": 1, "restricted": 2}
VERIFIER_ROLES = {
    "verifier",
    "validator",
    "node_admin",
    "platform_admin",
    "indigenous_council",
    "node_curator",
    "board_member",
    "auditor",
    "treasury_guardian",
}

REGENERATION_CATEGORIES = {
    "tree_planting",
    "native_garden_establishment",
    "waterway_restoration",
    "cultural_workshop_participation",
}


def _now_iso(value):
    return value.isoformat() if value else None


def _normalize_sensitivity(value: str | None) -> str:
    normalized = (value or "public").strip().lower()
    if normalized not in SENSITIVITY_ORDER:
        return "public"
    return normalized


def _max_sensitivity_for_user(user: User | None) -> str:
    if not user:
        return "public"
    if user.role in VERIFIER_ROLES:
        return "restricted"
    return "community"


def _allowed_sensitivity_levels(user: User | None) -> list[str]:
    max_level = _max_sensitivity_for_user(user)
    max_rank = SENSITIVITY_ORDER[max_level]
    return [level for level, rank in SENSITIVITY_ORDER.items() if rank <= max_rank]


def _is_verifier(user: User | None) -> bool:
    return bool(user and user.role in VERIFIER_ROLES)


def _record_audit(
    actor_id: int | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    payload: dict | None = None,
    node_id: int | None = None,
) -> None:
    db.session.add(
        AuditRecord(
            node_id=node_id,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload,
        )
    )


def _log_knowledge_audit(knowledge_id: int, actor_id: int | None, action: str, details: str | None = None) -> None:
    db.session.add(
        KnowledgeAuditLog(
            knowledge_id=knowledge_id,
            actor_id=actor_id,
            action=action,
            details=details,
        )
    )


def _award_subtle_points(user: User, points: int) -> None:
    if points <= 0:
        return
    user.points = int(user.points or 0) + int(points)
    if not user.points_to_level_up or user.points_to_level_up < 1:
        user.points_to_level_up = 100
    if not user.level or user.level < 1:
        user.level = 1
    while user.points >= user.points_to_level_up:
        user.points -= user.points_to_level_up
        user.level += 1
        user.points_to_level_up = int(max(100, round(user.points_to_level_up * 1.35)))


def _notify(user_id: int, message: str) -> None:
    db.session.add(Notification(user_id=user_id, message=message, is_read=False))


def _serialize_media(asset: PlantMediaAsset) -> dict:
    return {
        "id": asset.id,
        "media_type": asset.media_type,
        "asset_url": asset.asset_url,
        "thumbnail_url": asset.thumbnail_url,
        "alt_text": asset.alt_text,
        "is_transparent_illustration": bool(asset.is_transparent_illustration),
        "language_code": asset.language_code,
        "sort_order": asset.sort_order,
    }


def _serialize_relationship(rel: PlantEcologicalRelationship) -> dict:
    related = None
    if rel.related_plant_id:
        related = IndigenousPlantKnowledge.query.get(rel.related_plant_id)
    return {
        "id": rel.id,
        "relationship_type": rel.relationship_type,
        "related_plant_id": rel.related_plant_id,
        "related_label": rel.related_label,
        "related_plant_name": related.indigenous_name if related else None,
        "soil_type": rel.soil_type,
        "seasonal_cycle": rel.seasonal_cycle,
        "ethical_harvest_constraint": rel.ethical_harvest_constraint,
        "notes": rel.notes,
    }


def _serialize_plant(plant: IndigenousPlantKnowledge, include_nested: bool = False, include_audit: bool = False) -> dict:
    payload = {
        "id": plant.id,
        "region": plant.region,
        "language_group": plant.language_group,
        "indigenous_name": plant.indigenous_name,
        "scientific_name": plant.scientific_name,
        "season": plant.season,
        "traditional_uses": plant.traditional_uses,
        "preparation_methods": plant.preparation_methods,
        "cultural_context": plant.cultural_context,
        "scientific_notes": plant.scientific_notes,
        "sensitivity_level": plant.sensitivity_level,
        "verification_status": plant.verification_status,
        "elder_verified": bool(plant.elder_verified),
        "custodial_region_tag": plant.custodial_region_tag,
        "attribution_community": plant.attribution_community,
        "attribution_custodian": plant.attribution_custodian,
        "lineage_reference": plant.lineage_reference,
        "offline_package_ref": plant.offline_package_ref,
        "language_code": plant.language_code,
        "geo_lat": plant.geo_lat,
        "geo_lng": plant.geo_lng,
        "microcosm_id": plant.microcosm_id,
        "event_id": plant.event_id,
        "verified_by": plant.verified_by,
        "created_by": plant.created_by,
        "verified_at": _now_iso(plant.verified_at),
        "created_at": _now_iso(plant.created_at),
        "updated_at": _now_iso(plant.updated_at),
        "media_assets": [],
        "ecological_relationships": [],
        "audit_log": [],
    }
    if include_nested:
        media_assets = PlantMediaAsset.query.filter_by(plant_id=plant.id).order_by(PlantMediaAsset.sort_order.asc()).all()
        relationships = PlantEcologicalRelationship.query.filter_by(plant_id=plant.id).all()
        payload["media_assets"] = [_serialize_media(asset) for asset in media_assets]
        payload["ecological_relationships"] = [_serialize_relationship(rel) for rel in relationships]
        states = PlantLandscapeState.query.filter_by(plant_id=plant.id).order_by(PlantLandscapeState.id.asc()).all()
        payload["landscape_states"] = [
            {
                "state_label": state.state_label,
                "biodiversity_index": state.biodiversity_index,
                "soil_health_index": state.soil_health_index,
                "canopy_cover_pct": state.canopy_cover_pct,
                "narrative": state.narrative,
            }
            for state in states
        ]
    if include_audit:
        logs = KnowledgeAuditLog.query.filter_by(knowledge_id=plant.id).order_by(KnowledgeAuditLog.created_at.desc()).all()
        payload["audit_log"] = [
            {
                "id": row.id,
                "actor_id": row.actor_id,
                "action": row.action,
                "details": row.details,
                "created_at": _now_iso(row.created_at),
            }
            for row in logs
        ]
    return payload


def _topic_payload(topic: EducationTopic) -> dict:
    experiences = EducationInteractiveExperience.query.filter_by(topic_id=topic.id, is_active=True).order_by(
        EducationInteractiveExperience.sequence.asc()
    ).all()
    return {
        "topic_id": topic.id,
        "program_id": topic.program_id,
        "module_id": topic.module_id,
        "title": topic.title,
        "description": topic.description,
        "depth_tier": topic.depth_tier,
        "assessment_type": topic.assessment_type,
        "reflection_prompt": topic.reflection_prompt,
        "action_link": topic.action_link_id,
        "badge_link": topic.badge_link_id,
        "sensitivity_level": topic.sensitivity_level,
        "microcosm_id": topic.microcosm_id,
        "event_id": topic.event_id,
        "sequence": topic.sequence,
        "experiences": [
            {
                "id": exp.id,
                "title": exp.title,
                "experience_type": exp.experience_type,
                "content_ref": exp.content_ref,
                "narration_ref": exp.narration_ref,
                "mapping_ref": exp.mapping_ref,
                "sequence": exp.sequence,
            }
            for exp in experiences
        ],
    }


def _get_progress_for_link(user_id: int, link: EducationRegenerationLink) -> int:
    if link.topic_id:
        row = EducationUserProgress.query.filter_by(user_id=user_id, topic_id=link.topic_id).first()
        return int(row.completion_percent) if row else 0
    row = (
        db.session.query(func.max(EducationUserProgress.completion_percent))
        .filter(
            EducationUserProgress.user_id == user_id,
            EducationUserProgress.program_id == link.program_id,
            EducationUserProgress.module_id == link.module_id,
        )
        .scalar()
    )
    return int(row or 0)


def _award_badge_if_eligible(user: User, topic: EducationTopic) -> dict | None:
    if not topic.badge_link_id:
        return None
    existing = EducationBadgeAward.query.filter_by(
        badge_id=topic.badge_link_id,
        user_id=user.id,
        topic_id=topic.id,
    ).first()
    if existing:
        return None
    badge = EducationBadge.query.get(topic.badge_link_id)
    award = EducationBadgeAward(
        badge_id=topic.badge_link_id,
        user_id=user.id,
        program_id=topic.program_id,
        module_id=topic.module_id,
        topic_id=topic.id,
        awarded_by=user.id,
        award_reason="Topic completion",
    )
    db.session.add(award)
    if badge:
        _notify(user.id, f"Badge unlocked: {badge.title}")
    return {
        "badge_id": topic.badge_link_id,
        "badge_title": badge.title if badge else None,
    }


@education_stack_bp.route("/immersive/scenes", methods=["GET"])
def immersive_scenes():
    return ok(
        {
            "scenes": [
                {
                    "id": "digital_bush_walk",
                    "title": "Digital Bush Walk",
                    "description": "Transparent botanical overlays with contextual guidance cards.",
                    "supports": ["keyboard_navigation", "aria_modals", "reduced_motion"],
                },
                {
                    "id": "seasonal_knowledge_map",
                    "title": "Seasonal Knowledge Map",
                    "description": "Season and region filtered plant knowledge pathways.",
                    "supports": ["region_filter", "season_filter", "sensitivity_flagging"],
                },
                {
                    "id": "cultural_camp_scene",
                    "title": "Cultural Camp Scene",
                    "description": "Story-grounded learning prompts tied to custodial regions.",
                    "supports": ["custodial_tagging", "lineage_tracking"],
                },
                {
                    "id": "toolmakers_table",
                    "title": "Toolmakers Table",
                    "description": "Material and preparation pathways linked to ethics constraints.",
                    "supports": ["ethical_harvest_constraints", "systems_relationship_graph"],
                },
            ]
        }
    )


@education_stack_bp.route("/immersive/plants", methods=["GET"])
def immersive_plants():
    user = get_current_user()
    query = IndigenousPlantKnowledge.query
    if not _is_verifier(user):
        query = query.filter_by(verification_status="approved")

    region = request.args.get("region")
    if region:
        query = query.filter(IndigenousPlantKnowledge.region == region)
    season = request.args.get("season")
    if season:
        query = query.filter(IndigenousPlantKnowledge.season == season)
    microcosm_id = request.args.get("microcosm_id")
    if microcosm_id:
        query = query.filter(IndigenousPlantKnowledge.microcosm_id == int(microcosm_id))

    allowed_levels = _allowed_sensitivity_levels(user)
    query = query.filter(IndigenousPlantKnowledge.sensitivity_level.in_(allowed_levels))

    requested_sensitivity = request.args.get("sensitivity")
    if requested_sensitivity:
        requested = _normalize_sensitivity(requested_sensitivity)
        if requested not in allowed_levels:
            return error("forbidden", "Requested sensitivity level is not available for this role", status=403)
        query = query.filter(IndigenousPlantKnowledge.sensitivity_level == requested)

    plants = query.order_by(IndigenousPlantKnowledge.indigenous_name.asc()).all()
    payload = [_serialize_plant(plant, include_nested=True) for plant in plants]

    filters = {
        "regions": [row[0] for row in db.session.query(IndigenousPlantKnowledge.region).distinct().order_by(IndigenousPlantKnowledge.region.asc()).all()],
        "seasons": [row[0] for row in db.session.query(IndigenousPlantKnowledge.season).distinct().order_by(IndigenousPlantKnowledge.season.asc()).all()],
        "sensitivity_levels": allowed_levels,
    }
    return ok({"plants": payload, "filters": filters})


@education_stack_bp.route("/immersive/plants/<int:plant_id>", methods=["GET"])
def immersive_plant_detail(plant_id: int):
    user = get_current_user()
    plant = IndigenousPlantKnowledge.query.get_or_404(plant_id)
    if plant.verification_status != "approved" and not _is_verifier(user):
        return error("forbidden", "Knowledge entry is not publicly available", status=403)
    if plant.sensitivity_level not in _allowed_sensitivity_levels(user):
        return error("forbidden", "Insufficient role for this sensitivity level", status=403)
    return ok({"plant": _serialize_plant(plant, include_nested=True, include_audit=_is_verifier(user))})


@education_stack_bp.route("/systems/graph", methods=["GET"])
def systems_relationship_graph():
    user = get_current_user()
    allowed_levels = _allowed_sensitivity_levels(user)

    plant_query = IndigenousPlantKnowledge.query.filter(
        IndigenousPlantKnowledge.verification_status == "approved",
        IndigenousPlantKnowledge.sensitivity_level.in_(allowed_levels),
    )
    region = request.args.get("region")
    if region:
        plant_query = plant_query.filter(IndigenousPlantKnowledge.region == region)

    plant_id = request.args.get("plant_id")
    if plant_id:
        plant_query = plant_query.filter(IndigenousPlantKnowledge.id == int(plant_id))

    plants = plant_query.order_by(IndigenousPlantKnowledge.indigenous_name.asc()).all()
    plant_ids = [p.id for p in plants]

    if not plant_ids:
        return ok({"nodes": [], "edges": []})

    rel_rows = PlantEcologicalRelationship.query.filter(PlantEcologicalRelationship.plant_id.in_(plant_ids)).all()
    nodes = [
        {
            "id": plant.id,
            "label": plant.indigenous_name,
            "season": plant.season,
            "region": plant.region,
            "sensitivity_level": plant.sensitivity_level,
        }
        for plant in plants
    ]
    edges = []
    for rel in rel_rows:
        if rel.related_plant_id and rel.related_plant_id in plant_ids:
            edges.append(
                {
                    "id": rel.id,
                    "source": rel.plant_id,
                    "target": rel.related_plant_id,
                    "type": rel.relationship_type,
                    "label": rel.related_label or rel.relationship_type,
                    "soil_type": rel.soil_type,
                    "seasonal_cycle": rel.seasonal_cycle,
                    "ethical_harvest_constraint": rel.ethical_harvest_constraint,
                }
            )
        else:
            edges.append(
                {
                    "id": rel.id,
                    "source": rel.plant_id,
                    "target": None,
                    "type": rel.relationship_type,
                    "label": rel.related_label or rel.relationship_type,
                    "soil_type": rel.soil_type,
                    "seasonal_cycle": rel.seasonal_cycle,
                    "ethical_harvest_constraint": rel.ethical_harvest_constraint,
                }
            )
    return ok({"nodes": nodes, "edges": edges})


@education_stack_bp.route("/systems/harvest-simulator", methods=["POST"])
def systems_harvest_simulator():
    payload = request.get_json() or {}
    plant_id = payload.get("plant_id")
    if not plant_id:
        return error("validation_error", "plant_id is required", status=400)

    user = get_current_user()
    plant = IndigenousPlantKnowledge.query.get(plant_id)
    if not plant or plant.verification_status != "approved":
        return error("not_found", "Plant knowledge not found", status=404)
    if plant.sensitivity_level not in _allowed_sensitivity_levels(user):
        return error("forbidden", "Insufficient role for this sensitivity level", status=403)

    harvest_percent = float(payload.get("harvest_percent") or 0.0)
    method = (payload.get("method") or "selective").strip().lower()
    requested_season = (payload.get("season") or "").strip().lower()

    risk_score = 0.0
    notes = []
    if harvest_percent > 30:
        risk_score += min(50.0, (harvest_percent - 30.0) * 2.0)
        notes.append("Harvest volume is above the recommended threshold.")
    if requested_season and requested_season != (plant.season or "").strip().lower():
        risk_score += 20.0
        notes.append("Selected season is outside this plant's primary cycle.")
    if method in {"root_pull", "whole_plant", "strip_bark"}:
        risk_score += 25.0
        notes.append("Method creates high regeneration pressure.")

    constraints = PlantEcologicalRelationship.query.filter_by(
        plant_id=plant.id,
        relationship_type="harvest_constraint",
    ).all()
    for constraint in constraints:
        if constraint.ethical_harvest_constraint:
            notes.append(constraint.ethical_harvest_constraint)
            if harvest_percent > 20:
                risk_score += 10.0

    if risk_score <= 25:
        status = "sustainable"
        visual_state = "regenerating"
    elif risk_score <= 60:
        status = "caution"
        visual_state = "stressed"
    else:
        status = "unsustainable"
        visual_state = "degraded"

    if user:
        _record_audit(
            actor_id=user.id,
            node_id=user.node_id,
            action="education_harvest_simulated",
            entity_type="indigenous_plant_knowledge",
            entity_id=str(plant.id),
            payload={
                "harvest_percent": harvest_percent,
                "method": method,
                "status": status,
                "risk_score": round(risk_score, 2),
            },
        )
        db.session.commit()

    return ok(
        {
            "plant_id": plant.id,
            "indigenous_name": plant.indigenous_name,
            "risk_score": round(risk_score, 2),
            "status": status,
            "visual_state": visual_state,
            "guidance": notes,
        }
    )


@education_stack_bp.route("/systems/landscape/<int:plant_id>", methods=["GET"])
def systems_landscape_states(plant_id: int):
    user = get_current_user()
    plant = IndigenousPlantKnowledge.query.get_or_404(plant_id)
    if plant.verification_status != "approved" and not _is_verifier(user):
        return error("forbidden", "Knowledge entry is not publicly available", status=403)
    if plant.sensitivity_level not in _allowed_sensitivity_levels(user):
        return error("forbidden", "Insufficient role for this sensitivity level", status=403)

    rows = PlantLandscapeState.query.filter_by(plant_id=plant.id).order_by(PlantLandscapeState.id.asc()).all()
    if not rows:
        rows = [
            PlantLandscapeState(
                plant_id=plant.id,
                state_label="before",
                biodiversity_index=0.9,
                soil_health_index=0.85,
                canopy_cover_pct=0.8,
                narrative="Healthy custodial baseline.",
            ),
            PlantLandscapeState(
                plant_id=plant.id,
                state_label="degraded",
                biodiversity_index=0.45,
                soil_health_index=0.4,
                canopy_cover_pct=0.35,
                narrative="Degraded due to extractive pressure.",
            ),
            PlantLandscapeState(
                plant_id=plant.id,
                state_label="regenerated",
                biodiversity_index=0.82,
                soil_health_index=0.78,
                canopy_cover_pct=0.74,
                narrative="Regenerated through reciprocal stewardship.",
            ),
        ]
        db.session.add_all(rows)
        db.session.commit()

    payload = [
        {
            "state_label": row.state_label,
            "biodiversity_index": row.biodiversity_index,
            "soil_health_index": row.soil_health_index,
            "canopy_cover_pct": row.canopy_cover_pct,
            "narrative": row.narrative,
        }
        for row in rows
    ]
    return ok({"plant_id": plant.id, "states": payload})


@education_stack_bp.route("/curriculum/programs", methods=["GET"])
def curriculum_programs():
    user = get_current_user()
    query = EducationProgram.query.filter_by(is_active=True)

    region = request.args.get("region")
    if region:
        query = query.filter(EducationProgram.region == region)
    microcosm_id = request.args.get("microcosm_id")
    if microcosm_id:
        query = query.filter(EducationProgram.microcosm_id == int(microcosm_id))

    programs = query.order_by(EducationProgram.created_at.desc()).all()
    payload = []
    for program in programs:
        module_ids = [
            row.module_id
            for row in EducationProgramModule.query.filter_by(program_id=program.id).order_by(EducationProgramModule.sequence.asc()).all()
        ]
        topic_count = EducationTopic.query.filter_by(program_id=program.id, is_active=True).count()
        completion_percent = None
        depth_tier_unlocked = None
        if user:
            avg_completion = (
                db.session.query(func.avg(EducationUserProgress.completion_percent))
                .filter(
                    EducationUserProgress.user_id == user.id,
                    EducationUserProgress.program_id == program.id,
                )
                .scalar()
            )
            depth_unlocked = (
                db.session.query(func.max(EducationUserProgress.depth_tier_unlocked))
                .filter(
                    EducationUserProgress.user_id == user.id,
                    EducationUserProgress.program_id == program.id,
                )
                .scalar()
            )
            completion_percent = int(round(avg_completion)) if avg_completion is not None else 0
            depth_tier_unlocked = int(depth_unlocked or 1)
        payload.append(
            {
                "program_id": program.id,
                "title": program.title,
                "description": program.description,
                "region": program.region,
                "language_group": program.language_group,
                "branch_code": program.branch_code,
                "accreditation_code": program.accreditation_code,
                "offline_package_ref": program.offline_package_ref,
                "microcosm_id": program.microcosm_id,
                "event_id": program.event_id,
                "module_ids": module_ids,
                "module_count": len(module_ids),
                "topic_count": topic_count,
                "completion_percent": completion_percent,
                "depth_tier_unlocked": depth_tier_unlocked,
            }
        )
    return ok({"programs": payload})


@education_stack_bp.route("/curriculum/programs/<int:program_id>", methods=["GET"])
def curriculum_program_detail(program_id: int):
    program = EducationProgram.query.get_or_404(program_id)
    if not program.is_active:
        return error("not_found", "Program is inactive", status=404)

    links = EducationProgramModule.query.filter_by(program_id=program.id).order_by(EducationProgramModule.sequence.asc()).all()
    modules_payload = []
    for link in links:
        module = Module.query.get(link.module_id)
        if not module:
            continue
        topics = EducationTopic.query.filter_by(
            program_id=program.id,
            module_id=module.id,
            is_active=True,
        ).order_by(EducationTopic.sequence.asc()).all()
        modules_payload.append(
            {
                "program_id": program.id,
                "module_id": module.id,
                "title": module.title,
                "description": module.description,
                "sequence": link.sequence,
                "depth_tier_required": link.depth_tier_required,
                "topics": [_topic_payload(topic) for topic in topics],
            }
        )

    return ok(
        {
            "program": {
                "program_id": program.id,
                "title": program.title,
                "description": program.description,
                "region": program.region,
                "language_group": program.language_group,
                "branch_code": program.branch_code,
                "accreditation_code": program.accreditation_code,
                "microcosm_id": program.microcosm_id,
                "event_id": program.event_id,
            },
            "modules": modules_payload,
        }
    )


@education_stack_bp.route("/curriculum/progress", methods=["GET"])
@alpha_jwt_required()
def curriculum_progress():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)

    requested_user_id = request.args.get("user_id")
    target_user_id = user.id
    if requested_user_id and int(requested_user_id) != user.id:
        if not _is_verifier(user):
            return error("forbidden", "Only verifiers can inspect other learner progress", status=403)
        target_user_id = int(requested_user_id)

    query = EducationUserProgress.query.filter_by(user_id=target_user_id)
    program_id = request.args.get("program_id")
    if program_id:
        query = query.filter(EducationUserProgress.program_id == int(program_id))

    rows = query.order_by(EducationUserProgress.updated_at.desc()).all()
    payload = [
        {
            "id": row.id,
            "user_id": row.user_id,
            "program_id": row.program_id,
            "module_id": row.module_id,
            "topic_id": row.topic_id,
            "completion_percent": row.completion_percent,
            "depth_tier_unlocked": row.depth_tier_unlocked,
            "status": row.status,
            "completed_at": _now_iso(row.completed_at),
            "last_activity_at": _now_iso(row.last_activity_at),
            "updated_at": _now_iso(row.updated_at),
        }
        for row in rows
    ]
    return ok({"progress": payload})


@education_stack_bp.route("/curriculum/progress", methods=["POST"])
@alpha_jwt_required()
def curriculum_upsert_progress():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}

    try:
        program_id = int(payload.get("program_id"))
        module_id = int(payload.get("module_id"))
        topic_id = int(payload.get("topic_id"))
    except (TypeError, ValueError):
        return error("validation_error", "program_id, module_id and topic_id are required", status=400)

    topic = EducationTopic.query.get(topic_id)
    if not topic or topic.program_id != program_id or topic.module_id != module_id:
        return error("validation_error", "Topic does not align with provided program/module", status=400)

    completion_percent = max(0, min(100, int(payload.get("completion_percent") or 0)))
    depth_tier_unlocked = max(1, int(payload.get("depth_tier_unlocked") or topic.depth_tier or 1))

    row = EducationUserProgress.query.filter_by(
        user_id=user.id,
        program_id=program_id,
        module_id=module_id,
        topic_id=topic_id,
    ).first()
    newly_completed = False
    if not row:
        row = EducationUserProgress(
            user_id=user.id,
            program_id=program_id,
            module_id=module_id,
            topic_id=topic_id,
            completion_percent=completion_percent,
            depth_tier_unlocked=depth_tier_unlocked,
            status="completed" if completion_percent >= 100 else "in_progress",
            completed_at=datetime.utcnow() if completion_percent >= 100 else None,
            last_activity_at=datetime.utcnow(),
        )
        newly_completed = completion_percent >= 100
        db.session.add(row)
    else:
        previous_completion = row.completion_percent
        row.completion_percent = max(row.completion_percent, completion_percent)
        row.depth_tier_unlocked = max(row.depth_tier_unlocked, depth_tier_unlocked)
        row.last_activity_at = datetime.utcnow()
        if row.completion_percent >= 100 and row.completed_at is None:
            row.completed_at = datetime.utcnow()
            row.status = "completed"
            newly_completed = True
        elif row.completion_percent < 100:
            row.status = "in_progress"
        newly_completed = newly_completed or (previous_completion < 100 and row.completion_percent >= 100)

    completion_record = CompletionRecord.query.filter_by(
        user_id=user.id,
        entity_type="education_topic",
        entity_id=topic.id,
    ).first()
    if not completion_record:
        completion_record = CompletionRecord(
            user_id=user.id,
            entity_type="education_topic",
            entity_id=topic.id,
        )
        db.session.add(completion_record)
    completion_record.progress_percent = max(int(completion_record.progress_percent or 0), int(row.completion_percent or 0))
    completion_record.score = float(payload.get("score") or completion_record.score or 0)
    if completion_record.progress_percent >= 100 and completion_record.completed_at is None:
        completion_record.completed_at = datetime.utcnow()

    badge_payload = None
    if newly_completed:
        _award_subtle_points(user, 4)
        _notify(user.id, f"Topic completed: {topic.title}")
        badge_payload = _award_badge_if_eligible(user, topic)

    regen_links = EducationRegenerationLink.query.filter_by(
        program_id=program_id,
        module_id=module_id,
    ).all()
    unlocked_links = []
    for link in regen_links:
        if link.topic_id and link.topic_id != topic_id:
            continue
        progress_value = _get_progress_for_link(user.id, link)
        if progress_value >= link.unlock_threshold:
            unlocked_links.append(link.id)
            _notify(user.id, f"Regeneration action unlocked for module {module_id}.")

    _record_audit(
        actor_id=user.id,
        node_id=user.node_id,
        action="education_curriculum_progress_upsert",
        entity_type="education_topic",
        entity_id=str(topic.id),
        payload={
            "program_id": program_id,
            "module_id": module_id,
            "topic_id": topic_id,
            "completion_percent": row.completion_percent,
            "depth_tier_unlocked": row.depth_tier_unlocked,
            "newly_completed": newly_completed,
            "unlocked_regeneration_links": unlocked_links,
        },
    )
    db.session.commit()

    return ok(
        {
            "id": row.id,
            "program_id": row.program_id,
            "module_id": row.module_id,
            "topic_id": row.topic_id,
            "completion_percent": row.completion_percent,
            "depth_tier_unlocked": row.depth_tier_unlocked,
            "status": row.status,
            "completed_at": _now_iso(row.completed_at),
            "badge_award": badge_payload,
            "unlocked_regeneration_links": unlocked_links,
        }
    )


@education_stack_bp.route("/curriculum/reflections", methods=["POST"])
@alpha_jwt_required()
def curriculum_submit_reflection():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}
    try:
        program_id = int(payload.get("program_id"))
        module_id = int(payload.get("module_id"))
        topic_id = int(payload.get("topic_id"))
    except (TypeError, ValueError):
        return error("validation_error", "program_id, module_id and topic_id are required", status=400)
    response_text = (payload.get("response_text") or "").strip()
    if not response_text:
        return error("validation_error", "response_text is required", status=400)

    topic = EducationTopic.query.get(topic_id)
    if not topic or topic.program_id != program_id or topic.module_id != module_id:
        return error("validation_error", "Topic does not align with provided program/module", status=400)

    reflection = EducationReflection(
        user_id=user.id,
        program_id=program_id,
        module_id=module_id,
        topic_id=topic_id,
        prompt=(payload.get("prompt") or topic.reflection_prompt or "Reflection"),
        response_text=response_text,
    )
    db.session.add(reflection)
    _record_audit(
        actor_id=user.id,
        node_id=user.node_id,
        action="education_reflection_submitted",
        entity_type="education_reflection",
        entity_id=None,
        payload={"program_id": program_id, "module_id": module_id, "topic_id": topic_id},
    )
    db.session.commit()
    return ok({"id": reflection.id, "submitted_at": _now_iso(reflection.submitted_at)}, status=201)


@education_stack_bp.route("/curriculum/reflections", methods=["GET"])
@alpha_jwt_required()
def curriculum_reflections():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)

    query = EducationReflection.query
    requested_user_id = request.args.get("user_id")
    if requested_user_id:
        requested = int(requested_user_id)
        if requested != user.id and not _is_verifier(user):
            return error("forbidden", "Only verifiers can view other learner reflections", status=403)
        query = query.filter(EducationReflection.user_id == requested)
    elif not _is_verifier(user):
        query = query.filter(EducationReflection.user_id == user.id)

    topic_id = request.args.get("topic_id")
    if topic_id:
        query = query.filter(EducationReflection.topic_id == int(topic_id))

    reflections = query.order_by(EducationReflection.submitted_at.desc()).limit(400).all()
    payload = [
        {
            "id": row.id,
            "user_id": row.user_id,
            "program_id": row.program_id,
            "module_id": row.module_id,
            "topic_id": row.topic_id,
            "prompt": row.prompt,
            "response_text": row.response_text,
            "submitted_at": _now_iso(row.submitted_at),
            "updated_at": _now_iso(row.updated_at),
        }
        for row in reflections
    ]
    return ok({"reflections": payload})


@education_stack_bp.route("/curriculum/report", methods=["GET"])
@require_permission("education:manage")
def curriculum_report():
    completion_rows = db.session.query(
        EducationUserProgress.module_id,
        func.avg(EducationUserProgress.completion_percent),
        func.count(EducationUserProgress.id),
    ).group_by(EducationUserProgress.module_id).all()
    module_performance = [
        {
            "module_id": module_id,
            "avg_completion_percent": float(round(avg_completion or 0.0, 2)),
            "record_count": int(record_count),
        }
        for module_id, avg_completion, record_count in completion_rows
    ]

    tier_rows = db.session.query(
        EducationUserProgress.depth_tier_unlocked,
        func.count(EducationUserProgress.id),
    ).group_by(EducationUserProgress.depth_tier_unlocked).all()
    depth_distribution = [{"depth_tier": int(tier), "count": int(count)} for tier, count in tier_rows]

    progression_distribution = {"0-24": 0, "25-49": 0, "50-74": 0, "75-99": 0, "100": 0}
    completion_values = db.session.query(EducationUserProgress.completion_percent).all()
    for (value,) in completion_values:
        if value >= 100:
            progression_distribution["100"] += 1
        elif value >= 75:
            progression_distribution["75-99"] += 1
        elif value >= 50:
            progression_distribution["50-74"] += 1
        elif value >= 25:
            progression_distribution["25-49"] += 1
        else:
            progression_distribution["0-24"] += 1

    reflection_count = EducationReflection.query.count()
    return ok(
        {
            "module_performance": module_performance,
            "depth_distribution": depth_distribution,
            "progression_distribution": progression_distribution,
            "reflection_submissions": reflection_count,
            "report_generated_at": _now_iso(datetime.utcnow()),
        }
    )


@education_stack_bp.route("/governance/knowledge-entries", methods=["GET"])
def governance_list_knowledge_entries():
    user = get_current_user()
    query = IndigenousPlantKnowledge.query

    status = request.args.get("status")
    if status:
        if status != "approved" and not _is_verifier(user):
            return error("forbidden", "Only verifiers can inspect pending or rejected knowledge", status=403)
        query = query.filter(IndigenousPlantKnowledge.verification_status == status)
    elif not _is_verifier(user):
        query = query.filter(IndigenousPlantKnowledge.verification_status == "approved")

    region = request.args.get("region")
    if region:
        query = query.filter(IndigenousPlantKnowledge.region == region)

    allowed_levels = _allowed_sensitivity_levels(user)
    query = query.filter(IndigenousPlantKnowledge.sensitivity_level.in_(allowed_levels))

    rows = query.order_by(IndigenousPlantKnowledge.created_at.desc()).limit(500).all()
    payload = [_serialize_plant(row, include_nested=False, include_audit=_is_verifier(user)) for row in rows]
    return ok({"knowledge_entries": payload})


@education_stack_bp.route("/governance/knowledge-entries", methods=["POST"])
@alpha_jwt_required()
def governance_create_knowledge_entry():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}

    required_fields = [
        "region",
        "language_group",
        "indigenous_name",
        "season",
        "traditional_uses",
    ]
    missing = [field for field in required_fields if not str(payload.get(field) or "").strip()]
    if missing:
        return error("validation_error", f"Missing required fields: {', '.join(missing)}", status=400)

    sensitivity_level = _normalize_sensitivity(payload.get("sensitivity_level"))
    if sensitivity_level == "restricted" and not _is_verifier(user):
        return error("forbidden", "Restricted knowledge requires verifier-level role", status=403)

    entry = IndigenousPlantKnowledge(
        node_id=user.node_id,
        microcosm_id=payload.get("microcosm_id"),
        event_id=payload.get("event_id"),
        region=payload["region"].strip(),
        language_group=payload["language_group"].strip(),
        indigenous_name=payload["indigenous_name"].strip(),
        scientific_name=(payload.get("scientific_name") or "").strip() or None,
        season=payload["season"].strip(),
        traditional_uses=(payload.get("traditional_uses") or "").strip(),
        preparation_methods=(payload.get("preparation_methods") or "").strip() or None,
        cultural_context=(payload.get("cultural_context") or "").strip() or None,
        scientific_notes=(payload.get("scientific_notes") or "").strip() or None,
        sensitivity_level=sensitivity_level,
        verification_status="pending",
        elder_verified=bool(payload.get("elder_verified", False)),
        custodial_region_tag=(payload.get("custodial_region_tag") or "").strip() or None,
        attribution_community=(payload.get("attribution_community") or "").strip() or None,
        attribution_custodian=(payload.get("attribution_custodian") or "").strip() or None,
        lineage_reference=(payload.get("lineage_reference") or "").strip() or None,
        language_code=(payload.get("language_code") or "").strip() or None,
        geo_lat=payload.get("geo_lat"),
        geo_lng=payload.get("geo_lng"),
        offline_package_ref=(payload.get("offline_package_ref") or "").strip() or None,
        created_by=user.id,
    )
    db.session.add(entry)
    db.session.flush()

    for media in payload.get("media_assets") or []:
        asset_url = (media.get("asset_url") or "").strip()
        if not asset_url:
            continue
        db.session.add(
            PlantMediaAsset(
                plant_id=entry.id,
                media_type=(media.get("media_type") or "illustration").strip(),
                asset_url=asset_url,
                thumbnail_url=(media.get("thumbnail_url") or "").strip() or None,
                alt_text=(media.get("alt_text") or "").strip() or None,
                is_transparent_illustration=bool(media.get("is_transparent_illustration", False)),
                language_code=(media.get("language_code") or "").strip() or None,
                sort_order=int(media.get("sort_order") or 0),
            )
        )

    for rel in payload.get("ecological_relationships") or []:
        relation_type = (rel.get("relationship_type") or "").strip()
        if not relation_type:
            continue
        db.session.add(
            PlantEcologicalRelationship(
                plant_id=entry.id,
                related_plant_id=rel.get("related_plant_id"),
                relationship_type=relation_type,
                related_label=(rel.get("related_label") or "").strip() or None,
                soil_type=(rel.get("soil_type") or "").strip() or None,
                seasonal_cycle=(rel.get("seasonal_cycle") or "").strip() or None,
                ethical_harvest_constraint=(rel.get("ethical_harvest_constraint") or "").strip() or None,
                notes=(rel.get("notes") or "").strip() or None,
            )
        )

    for state in payload.get("landscape_states") or []:
        state_label = (state.get("state_label") or "").strip().lower()
        if state_label not in {"before", "degraded", "regenerated"}:
            continue
        db.session.add(
            PlantLandscapeState(
                plant_id=entry.id,
                state_label=state_label,
                biodiversity_index=state.get("biodiversity_index"),
                soil_health_index=state.get("soil_health_index"),
                canopy_cover_pct=state.get("canopy_cover_pct"),
                narrative=(state.get("narrative") or "").strip() or None,
            )
        )

    _log_knowledge_audit(entry.id, user.id, "knowledge_entry_created", "Submitted for verifier review.")
    _record_audit(
        actor_id=user.id,
        node_id=user.node_id,
        action="education_knowledge_entry_created",
        entity_type="indigenous_plant_knowledge",
        entity_id=str(entry.id),
        payload={"sensitivity_level": entry.sensitivity_level},
    )
    db.session.commit()
    return ok({"knowledge_id": entry.id, "verification_status": entry.verification_status}, status=201)


@education_stack_bp.route("/governance/knowledge-entries/<int:knowledge_id>/verify", methods=["POST"])
@alpha_jwt_required()
def governance_verify_knowledge_entry(knowledge_id: int):
    user = get_current_user()
    if not _is_verifier(user):
        return error("forbidden", "Verifier role required", status=403)
    payload = request.get_json() or {}
    decision = (payload.get("decision") or "").strip().lower()
    if decision not in {"approved", "rejected"}:
        return error("validation_error", "decision must be approved or rejected", status=400)

    entry = IndigenousPlantKnowledge.query.get_or_404(knowledge_id)
    entry.verification_status = decision
    entry.verified_by = user.id
    entry.verified_at = datetime.utcnow()
    entry.elder_verified = bool(payload.get("elder_verification_flag", entry.elder_verified))
    notes = (payload.get("notes") or "").strip() or None

    db.session.add(
        KnowledgeApprovalRecord(
            knowledge_id=entry.id,
            verifier_id=user.id,
            decision=decision,
            notes=notes,
            elder_verification_flag=entry.elder_verified,
        )
    )
    _log_knowledge_audit(entry.id, user.id, f"knowledge_entry_{decision}", notes)
    _record_audit(
        actor_id=user.id,
        node_id=user.node_id,
        action="education_knowledge_entry_verified",
        entity_type="indigenous_plant_knowledge",
        entity_id=str(entry.id),
        payload={"decision": decision, "elder_verified": bool(entry.elder_verified)},
    )
    if entry.created_by:
        _notify(
            entry.created_by,
            f"Knowledge entry '{entry.indigenous_name}' {decision}.",
        )
    db.session.commit()
    return ok(
        {
            "knowledge_id": entry.id,
            "verification_status": entry.verification_status,
            "verified_by": entry.verified_by,
            "verified_at": _now_iso(entry.verified_at),
        }
    )


@education_stack_bp.route("/governance/knowledge-entries/<int:knowledge_id>/lineage", methods=["GET", "POST"])
@alpha_jwt_required()
def governance_lineage(knowledge_id: int):
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    IndigenousPlantKnowledge.query.get_or_404(knowledge_id)

    if request.method == "GET":
        parent_rows = KnowledgeLineage.query.filter_by(child_knowledge_id=knowledge_id).all()
        child_rows = KnowledgeLineage.query.filter_by(parent_knowledge_id=knowledge_id).all()
        return ok(
            {
                "parents": [
                    {
                        "lineage_id": row.id,
                        "knowledge_id": row.parent_knowledge_id,
                        "relation_type": row.relation_type,
                        "notes": row.notes,
                    }
                    for row in parent_rows
                ],
                "children": [
                    {
                        "lineage_id": row.id,
                        "knowledge_id": row.child_knowledge_id,
                        "relation_type": row.relation_type,
                        "notes": row.notes,
                    }
                    for row in child_rows
                ],
            }
        )

    if not _is_verifier(user):
        return error("forbidden", "Verifier role required for lineage updates", status=403)

    payload = request.get_json() or {}
    try:
        parent_knowledge_id = int(payload.get("parent_knowledge_id"))
    except (TypeError, ValueError):
        return error("validation_error", "parent_knowledge_id is required", status=400)
    relation_type = (payload.get("relation_type") or "derived_from").strip()
    if parent_knowledge_id == knowledge_id:
        return error("validation_error", "A record cannot lineage-link to itself", status=400)

    parent = IndigenousPlantKnowledge.query.get(parent_knowledge_id)
    if not parent:
        return error("not_found", "Parent knowledge entry not found", status=404)

    existing = KnowledgeLineage.query.filter_by(
        parent_knowledge_id=parent_knowledge_id,
        child_knowledge_id=knowledge_id,
        relation_type=relation_type,
    ).first()
    if existing:
        return ok({"lineage_id": existing.id})

    row = KnowledgeLineage(
        parent_knowledge_id=parent_knowledge_id,
        child_knowledge_id=knowledge_id,
        relation_type=relation_type,
        notes=(payload.get("notes") or "").strip() or None,
        created_by=user.id,
    )
    db.session.add(row)
    _log_knowledge_audit(knowledge_id, user.id, "knowledge_lineage_linked", f"Parent {parent_knowledge_id}")
    _record_audit(
        actor_id=user.id,
        node_id=user.node_id,
        action="education_knowledge_lineage_linked",
        entity_type="indigenous_plant_knowledge",
        entity_id=str(knowledge_id),
        payload={"parent_knowledge_id": parent_knowledge_id, "relation_type": relation_type},
    )
    db.session.commit()
    return ok({"lineage_id": row.id}, status=201)


@education_stack_bp.route("/governance/approvals/pending", methods=["GET"])
@alpha_jwt_required()
def governance_pending_approvals():
    user = get_current_user()
    if not _is_verifier(user):
        return error("forbidden", "Verifier role required", status=403)
    rows = IndigenousPlantKnowledge.query.filter_by(verification_status="pending").order_by(
        IndigenousPlantKnowledge.created_at.asc()
    ).all()
    payload = [_serialize_plant(row, include_nested=False, include_audit=True) for row in rows]
    return ok({"pending_entries": payload})


@education_stack_bp.route("/regeneration/unlocks", methods=["GET"])
@alpha_jwt_required()
def regeneration_unlocks():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    links = EducationRegenerationLink.query.order_by(EducationRegenerationLink.created_at.desc()).all()

    payload = []
    for link in links:
        if link.action_category not in REGENERATION_CATEGORIES:
            continue
        action = Action.query.get(link.action_id)
        if not action:
            continue
        progress_value = _get_progress_for_link(user.id, link)
        unlocked = progress_value >= link.unlock_threshold
        log_row = EducationRegenerationLog.query.filter_by(
            user_id=user.id,
            regeneration_link_id=link.id,
        ).first()
        payload.append(
            {
                "regeneration_link_id": link.id,
                "program_id": link.program_id,
                "module_id": link.module_id,
                "topic_id": link.topic_id,
                "action_id": link.action_id,
                "action_title": action.title,
                "action_category": link.action_category,
                "unlock_threshold": link.unlock_threshold,
                "progress_value": progress_value,
                "unlocked": unlocked,
                "requires_verification": bool(link.requires_verification),
                "cultural_guidance": link.cultural_guidance,
                "completion_status": log_row.completion_status if log_row else None,
                "completed_at": _now_iso(log_row.completed_at) if log_row else None,
                "verified_at": _now_iso(log_row.verified_at) if log_row else None,
            }
        )
    return ok({"unlocks": payload})


@education_stack_bp.route("/regeneration/logs", methods=["GET"])
@alpha_jwt_required()
def regeneration_logs():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    query = EducationRegenerationLog.query
    if _is_verifier(user):
        requested_user_id = request.args.get("user_id")
        if requested_user_id:
            query = query.filter(EducationRegenerationLog.user_id == int(requested_user_id))
    else:
        query = query.filter(EducationRegenerationLog.user_id == user.id)
    rows = query.order_by(EducationRegenerationLog.updated_at.desc()).all()
    payload = [
        {
            "id": row.id,
            "user_id": row.user_id,
            "regeneration_link_id": row.regeneration_link_id,
            "action_id": row.action_id,
            "completion_status": row.completion_status,
            "proof_note": row.proof_note,
            "completed_at": _now_iso(row.completed_at),
            "verified_by": row.verified_by,
            "verified_at": _now_iso(row.verified_at),
            "updated_at": _now_iso(row.updated_at),
        }
        for row in rows
    ]
    return ok({"logs": payload})


@education_stack_bp.route("/regeneration/logs", methods=["POST"])
@alpha_jwt_required()
def regeneration_create_log():
    user = get_current_user()
    if not user:
        return error("unauthorized", "Unauthorized", status=401)
    payload = request.get_json() or {}

    try:
        link_id = int(payload.get("regeneration_link_id"))
    except (TypeError, ValueError):
        return error("validation_error", "regeneration_link_id is required", status=400)

    link = EducationRegenerationLink.query.get(link_id)
    if not link:
        return error("not_found", "Regeneration link not found", status=404)

    progress_value = _get_progress_for_link(user.id, link)
    if progress_value < link.unlock_threshold:
        return error("forbidden", "Regeneration action not yet unlocked", status=403)

    requested_status = (payload.get("completion_status") or "completed").strip().lower()
    if requested_status not in {"pending", "completed"}:
        requested_status = "completed"

    row = EducationRegenerationLog.query.filter_by(user_id=user.id, regeneration_link_id=link.id).first()
    was_completed = False
    if not row:
        row = EducationRegenerationLog(
            user_id=user.id,
            regeneration_link_id=link.id,
            action_id=link.action_id,
            completion_status=requested_status,
            proof_note=(payload.get("proof_note") or "").strip() or None,
            completed_at=datetime.utcnow() if requested_status == "completed" else None,
        )
        db.session.add(row)
    else:
        was_completed = row.completion_status in {"completed", "verified"} or row.completed_at is not None
        row.completion_status = requested_status
        row.proof_note = (payload.get("proof_note") or row.proof_note or "").strip() or None
        if requested_status == "completed" and row.completed_at is None:
            row.completed_at = datetime.utcnow()

    is_new_completion = requested_status == "completed" and not was_completed
    action = Action.query.get(link.action_id)
    if action and is_new_completion:
        action.completions = int(action.completions or 0) + 1

    if is_new_completion:
        _award_subtle_points(user, 2)
        _notify(user.id, "Regeneration action logged. Verification pending where required.")

    _record_audit(
        actor_id=user.id,
        node_id=user.node_id,
        action="education_regeneration_log_created",
        entity_type="education_regeneration_log",
        entity_id=str(link.id),
        payload={
            "completion_status": requested_status,
            "action_id": link.action_id,
            "regeneration_link_id": link.id,
        },
    )
    db.session.commit()
    return ok(
        {
            "id": row.id,
            "completion_status": row.completion_status,
            "completed_at": _now_iso(row.completed_at),
            "requires_verification": bool(link.requires_verification),
        },
        status=201,
    )


@education_stack_bp.route("/regeneration/logs/<int:log_id>/verify", methods=["POST"])
@alpha_jwt_required()
def regeneration_verify_log(log_id: int):
    verifier = get_current_user()
    if not _is_verifier(verifier):
        return error("forbidden", "Verifier role required", status=403)

    row = EducationRegenerationLog.query.get_or_404(log_id)
    row.completion_status = "verified"
    row.verified_by = verifier.id
    row.verified_at = datetime.utcnow()

    _record_audit(
        actor_id=verifier.id,
        node_id=verifier.node_id,
        action="education_regeneration_log_verified",
        entity_type="education_regeneration_log",
        entity_id=str(row.id),
        payload={"user_id": row.user_id},
    )
    _notify(row.user_id, "Regeneration action verified.")
    db.session.commit()
    return ok(
        {
            "id": row.id,
            "completion_status": row.completion_status,
            "verified_by": row.verified_by,
            "verified_at": _now_iso(row.verified_at),
        }
    )


@education_stack_bp.route("/admin/overview", methods=["GET"])
@require_permission("education:manage")
def education_admin_overview():
    total_programs = EducationProgram.query.count()
    total_topics = EducationTopic.query.count()
    total_progress = EducationUserProgress.query.count()
    completed_progress = EducationUserProgress.query.filter_by(status="completed").count()
    total_reflections = EducationReflection.query.count()
    pending_approvals = IndigenousPlantKnowledge.query.filter_by(verification_status="pending").count()
    approved_entries = IndigenousPlantKnowledge.query.filter_by(verification_status="approved").count()
    rejected_entries = IndigenousPlantKnowledge.query.filter_by(verification_status="rejected").count()
    total_regen_logs = EducationRegenerationLog.query.count()

    module_perf_rows = db.session.query(
        EducationUserProgress.module_id,
        func.avg(EducationUserProgress.completion_percent),
        func.count(EducationUserProgress.id),
    ).group_by(EducationUserProgress.module_id).all()
    module_performance = [
        {
            "module_id": module_id,
            "module_title": Module.query.get(module_id).title if Module.query.get(module_id) else f"Module {module_id}",
            "avg_completion_percent": float(round(avg_completion or 0.0, 2)),
            "record_count": int(record_count),
        }
        for module_id, avg_completion, record_count in module_perf_rows
    ]

    user_distribution = defaultdict(int)
    user_rows = (
        db.session.query(
            EducationUserProgress.user_id,
            func.avg(EducationUserProgress.completion_percent),
        )
        .group_by(EducationUserProgress.user_id)
        .all()
    )
    for _, avg_completion in user_rows:
        value = float(avg_completion or 0.0)
        if value >= 100:
            user_distribution["completed"] += 1
        elif value >= 75:
            user_distribution["advanced"] += 1
        elif value >= 40:
            user_distribution["active"] += 1
        else:
            user_distribution["early"] += 1

    recent_reflections = EducationReflection.query.order_by(EducationReflection.submitted_at.desc()).limit(30).all()
    reflection_payload = [
        {
            "id": row.id,
            "user_id": row.user_id,
            "username": User.query.get(row.user_id).username if User.query.get(row.user_id) else None,
            "topic_id": row.topic_id,
            "prompt": row.prompt,
            "submitted_at": _now_iso(row.submitted_at),
        }
        for row in recent_reflections
    ]

    pending_entries = IndigenousPlantKnowledge.query.filter_by(verification_status="pending").order_by(
        IndigenousPlantKnowledge.created_at.asc()
    ).limit(50).all()
    pending_payload = [_serialize_plant(entry, include_nested=False, include_audit=False) for entry in pending_entries]

    return ok(
        {
            "summary": {
                "programs": total_programs,
                "topics": total_topics,
                "progress_records": total_progress,
                "completed_progress_records": completed_progress,
                "completion_rate": round((completed_progress / total_progress) * 100, 2) if total_progress else 0.0,
                "reflection_submissions": total_reflections,
                "pending_approvals": pending_approvals,
                "approved_entries": approved_entries,
                "rejected_entries": rejected_entries,
                "regeneration_logs": total_regen_logs,
            },
            "module_performance": module_performance,
            "user_progression_distribution": user_distribution,
            "recent_reflections": reflection_payload,
            "pending_approval_panel": pending_payload,
            "generated_at": _now_iso(datetime.utcnow()),
        }
    )


@education_stack_bp.route("/admin/reflections", methods=["GET"])
@require_permission("education:manage")
def education_admin_reflections():
    query = EducationReflection.query
    topic_id = request.args.get("topic_id")
    if topic_id:
        query = query.filter(EducationReflection.topic_id == int(topic_id))
    user_id = request.args.get("user_id")
    if user_id:
        query = query.filter(EducationReflection.user_id == int(user_id))
    rows = query.order_by(EducationReflection.submitted_at.desc()).limit(500).all()
    payload = [
        {
            "id": row.id,
            "user_id": row.user_id,
            "username": User.query.get(row.user_id).username if User.query.get(row.user_id) else None,
            "program_id": row.program_id,
            "module_id": row.module_id,
            "topic_id": row.topic_id,
            "prompt": row.prompt,
            "response_text": row.response_text,
            "submitted_at": _now_iso(row.submitted_at),
        }
        for row in rows
    ]
    return ok({"reflections": payload})


@education_stack_bp.route("/admin/approvals", methods=["GET"])
@require_permission("education:manage")
def education_admin_approvals():
    pending = IndigenousPlantKnowledge.query.filter_by(verification_status="pending").order_by(
        IndigenousPlantKnowledge.created_at.asc()
    ).all()
    approvals = KnowledgeApprovalRecord.query.order_by(KnowledgeApprovalRecord.created_at.desc()).limit(200).all()
    return ok(
        {
            "pending_entries": [_serialize_plant(item, include_nested=False) for item in pending],
            "recent_approvals": [
                {
                    "id": row.id,
                    "knowledge_id": row.knowledge_id,
                    "verifier_id": row.verifier_id,
                    "decision": row.decision,
                    "notes": row.notes,
                    "elder_verification_flag": row.elder_verification_flag,
                    "created_at": _now_iso(row.created_at),
                }
                for row in approvals
            ],
        }
    )
