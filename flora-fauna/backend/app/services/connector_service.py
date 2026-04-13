from __future__ import annotations

from datetime import datetime, timezone

from ..extensions import db
from ..models import JourneyConnector, JourneyTransitionProof, PublicArchiveRecord, PublicTrustReport
from .node_service import resolve_node

CONNECTOR_FLAGSHIP_JOURNEY_SLUG = "knowledge-action-community-governance-archive"
CONNECTOR_DEFAULT_MAP_SLUG = "weaving-futures-atlas"
CONNECTOR_JOURNEY_LABEL = "Knowledge -> action/event -> community -> governance/transparency -> archive"


def _route_starts_with(pathname: str, route: str) -> bool:
    return pathname == route or pathname.startswith(f"{route}/")


def _canonical_connector_source_route(raw_route: str | None) -> tuple[str, str]:
    route = (raw_route or "").strip()
    if not route:
        return f"/education/maps/{CONNECTOR_DEFAULT_MAP_SLUG}", CONNECTOR_DEFAULT_MAP_SLUG

    if not route.startswith("/"):
        route = f"/{route}"

    if _route_starts_with(route, "/education") and not _route_starts_with(route, "/education/maps"):
        route = f"/education/maps/{CONNECTOR_DEFAULT_MAP_SLUG}"

    if _route_starts_with(route, "/education/maps"):
        parts = [segment for segment in route.split("/") if segment]
        map_slug = parts[2] if len(parts) >= 3 and parts[2] else CONNECTOR_DEFAULT_MAP_SLUG
        canonical = f"/education/maps/{map_slug}"
        return canonical, map_slug

    return route, CONNECTOR_DEFAULT_MAP_SLUG


def _journey_connector_blueprint(knowledge_source_route: str, map_slug: str, archive_record_slug: str) -> list[dict]:
    return [
        {
            "slug": "knowledge-to-actions",
            "source_type": "knowledge-map",
            "source_id": map_slug,
            "source_route": knowledge_source_route,
            "target_type": "action-lane",
            "target_route": "/actions",
            "target_slug": None,
            "target_id": "actions",
            "threshold_required": "MEMBER",
            "label": "Activate practical lanes",
            "summary": "Move from map literacy into concrete community actions.",
            "provenance_mode": "source-backed",
            "archive_handoff_mode": "none",
            "display_order": 10,
        },
        {
            "slug": "knowledge-to-events",
            "source_type": "knowledge-map",
            "source_id": map_slug,
            "source_route": knowledge_source_route,
            "target_type": "event-lane",
            "target_route": "/events",
            "target_slug": None,
            "target_id": "events",
            "threshold_required": "MEMBER",
            "label": "Open event pathways",
            "summary": "Move from map reading into situated gatherings and event pathways.",
            "provenance_mode": "source-backed",
            "archive_handoff_mode": "none",
            "display_order": 20,
        },
        {
            "slug": "actions-to-community",
            "source_type": "route",
            "source_id": "actions",
            "source_route": "/actions",
            "target_type": "community",
            "target_route": "/community",
            "target_slug": None,
            "target_id": "community",
            "threshold_required": "MEMBER",
            "label": "Bring actions into commons memory",
            "summary": "Action participation flows into community trace, witness, and collaboration context.",
            "provenance_mode": "verified-summary",
            "archive_handoff_mode": "optional",
            "display_order": 30,
        },
        {
            "slug": "events-to-community",
            "source_type": "route",
            "source_id": "events",
            "source_route": "/events",
            "target_type": "community",
            "target_route": "/community",
            "target_slug": None,
            "target_id": "community",
            "threshold_required": "MEMBER",
            "label": "Route event outcomes to commons",
            "summary": "Event participation and outcomes move into community memory with traceable summaries.",
            "provenance_mode": "verified-summary",
            "archive_handoff_mode": "optional",
            "display_order": 40,
        },
        {
            "slug": "community-to-model-registry",
            "source_type": "route",
            "source_id": "community",
            "source_route": "/community",
            "target_type": "governance-model-registry",
            "target_route": "/governance/model-registry",
            "target_slug": None,
            "target_id": "model-registry",
            "threshold_required": "STEWARD",
            "label": "Escalate into model governance",
            "summary": "Community consequences can be inspected in model and governance registry form.",
            "provenance_mode": "verified-summary",
            "archive_handoff_mode": "required",
            "display_order": 50,
        },
        {
            "slug": "community-to-transparency",
            "source_type": "route",
            "source_id": "community",
            "source_route": "/community",
            "target_type": "trust-transparency",
            "target_route": "/transparency",
            "target_slug": None,
            "target_id": "transparency",
            "threshold_required": "OPEN",
            "label": "Inspect public trust posture",
            "summary": "Community consequences can be read through public trust and disclosure summaries.",
            "provenance_mode": "verified-summary",
            "archive_handoff_mode": "required",
            "display_order": 60,
        },
        {
            "slug": "model-registry-to-archive",
            "source_type": "route",
            "source_id": "model-registry",
            "source_route": "/governance/model-registry",
            "target_type": "archive-record",
            "target_route": "/archive",
            "target_slug": archive_record_slug,
            "target_id": archive_record_slug,
            "threshold_required": "OPEN",
            "label": "Publish accountable archive record",
            "summary": "Governance review materializes as an archive handoff with trust report linkage.",
            "provenance_mode": "source-backed",
            "archive_handoff_mode": "required",
            "display_order": 70,
        },
        {
            "slug": "transparency-to-archive",
            "source_type": "route",
            "source_id": "transparency",
            "source_route": "/transparency",
            "target_type": "archive-record",
            "target_route": "/archive",
            "target_slug": archive_record_slug,
            "target_id": archive_record_slug,
            "threshold_required": "OPEN",
            "label": "Carry trust reports into archive",
            "summary": "Transparency disclosures land in archive memory with stable deep links.",
            "provenance_mode": "source-backed",
            "archive_handoff_mode": "required",
            "display_order": 80,
        },
    ]


def _ensure_archive_and_trust_records(node_slug: str, journey_slug: str) -> tuple[PublicArchiveRecord, PublicTrustReport]:
    archive_slug = f"{journey_slug}-record"
    trust_slug = f"{journey_slug}-trust-report"

    archive_record = PublicArchiveRecord.query.filter_by(slug=archive_slug).first()
    if not archive_record:
        archive_record = PublicArchiveRecord(
            slug=archive_slug,
            record_type="connector-transition-proof-summary",
            title="Knowledge-to-archive flagship journey record",
            summary="Canonical archive record proving the journey from knowledge map to accountable memory.",
            node_slug=node_slug,
            visibility_class="public",
            verification_status="verified-summary",
            last_verified_at=datetime.now(timezone.utc).replace(tzinfo=None),
            source_route="/governance/model-registry",
            provenance_summary="Synthesized from route connectors and transition proof records.",
            redaction_note="No participant-private records are included in this public summary.",
            metadata_json={
                "journey_slug": journey_slug,
                "deep_link": f"/archive/{archive_slug}",
            },
        )
        db.session.add(archive_record)
        db.session.flush()

    trust_report = PublicTrustReport.query.filter_by(slug=trust_slug).first()
    if not trust_report:
        trust_report = PublicTrustReport(
            slug=trust_slug,
            title="Connector trust posture report",
            summary="Public trust report for the flagship knowledge-action-community-governance-archive journey.",
            report_kind="connector-journey",
            node_slug=node_slug,
            published_at=datetime.now(timezone.utc).replace(tzinfo=None),
            verification_status="verified-summary",
            provenance_summary="Backed by journey connector registry and transition proof snapshots.",
            archive_record_id=archive_record.id,
            sponsor_disclosure_ref=None,
            metadata_json={
                "journey_slug": journey_slug,
                "archive_slug": archive_slug,
            },
        )
        db.session.add(trust_report)
        db.session.flush()
    elif trust_report.archive_record_id != archive_record.id:
        trust_report.archive_record_id = archive_record.id

    return archive_record, trust_report


def _upsert_journey_connectors(node, journey_slug: str, source_route: str, map_slug: str, archive_record_slug: str) -> list[JourneyConnector]:
    blueprint = _journey_connector_blueprint(
        knowledge_source_route=f"/education/maps/{map_slug}",
        map_slug=map_slug,
        archive_record_slug=archive_record_slug,
    )
    expected_slugs = {entry["slug"] for entry in blueprint}

    existing_rows = JourneyConnector.query.filter_by(node_slug=node.slug, journey_slug=journey_slug).all()
    by_slug = {row.slug: row for row in existing_rows}

    for entry in blueprint:
        row = by_slug.get(entry["slug"])
        if row is None:
            row = JourneyConnector(
                journey_slug=journey_slug,
                node_id=node.id,
                node_slug=node.slug,
                slug=entry["slug"],
                source_type=entry["source_type"],
                source_id=entry["source_id"],
                source_route=entry["source_route"],
                target_type=entry["target_type"],
                target_route=entry["target_route"],
                target_slug=entry["target_slug"],
                target_id=entry["target_id"],
                threshold_required=entry["threshold_required"],
                label=entry["label"],
                summary=entry["summary"],
                provenance_mode=entry["provenance_mode"],
                archive_handoff_mode=entry["archive_handoff_mode"],
                is_active=True,
                display_order=entry["display_order"],
                metadata_json={"journey_slug": journey_slug},
            )
            db.session.add(row)
            continue

        row.node_id = node.id
        row.node_slug = node.slug
        row.source_type = entry["source_type"]
        row.source_id = entry["source_id"]
        row.source_route = entry["source_route"]
        row.target_type = entry["target_type"]
        row.target_route = entry["target_route"]
        row.target_slug = entry["target_slug"]
        row.target_id = entry["target_id"]
        row.threshold_required = entry["threshold_required"]
        row.label = entry["label"]
        row.summary = entry["summary"]
        row.provenance_mode = entry["provenance_mode"]
        row.archive_handoff_mode = entry["archive_handoff_mode"]
        row.display_order = entry["display_order"]
        row.is_active = True

    for row in existing_rows:
        if row.slug not in expected_slugs:
            row.is_active = False

    db.session.flush()

    return (
        JourneyConnector.query
        .filter_by(node_slug=node.slug, journey_slug=journey_slug, is_active=True)
        .order_by(JourneyConnector.display_order.asc(), JourneyConnector.id.asc())
        .all()
    )


def _ensure_transition_proofs(connectors: list[JourneyConnector], archive_record_id: int | None) -> list[JourneyTransitionProof]:
    proofs: list[JourneyTransitionProof] = []
    for connector in connectors:
        proof = (
            JourneyTransitionProof.query
            .filter_by(connector_id=connector.id, transition_kind="connector-published", result_state="published")
            .first()
        )
        if proof is None:
            proof = JourneyTransitionProof(
                connector_id=connector.id,
                actor_id=None,
                node_slug=connector.node_slug,
                source_route=connector.source_route,
                target_route=connector.target_route,
                transition_kind="connector-published",
                provenance_snapshot={
                    "provenance_mode": connector.provenance_mode,
                    "threshold_required": connector.threshold_required,
                    "archive_handoff_mode": connector.archive_handoff_mode,
                },
                result_state="published",
                archive_record_id=archive_record_id if connector.archive_handoff_mode == "required" else None,
                metadata_json={"connector_slug": connector.slug},
            )
            db.session.add(proof)
        proofs.append(proof)

    db.session.flush()
    return proofs


def _build_connector_payload(
    *,
    node,
    source_route: str,
    connectors: list[JourneyConnector],
    proofs: list[JourneyTransitionProof],
    archive_record: PublicArchiveRecord,
    trust_report: PublicTrustReport,
):
    active_connectors = [
        connector.to_dict()
        for connector in connectors
        if _route_starts_with(source_route, connector.source_route)
    ]

    threshold_flow = []
    for connector in active_connectors:
        threshold = connector.get("threshold_required")
        if threshold and threshold not in threshold_flow:
            threshold_flow.append(threshold)

    degraded = len(active_connectors) == 0 and source_route != "/archive"

    return {
        "journey_slug": CONNECTOR_FLAGSHIP_JOURNEY_SLUG,
        "source": {
            "type": "route",
            "route": source_route,
            "label": "Knowledge source" if _route_starts_with(source_route, "/education/maps") else "Journey source",
        },
        "connectors": [connector.to_dict() for connector in connectors],
        "active_connectors": active_connectors,
        "threshold_context": {
            "active_thresholds": threshold_flow,
            "default_threshold": threshold_flow[0] if threshold_flow else "OPEN",
        },
        "provenance_summary": {
            "source_label": "Journey connector registry",
            "verification_posture": "verified-summary",
            "freshness": datetime.now(timezone.utc).isoformat(),
            "proof_count": len(proofs),
        },
        "archive_handoff": {
            "slug": archive_record.slug,
            "route": "/archive",
            "record_route": f"/archive/{archive_record.slug}",
            "title": archive_record.title,
            "report_slug": trust_report.slug,
            "report_route": f"/transparency?report={trust_report.slug}",
        },
        "degraded_honesty": {
            "is_degraded": degraded,
            "reason": "no_connectors_for_source_route" if degraded else None,
            "fallback": "Journey remains visible from canonical knowledge source." if degraded else None,
        },
        "node_scope": {
            "slug": node.slug,
            "name": node.name,
        },
    }


def ensure_flagship_journey_payload(source_route: str, *, node_override=None):
    node = node_override or resolve_node(None)
    if not node:
        return None

    canonical_source_route, map_slug = _canonical_connector_source_route(source_route)
    archive_record, trust_report = _ensure_archive_and_trust_records(
        node_slug=node.slug,
        journey_slug=CONNECTOR_FLAGSHIP_JOURNEY_SLUG,
    )
    connectors = _upsert_journey_connectors(
        node=node,
        journey_slug=CONNECTOR_FLAGSHIP_JOURNEY_SLUG,
        source_route=canonical_source_route,
        map_slug=map_slug,
        archive_record_slug=archive_record.slug,
    )
    proofs = _ensure_transition_proofs(connectors, archive_record_id=archive_record.id)
    db.session.commit()

    return _build_connector_payload(
        node=node,
        source_route=canonical_source_route,
        connectors=connectors,
        proofs=proofs,
        archive_record=archive_record,
        trust_report=trust_report,
    )


def build_public_journey_payload(slug: str, *, source_route: str, node_override=None):
    if slug != CONNECTOR_FLAGSHIP_JOURNEY_SLUG:
        return None

    payload = ensure_flagship_journey_payload(source_route=source_route, node_override=node_override)
    if not payload:
        return None

    connector_ids = [entry["id"] for entry in payload["connectors"]]
    proofs = (
        JourneyTransitionProof.query
        .filter(JourneyTransitionProof.connector_id.in_(connector_ids))
        .order_by(JourneyTransitionProof.occurred_at.desc(), JourneyTransitionProof.id.desc())
        .all()
        if connector_ids
        else []
    )

    return {
        **payload,
        "journey": {
            "slug": CONNECTOR_FLAGSHIP_JOURNEY_SLUG,
            "label": CONNECTOR_JOURNEY_LABEL,
            "transition_proofs": [proof.to_dict() for proof in proofs],
        },
    }


def build_public_archive_handoff_payload(slug: str):
    record = PublicArchiveRecord.query.filter_by(slug=slug).first()
    if not record:
        return None

    trust_report = PublicTrustReport.query.filter_by(archive_record_id=record.id).order_by(PublicTrustReport.id.desc()).first()
    return {
        "archive_record": record.to_dict(),
        "trust_report": trust_report.to_dict() if trust_report else None,
        "deep_links": {
            "archive": f"/archive/{record.slug}",
            "transparency": f"/transparency?report={trust_report.slug}" if trust_report else "/transparency",
        },
    }


def build_public_trust_report_payload(report_ref: str):
    report = PublicTrustReport.query.filter_by(slug=report_ref).first()
    if report is None:
        try:
            report_id = int(report_ref)
        except (TypeError, ValueError):
            report_id = None
        if report_id is not None:
            report = db.session.get(PublicTrustReport, report_id)

    if report is None:
        return None

    archive_record = db.session.get(PublicArchiveRecord, report.archive_record_id) if report.archive_record_id else None
    return {
        "report": report.to_dict(),
        "archive_record": archive_record.to_dict() if archive_record else None,
        "degraded_honesty": {
            "is_degraded": False,
            "reason": None,
        },
    }
