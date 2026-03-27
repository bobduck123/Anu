import os
from pathlib import Path
from unittest.mock import MagicMock, patch

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
    with patch("manara_backend_app.health._database_engine") as database_engine:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
    assert response.get_json()["database_checked"] is False
    assert response.get_json()["readiness"] == "/readiness"
    database_engine.assert_not_called()


def test_healthz_is_minimal_liveness_probe():
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_readiness_reports_database_success():
    connection = MagicMock()
    connect_context = MagicMock()
    connect_context.__enter__.return_value = connection

    engine = MagicMock()
    engine.connect.return_value = connect_context

    with patch("manara_backend_app.health._database_engine", return_value=engine) as database_engine:
        response = client.get("/readiness")

    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
    assert response.get_json()["db"] is True
    assert response.get_json()["warnings"] == []
    database_engine.assert_called_once()
    engine.connect.assert_called_once()
    connection.execute.assert_called_once()


def test_readiness_reports_database_failure():
    engine = MagicMock()
    engine.connect.side_effect = RuntimeError("db unavailable")

    with patch("manara_backend_app.health._database_engine", return_value=engine) as database_engine:
        response = client.get("/readiness")

    assert response.status_code == 503
    assert response.get_json()["status"] == "degraded"
    assert response.get_json()["db"] is False
    database_engine.assert_called_once()
    engine.connect.assert_called_once()


def test_readiness_stays_green_when_only_stripe_is_placeholder():
    stripe_placeholder_app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": False,
            "BETA_PLACEHOLDER_DATABASE": False,
            "BETA_PLACEHOLDER_STRIPE": True,
        }
    )
    stripe_placeholder_client = stripe_placeholder_app.test_client()

    connection = MagicMock()
    connect_context = MagicMock()
    connect_context.__enter__.return_value = connection

    engine = MagicMock()
    engine.connect.return_value = connect_context

    with patch("manara_backend_app.health._database_engine", return_value=engine):
        response = stripe_placeholder_client.get("/readiness")

    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
    assert response.get_json()["warnings"] == ["stripe_placeholder"]


def test_health_reports_database_target_family_for_sqlite():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["database_target"]["family"] == "sqlite"


def test_readiness_uses_engine_probe_even_if_request_session_was_stale():
    connection = MagicMock()
    connect_context = MagicMock()
    connect_context.__enter__.return_value = connection

    with patch("manara_backend_app.health.db.session.rollback", side_effect=RuntimeError("stale session")) as rollback:
        with patch("manara_backend_app.health.db.session.remove") as remove:
            engine = MagicMock()
            engine.connect.return_value = connect_context

            with patch("manara_backend_app.health._database_engine", return_value=engine) as database_engine:
                response = client.get("/readiness")

    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"
    rollback.assert_called_once()
    assert remove.call_count >= 1
    database_engine.assert_called_once()
    engine.connect.assert_called_once()
    connection.execute.assert_called_once()


def test_readiness_flags_serverless_direct_supabase_target():
    with app.app_context():
        original_uri = app.config["SQLALCHEMY_DATABASE_URI"]
        app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://postgres.example:password@db.example.supabase.co:5432/postgres"
        try:
            with patch.dict(os.environ, {"VERCEL": "1"}, clear=False):
                from manara_backend_app import health as health_module

                assert health_module._database_target()["family"] == "supabase_direct"
                assert "database_serverless_non_pooler" in health_module._readiness_warnings()
                assert "transaction pooler" in health_module._database_target_hint()
        finally:
            app.config["SQLALCHEMY_DATABASE_URI"] = original_uri


def test_domain_resolution_route_contract_is_single_prefixed():
    routes = {rule.rule for rule in app.url_map.iter_rules()}

    assert "/api/domains/resolve" in routes
    assert "/api/api/domains/resolve" not in routes


def test_backend_package_does_not_use_vercel_fragile_absolute_app_imports():
    app_dir = Path(__file__).resolve().parents[1] / "app"
    violations = []

    for path in app_dir.rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        if "from app." in text or "import app." in text:
            violations.append(path.relative_to(app_dir).as_posix())

    assert violations == []
