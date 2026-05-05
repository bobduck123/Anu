import os

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-public-content-fallback-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-public-content-fallback-1234"

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


def _seed_mudyin(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node

    with app.app_context():
        db.session.add(Node(name="Mudyin", slug="mudyin", status="active"))
        db.session.commit()


def test_public_archive_list_degrades_to_empty_public_payload_on_storage_failure(monkeypatch):
    app = _build_app()
    _seed_mudyin(app)

    from manara_backend_app.api import public_archive

    def _raise(*args, **kwargs):
        raise RuntimeError("storage unavailable")

    monkeypatch.setattr(public_archive, "list_public_archive_summaries", _raise)

    response = app.test_client().get("/public/archive/records?node=mudyin&page=1&page_size=5")

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["records"] == []
    assert payload["degraded_honesty"]["is_degraded"] is True
    assert payload["degraded_honesty"]["reason"] == "public_archive_storage_unavailable"


def test_public_archive_list_degrades_for_registered_site_before_node_bootstrap():
    app = _build_app()

    response = app.test_client().get("/public/archive/records?node=mudyin&page=1&page_size=5")

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["records"] == []
    assert payload["degraded_honesty"]["reason"] == "tenant_node_not_bootstrapped"


def test_public_trust_list_degrades_to_empty_public_payload_on_storage_failure(monkeypatch):
    app = _build_app()
    _seed_mudyin(app)

    from manara_backend_app.api import public_trust

    def _raise(*args, **kwargs):
        raise RuntimeError("storage unavailable")

    monkeypatch.setattr(public_trust, "list_public_decision_summaries", _raise)
    monkeypatch.setattr(public_trust, "list_public_trust_reports", _raise)

    decisions = app.test_client().get("/public/trust/decisions?node=mudyin&limit=5")
    assert decisions.status_code == 200
    decision_payload = decisions.get_json()["data"]
    assert decision_payload["decisions"] == []
    assert decision_payload["degraded_honesty"]["reason"] == "public_decision_storage_unavailable"

    reports = app.test_client().get("/public/trust/reports?node=mudyin&limit=5")
    assert reports.status_code == 200
    report_payload = reports.get_json()["data"]
    assert report_payload["reports"] == []
    assert report_payload["degraded_honesty"]["reason"] == "public_trust_storage_unavailable"


def test_public_trust_list_degrades_for_registered_site_before_node_bootstrap():
    app = _build_app()

    decisions = app.test_client().get("/public/trust/decisions?node=mudyin&limit=5")
    assert decisions.status_code == 200
    decision_payload = decisions.get_json()["data"]
    assert decision_payload["decisions"] == []
    assert decision_payload["degraded_honesty"]["reason"] == "tenant_node_not_bootstrapped"

    reports = app.test_client().get("/public/trust/reports?node=mudyin&limit=5")
    assert reports.status_code == 200
    report_payload = reports.get_json()["data"]
    assert report_payload["reports"] == []
    assert report_payload["degraded_honesty"]["reason"] == "tenant_node_not_bootstrapped"
