from __future__ import annotations

from typing import Any

from ...extensions import db
from ...time_utils import now_utc
from ...models import (
    CIQuestInstance,
    Commitment,
    CommitmentEvidence,
    QuestCommitmentLink,
)


STATE_ORDER = [
    "proposed",
    "confirmed",
    "active",
    "completed",
    "verified",
    "archived",
]


def _state_index(state: str) -> int:
    try:
        return STATE_ORDER.index(state)
    except ValueError:
        return -1


def transition_commitment(commitment: Commitment, next_state: str) -> Commitment:
    if next_state not in Commitment.VALID_STATES:
        raise ValueError("Invalid commitment state")
    if _state_index(next_state) < _state_index(commitment.state):
        raise ValueError("State regression is not allowed")
    commitment.state = next_state
    if next_state == "completed":
        commitment.completed_at = now_utc()
    if next_state == "verified":
        commitment.verified_at = now_utc()
    if next_state == "archived":
        commitment.archived_at = now_utc()
    db.session.flush()
    return commitment


def create_commitment(
    user_id: int,
    title: str,
    description: str | None = None,
    source_type: str | None = None,
    source_id: str | None = None,
    created_by: int | None = None,
) -> Commitment:
    commitment = Commitment(
        user_id=user_id,
        title=title,
        description=description,
        source_type=source_type,
        source_id=source_id,
        state="proposed",
        created_by=created_by,
    )
    db.session.add(commitment)
    db.session.flush()
    return commitment


def list_commitments_for_user(user_id: int) -> list[Commitment]:
    return (
        Commitment.query.filter_by(user_id=user_id)
        .order_by(Commitment.updated_at.desc())
        .all()
    )


def add_checkin(
    commitment_id: int,
    payload: dict[str, Any],
    submitted_by: int | None = None,
    evidence_type: str = "checkin",
) -> CommitmentEvidence:
    commitment = db.session.get(Commitment, commitment_id)
    if not commitment:
        raise ValueError("Commitment not found")

    if commitment.state == "proposed":
        transition_commitment(commitment, "confirmed")
    if commitment.state == "confirmed":
        transition_commitment(commitment, "active")

    evidence = CommitmentEvidence(
        commitment_id=commitment.id,
        evidence_type=evidence_type,
        payload_json=payload or {},
        status="submitted",
        submitted_by=submitted_by,
    )
    db.session.add(evidence)
    db.session.flush()
    return evidence


def verify_evidence(
    evidence_id: int,
    verifier_id: int,
    accepted: bool,
    notes: str | None = None,
) -> CommitmentEvidence:
    evidence = db.session.get(CommitmentEvidence, evidence_id)
    if not evidence:
        raise ValueError("Evidence not found")
    commitment = db.session.get(Commitment, evidence.commitment_id)
    if not commitment:
        raise ValueError("Commitment not found")

    evidence.status = "verified" if accepted else "rejected"
    payload = dict(evidence.payload_json or {})
    if notes:
        payload["verification_notes"] = notes
    evidence.payload_json = payload
    evidence.verified_by = verifier_id
    evidence.verified_at = now_utc()

    if accepted and commitment.state in {"active", "completed"}:
        transition_commitment(commitment, "verified")
    elif not accepted and commitment.state == "verified":
        commitment.state = "active"

    db.session.flush()
    return evidence


def maybe_complete_commitment(commitment_id: int, progress_percent: float | int) -> Commitment:
    commitment = db.session.get(Commitment, commitment_id)
    if not commitment:
        raise ValueError("Commitment not found")
    if float(progress_percent) >= 100 and commitment.state in {"active", "confirmed", "proposed"}:
        if commitment.state == "proposed":
            transition_commitment(commitment, "confirmed")
        if commitment.state == "confirmed":
            transition_commitment(commitment, "active")
        transition_commitment(commitment, "completed")
    db.session.flush()
    return commitment


def link_quest_to_commitment(quest_instance: CIQuestInstance, commitment: Commitment) -> QuestCommitmentLink:
    existing = QuestCommitmentLink.query.filter_by(
        quest_instance_id=quest_instance.id,
        commitment_id=commitment.id,
    ).first()
    if existing:
        return existing
    link = QuestCommitmentLink(
        quest_instance_id=quest_instance.id,
        commitment_id=commitment.id,
    )
    db.session.add(link)
    db.session.flush()
    return link
