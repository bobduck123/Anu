import os
import shutil
import uuid
from contextlib import contextmanager
from pathlib import Path

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-public-decisions-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-public-decisions-1234"

from backend_factory import load_create_app  # noqa: E402


def _build_app(decision_register_path: str):
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "DECISION_REGISTER_PATH": decision_register_path,
        }
    )


def _write_decision_register(path: str):
    content = """# Decision Register (test)

| ID | Title | Decision Statement | Why It Matters | Default Assumption For Now | Owner | Due Date | Blocking Impact If Unresolved | Current Status |
|---|---|---|---|---|---|---|---|---|
| D001 | Control host/domain | Confirm canonical control host/domain for privileged surfaces. | Needed for host gating proof. | Use control host defaults. | Founder + Ops | 2026-04-14 | Medium | Open (default active) |
| D002 | Financial source of truth | Decide canonical finance disclosure source. | Needed for trust posture. | Backend disclosure default. | Founder + Finance | 2026-04-21 | High | Open (default active) |
"""
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content)


@contextmanager
def _local_temp_dir():
    root = Path(__file__).resolve().parent / ".tmp_public_decisions"
    root.mkdir(parents=True, exist_ok=True)
    candidate = root / uuid.uuid4().hex
    candidate.mkdir(parents=True, exist_ok=False)
    try:
        yield candidate
    finally:
        shutil.rmtree(candidate, ignore_errors=True)


def test_public_decision_list_only_exposes_archive_published_summaries():
    with _local_temp_dir() as temp_dir:
        register_path = str(temp_dir / "decision-register.md")
        _write_decision_register(register_path)
        app = _build_app(register_path)

        from manara_backend_app.extensions import db
        from manara_backend_app.models import Node, PublicArchiveRecord

        with app.app_context():
            node = Node(name="Decision Node", slug="decision-node", status="active")
            db.session.add(node)
            db.session.flush()

            db.session.add(
                PublicArchiveRecord(
                    slug="d001-control-host-summary",
                    record_type="governance-decision-summary",
                    title="D001 public summary",
                    summary="Public-safe decision summary for D001.",
                    node_slug=node.slug,
                    visibility_class="public",
                    verification_status="verified-summary",
                    source_route="/governance/model-registry",
                    provenance_summary="Derived from decision register publication packet.",
                    metadata_json={"decision_id": "D001"},
                )
            )
            db.session.commit()

        payload = app.test_client().get("/public/trust/decisions").get_json()["data"]
        assert len(payload["decisions"]) == 1
        assert payload["decisions"][0]["decision_id"] == "D001"
        assert payload["decisions"][0]["record_route"] == "/archive/d001-control-host-summary"
        assert payload["degraded_honesty"]["is_degraded"] is False


def test_public_decision_detail_supports_lookup_by_decision_id_and_archive_slug():
    with _local_temp_dir() as temp_dir:
        register_path = str(temp_dir / "decision-register.md")
        _write_decision_register(register_path)
        app = _build_app(register_path)

        from manara_backend_app.extensions import db
        from manara_backend_app.models import Node, PublicArchiveRecord

        with app.app_context():
            node = Node(name="Decision Detail Node", slug="decision-detail-node", status="active")
            db.session.add(node)
            db.session.flush()

            db.session.add(
                PublicArchiveRecord(
                    slug="d001-public-record",
                    record_type="governance-decision-summary",
                    title="D001 public record",
                    summary="Public-safe D001 summary.",
                    node_slug=node.slug,
                    visibility_class="public",
                    verification_status="verified-summary",
                    source_route="/governance/model-registry",
                    provenance_summary="Decision register publication packet.",
                    metadata_json={"decision_id": "D001"},
                )
            )
            db.session.commit()

        client = app.test_client()
        by_id = client.get("/public/trust/decisions/D001")
        assert by_id.status_code == 200
        assert by_id.get_json()["data"]["decision"]["archive_record_slug"] == "d001-public-record"

        by_slug = client.get("/public/trust/decisions/d001-public-record")
        assert by_slug.status_code == 200
        assert by_slug.get_json()["data"]["decision"]["decision_id"] == "D001"

        missing = client.get("/public/trust/decisions/D002")
        assert missing.status_code == 404


def test_public_decision_list_degrades_honestly_when_none_are_published():
    with _local_temp_dir() as temp_dir:
        register_path = str(temp_dir / "decision-register.md")
        _write_decision_register(register_path)
        app = _build_app(register_path)

        payload = app.test_client().get("/public/trust/decisions").get_json()["data"]
        assert payload["decisions"] == []
        assert payload["degraded_honesty"]["is_degraded"] is True
        assert payload["degraded_honesty"]["reason"] == "no_public_decision_summaries"
