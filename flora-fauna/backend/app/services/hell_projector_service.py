from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from flask import current_app, has_app_context

from ..extensions import db
from ..hell_models import (
    ContributionFootprintRead,
    CoverageProjectionRead,
    MicrocosmLifecycleState,
    MicrocosmProjectionRead,
    NeedProjectionRead,
    OfferProjectionRead,
    OperationalNeed,
    OperationalOffer,
    ProjectorState,
    TelemetryEvent,
    TreasuryProjectionRead,
    TrustProjectionRead,
)
from ..models import ImpactLedgerEntry, Microcosm


ACTIVE_NEED_STATUSES = {"VERIFIED", "ROUTING_ACTIVE", "PARTIALLY_FULFILLED", "FULFILLED_PENDING_PROOF"}
ACTIVE_OFFER_STATUSES = {"MATCHED_TO_NEED", "ACCEPTED", "IN_PROGRESS", "DELIVERED_PENDING_CONFIRMATION"}


@dataclass(frozen=True)
class ProjectorMeta:
    name: str
    version: str


class NeedProjector:
    META = ProjectorMeta(name="NeedProjector", version="1.0.0")

    @staticmethod
    def project(events: list[TelemetryEvent]) -> dict[int, dict[str, Any]]:
        state: dict[int, dict[str, Any]] = {}
        for event in events:
            if event.entity_type != "need":
                continue
            need_id = int(event.entity_id)
            props = event.props_json or {}
            current = state.get(need_id) or {
                "need_id": need_id,
                "node_id": event.node_id,
                "status": "DRAFT",
                "category": props.get("category", "general"),
                "severity": props.get("severity", "medium"),
                "microcosm_id": props.get("microcosm_id"),
                "requested_units": int(props.get("requested_units", 1)),
                "fulfilled_units": 0,
                "queue_position": None,
                "is_sensitive": bool(props.get("sensitive", True)),
                "last_event_id": event.id,
            }
            if event.event_type == "NEED_CREATED_DRAFT":
                current["status"] = props.get("status", "DRAFT")
                current["category"] = props.get("category", current["category"])
                current["severity"] = props.get("severity", current["severity"])
                current["requested_units"] = int(props.get("requested_units", current["requested_units"]))
                current["is_sensitive"] = bool(props.get("sensitive", current["is_sensitive"]))
                current["microcosm_id"] = props.get("microcosm_id")
            elif event.event_type in {"NEED_STATUS_CHANGED", "NEED_SUBMITTED", "NEED_VERIFIED", "NEED_ROUTING_ACTIVATED", "NEED_CLOSED_FULFILLED"}:
                current["status"] = props.get("to_state") or props.get("status") or current["status"]
            elif event.event_type == "NEED_ROUTING_THROTTLED":
                current["status"] = props.get("status", current["status"])
                current["queue_position"] = int(props.get("queue_position", 0))
            elif event.event_type == "NEED_PARTIALLY_FULFILLED":
                current["status"] = "PARTIALLY_FULFILLED"
                current["fulfilled_units"] = int(props.get("fulfilled_units", current["fulfilled_units"]))
            elif event.event_type == "NEED_FULFILLED_PENDING_PROOF":
                current["status"] = "FULFILLED_PENDING_PROOF"
                current["fulfilled_units"] = int(props.get("fulfilled_units", current["fulfilled_units"]))
            current["last_event_id"] = event.id
            state[need_id] = current
        return state


class OfferProjector:
    META = ProjectorMeta(name="OfferProjector", version="1.0.0")

    @staticmethod
    def project(events: list[TelemetryEvent]) -> dict[int, dict[str, Any]]:
        state: dict[int, dict[str, Any]] = {}
        for event in events:
            if event.entity_type != "offer":
                continue
            offer_id = int(event.entity_id)
            props = event.props_json or {}
            current = state.get(offer_id) or {
                "offer_id": offer_id,
                "node_id": event.node_id,
                "need_id": props.get("need_id"),
                "status": "PROPOSED",
                "category": props.get("category", "general"),
                "contribution_type": props.get("contribution_type", "time"),
                "capacity_units": int(props.get("capacity_units", 1)),
                "delivered_units": 0,
                "last_event_id": event.id,
            }
            if event.event_type == "OFFER_CREATED_PROPOSED":
                current["status"] = props.get("status", "PROPOSED")
                current["category"] = props.get("category", current["category"])
                current["contribution_type"] = props.get("contribution_type", current["contribution_type"])
                current["capacity_units"] = int(props.get("capacity_units", current["capacity_units"]))
            elif event.event_type in {
                "OFFER_MATCHED_TO_NEED",
                "OFFER_ACCEPTED",
                "OFFER_IN_PROGRESS",
                "OFFER_DELIVERED_PENDING_CONFIRMATION",
                "OFFER_CONFIRMED",
            }:
                current["status"] = props.get("status", current["status"])
                if props.get("need_id") is not None:
                    current["need_id"] = int(props["need_id"])
            elif event.event_type in {"OFFER_FAILED", "OFFER_WITHDRAWN", "OFFER_DISPUTED"}:
                current["status"] = props.get("status", current["status"])
            if event.event_type == "OFFER_CONFIRMED":
                current["delivered_units"] = int(props.get("units", current["capacity_units"]))
            current["last_event_id"] = event.id
            state[offer_id] = current
        return state


class TrustProjector:
    META = ProjectorMeta(name="TrustProjector", version="1.0.0")

    @staticmethod
    def project(events: list[TelemetryEvent]) -> dict[tuple[int, int], dict[str, Any]]:
        state: dict[tuple[int, int], dict[str, Any]] = {}
        for event in events:
            actor_id = event.actor_id
            node_id = event.node_id
            if not actor_id or not node_id:
                continue
            key = (actor_id, node_id)
            current = state.get(key) or {
                "user_id": actor_id,
                "node_id": node_id,
                "reliability": 50.0,
                "confirmed_contributions": 0,
                "failed_contributions": 0,
                "verification_votes": 0,
                "last_event_id": event.id,
            }
            props = event.props_json or {}
            if event.event_type == "CONTRIBUTION_CONFIRMED":
                delta = float(props.get("trust_delta", 0.0))
                current["confirmed_contributions"] += 1
                current["reliability"] = min(100.0, max(0.0, current["reliability"] + delta))
            elif event.event_type == "OFFER_FAILED":
                current["failed_contributions"] += 1
                current["reliability"] = min(100.0, max(0.0, current["reliability"] - 2.0))
            elif event.event_type == "NEED_VERIFICATION_VOUCHED":
                current["verification_votes"] += 1
            current["last_event_id"] = event.id
            state[key] = current
        return state


class TreasuryProjector:
    META = ProjectorMeta(name="TreasuryProjector", version="1.0.0")

    @staticmethod
    def project(events: list[TelemetryEvent]) -> dict[int, dict[str, Any]]:
        state: dict[int, dict[str, Any]] = {}
        for event in events:
            if event.entity_type != "treasury":
                continue
            node_id = event.node_id
            if node_id is None:
                continue
            current = state.get(node_id) or {
                "node_id": node_id,
                "pledge_intent_cents": 0,
                "received_cents": 0,
                "split_allocated_cents": 0,
                "escrowed_cents": 0,
                "released_cents": 0,
                "reversed_cents": 0,
                "disbursed_cents": 0,
                "last_event_id": event.id,
            }
            props = event.props_json or {}
            amount = int(props.get("amount_cents", 0))
            to_state = props.get("to_state")
            if to_state == "PLEDGE_INTENT":
                current["pledge_intent_cents"] += amount
            elif to_state == "RECEIVED":
                current["received_cents"] += amount
            elif to_state == "SPLIT_ALLOCATED":
                current["split_allocated_cents"] += amount
            elif to_state == "ESCROWED":
                current["escrowed_cents"] += amount
            elif to_state == "RELEASED":
                current["released_cents"] += amount
            elif to_state == "REVERSED":
                current["reversed_cents"] += abs(amount)
            elif to_state == "DISBURSED":
                current["disbursed_cents"] += amount
            current["last_event_id"] = event.id
            state[node_id] = current
        return state


class ContributionFootprintProjector:
    META = ProjectorMeta(name="ContributionFootprintProjector", version="1.0.0")

    @staticmethod
    def project(events: list[TelemetryEvent]) -> dict[tuple[int, int], dict[str, Any]]:
        state: dict[tuple[int, int], dict[str, Any]] = {}
        for event in events:
            if event.event_type != "CONTRIBUTION_CONFIRMED":
                continue
            if not event.actor_id or not event.node_id:
                continue
            key = (event.actor_id, event.node_id)
            current = state.get(key) or {
                "user_id": event.actor_id,
                "node_id": event.node_id,
                "time_units": 0.0,
                "goods_units": 0.0,
                "skills_units": 0.0,
                "logistics_units": 0.0,
                "verification_units": 0.0,
                "money_cents": 0,
                "impact_credits": 0.0,
                "microcosm_ids_json": [],
            }
            props = event.props_json or {}
            ctype = props.get("contribution_type")
            units = float(props.get("units", 0.0))
            if ctype == "time":
                current["time_units"] += units
            elif ctype == "goods":
                current["goods_units"] += units
            elif ctype == "skills":
                current["skills_units"] += units
            elif ctype == "logistics":
                current["logistics_units"] += units
            elif ctype == "verification":
                current["verification_units"] += units
            elif ctype == "money":
                current["money_cents"] += int(units)
            current["impact_credits"] += float(props.get("impact_credits_delta", 0.0))
            microcosm_id = props.get("microcosm_id")
            if microcosm_id and microcosm_id not in current["microcosm_ids_json"]:
                current["microcosm_ids_json"].append(int(microcosm_id))
            state[key] = current
        return state


class MicrocosmProjector:
    META = ProjectorMeta(name="MicrocosmProjector", version="1.0.0")

    @staticmethod
    def project(
        events: list[TelemetryEvent],
        need_state: dict[int, dict[str, Any]],
        offer_state: dict[int, dict[str, Any]],
    ) -> dict[int, dict[str, Any]]:
        state: dict[int, dict[str, Any]] = {}
        for event in events:
            if event.event_type != "MICROCOSM_STATE_CHANGED":
                continue
            props = event.props_json or {}
            microcosm_id = props.get("microcosm_id")
            if not microcosm_id:
                continue
            current = state.get(int(microcosm_id)) or {
                "microcosm_id": int(microcosm_id),
                "node_id": event.node_id,
                "status": "PROPOSED",
                "active_needs": 0,
                "active_offers": 0,
                "fulfilled_30d": 0,
                "last_event_id": event.id,
            }
            current["status"] = props.get("to_state", current["status"])
            current["last_event_id"] = event.id
            state[int(microcosm_id)] = current

        for need in need_state.values():
            microcosm_id = need.get("microcosm_id")
            if not microcosm_id:
                continue
            bucket = state.get(int(microcosm_id)) or {
                "microcosm_id": int(microcosm_id),
                "node_id": need.get("node_id"),
                "status": "PROPOSED",
                "active_needs": 0,
                "active_offers": 0,
                "fulfilled_30d": 0,
                "last_event_id": need.get("last_event_id"),
            }
            if need.get("status") in ACTIVE_NEED_STATUSES:
                bucket["active_needs"] += 1
            state[int(microcosm_id)] = bucket

        for offer in offer_state.values():
            microcosm_id = None
            linked_need_id = offer.get("need_id")
            if linked_need_id and linked_need_id in need_state:
                microcosm_id = need_state[linked_need_id].get("microcosm_id")
            if not microcosm_id:
                continue
            bucket = state.get(int(microcosm_id)) or {
                "microcosm_id": int(microcosm_id),
                "node_id": offer.get("node_id"),
                "status": "PROPOSED",
                "active_needs": 0,
                "active_offers": 0,
                "fulfilled_30d": 0,
                "last_event_id": offer.get("last_event_id"),
            }
            if offer.get("status") in ACTIVE_OFFER_STATUSES:
                bucket["active_offers"] += 1
            state[int(microcosm_id)] = bucket

        cutoff = datetime.utcnow() - timedelta(days=30)
        recent_closed = (
            db.session.query(OperationalNeed.microcosm_id)
            .filter(OperationalNeed.closed_at.isnot(None), OperationalNeed.closed_at >= cutoff)
            .all()
        )
        for row in recent_closed:
            if not row[0]:
                continue
            bucket = state.get(int(row[0])) or {
                "microcosm_id": int(row[0]),
                "node_id": None,
                "status": "PROPOSED",
                "active_needs": 0,
                "active_offers": 0,
                "fulfilled_30d": 0,
                "last_event_id": None,
            }
            bucket["fulfilled_30d"] += 1
            state[int(row[0])] = bucket
        return state


class CoverageProjector:
    META = ProjectorMeta(name="CoverageProjector", version="1.0.0")

    @staticmethod
    def project(
        need_state: dict[int, dict[str, Any]],
        offer_state: dict[int, dict[str, Any]],
    ) -> dict[tuple[int, str, int | None], dict[str, Any]]:
        coverage: dict[tuple[int, str, int | None], dict[str, Any]] = defaultdict(
            lambda: {
                "node_id": 0,
                "category": "general",
                "microcosm_id": None,
                "active_needs": 0,
                "active_offers": 0,
                "routing_capacity": 0,
                "gap_index": 0.0,
                "k_anon_bucket_size": 0,
            }
        )
        for need in need_state.values():
            node_id = int(need.get("node_id") or 0)
            category = need.get("category") or "general"
            microcosm_id = need.get("microcosm_id")
            key = (node_id, category, microcosm_id)
            row = coverage[key]
            row["node_id"] = node_id
            row["category"] = category
            row["microcosm_id"] = microcosm_id
            if need.get("status") in ACTIVE_NEED_STATUSES:
                row["active_needs"] += 1
            row["k_anon_bucket_size"] += 1

        for offer in offer_state.values():
            node_id = int(offer.get("node_id") or 0)
            category = offer.get("category") or "general"
            microcosm_id = None
            key = (node_id, category, microcosm_id)
            row = coverage[key]
            row["node_id"] = node_id
            row["category"] = category
            row["microcosm_id"] = microcosm_id
            if offer.get("status") in ACTIVE_OFFER_STATUSES:
                row["active_offers"] += 1
                row["routing_capacity"] += int(offer.get("capacity_units") or 1)
            row["k_anon_bucket_size"] += 1

        for row in coverage.values():
            needs = row["active_needs"]
            offers = max(row["active_offers"], 0)
            if needs <= 0:
                row["gap_index"] = 0.0
            else:
                row["gap_index"] = max(0.0, (needs - offers) / float(needs))
        return coverage


def _upsert_projector_state(meta: ProjectorMeta, last_event_id: int, config_hash: str | None = None) -> None:
    row = ProjectorState.query.filter_by(projector_name=meta.name).first()
    if not row:
        row = ProjectorState(projector_name=meta.name, projector_version=meta.version, last_event_id=last_event_id, config_hash=config_hash)
        db.session.add(row)
    else:
        row.projector_version = meta.version
        row.last_event_id = last_event_id
        row.config_hash = config_hash
    if has_app_context():
        current_app.logger.debug(
            "projector_state_update",
            extra={
                "projector": meta.name,
                "version": meta.version,
                "last_event_id": last_event_id,
                "config_hash": config_hash,
            },
        )
    db.session.flush()


def rebuild_projectors(node_id: int | None = None) -> dict[str, Any]:
    query = TelemetryEvent.query
    if node_id is not None:
        query = query.filter_by(node_id=node_id)
    events = query.order_by(TelemetryEvent.id.asc()).all()
    last_event_id = events[-1].id if events else 0

    need_state = NeedProjector.project(events)
    offer_state = OfferProjector.project(events)
    trust_state = TrustProjector.project(events)
    treasury_state = TreasuryProjector.project(events)
    footprint_state = ContributionFootprintProjector.project(events)
    microcosm_state = MicrocosmProjector.project(events, need_state, offer_state)
    coverage_state = CoverageProjector.project(need_state, offer_state)

    if node_id is None:
        NeedProjectionRead.query.delete()
        OfferProjectionRead.query.delete()
        TrustProjectionRead.query.delete()
        TreasuryProjectionRead.query.delete()
        ContributionFootprintRead.query.delete()
        MicrocosmProjectionRead.query.delete()
        CoverageProjectionRead.query.delete()
    else:
        NeedProjectionRead.query.filter_by(node_id=node_id).delete()
        OfferProjectionRead.query.filter_by(node_id=node_id).delete()
        TrustProjectionRead.query.filter_by(node_id=node_id).delete()
        TreasuryProjectionRead.query.filter_by(node_id=node_id).delete()
        ContributionFootprintRead.query.filter_by(node_id=node_id).delete()
        MicrocosmProjectionRead.query.filter_by(node_id=node_id).delete()
        CoverageProjectionRead.query.filter_by(node_id=node_id).delete()

    for item in need_state.values():
        db.session.add(NeedProjectionRead(**item))
    for item in offer_state.values():
        db.session.add(OfferProjectionRead(**item))
    for item in trust_state.values():
        db.session.add(TrustProjectionRead(**item))
    for item in treasury_state.values():
        db.session.add(TreasuryProjectionRead(**item))
    for item in footprint_state.values():
        db.session.add(ContributionFootprintRead(**item))

    known_microcosm_ids = {m.id: m for m in Microcosm.query.all()}
    for microcosm_id, m in known_microcosm_ids.items():
        projected = microcosm_state.get(microcosm_id) or {
            "microcosm_id": microcosm_id,
            "node_id": m.node_id,
            "status": "PROPOSED",
            "active_needs": 0,
            "active_offers": 0,
            "fulfilled_30d": 0,
            "last_event_id": None,
        }
        lifecycle = MicrocosmLifecycleState.query.filter_by(microcosm_id=microcosm_id).first()
        if lifecycle:
            projected["status"] = lifecycle.status
            if not projected.get("node_id"):
                projected["node_id"] = lifecycle.node_id
        if not projected.get("node_id"):
            projected["node_id"] = 1
        if node_id is not None and int(projected["node_id"]) != int(node_id):
            continue
        db.session.add(MicrocosmProjectionRead(**projected))

    for item in coverage_state.values():
        db.session.add(CoverageProjectionRead(**item))

    _upsert_projector_state(NeedProjector.META, last_event_id)
    _upsert_projector_state(OfferProjector.META, last_event_id)
    _upsert_projector_state(TrustProjector.META, last_event_id)
    _upsert_projector_state(TreasuryProjector.META, last_event_id)
    _upsert_projector_state(ContributionFootprintProjector.META, last_event_id)
    _upsert_projector_state(MicrocosmProjector.META, last_event_id)
    _upsert_projector_state(CoverageProjector.META, last_event_id)
    db.session.commit()

    return {
        "events_processed": len(events),
        "last_event_id": last_event_id,
        "needs": len(need_state),
        "offers": len(offer_state),
        "trust_subjects": len(trust_state),
        "treasury_nodes": len(treasury_state),
        "coverage_buckets": len(coverage_state),
    }


def refresh_treasury_projection_from_ledger(node_id: int) -> None:
    row = TreasuryProjectionRead.query.filter_by(node_id=node_id).first()
    if not row:
        row = TreasuryProjectionRead(node_id=node_id)
        db.session.add(row)
    entries = ImpactLedgerEntry.query.filter_by(node_id=node_id).all()
    total_inflow = sum(max(e.amount_cents, 0) for e in entries)
    total_outflow = sum(abs(min(e.amount_cents, 0)) for e in entries)
    row.received_cents = total_inflow
    row.disbursed_cents = total_outflow
    row.updated_at = datetime.utcnow()
    db.session.commit()
