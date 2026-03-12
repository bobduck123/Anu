from __future__ import annotations

from typing import Any

from ...extensions import db
from ...time_utils import now_utc
from ...models import (
    CIGuidedJourney,
    CIGuidedJourneyModule,
    CILearningModule,
    CIQuestInstance,
    CIQuestProgress,
    CIQuestTemplate,
    QuestCommitmentLink,
    StoryCluster,
)
from .coordination import (
    add_checkin,
    create_commitment,
    link_quest_to_commitment,
    maybe_complete_commitment,
)


def list_learning_modules() -> list[dict[str, Any]]:
    rows = (
        CILearningModule.query.filter(CILearningModule.status.in_(["draft", "published"]))
        .order_by(CILearningModule.updated_at.desc())
        .all()
    )
    return [row.to_dict() for row in rows]


def list_guided_journeys() -> list[dict[str, Any]]:
    journeys = (
        CIGuidedJourney.query.filter(CIGuidedJourney.status.in_(["draft", "published"]))
        .order_by(CIGuidedJourney.updated_at.desc())
        .all()
    )
    if not journeys:
        return []

    journey_ids = [row.id for row in journeys]
    links = (
        CIGuidedJourneyModule.query.filter(CIGuidedJourneyModule.journey_id.in_(journey_ids))
        .order_by(CIGuidedJourneyModule.journey_id.asc(), CIGuidedJourneyModule.sequence.asc())
        .all()
    )
    module_ids = sorted({link.module_id for link in links})
    modules = (
        CILearningModule.query.filter(CILearningModule.id.in_(module_ids)).all()
        if module_ids
        else []
    )
    module_by_id = {module.id: module for module in modules}
    links_by_journey: dict[int, list[CIGuidedJourneyModule]] = {}
    for link in links:
        links_by_journey.setdefault(link.journey_id, []).append(link)

    payload: list[dict[str, Any]] = []
    for journey in journeys:
        data = journey.to_dict()
        modules: list[dict[str, Any]] = []
        for link in links_by_journey.get(journey.id, []):
            module = module_by_id.get(link.module_id)
            if module:
                modules.append(module.to_dict())
        data["modules"] = modules
        payload.append(data)
    return payload


def find_triggered_quest_templates(
    cluster: StoryCluster | None,
    event_type: str | None = None,
    entity_types: list[str] | None = None,
) -> list[CIQuestTemplate]:
    query = CIQuestTemplate.query.filter_by(status="active")
    candidates = query.order_by(CIQuestTemplate.updated_at.desc()).all()
    if not candidates:
        return []
    matched: list[CIQuestTemplate] = []
    for template in candidates:
        if cluster and float(cluster.score or 0) < float(template.min_cluster_score or 0):
            continue
        if template.trigger_event_type and event_type and template.trigger_event_type != event_type:
            continue
        if template.trigger_entity_type:
            if not entity_types or template.trigger_entity_type not in entity_types:
                continue
        matched.append(template)
    return matched


def start_quest(
    user_id: int,
    quest_template: CIQuestTemplate,
    cluster_id: int | None = None,
) -> CIQuestInstance:
    existing = (
        CIQuestInstance.query.filter_by(
            user_id=user_id,
            quest_template_id=quest_template.id,
            cluster_id=cluster_id,
            status="active",
        )
        .order_by(CIQuestInstance.id.desc())
        .first()
    )
    if existing:
        return existing

    instance = CIQuestInstance(
        quest_template_id=quest_template.id,
        user_id=user_id,
        cluster_id=cluster_id,
        linked_module_id=quest_template.linked_module_id,
        status="active",
        progress_percent=0.0,
        started_at=now_utc(),
    )
    db.session.add(instance)
    db.session.flush()

    if quest_template.commitment_type:
        commitment = create_commitment(
            user_id=user_id,
            title=quest_template.title,
            description=quest_template.description,
            source_type="quest",
            source_id=str(instance.id),
            created_by=user_id,
        )
        link_quest_to_commitment(instance, commitment)

    db.session.flush()
    return instance


def list_quests_for_user(user_id: int) -> list[dict[str, Any]]:
    rows = (
        CIQuestInstance.query.filter_by(user_id=user_id)
        .order_by(CIQuestInstance.updated_at.desc())
        .all()
    )
    if not rows:
        return []

    quest_ids = [row.id for row in rows]
    template_ids = sorted({row.quest_template_id for row in rows if row.quest_template_id})
    templates = (
        CIQuestTemplate.query.filter(CIQuestTemplate.id.in_(template_ids)).all()
        if template_ids
        else []
    )
    template_by_id = {template.id: template for template in templates}

    links = QuestCommitmentLink.query.filter(QuestCommitmentLink.quest_instance_id.in_(quest_ids)).all()
    links_by_quest: dict[int, list[QuestCommitmentLink]] = {}
    for link in links:
        links_by_quest.setdefault(link.quest_instance_id, []).append(link)

    payload: list[dict[str, Any]] = []
    for row in rows:
        item = row.to_dict()
        template = template_by_id.get(row.quest_template_id)
        if template:
            item["template"] = template.to_dict()
        quest_links = links_by_quest.get(row.id, [])
        item["commitment_ids"] = [link.commitment_id for link in quest_links]
        payload.append(item)
    return payload


def track_quest_progress(
    quest_instance_id: int,
    progress_percent: float,
    step_key: str,
    notes: str | None,
    evidence: dict[str, Any] | None,
    actor_id: int,
) -> CIQuestInstance:
    instance = db.session.get(CIQuestInstance, quest_instance_id)
    if not instance:
        raise ValueError("Quest instance not found")

    instance.progress_percent = max(0.0, min(100.0, float(progress_percent)))
    if instance.progress_percent >= 100.0:
        instance.status = "completed"
        if not instance.completed_at:
            instance.completed_at = now_utc()

    db.session.add(
        CIQuestProgress(
            quest_instance_id=instance.id,
            step_key=step_key or "progress_update",
            status="logged",
            notes=notes,
            evidence_json=evidence or {},
        )
    )

    commitment_links = QuestCommitmentLink.query.filter_by(quest_instance_id=instance.id).all()
    for link in commitment_links:
        add_checkin(
            commitment_id=link.commitment_id,
            payload={
                "quest_instance_id": instance.id,
                "progress_percent": instance.progress_percent,
                "step_key": step_key,
                "notes": notes,
                "evidence": evidence or {},
            },
            submitted_by=actor_id,
            evidence_type="quest_checkin",
        )
        maybe_complete_commitment(link.commitment_id, instance.progress_percent)

    db.session.flush()
    return instance
