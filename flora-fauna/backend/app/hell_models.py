from __future__ import annotations

from datetime import datetime

from sqlalchemy import event

from .extensions import db
from .time_utils import now_utc


def utcnow():
    return now_utc()


class TelemetryEvent(db.Model):
    __tablename__ = "telemetry_event"
    __table_args__ = (
        db.Index("ix_telemetry_event_t", "t"),
        db.Index("ix_telemetry_event_entity", "entity_type", "entity_id"),
        db.Index("ix_telemetry_event_type", "event_type"),
        db.Index("ix_telemetry_event_node", "node_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    t = db.Column(db.DateTime, default=utcnow, nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    entity_type = db.Column(db.String(80), nullable=False)
    entity_id = db.Column(db.String(120), nullable=False)
    event_type = db.Column(db.String(120), nullable=False)
    props_json = db.Column(db.JSON, nullable=False, default=dict)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=True)
    consent_flags = db.Column(db.JSON, nullable=True)
    signature = db.Column(db.String(256), nullable=True)
    evidence_hash = db.Column(db.String(128), nullable=True)
    schema_version = db.Column(db.String(32), nullable=False, default="1.0.0")


@event.listens_for(TelemetryEvent, "before_update")
def _telemetry_no_update(mapper, connection, target):
    raise ValueError("TelemetryEvent is append-only and cannot be updated.")


@event.listens_for(TelemetryEvent, "before_delete")
def _telemetry_no_delete(mapper, connection, target):
    raise ValueError("TelemetryEvent is append-only and cannot be deleted.")


class OperationalNeed(db.Model):
    __tablename__ = "operational_need"
    __table_args__ = (
        db.Index("ix_operational_need_status", "status"),
        db.Index("ix_operational_need_category", "category"),
        db.Index("ix_operational_need_node", "node_id"),
        db.Index("ix_operational_need_microcosm", "microcosm_id"),
        db.Index("ix_operational_need_created_at", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(80), nullable=False)
    severity = db.Column(db.String(40), nullable=False, default="medium")
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    microcosm_id = db.Column(db.Integer, db.ForeignKey("microcosm.id"), nullable=True)
    availability_json = db.Column(db.JSON, nullable=True)
    requested_units = db.Column(db.Integer, nullable=False, default=1)
    status = db.Column(db.String(64), nullable=False, default="DRAFT")
    is_sensitive = db.Column(db.Boolean, default=True)
    queue_position = db.Column(db.Integer, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    closed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class OperationalOffer(db.Model):
    __tablename__ = "operational_offer"
    __table_args__ = (
        db.Index("ix_operational_offer_status", "status"),
        db.Index("ix_operational_offer_category", "category"),
        db.Index("ix_operational_offer_node", "node_id"),
        db.Index("ix_operational_offer_need_id", "need_id"),
        db.Index("ix_operational_offer_created_at", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    need_id = db.Column(db.Integer, db.ForeignKey("operational_need.id"), nullable=True)
    category = db.Column(db.String(80), nullable=False)
    contribution_type = db.Column(db.String(40), nullable=False)
    description = db.Column(db.Text, nullable=True)
    capacity_units = db.Column(db.Integer, nullable=False, default=1)
    availability_json = db.Column(db.JSON, nullable=True)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    microcosm_id = db.Column(db.Integer, db.ForeignKey("microcosm.id"), nullable=True)
    status = db.Column(db.String(64), nullable=False, default="PROPOSED")
    proof_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class NeedOfferMatch(db.Model):
    __tablename__ = "need_offer_match"
    __table_args__ = (
        db.Index("ix_need_offer_match_need", "need_id"),
        db.Index("ix_need_offer_match_offer", "offer_id"),
        db.Index("ix_need_offer_match_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    need_id = db.Column(db.Integer, db.ForeignKey("operational_need.id"), nullable=False)
    offer_id = db.Column(db.Integer, db.ForeignKey("operational_offer.id"), nullable=False)
    status = db.Column(db.String(40), nullable=False, default="MATCHED")
    score = db.Column(db.Float, nullable=False, default=0.0)
    distance_km = db.Column(db.Float, nullable=True)
    microcosm_bonus = db.Column(db.Boolean, default=False)
    matched_at = db.Column(db.DateTime, default=utcnow)
    accepted_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)


class MicrocosmLifecycleState(db.Model):
    __tablename__ = "microcosm_lifecycle_state"
    __table_args__ = (
        db.UniqueConstraint("microcosm_id", name="uq_microcosm_lifecycle"),
        db.Index("ix_microcosm_lifecycle_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    microcosm_id = db.Column(db.Integer, db.ForeignKey("microcosm.id"), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=False)
    status = db.Column(db.String(40), nullable=False, default="PROPOSED")
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class NeedProjectionRead(db.Model):
    __tablename__ = "need_projection_read"
    __table_args__ = (
        db.UniqueConstraint("need_id", name="uq_need_projection_need"),
        db.Index("ix_need_projection_status", "status"),
        db.Index("ix_need_projection_node", "node_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    need_id = db.Column(db.Integer, db.ForeignKey("operational_need.id"), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=False)
    status = db.Column(db.String(64), nullable=False)
    category = db.Column(db.String(80), nullable=False)
    severity = db.Column(db.String(40), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey("microcosm.id"), nullable=True)
    requested_units = db.Column(db.Integer, default=1)
    fulfilled_units = db.Column(db.Integer, default=0)
    queue_position = db.Column(db.Integer, nullable=True)
    is_sensitive = db.Column(db.Boolean, default=True)
    last_event_id = db.Column(db.Integer, nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class OfferProjectionRead(db.Model):
    __tablename__ = "offer_projection_read"
    __table_args__ = (
        db.UniqueConstraint("offer_id", name="uq_offer_projection_offer"),
        db.Index("ix_offer_projection_status", "status"),
        db.Index("ix_offer_projection_node", "node_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    offer_id = db.Column(db.Integer, db.ForeignKey("operational_offer.id"), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=False)
    need_id = db.Column(db.Integer, db.ForeignKey("operational_need.id"), nullable=True)
    status = db.Column(db.String(64), nullable=False)
    category = db.Column(db.String(80), nullable=False)
    contribution_type = db.Column(db.String(40), nullable=False)
    capacity_units = db.Column(db.Integer, default=1)
    delivered_units = db.Column(db.Integer, default=0)
    last_event_id = db.Column(db.Integer, nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class MicrocosmProjectionRead(db.Model):
    __tablename__ = "microcosm_projection_read"
    __table_args__ = (
        db.UniqueConstraint("microcosm_id", name="uq_microcosm_projection_microcosm"),
        db.Index("ix_microcosm_projection_node", "node_id"),
        db.Index("ix_microcosm_projection_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    microcosm_id = db.Column(db.Integer, db.ForeignKey("microcosm.id"), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=False)
    status = db.Column(db.String(40), nullable=False, default="PROPOSED")
    active_needs = db.Column(db.Integer, default=0)
    active_offers = db.Column(db.Integer, default=0)
    fulfilled_30d = db.Column(db.Integer, default=0)
    last_event_id = db.Column(db.Integer, nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class TrustProjectionRead(db.Model):
    __tablename__ = "trust_projection_read"
    __table_args__ = (
        db.UniqueConstraint("user_id", name="uq_trust_projection_user"),
        db.Index("ix_trust_projection_node", "node_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=False)
    reliability = db.Column(db.Float, default=50.0)
    confirmed_contributions = db.Column(db.Integer, default=0)
    failed_contributions = db.Column(db.Integer, default=0)
    verification_votes = db.Column(db.Integer, default=0)
    last_event_id = db.Column(db.Integer, nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class TreasuryProjectionRead(db.Model):
    __tablename__ = "treasury_projection_read"
    __table_args__ = (
        db.UniqueConstraint("node_id", name="uq_treasury_projection_node"),
    )

    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=False)
    pledge_intent_cents = db.Column(db.Integer, default=0)
    received_cents = db.Column(db.Integer, default=0)
    split_allocated_cents = db.Column(db.Integer, default=0)
    escrowed_cents = db.Column(db.Integer, default=0)
    released_cents = db.Column(db.Integer, default=0)
    reversed_cents = db.Column(db.Integer, default=0)
    disbursed_cents = db.Column(db.Integer, default=0)
    last_event_id = db.Column(db.Integer, nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class CoverageProjectionRead(db.Model):
    __tablename__ = "coverage_projection_read"
    __table_args__ = (
        db.UniqueConstraint("node_id", "category", "microcosm_id", name="uq_coverage_projection_bucket"),
        db.Index("ix_coverage_projection_node", "node_id"),
        db.Index("ix_coverage_projection_gap", "gap_index"),
    )

    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=False)
    category = db.Column(db.String(80), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey("microcosm.id"), nullable=True)
    active_needs = db.Column(db.Integer, default=0)
    active_offers = db.Column(db.Integer, default=0)
    routing_capacity = db.Column(db.Integer, default=0)
    gap_index = db.Column(db.Float, default=0.0)
    k_anon_bucket_size = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class ContributionFootprintRead(db.Model):
    __tablename__ = "contribution_footprint_read"
    __table_args__ = (
        db.UniqueConstraint("user_id", "node_id", name="uq_contribution_footprint_user_node"),
        db.Index("ix_contribution_footprint_node", "node_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=False)
    time_units = db.Column(db.Float, default=0.0)
    goods_units = db.Column(db.Float, default=0.0)
    skills_units = db.Column(db.Float, default=0.0)
    logistics_units = db.Column(db.Float, default=0.0)
    verification_units = db.Column(db.Float, default=0.0)
    money_cents = db.Column(db.Integer, default=0)
    impact_credits = db.Column(db.Float, default=0.0)
    microcosm_ids_json = db.Column(db.JSON, nullable=True, default=list)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class ProjectorState(db.Model):
    __tablename__ = "projector_state"
    __table_args__ = (
        db.UniqueConstraint("projector_name", name="uq_projector_state_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    projector_name = db.Column(db.String(120), nullable=False)
    projector_version = db.Column(db.String(40), nullable=False)
    last_event_id = db.Column(db.Integer, default=0)
    config_hash = db.Column(db.String(128), nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


