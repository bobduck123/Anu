import os
from datetime import datetime, timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-public-sponsor-disclosures-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-public-sponsor-disclosures-1234"

from backend_factory import load_create_app  # noqa: E402


def _build_app():
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
        }
    )


def test_public_sponsor_disclosure_model_serialization_contract():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import PublicSponsorDisclosure

    with app.app_context():
        now = datetime.utcnow()
        disclosure = PublicSponsorDisclosure(
            slug="civic-bank-transparency-note",
            sponsor_name="Civic Bank Foundation",
            sponsor_type="foundation",
            sponsored_surface="/transparency",
            placement_type="supporting-note",
            disclosure_label="Sponsor disclosure",
            public_note="Support acknowledged for public reporting infrastructure.",
            disclosure_text="This sponsor support funds reporting infrastructure and does not alter trust report content.",
            active_from=now - timedelta(days=1),
            active_until=now + timedelta(days=7),
            is_active=True,
            trust_report_slug="flood-resilience-brief",
            archive_record_slug="flood-resilience-q2",
            metadata_json={"private_billing_code": "internal-123"},
        )
        db.session.add(disclosure)
        db.session.commit()

        payload = disclosure.to_dict(reference_time=now)
        assert payload["sponsor_name"] == "Civic Bank Foundation"
        assert payload["sponsor_type"] == "foundation"
        assert payload["sponsored_surface"] == "/transparency"
        assert payload["placement_type"] == "supporting-note"
        assert payload["disclosure_label"] == "Sponsor disclosure"
        assert payload["is_active"] is True
        assert payload["is_currently_active"] is True
        assert payload["trust_report_slug"] == "flood-resilience-brief"
        assert payload["archive_record_slug"] == "flood-resilience-q2"
        assert "metadata" not in payload


def test_public_sponsor_disclosure_api_and_non_distortion_invariants():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PublicArchiveRecord, PublicSponsorDisclosure, PublicTrustReport

    with app.app_context():
        now = datetime.utcnow()
        node = Node(name="Disclosure Node", slug="disclosure-node", status="active")
        db.session.add(node)
        db.session.flush()

        archive_record = PublicArchiveRecord(
            slug="resilience-record",
            record_type="public-trust-report",
            title="Resilience record",
            summary="Archive summary that must remain unchanged.",
            node_slug=node.slug,
            visibility_class="public",
            verification_status="verified-summary",
            source_route="/transparency",
            provenance_summary="Archive provenance summary.",
        )
        db.session.add(archive_record)
        db.session.flush()

        trust_report = PublicTrustReport(
            slug="resilience-report",
            title="Resilience trust report",
            summary="Trust summary",
            report_kind="status-brief",
            node_slug=node.slug,
            verification_status="verified-summary",
            provenance_summary="Trust provenance summary.",
            archive_record_id=archive_record.id,
            metadata_json={
                "body": "Canonical trust body text that must not be replaced by sponsor disclosure.",
                "sections": [{"heading": "Methods", "content": "Methods section."}],
                "public_visibility": True,
            },
        )
        db.session.add(trust_report)

        active_disclosure = PublicSponsorDisclosure(
            slug="sponsor-disclosure-active",
            sponsor_name="Public Interest Labs",
            sponsor_type="civic-partner",
            sponsored_surface="/transparency",
            placement_type="supporting-note",
            disclosure_label="Sponsor disclosure",
            public_note="Public Interest Labs supports publication infrastructure.",
            disclosure_text="This support does not alter trust-report claims or archive truth fields.",
            active_from=now - timedelta(days=2),
            active_until=now + timedelta(days=10),
            is_active=True,
            trust_report_slug=trust_report.slug,
            archive_record_slug=archive_record.slug,
            metadata_json={"private_invoice_id": "INV-9999"},
        )
        inactive_disclosure = PublicSponsorDisclosure(
            slug="sponsor-disclosure-inactive",
            sponsor_name="Inactive Partner",
            sponsor_type="foundation",
            sponsored_surface="/transparency",
            placement_type="supporting-note",
            disclosure_label="Sponsor disclosure",
            public_note="Inactive placement",
            disclosure_text="Inactive placement text",
            active_from=now - timedelta(days=30),
            active_until=now - timedelta(days=7),
            is_active=True,
            trust_report_slug=trust_report.slug,
            archive_record_slug=archive_record.slug,
        )
        db.session.add(active_disclosure)
        db.session.add(inactive_disclosure)
        db.session.commit()

    client = app.test_client()

    list_response = client.get("/public/transparency/sponsor-disclosures?surface=/transparency")
    assert list_response.status_code == 200
    list_payload = list_response.get_json()["data"]
    assert list_payload["disclosure_state"] == "live"
    assert list_payload["degraded_honesty"]["is_degraded"] is False
    assert len(list_payload["disclosures"]) == 1

    disclosure = list_payload["disclosures"][0]
    assert disclosure["slug"] == "sponsor-disclosure-active"
    assert disclosure["sponsor_name"] == "Public Interest Labs"
    assert disclosure["is_currently_active"] is True
    assert disclosure["related_routes"]["transparency"] == "/transparency"
    assert disclosure["related_routes"]["trust_report"] == "/transparency?report=resilience-report"
    assert disclosure["related_routes"]["archive_record"] == "/archive/resilience-record"
    assert "metadata" not in disclosure
    assert "private_invoice_id" not in str(disclosure)

    detail_response = client.get("/public/transparency/sponsor-disclosures/sponsor-disclosure-active")
    assert detail_response.status_code == 200
    detail_payload = detail_response.get_json()["data"]["disclosure"]
    assert detail_payload["slug"] == "sponsor-disclosure-active"
    assert detail_payload["disclosure_label"] == "Sponsor disclosure"

    trust_response = client.get("/public/trust/reports/resilience-report")
    assert trust_response.status_code == 200
    trust_payload = trust_response.get_json()["data"]
    assert trust_payload["report"]["body"] == "Canonical trust body text that must not be replaced by sponsor disclosure."
    assert trust_payload["archive_record"]["summary"] == "Archive summary that must remain unchanged."
    assert trust_payload["archive_record"]["verification_status"] == "verified-summary"


def test_public_sponsor_disclosure_api_handles_no_disclosures_honestly():
    client = _build_app().test_client()

    response = client.get("/public/transparency/sponsor-disclosures?surface=/transparency")
    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["disclosures"] == []
    assert payload["disclosure_state"] == "none_published"
    assert payload["degraded_honesty"]["is_degraded"] is False
    assert payload["degraded_honesty"]["fallback"] == "No active sponsor disclosures are published for this surface at this time."
