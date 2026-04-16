import os
from datetime import datetime, timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-public-archive-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-public-archive-1234"

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


def _add_archive_record(
    *,
    db,
    PublicArchiveRecord,
    slug: str,
    record_type: str,
    node_slug: str,
    updated_at: datetime,
    title: str | None = None,
):
    record = PublicArchiveRecord(
        slug=slug,
        record_type=record_type,
        title=title or f"{slug} title",
        summary=f"{slug} summary",
        node_slug=node_slug,
        visibility_class="public",
        verification_status="verified-summary",
        source_route="/transparency",
        provenance_summary=f"{slug} provenance",
        updated_at=updated_at,
    )
    db.session.add(record)
    return record


def test_public_archive_summary_contract_and_non_distortion_fields_with_pagination_metadata():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import (
        Node,
        PublicArchiveRecord,
        PublicSponsorDisclosure,
        PublicTrustReport,
    )

    with app.app_context():
        node = Node(name="Archive Node", slug="archive-node", status="active")
        db.session.add(node)
        db.session.flush()

        trust_linked_record = _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="water-memory-record",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=datetime(2026, 4, 14, 9, 0, 0),
            title="Water memory record",
        )
        trust_linked_record.sponsor_context = "internal-only sponsor context that must not leak"
        trust_linked_record.metadata_json = {"freshness_hint": "Reviewed today"}

        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="connector-memory-record",
            record_type="connector-transition-proof-summary",
            node_slug=node.slug,
            updated_at=datetime(2026, 4, 14, 8, 0, 0),
            title="Connector memory record",
        )
        db.session.flush()

        trust_report = PublicTrustReport(
            slug="water-trust-brief",
            title="Water trust brief",
            summary="Trust brief summary",
            report_kind="integrity-brief",
            node_slug=node.slug,
            verification_status="verified-summary",
            provenance_summary="Verified publication provenance.",
            archive_record_id=trust_linked_record.id,
            metadata_json={
                "public_visibility": True,
                "effective_at": "2026-04-14T08:00:00Z",
                "freshness_hint": "Reviewed 3 hours ago",
            },
        )
        disclosure = PublicSponsorDisclosure(
            slug="water-sponsor-disclosure",
            sponsor_name="Example Sponsor",
            sponsor_type="foundation",
            sponsored_surface="/trust",
            placement_type="panel",
            disclosure_label="Sponsor disclosure",
            public_note="Infrastructure support disclosure.",
            disclosure_text="Support does not alter trust-report body or archive truth fields.",
            is_active=True,
            trust_report_slug=trust_report.slug,
            archive_record_slug=trust_linked_record.slug,
        )

        db.session.add(trust_report)
        db.session.add(disclosure)
        db.session.commit()

    client = app.test_client()
    response = client.get("/public/archive/records?page=1&page_size=2")

    assert response.status_code == 200
    payload = response.get_json()["data"]

    assert payload["degraded_honesty"]["is_degraded"] is False
    assert payload["applied_record_type_filter"] is None
    assert payload["applied_title_prefix_filter"] is None
    assert payload["applied_filters"]["record_type"] is None
    assert payload["applied_filters"]["title_prefix"] is None

    assert payload["pagination"]["model"] == "offset"
    assert payload["pagination"]["page"] == 1
    assert payload["pagination"]["page_size"] == 2
    assert payload["pagination"]["total_records"] == 2
    assert payload["pagination"]["total_pages"] == 1
    assert payload["pagination"]["ordering"] == ["updated_at:desc", "id:desc"]

    rows_by_slug = {row["slug"]: row for row in payload["records"]}
    trust_row = rows_by_slug["water-memory-record"]
    assert trust_row["related_trust_report_slug"] == "water-trust-brief"
    assert trust_row["is_trust_linked"] is True
    assert "sponsor_context" not in trust_row
    assert "sponsor" not in " ".join(sorted(trust_row.keys()))


def test_public_archive_summary_title_prefix_filter_is_case_insensitive_and_deterministic():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PublicArchiveRecord

    with app.app_context():
        node = Node(name="Prefix Node", slug="prefix-node", status="active")
        db.session.add(node)
        db.session.flush()

        base = datetime(2026, 4, 14, 12, 0, 0)
        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="alpha-1",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=base,
            title="Alpha Trust Brief",
        )
        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="alpha-2",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=base - timedelta(minutes=1),
            title="alpha civic memory",
        )
        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="beta-1",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=base - timedelta(minutes=2),
            title="Beta Record",
        )
        db.session.commit()

    client = app.test_client()
    payload = client.get("/public/archive/records?title_prefix=ALPHA&page=1&page_size=5").get_json()["data"]

    assert [row["slug"] for row in payload["records"]] == ["alpha-1", "alpha-2"]
    assert payload["applied_title_prefix_filter"] == "ALPHA"
    assert payload["applied_filters"]["title_prefix"] == "ALPHA"
    assert payload["pagination"]["total_records"] == 2


def test_public_archive_summary_title_prefix_guardrails_normalize_whitespace_and_drop_blank():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PublicArchiveRecord

    with app.app_context():
        node = Node(name="Prefix Guardrail Node", slug="prefix-guardrail-node", status="active")
        db.session.add(node)
        db.session.flush()

        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="alpha-trust-guardrail",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=datetime(2026, 4, 14, 12, 5, 0),
            title="Alpha Trust Guardrail",
        )
        db.session.commit()

    client = app.test_client()

    normalized = client.get(
        "/public/archive/records?title_prefix=%20%20Alpha%20%20%20Trust%20%20&page=1&page_size=5"
    ).get_json()["data"]
    assert [row["slug"] for row in normalized["records"]] == ["alpha-trust-guardrail"]
    assert normalized["applied_title_prefix_filter"] == "Alpha Trust"
    assert normalized["applied_filters"]["title_prefix"] == "Alpha Trust"

    blank = client.get(
        "/public/archive/records?title_prefix=%20%20%20&page=1&page_size=5"
    ).get_json()["data"]
    assert blank["applied_title_prefix_filter"] is None
    assert blank["applied_filters"]["title_prefix"] is None
    assert blank["pagination"]["total_records"] == 1


def test_public_archive_summary_title_prefix_guardrail_caps_length_deterministically():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PublicArchiveRecord

    with app.app_context():
        node = Node(name="Prefix Cap Node", slug="prefix-cap-node", status="active")
        db.session.add(node)
        db.session.flush()

        capped_prefix = "A" * 80
        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="prefix-cap-match",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=datetime(2026, 4, 14, 12, 10, 0),
            title=f"{capped_prefix} canonical title",
        )
        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="prefix-cap-nonmatch",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=datetime(2026, 4, 14, 12, 9, 0),
            title=f"{'A' * 79}B non-matching title",
        )
        db.session.commit()

    client = app.test_client()

    overlong_prefix = "A" * 120
    payload = client.get(
        f"/public/archive/records?title_prefix={overlong_prefix}&page=1&page_size=5"
    ).get_json()["data"]

    assert payload["applied_title_prefix_filter"] == "A" * 80
    assert payload["applied_filters"]["title_prefix"] == "A" * 80
    assert [row["slug"] for row in payload["records"]] == ["prefix-cap-match"]
    assert payload["pagination"]["total_records"] == 1


def test_public_archive_summary_pagination_type_and_title_prefix_filters_coexist():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PublicArchiveRecord

    with app.app_context():
        node = Node(name="Filter Node", slug="filter-node", status="active")
        db.session.add(node)
        db.session.flush()

        base = datetime(2026, 4, 14, 10, 0, 0)
        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="trust-a-1",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=base,
            title="Alpha Trust One",
        )
        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="trust-a-2",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=base - timedelta(minutes=1),
            title="Alpha Trust Two",
        )
        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="trust-a-3",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=base - timedelta(minutes=2),
            title="Alpha Trust Three",
        )
        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="trust-b-1",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=base - timedelta(minutes=3),
            title="Beta Trust One",
        )
        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="connector-a-1",
            record_type="connector-transition-proof-summary",
            node_slug=node.slug,
            updated_at=base - timedelta(minutes=4),
            title="Alpha Connector One",
        )
        db.session.commit()

    client = app.test_client()

    page_one = client.get(
        "/public/archive/records?type=public-trust-report&title_prefix=alpha&page=1&page_size=2"
    ).get_json()["data"]
    page_two = client.get(
        "/public/archive/records?type=public-trust-report&title_prefix=alpha&page=2&page_size=2"
    ).get_json()["data"]

    assert [row["slug"] for row in page_one["records"]] == ["trust-a-1", "trust-a-2"]
    assert [row["slug"] for row in page_two["records"]] == ["trust-a-3"]

    assert page_one["applied_record_type_filter"] == "public-trust-report"
    assert page_one["applied_title_prefix_filter"] == "alpha"
    assert page_one["applied_filters"]["record_type"] == "public-trust-report"
    assert page_one["applied_filters"]["title_prefix"] == "alpha"
    assert page_one["pagination"]["has_more"] is True
    assert page_two["pagination"]["has_more"] is False


def test_public_archive_summary_out_of_range_page_and_empty_states_are_honest_with_prefix_filter():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PublicArchiveRecord

    with app.app_context():
        node = Node(name="Honesty Node", slug="honesty-node", status="active")
        db.session.add(node)
        db.session.flush()

        _add_archive_record(
            db=db,
            PublicArchiveRecord=PublicArchiveRecord,
            slug="alpha-only",
            record_type="public-trust-report",
            node_slug=node.slug,
            updated_at=datetime(2026, 4, 14, 10, 0, 0),
            title="Alpha Only",
        )
        db.session.commit()

    client = app.test_client()

    out_of_range = client.get(
        "/public/archive/records?title_prefix=alpha&page=2&page_size=1"
    ).get_json()["data"]
    assert out_of_range["records"] == []
    assert out_of_range["degraded_honesty"]["is_degraded"] is True
    assert out_of_range["degraded_honesty"]["reason"] == "no_public_archive_records_for_page"

    no_match = client.get("/public/archive/records?title_prefix=zzz&page=1&page_size=5").get_json()["data"]
    assert no_match["records"] == []
    assert no_match["degraded_honesty"]["is_degraded"] is True
    assert no_match["degraded_honesty"]["reason"] == "no_public_archive_records_for_title_prefix"


def test_public_archive_summary_bad_pagination_contract():
    client = _build_app().test_client()

    bad_page_response = client.get("/public/archive/records?page=not-a-number")
    assert bad_page_response.status_code == 400

    bad_page_size_response = client.get("/public/archive/records?page=1&page_size=0")
    assert bad_page_size_response.status_code == 400


def test_public_archive_summary_exposes_stable_decision_register_links_when_metadata_is_present():
    app = _build_app()

    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, PublicArchiveRecord

    with app.app_context():
        node = Node(name="Decision Link Node", slug="decision-link-node", status="active")
        db.session.add(node)
        db.session.flush()

        decision_record = PublicArchiveRecord(
            slug="d001-control-host-summary",
            record_type="governance-decision-summary",
            title="D001 control host summary",
            summary="Public-safe summary of the control host decision.",
            node_slug=node.slug,
            visibility_class="public",
            verification_status="verified-summary",
            source_route="/governance/model-registry",
            provenance_summary="Decision register publication packet.",
            metadata_json={"decision_id": "D001"},
            updated_at=datetime(2026, 4, 14, 11, 0, 0),
        )
        db.session.add(decision_record)
        db.session.commit()

    payload = app.test_client().get("/public/archive/records?page=1&page_size=5").get_json()["data"]
    row = next(entry for entry in payload["records"] if entry["slug"] == "d001-control-host-summary")

    assert row["related_decision_id"] == "D001"
    assert row["related_decision_route"] == "/archive/d001-control-host-summary#decision-summary"
    assert row["related_route"] == "/archive/d001-control-host-summary#decision-summary"
    assert row["is_decision_linked"] is True
