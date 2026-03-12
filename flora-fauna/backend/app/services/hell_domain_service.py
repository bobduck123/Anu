from __future__ import annotations

import math
from datetime import datetime
from typing import Any

from flask import current_app

from ..extensions import db
from ..hell_models import (
    NeedOfferMatch,
    NeedProjectionRead,
    OperationalNeed,
    OperationalOffer,
    TelemetryEvent,
)
from ..models import CrisisMode, User
from .hell_lifecycle import NEED_TRANSITIONS, OFFER_TRANSITIONS, validate_transition
from .hell_projector_service import rebuild_projectors
from .telemetry_service import emit_telemetry_event


CONTRIBUTION_TYPES = {"time", "goods", "skills", "logistics", "verification", "money"}
LEADER_ROLES = {"board_member", "node_admin", "platform_admin", "treasury_guardian", "relief_moderator"}
TRUSTED_ROLES = LEADER_ROLES | {"validator", "case_worker", "organizer", "node_curator", "auditor"}


def _routing_capacity() -> int:
    return int(current_app.config.get("HELL_ROUTING_CAPACITY", 25))


def _k_min() -> int:
    return int(current_app.config.get("HELL_K_ANON_MIN", 3))


def _trusted_quorum() -> int:
    return int(current_app.config.get("HELL_TRUSTED_QUORUM", 2))


def _leader_quorum() -> int:
    return int(current_app.config.get("HELL_LEADER_QUORUM", 1))


def _ensure_crisis_allows_verified_need(node_id: int) -> None:
    crisis = CrisisMode.query.filter_by(node_id=node_id).first()
    if crisis and crisis.is_active and crisis.event_submission_frozen:
        raise ValueError("Crisis mode blocks new verified needs at this node.")


def _ensure_crisis_allows_disbursement(node_id: int, emergency_override: bool = False) -> None:
    crisis = CrisisMode.query.filter_by(node_id=node_id).first()
    if crisis and crisis.is_active and crisis.escrow_frozen and not emergency_override:
        raise ValueError("Crisis mode freeze blocks disbursements.")


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def _availability_overlap(need_availability: dict[str, Any] | None, offer_availability: dict[str, Any] | None) -> bool:
    if not need_availability or not offer_availability:
        return True
    need_days = set((need_availability.get("days") or []))
    offer_days = set((offer_availability.get("days") or []))
    if not need_days or not offer_days:
        return True
    return len(need_days.intersection(offer_days)) > 0


def _compute_match_score(need: OperationalNeed, offer: OperationalOffer) -> tuple[float, float | None, bool]:
    score = 0.0
    distance_km = None
    microcosm_bonus = False
    if offer.category == need.category:
        score += 50.0
    if need.microcosm_id and offer.microcosm_id and need.microcosm_id == offer.microcosm_id:
        score += 25.0
        microcosm_bonus = True
    if need.lat is not None and need.lng is not None and offer.lat is not None and offer.lng is not None:
        distance_km = _haversine_km(need.lat, need.lng, offer.lat, offer.lng)
        score += max(0.0, 20.0 - min(distance_km, 20.0))
    if _availability_overlap(need.availability_json, offer.availability_json):
        score += 10.0
    return score, distance_km, microcosm_bonus


def _record_need_status_change(
    *,
    need: OperationalNeed,
    actor_id: int | None,
    to_state: str,
    node_id: int,
    consent_flags: dict[str, Any] | None = None,
) -> TelemetryEvent:
    from_state = need.status
    validate_transition(NEED_TRANSITIONS, from_state, to_state, "need")
    event = emit_telemetry_event(
        actor_id=actor_id,
        entity_type="need",
        entity_id=str(need.id),
        event_type="NEED_STATUS_CHANGED",
        props_json={"from_state": from_state, "to_state": to_state},
        node_id=node_id,
        consent_flags=consent_flags,
    )
    need.status = to_state
    if to_state == "CLOSED_FULFILLED":
        need.closed_at = datetime.utcnow()
    return event


def _record_offer_status_change(
    *,
    offer: OperationalOffer,
    actor_id: int | None,
    to_state: str,
    node_id: int,
    props_extra: dict[str, Any] | None = None,
    event_type: str | None = None,
    consent_flags: dict[str, Any] | None = None,
) -> TelemetryEvent:
    from_state = offer.status
    validate_transition(OFFER_TRANSITIONS, from_state, to_state, "offer")
    event_name = event_type or {
        "MATCHED_TO_NEED": "OFFER_MATCHED_TO_NEED",
        "ACCEPTED": "OFFER_ACCEPTED",
        "IN_PROGRESS": "OFFER_IN_PROGRESS",
        "DELIVERED_PENDING_CONFIRMATION": "OFFER_DELIVERED_PENDING_CONFIRMATION",
        "CONFIRMED": "OFFER_CONFIRMED",
        "DISPUTED": "OFFER_DISPUTED",
        "WITHDRAWN": "OFFER_WITHDRAWN",
        "FAILED": "OFFER_FAILED",
    }.get(to_state, "OFFER_STATUS_CHANGED")
    props = {"from_state": from_state, "status": to_state}
    if props_extra:
        props.update(props_extra)
    event = emit_telemetry_event(
        actor_id=actor_id,
        entity_type="offer",
        entity_id=str(offer.id),
        event_type=event_name,
        props_json=props,
        node_id=node_id,
        consent_flags=consent_flags,
    )
    offer.status = to_state
    return event


def _count_active_vouches(need_id: int) -> dict[str, int]:
    events = (
        TelemetryEvent.query.filter_by(entity_type="need", entity_id=str(need_id))
        .filter(TelemetryEvent.event_type.in_(["NEED_VERIFICATION_VOUCHED", "NEED_VERIFICATION_REVOKED"]))
        .order_by(TelemetryEvent.id.asc())
        .all()
    )
    votes: dict[int, dict[str, Any]] = {}
    for ev in events:
        actor = ev.actor_id
        if not actor:
            continue
        if ev.event_type == "NEED_VERIFICATION_REVOKED":
            votes[actor] = {"active": False, "role": votes.get(actor, {}).get("role")}
        else:
            role = (ev.props_json or {}).get("voter_role")
            votes[actor] = {"active": True, "role": role}
    active = [v for v in votes.values() if v.get("active")]
    leaders = sum(1 for v in active if v.get("role") in LEADER_ROLES)
    trusted = sum(1 for v in active if v.get("role") in TRUSTED_ROLES)
    return {"leaders": leaders, "trusted": trusted}


def _current_routing_load(node_id: int) -> int:
    return OperationalNeed.query.filter(
        OperationalNeed.node_id == node_id,
        OperationalNeed.status.in_(["ROUTING_ACTIVE", "PARTIALLY_FULFILLED", "FULFILLED_PENDING_PROOF"]),
    ).count()


def _compute_impact_credits(contribution_type: str, units: float) -> float:
    weights = {
        "time": 1.0,
        "goods": 1.3,
        "skills": 1.6,
        "logistics": 1.2,
        "verification": 0.9,
        "money": 0.001,
    }
    return round(units * weights.get(contribution_type, 1.0), 3)


def _compute_trust_delta(contribution_type: str, units: float) -> float:
    multipliers = {
        "time": 0.4,
        "goods": 0.35,
        "skills": 0.45,
        "logistics": 0.38,
        "verification": 0.3,
        "money": 0.0002,
    }
    raw = units * multipliers.get(contribution_type, 0.25)
    return max(0.2, min(5.0, round(raw, 3)))


def create_need(
    *,
    actor: User,
    node_id: int,
    title: str,
    description: str,
    category: str,
    severity: str,
    requested_units: int,
    is_sensitive: bool,
    lat: float | None,
    lng: float | None,
    microcosm_id: int | None,
    availability_json: dict[str, Any] | None,
    submit_immediately: bool,
    consent_flags: dict[str, Any] | None = None,
) -> OperationalNeed:
    need = OperationalNeed(
        node_id=node_id,
        created_by=actor.id,
        title=title,
        description=description,
        category=category,
        severity=severity,
        requested_units=max(1, int(requested_units)),
        status="DRAFT",
        is_sensitive=is_sensitive,
        lat=lat,
        lng=lng,
        microcosm_id=microcosm_id,
        availability_json=availability_json,
    )
    db.session.add(need)
    db.session.flush()
    emit_telemetry_event(
        actor_id=actor.id,
        entity_type="need",
        entity_id=str(need.id),
        event_type="NEED_CREATED_DRAFT",
        props_json={
            "status": "DRAFT",
            "category": category,
            "severity": severity,
            "requested_units": need.requested_units,
            "sensitive": bool(is_sensitive),
            "microcosm_id": microcosm_id,
        },
        node_id=node_id,
        consent_flags=consent_flags,
    )
    if submit_immediately:
        submit_need(need=need, actor=actor, consent_flags=consent_flags, auto_flush=False)
    db.session.commit()
    rebuild_projectors(node_id=node_id)
    return need


def submit_need(
    *,
    need: OperationalNeed,
    actor: User,
    consent_flags: dict[str, Any] | None = None,
    auto_flush: bool = True,
) -> OperationalNeed:
    if need.status == "DRAFT":
        _record_need_status_change(need=need, actor_id=actor.id, to_state="SUBMITTED", node_id=need.node_id, consent_flags=consent_flags)
    if need.status == "SUBMITTED":
        _record_need_status_change(need=need, actor_id=actor.id, to_state="INTAKE_SCREEN", node_id=need.node_id, consent_flags=consent_flags)
    if need.status == "INTAKE_SCREEN":
        _record_need_status_change(
            need=need,
            actor_id=actor.id,
            to_state="AWAITING_VERIFICATION",
            node_id=need.node_id,
            consent_flags=consent_flags,
        )
    emit_telemetry_event(
        actor_id=actor.id,
        entity_type="need",
        entity_id=str(need.id),
        event_type="NEED_SUBMITTED",
        props_json={"status": need.status},
        node_id=need.node_id,
        consent_flags=consent_flags,
    )
    if auto_flush:
        db.session.commit()
        rebuild_projectors(node_id=need.node_id)
    return need


def verify_need(
    *,
    need: OperationalNeed,
    actor: User,
    vote: str,
    reason: str | None = None,
    consent_flags: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if need.status not in {"AWAITING_VERIFICATION", "VERIFIED", "ROUTING_ACTIVE"}:
        raise ValueError("Need is not in a verification-capable state.")
    if actor.role not in TRUSTED_ROLES:
        raise ValueError("Actor is not authorized to vouch verification.")
    vote_normalized = vote.lower()
    if vote_normalized not in {"vouch", "revoke"}:
        raise ValueError("vote must be one of: vouch, revoke")

    if vote_normalized == "vouch":
        emit_telemetry_event(
            actor_id=actor.id,
            entity_type="need",
            entity_id=str(need.id),
            event_type="NEED_VERIFICATION_VOUCHED",
            props_json={"need_id": need.id, "vote": "vouch", "voter_role": actor.role, "reason": reason or ""},
            node_id=need.node_id,
            consent_flags=consent_flags,
        )
    else:
        emit_telemetry_event(
            actor_id=actor.id,
            entity_type="need",
            entity_id=str(need.id),
            event_type="NEED_VERIFICATION_REVOKED",
            props_json={"need_id": need.id, "vote": "revoke", "reason": reason or ""},
            node_id=need.node_id,
            consent_flags=consent_flags,
        )

    counts = _count_active_vouches(need.id)
    quorum_met = counts["leaders"] >= _leader_quorum() or counts["trusted"] >= _trusted_quorum()

    if quorum_met:
        _ensure_crisis_allows_verified_need(need.node_id)
        if need.status in {"AWAITING_VERIFICATION", "VERIFIED"}:
            if need.status == "AWAITING_VERIFICATION":
                _record_need_status_change(need=need, actor_id=actor.id, to_state="VERIFIED", node_id=need.node_id)
            emit_telemetry_event(
                actor_id=actor.id,
                entity_type="need",
                entity_id=str(need.id),
                event_type="NEED_VERIFIED",
                props_json={"status": "VERIFIED", "quorum_met": True},
                node_id=need.node_id,
                consent_flags=consent_flags,
            )
            _activate_routing_if_capacity(need=need, actor=actor, consent_flags=consent_flags)
    else:
        if need.status == "VERIFIED":
            _record_need_status_change(
                need=need,
                actor_id=actor.id,
                to_state="AWAITING_VERIFICATION",
                node_id=need.node_id,
                consent_flags=consent_flags,
            )
        elif need.status == "ROUTING_ACTIVE":
            _record_need_status_change(
                need=need,
                actor_id=actor.id,
                to_state="FROZEN",
                node_id=need.node_id,
                consent_flags=consent_flags,
            )

    db.session.commit()
    rebuild_projectors(node_id=need.node_id)
    return {"quorum_met": quorum_met, "leaders": counts["leaders"], "trusted": counts["trusted"], "status": need.status}


def _activate_routing_if_capacity(*, need: OperationalNeed, actor: User, consent_flags: dict[str, Any] | None = None) -> None:
    current_load = _current_routing_load(need.node_id)
    capacity = _routing_capacity()
    if current_load >= capacity:
        queue_position = current_load - capacity + 1
        need.queue_position = queue_position
        emit_telemetry_event(
            actor_id=actor.id,
            entity_type="need",
            entity_id=str(need.id),
            event_type="NEED_ROUTING_THROTTLED",
            props_json={"status": "VERIFIED", "queue_position": queue_position, "capacity": capacity},
            node_id=need.node_id,
            consent_flags=consent_flags,
        )
        return
    if need.status != "ROUTING_ACTIVE":
        _record_need_status_change(
            need=need,
            actor_id=actor.id,
            to_state="ROUTING_ACTIVE",
            node_id=need.node_id,
            consent_flags=consent_flags,
        )
        emit_telemetry_event(
            actor_id=actor.id,
            entity_type="need",
            entity_id=str(need.id),
            event_type="NEED_ROUTING_ACTIVATED",
            props_json={"status": "ROUTING_ACTIVE"},
            node_id=need.node_id,
            consent_flags=consent_flags,
        )
    _attempt_match_for_need(need=need, actor=actor, consent_flags=consent_flags)


def _attempt_match_for_need(*, need: OperationalNeed, actor: User, consent_flags: dict[str, Any] | None = None) -> NeedOfferMatch | None:
    candidate_offers = OperationalOffer.query.filter(
        OperationalOffer.node_id == need.node_id,
        OperationalOffer.status == "PROPOSED",
    ).all()
    scored: list[tuple[float, float | None, bool, OperationalOffer]] = []
    for offer in candidate_offers:
        if offer.category != need.category:
            continue
        score, distance_km, microcosm_bonus = _compute_match_score(need, offer)
        if score <= 0:
            continue
        scored.append((score, distance_km, microcosm_bonus, offer))
    if not scored:
        return None
    scored.sort(key=lambda item: item[0], reverse=True)
    best_score, best_distance, best_bonus, best_offer = scored[0]
    best_offer.need_id = need.id
    _record_offer_status_change(
        offer=best_offer,
        actor_id=actor.id,
        to_state="MATCHED_TO_NEED",
        node_id=need.node_id,
        props_extra={"need_id": need.id, "score": round(best_score, 3)},
        consent_flags=consent_flags,
    )
    match = NeedOfferMatch(
        need_id=need.id,
        offer_id=best_offer.id,
        status="MATCHED",
        score=round(best_score, 3),
        distance_km=best_distance,
        microcosm_bonus=best_bonus,
    )
    db.session.add(match)
    emit_telemetry_event(
        actor_id=actor.id,
        entity_type="need",
        entity_id=str(need.id),
        event_type="NEED_MATCHED",
        props_json={"offer_id": best_offer.id, "score": round(best_score, 3)},
        node_id=need.node_id,
        consent_flags=consent_flags,
    )
    return match


def create_offer(
    *,
    actor: User,
    node_id: int,
    category: str,
    contribution_type: str,
    description: str,
    capacity_units: int,
    lat: float | None,
    lng: float | None,
    microcosm_id: int | None,
    availability_json: dict[str, Any] | None,
    consent_flags: dict[str, Any] | None = None,
) -> OperationalOffer:
    if contribution_type not in CONTRIBUTION_TYPES:
        raise ValueError("Invalid contribution_type.")
    offer = OperationalOffer(
        node_id=node_id,
        created_by=actor.id,
        category=category,
        contribution_type=contribution_type,
        description=description,
        capacity_units=max(1, int(capacity_units)),
        lat=lat,
        lng=lng,
        microcosm_id=microcosm_id,
        availability_json=availability_json,
        status="PROPOSED",
    )
    db.session.add(offer)
    db.session.flush()
    emit_telemetry_event(
        actor_id=actor.id,
        entity_type="offer",
        entity_id=str(offer.id),
        event_type="OFFER_CREATED_PROPOSED",
        props_json={
            "status": "PROPOSED",
            "category": category,
            "contribution_type": contribution_type,
            "capacity_units": offer.capacity_units,
            "microcosm_id": microcosm_id,
        },
        node_id=node_id,
        consent_flags=consent_flags,
    )
    linked_need = _find_best_need_for_offer(offer)
    if linked_need:
        _attempt_match_for_need(need=linked_need, actor=actor, consent_flags=consent_flags)
    db.session.commit()
    rebuild_projectors(node_id=node_id)
    return offer


def _find_best_need_for_offer(offer: OperationalOffer) -> OperationalNeed | None:
    needs = OperationalNeed.query.filter(
        OperationalNeed.node_id == offer.node_id,
        OperationalNeed.status.in_(["ROUTING_ACTIVE", "PARTIALLY_FULFILLED"]),
        OperationalNeed.category == offer.category,
    ).all()
    if not needs:
        return None
    scored = [(_compute_match_score(need, offer)[0], need) for need in needs]
    scored.sort(key=lambda item: item[0], reverse=True)
    if not scored or scored[0][0] <= 0:
        return None
    return scored[0][1]


def accept_offer(*, offer: OperationalOffer, actor: User, consent_flags: dict[str, Any] | None = None) -> OperationalOffer:
    if offer.status != "MATCHED_TO_NEED":
        raise ValueError("Offer must be MATCHED_TO_NEED before acceptance.")
    _record_offer_status_change(
        offer=offer,
        actor_id=actor.id,
        to_state="ACCEPTED",
        node_id=offer.node_id,
        props_extra={"need_id": offer.need_id},
        consent_flags=consent_flags,
    )
    _record_offer_status_change(
        offer=offer,
        actor_id=actor.id,
        to_state="IN_PROGRESS",
        node_id=offer.node_id,
        consent_flags=consent_flags,
    )
    match = NeedOfferMatch.query.filter_by(offer_id=offer.id).order_by(NeedOfferMatch.id.desc()).first()
    if match:
        match.status = "ACCEPTED"
        match.accepted_at = datetime.utcnow()
    db.session.commit()
    rebuild_projectors(node_id=offer.node_id)
    return offer


def confirm_offer(
    *,
    offer: OperationalOffer,
    actor: User,
    proof_ref: str,
    units: float,
    emergency_override: bool = False,
    consent_flags: dict[str, Any] | None = None,
) -> OperationalOffer:
    if offer.status not in {"IN_PROGRESS", "DELIVERED_PENDING_CONFIRMATION"}:
        raise ValueError("Offer must be IN_PROGRESS or DELIVERED_PENDING_CONFIRMATION before confirmation.")
    if offer.need_id is None:
        raise ValueError("Offer is not linked to a need.")

    need = OperationalNeed.query.get(offer.need_id)
    if not need:
        raise ValueError("Linked need not found.")
    _ensure_crisis_allows_disbursement(offer.node_id, emergency_override=emergency_override)

    if offer.status == "IN_PROGRESS":
        _record_offer_status_change(
            offer=offer,
            actor_id=actor.id,
            to_state="DELIVERED_PENDING_CONFIRMATION",
            node_id=offer.node_id,
            props_extra={"proof_ref": proof_ref},
            consent_flags=consent_flags,
        )
    contribution_type = offer.contribution_type
    units_value = max(0.0, float(units))
    impact_delta = _compute_impact_credits(contribution_type, units_value)
    trust_delta = _compute_trust_delta(contribution_type, units_value)
    _record_offer_status_change(
        offer=offer,
        actor_id=actor.id,
        to_state="CONFIRMED",
        node_id=offer.node_id,
        props_extra={
            "contribution_type": contribution_type,
            "impact_credits_delta": impact_delta,
            "units": units_value,
            "need_id": need.id,
        },
        consent_flags=consent_flags,
    )
    offer.proof_json = {"proof_ref": proof_ref, "confirmed_by": actor.id, "confirmed_at": datetime.utcnow().isoformat()}
    emit_telemetry_event(
        actor_id=offer.created_by,
        entity_type="offer",
        entity_id=str(offer.id),
        event_type="CONTRIBUTION_CONFIRMED",
        props_json={
            "offer_id": offer.id,
            "need_id": need.id,
            "contribution_type": contribution_type,
            "units": units_value,
            "impact_credits_delta": impact_delta,
            "trust_delta": trust_delta,
            "microcosm_id": need.microcosm_id,
            "confirmed_by": actor.id,
        },
        node_id=offer.node_id,
        consent_flags=consent_flags,
    )

    match = NeedOfferMatch.query.filter_by(offer_id=offer.id).order_by(NeedOfferMatch.id.desc()).first()
    if match:
        match.status = "COMPLETED"
        match.completed_at = datetime.utcnow()

    confirmed_offers = OperationalOffer.query.filter_by(need_id=need.id, status="CONFIRMED").all()
    fulfilled_units = sum(max(1, int(o.capacity_units)) for o in confirmed_offers)
    if fulfilled_units < need.requested_units:
        if need.status not in {"PARTIALLY_FULFILLED", "FULFILLED_PENDING_PROOF", "CLOSED_FULFILLED"}:
            _record_need_status_change(
                need=need,
                actor_id=actor.id,
                to_state="PARTIALLY_FULFILLED",
                node_id=need.node_id,
                consent_flags=consent_flags,
            )
        emit_telemetry_event(
            actor_id=actor.id,
            entity_type="need",
            entity_id=str(need.id),
            event_type="NEED_PARTIALLY_FULFILLED",
            props_json={"fulfilled_units": fulfilled_units, "requested_units": need.requested_units},
            node_id=need.node_id,
            consent_flags=consent_flags,
        )
    else:
        if need.status != "FULFILLED_PENDING_PROOF":
            _record_need_status_change(
                need=need,
                actor_id=actor.id,
                to_state="FULFILLED_PENDING_PROOF",
                node_id=need.node_id,
                consent_flags=consent_flags,
            )
        emit_telemetry_event(
            actor_id=actor.id,
            entity_type="need",
            entity_id=str(need.id),
            event_type="NEED_FULFILLED_PENDING_PROOF",
            props_json={"fulfilled_units": fulfilled_units, "requested_units": need.requested_units},
            node_id=need.node_id,
            consent_flags=consent_flags,
        )
        emit_telemetry_event(
            actor_id=actor.id,
            entity_type="need",
            entity_id=str(need.id),
            event_type="NEED_FULFILLMENT_CONFIRMED",
            props_json={"proof_ref": proof_ref},
            node_id=need.node_id,
            consent_flags=consent_flags,
        )
        _record_need_status_change(
            need=need,
            actor_id=actor.id,
            to_state="CLOSED_FULFILLED",
            node_id=need.node_id,
            consent_flags=consent_flags,
        )
        emit_telemetry_event(
            actor_id=actor.id,
            entity_type="need",
            entity_id=str(need.id),
            event_type="NEED_CLOSED_FULFILLED",
            props_json={"status": "CLOSED_FULFILLED", "closed_at": datetime.utcnow().isoformat()},
            node_id=need.node_id,
            consent_flags=consent_flags,
        )

    db.session.commit()
    rebuild_projectors(node_id=offer.node_id)
    return offer


def list_needs(
    *,
    node_id: int | None = None,
    status: str | None = None,
    category: str | None = None,
    bbox: list[float] | None = None,
    severity: str | None = None,
) -> list[dict[str, Any]]:
    query = db.session.query(NeedProjectionRead, OperationalNeed).join(
        OperationalNeed, OperationalNeed.id == NeedProjectionRead.need_id
    )
    if node_id is not None:
        query = query.filter(NeedProjectionRead.node_id == node_id)
    if status:
        query = query.filter(NeedProjectionRead.status == status)
    if category:
        query = query.filter(NeedProjectionRead.category == category)
    if severity:
        query = query.filter(NeedProjectionRead.severity == severity)
    if bbox and len(bbox) == 4:
        min_lng, min_lat, max_lng, max_lat = bbox
        query = query.filter(
            OperationalNeed.lng.isnot(None),
            OperationalNeed.lat.isnot(None),
            OperationalNeed.lng >= min_lng,
            OperationalNeed.lng <= max_lng,
            OperationalNeed.lat >= min_lat,
            OperationalNeed.lat <= max_lat,
        )
    rows = query.order_by(NeedProjectionRead.updated_at.desc()).all()
    payload = []
    for proj, need in rows:
        payload.append(
            {
                "id": need.id,
                "title": need.title,
                "description": need.description,
                "category": proj.category,
                "severity": proj.severity,
                "status": proj.status,
                "requested_units": proj.requested_units,
                "fulfilled_units": proj.fulfilled_units,
                "queue_position": proj.queue_position,
                "microcosm_id": proj.microcosm_id,
                "is_sensitive": bool(proj.is_sensitive),
                "lat": need.lat,
                "lng": need.lng,
                "created_at": need.created_at.isoformat() if need.created_at else None,
                "updated_at": proj.updated_at.isoformat() if proj.updated_at else None,
            }
        )
    return payload
