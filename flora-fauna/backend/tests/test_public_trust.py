import os
from datetime import datetime

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-public-trust-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-public-trust-1234"

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


def test_public_trust_report_model_serializes_contract_fields():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PublicArchiveRecord, PublicTrustReport

    with app.app_context():
        node = Node(name="Trust Node", slug="trust-node", status="active")
        db.session.add(node)
        db.session.flush()

        archive_record = PublicArchiveRecord(
            slug="trust-record",
            record_type="public-trust-report",
            title="Trust record",
            summary="Trust record summary",
            node_slug=node.slug,
            source_route="/transparency",
            provenance_summary="Source: transparency report publication feed.",
        )
        db.session.add(archive_record)
        db.session.flush()

        report = PublicTrustReport(
            slug="trust-report-1",
            title="Trust report one",
            summary="Summary one",
            report_kind="integrity-brief",
            node_slug=node.slug,
            verification_status="verified-summary",
            provenance_summary="Signed publication packet.",
            archive_record_id=archive_record.id,
            metadata_json={
                "body": "Detailed trust body text.",
                "sections": [{"heading": "Methods", "content": "Human review + machine checks."}],
                "status": "provisional",
                "effective_at": "2026-04-14T00:00:00Z",
                "source_notes": "Compiled from verified publication records.",
                "freshness_hint": "Reviewed 6 hours ago",
                "jurisdiction": "NSW",
                "public_visibility": True,
            },
        )
        db.session.add(report)
        db.session.commit()

        payload = report.to_dict()
        assert payload["report_type"] == "integrity-brief"
        assert payload["status"] == "provisional"
        assert payload["body"] == "Detailed trust body text."
        assert payload["sections"][0]["heading"] == "Methods"
        assert payload["public_visibility"] is True
        assert payload["jurisdiction"] == "NSW"
        assert payload["source_notes"] == "Compiled from verified publication records."
        assert payload["archive_record_id"] == archive_record.id


def test_public_trust_report_list_and_detail_contract():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PublicArchiveRecord, PublicTrustReport

    with app.app_context():
        node = Node(name="Trust List Node", slug="trust-list-node", status="active")
        db.session.add(node)
        db.session.flush()

        archive_record = PublicArchiveRecord(
            slug="list-record",
            record_type="public-trust-report",
            title="List record",
            summary="List record summary",
            node_slug=node.slug,
            source_route="/transparency",
            provenance_summary="List record provenance.",
        )
        db.session.add(archive_record)
        db.session.flush()

        visible_report = PublicTrustReport(
            slug="visible-report",
            title="Visible report",
            summary="Visible report summary",
            report_kind="status-brief",
            node_slug=node.slug,
            verification_status="verified-summary",
            provenance_summary="Visible source.",
            archive_record_id=archive_record.id,
            published_at=datetime(2026, 4, 14, 9, 0, 0),
            metadata_json={
                "public_visibility": True,
                "freshness_hint": "Reviewed today",
                "body": "Visible detail body.",
                "sections": [{"heading": "Scope", "content": "Public-safe scope."}],
            },
        )
        hidden_report = PublicTrustReport(
            slug="hidden-report",
            title="Hidden report",
            summary="Hidden report summary",
            report_kind="status-brief",
            node_slug=node.slug,
            verification_status="restricted",
            provenance_summary="Hidden source.",
            metadata_json={"public_visibility": False},
        )
        db.session.add(visible_report)
        db.session.add(hidden_report)
        db.session.commit()

    client = app.test_client()

    list_response = client.get("/public/trust/reports")
    assert list_response.status_code == 200
    list_payload = list_response.get_json()["data"]

    assert len(list_payload["reports"]) == 1
    list_entry = list_payload["reports"][0]
    assert list_entry["slug"] == "visible-report"
    assert list_entry["record_route"] == "/archive/list-record"
    assert list_payload["degraded_honesty"]["is_degraded"] is False

    detail_response = client.get("/public/trust/reports/visible-report")
    assert detail_response.status_code == 200
    detail_payload = detail_response.get_json()["data"]

    assert detail_payload["report"]["slug"] == "visible-report"
    assert detail_payload["report"]["body"] == "Visible detail body."
    assert detail_payload["archive_record"]["slug"] == "list-record"

    missing_response = client.get("/public/trust/reports/hidden-report")
    assert missing_response.status_code == 404


def test_public_trust_report_list_exposes_degraded_honesty_when_empty():
    client = _build_app().test_client()
    response = client.get("/public/trust/reports")
    assert response.status_code == 200
    payload = response.get_json()["data"]

    assert payload["reports"] == []
    assert payload["degraded_honesty"]["is_degraded"] is True
    assert payload["degraded_honesty"]["reason"] == "no_public_trust_reports"
