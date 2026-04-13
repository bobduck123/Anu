import os

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-public-connectors-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-public-connectors-1234"

from backend_factory import load_create_app  # noqa: E402


FLAGSHIP_JOURNEY_SLUG = "knowledge-action-community-governance-archive"


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
        }
    )


def _build_client():
    return _build_app().test_client()


def test_journey_connector_and_transition_proof_models_persist_required_fields():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import JourneyConnector, JourneyTransitionProof, Node, PublicArchiveRecord

    with app.app_context():
        node = Node(name="Connector Node", slug="connector-node", status="active")
        db.session.add(node)
        db.session.flush()

        archive = PublicArchiveRecord(
            slug="connector-node-proof-record",
            record_type="connector-transition-proof-summary",
            title="Connector proof record",
            summary="Proof summary",
            node_slug=node.slug,
            visibility_class="public",
            verification_status="verified-summary",
            source_route="/governance/model-registry",
            provenance_summary="Generated from canonical connector pathway.",
        )
        db.session.add(archive)
        db.session.flush()

        connector = JourneyConnector(
            journey_slug=FLAGSHIP_JOURNEY_SLUG,
            node_id=node.id,
            slug="knowledge-to-actions",
            source_type="knowledge-map",
            source_id="weaving-futures-atlas",
            source_route="/education/maps/weaving-futures-atlas",
            target_type="action-lane",
            target_route="/actions",
            target_slug=None,
            target_id="actions",
            threshold_required="MEMBER",
            node_slug=node.slug,
            label="Activate practical lanes",
            summary="Move from map literacy into concrete community actions.",
            provenance_mode="source-backed",
            archive_handoff_mode="none",
            is_active=True,
            display_order=10,
        )
        db.session.add(connector)
        db.session.flush()

        proof = JourneyTransitionProof(
            connector_id=connector.id,
            actor_id=None,
            node_slug=node.slug,
            source_route=connector.source_route,
            target_route=connector.target_route,
            transition_kind="journey-step",
            provenance_snapshot={"provenance_mode": "source-backed"},
            result_state="recorded",
            archive_record_id=archive.id,
        )
        db.session.add(proof)
        db.session.commit()

        reloaded_connector = db.session.get(JourneyConnector, connector.id)
        reloaded_proof = db.session.get(JourneyTransitionProof, proof.id)

        assert reloaded_connector is not None
        assert reloaded_connector.target_route == "/actions"
        assert reloaded_connector.threshold_required == "MEMBER"
        assert reloaded_connector.provenance_mode == "source-backed"

        assert reloaded_proof is not None
        assert reloaded_proof.connector_id == connector.id
        assert reloaded_proof.archive_record_id == archive.id
        assert reloaded_proof.provenance_snapshot["provenance_mode"] == "source-backed"


def test_public_connectors_endpoint_returns_connector_rail_payload_with_archive_handoff():
    client = _build_client()

    response = client.get("/public/connectors?source_route=/education/maps/weaving-futures-atlas")

    assert response.status_code == 200
    payload = response.get_json()["data"]

    assert payload["journey_slug"] == FLAGSHIP_JOURNEY_SLUG
    assert payload["source"]["route"] == "/education/maps/weaving-futures-atlas"
    assert len(payload["connectors"]) >= 8
    assert payload["archive_handoff"]["route"] == "/archive"
    assert payload["archive_handoff"]["record_route"].startswith("/archive/")

    active_targets = {entry["target_route"] for entry in payload["active_connectors"]}
    assert "/actions" in active_targets
    assert "/events" in active_targets

    assert payload["provenance_summary"]["proof_count"] >= len(payload["connectors"])


def test_public_journey_endpoint_proves_archive_path_and_no_dead_end_for_touched_routes():
    client = _build_client()

    response = client.get(
        f"/public/journeys/{FLAGSHIP_JOURNEY_SLUG}?source_route=/education/maps/weaving-futures-atlas"
    )

    assert response.status_code == 200
    payload = response.get_json()["data"]
    connectors = payload["connectors"]

    outgoing = {}
    touched = set()
    for connector in connectors:
        source = connector["source_route"]
        target = connector["target_route"]
        touched.add(source)
        touched.add(target)
        outgoing.setdefault(source, set()).add(target)

    dead_end_routes = sorted(route for route in touched if route != "/archive" and route not in outgoing)
    assert dead_end_routes == []

    start = "/education/maps/weaving-futures-atlas"
    target = "/archive"
    frontier = [start]
    seen = set()
    reached_archive = False
    while frontier:
        current = frontier.pop(0)
        if current in seen:
            continue
        seen.add(current)
        if current == target:
            reached_archive = True
            break
        frontier.extend(sorted(outgoing.get(current, set()) - seen))

    assert reached_archive is True
    assert len(payload["journey"]["transition_proofs"]) >= len(connectors)


def test_public_archive_handoff_and_trust_report_endpoints_link_to_each_other():
    client = _build_client()

    connectors_payload = client.get("/public/connectors").get_json()["data"]
    archive_slug = connectors_payload["archive_handoff"]["slug"]
    report_slug = connectors_payload["archive_handoff"]["report_slug"]

    handoff_response = client.get(f"/public/archive-handoffs/{archive_slug}")
    assert handoff_response.status_code == 200
    handoff_payload = handoff_response.get_json()["data"]

    assert handoff_payload["archive_record"]["slug"] == archive_slug
    assert handoff_payload["trust_report"]["slug"] == report_slug

    report_response = client.get(f"/public/trust/reports/{report_slug}")
    assert report_response.status_code == 200
    report_payload = report_response.get_json()["data"]

    assert report_payload["report"]["slug"] == report_slug
    assert report_payload["archive_record"]["slug"] == archive_slug


def test_connector_service_canonicalizes_source_routes_and_surfaces_degraded_honesty():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node
    from manara_backend_app.services.connector_service import ensure_flagship_journey_payload

    with app.app_context():
        node = Node(name="Journey Service Node", slug="journey-service-node", status="active")
        db.session.add(node)
        db.session.commit()

        education_payload = ensure_flagship_journey_payload("/education", node_override=node)
        assert education_payload is not None
        assert education_payload["source"]["route"] == "/education/maps/weaving-futures-atlas"
        assert education_payload["degraded_honesty"]["is_degraded"] is False

        degraded_payload = ensure_flagship_journey_payload("/unmapped-route", node_override=node)
        assert degraded_payload is not None
        assert degraded_payload["source"]["route"] == "/unmapped-route"
        assert degraded_payload["degraded_honesty"]["is_degraded"] is True
        assert degraded_payload["degraded_honesty"]["reason"] == "no_connectors_for_source_route"
