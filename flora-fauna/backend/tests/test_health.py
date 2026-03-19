import os
from unittest.mock import patch

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-health-routes-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-health-routes-1234"

from backend_factory import load_create_app  # noqa: E402


create_app = load_create_app()
app = create_app(
    {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "AUTO_CREATE_ALL": False,
        "BETA_PLACEHOLDER_DATABASE": False,
        "BETA_PLACEHOLDER_STRIPE": False,
    }
)
client = app.test_client()


def test_health_is_lightweight_and_advertises_readiness():
    with patch("manara_backend_app.health.db.session.execute") as execute:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
    assert response.get_json()["database_checked"] is False
    assert response.get_json()["readiness"] == "/readiness"
    execute.assert_not_called()


def test_healthz_is_minimal_liveness_probe():
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_readiness_reports_database_success():
    with patch("manara_backend_app.health.db.session.execute", return_value=None) as execute:
        response = client.get("/readiness")

    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
    assert response.get_json()["db"] is True
    execute.assert_called_once()


def test_readiness_reports_database_failure():
    with patch("manara_backend_app.health.db.session.execute", side_effect=RuntimeError("db unavailable")) as execute:
        response = client.get("/readiness")

    assert response.status_code == 503
    assert response.get_json()["status"] == "degraded"
    assert response.get_json()["db"] is False
    execute.assert_called_once()


def test_domain_resolution_route_contract_is_single_prefixed():
    routes = {rule.rule for rule in app.url_map.iter_rules()}

    assert "/api/domains/resolve" in routes
    assert "/api/api/domains/resolve" not in routes
