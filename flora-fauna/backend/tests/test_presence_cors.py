"""CORS coverage for the Presence routes called by the deployed Presence
frontend at https://presence-gilt.vercel.app.

These tests guarantee:

1. OPTIONS preflight from an approved origin succeeds, with the right headers,
   even on owner-protected routes (Flask-CORS handles preflight before auth
   decorators run).
2. Actual protected requests still require auth — CORS does NOT bypass auth.
3. CORS headers are still attached to public/owner responses regardless of
   auth state, so the browser's diagnosis story remains "401 means auth is
   missing", not "CORS is misconfigured".
4. Disallowed origins do not receive Access-Control-Allow-Origin.

These guard the live failure mode where presence-gilt.vercel.app called
/api/presence/owner/nodes and got "No 'Access-Control-Allow-Origin' header is
present on the requested resource."
"""

import os

# Reuse the existing test bootstrap pattern.
os.environ.setdefault("FLASK_ENV", "testing")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-presence-cors-1234")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-for-presence-cors-1234")

from backend_factory import load_create_app  # noqa: E402


PRESENCE_ORIGIN = "https://presence-gilt.vercel.app"
YOUR_PRESENCE_ORIGIN = "https://your-presence.vercel.app"
DISALLOWED_ORIGIN = "https://attacker.example"


def _build_app(origins: list[str]):
    create_app = load_create_app()
    return create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "CORS_ORIGINS": origins,
        }
    )


# ---------------------------------------------------------------------------
# 1. OPTIONS preflight on a protected owner route — flask-cors must respond
#    before the alpha_jwt_required decorator runs.
# ---------------------------------------------------------------------------


def test_options_preflight_on_owner_nodes_from_presence_frontend_succeeds():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.options(
        "/api/presence/owner/nodes",
        headers={
            "Origin": PRESENCE_ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code in (200, 204), (
        f"preflight should succeed without auth, got {response.status_code} "
        f"with body {response.get_data(as_text=True)[:200]}"
    )
    allowed_origin = response.headers.get("Access-Control-Allow-Origin")
    assert allowed_origin == PRESENCE_ORIGIN, (
        f"expected ACAO={PRESENCE_ORIGIN}, got {allowed_origin}"
    )
    allow_headers = (response.headers.get("Access-Control-Allow-Headers") or "").lower()
    assert "authorization" in allow_headers, (
        f"Authorization must be allowed in CORS headers, got: {allow_headers}"
    )
    allow_methods = (response.headers.get("Access-Control-Allow-Methods") or "").upper()
    # GET is the actual request method we'll be making.
    assert "GET" in allow_methods, f"GET must be allowed: {allow_methods}"


def test_options_preflight_on_owner_media_upload_from_presence_frontend_succeeds():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.options(
        "/api/presence/owner/nodes/1/media",
        headers={
            "Origin": PRESENCE_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code in (200, 204), (
        f"media preflight should succeed without auth, got {response.status_code} "
        f"with body {response.get_data(as_text=True)[:200]}"
    )
    assert response.headers.get("Access-Control-Allow-Origin") == PRESENCE_ORIGIN
    allow_headers = (response.headers.get("Access-Control-Allow-Headers") or "").lower()
    assert "authorization" in allow_headers
    assert "content-type" in allow_headers
    allow_methods = (response.headers.get("Access-Control-Allow-Methods") or "").upper()
    assert "POST" in allow_methods, f"POST must be allowed for media upload: {allow_methods}"
    assert "OPTIONS" in allow_methods, f"OPTIONS must be allowed for media upload: {allow_methods}"


def test_options_preflight_on_editor_draft_image_upload_succeeds():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.options(
        "/api/presence/owner/rooms/1/assets/upload",
        headers={
            "Origin": PRESENCE_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code in (200, 204)
    assert response.headers.get("Access-Control-Allow-Origin") == PRESENCE_ORIGIN
    allow_headers = (response.headers.get("Access-Control-Allow-Headers") or "").lower()
    assert "authorization" in allow_headers
    assert "content-type" in allow_headers
    assert "POST" in (response.headers.get("Access-Control-Allow-Methods") or "").upper()


def test_options_preflight_on_beta_start_from_current_presence_frontend_succeeds():
    # Production previously allowed presence-gilt but the live frontend moved
    # to your-presence. The repo-owned alias must be granted even when the
    # explicit env allowlist still contains only the older Presence origin.
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.options(
        "/api/presence/owner/beta/start",
        headers={
            "Origin": YOUR_PRESENCE_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code in (200, 204), (
        f"beta/start preflight should succeed without auth, got {response.status_code}"
    )
    assert response.headers.get("Access-Control-Allow-Origin") == YOUR_PRESENCE_ORIGIN
    allow_headers = (response.headers.get("Access-Control-Allow-Headers") or "").lower()
    assert "authorization" in allow_headers
    assert "content-type" in allow_headers
    allow_methods = (response.headers.get("Access-Control-Allow-Methods") or "").upper()
    assert "POST" in allow_methods


def test_options_preflight_on_public_setup_request_from_current_presence_frontend_succeeds():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.options(
        "/api/presence/setup-requests",
        headers={
            "Origin": YOUR_PRESENCE_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code in (200, 204)
    assert response.headers.get("Access-Control-Allow-Origin") == YOUR_PRESENCE_ORIGIN
    allow_headers = (response.headers.get("Access-Control-Allow-Headers") or "").lower()
    assert "content-type" in allow_headers
    allow_methods = (response.headers.get("Access-Control-Allow-Methods") or "").upper()
    assert "POST" in allow_methods


# ---------------------------------------------------------------------------
# 2. Actual protected request without auth — must return 401, must include
#    CORS header so the browser surfaces a normal 401 (not a CORS error).
# ---------------------------------------------------------------------------


def test_get_owner_nodes_without_auth_returns_401_with_cors_header():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.get(
        "/api/presence/owner/nodes",
        headers={"Origin": PRESENCE_ORIGIN},
    )

    # Must NOT be 200 — that would mean auth was bypassed.
    assert response.status_code == 401, (
        f"protected route without auth should return 401, got {response.status_code}"
    )
    # CORS header must STILL be attached so the browser shows the 401 instead
    # of a CORS error.
    assert response.headers.get("Access-Control-Allow-Origin") == PRESENCE_ORIGIN


def test_post_owner_media_without_auth_returns_401_with_cors_header_not_404():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.post(
        "/api/presence/owner/nodes/1/media",
        data={"target_type": "profile_image"},
        headers={"Origin": PRESENCE_ORIGIN},
        content_type="multipart/form-data",
    )

    assert response.status_code == 401, (
        f"protected media route without auth should return 401, got {response.status_code}"
    )
    assert response.status_code != 404
    assert response.headers.get("Access-Control-Allow-Origin") == PRESENCE_ORIGIN


def test_post_editor_draft_image_upload_without_auth_returns_401_with_cors_header():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.post(
        "/api/presence/owner/rooms/1/assets/upload",
        headers={"Origin": PRESENCE_ORIGIN},
        content_type="multipart/form-data",
    )

    assert response.status_code == 401
    assert response.headers.get("Access-Control-Allow-Origin") == PRESENCE_ORIGIN


# ---------------------------------------------------------------------------
# 3. Public list endpoint from the Presence frontend — 200 with CORS header.
# ---------------------------------------------------------------------------


def test_get_owner_nodes_invalid_token_returns_401_with_cors_header_not_500():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.get(
        "/api/presence/owner/nodes",
        headers={
            "Origin": PRESENCE_ORIGIN,
            "Authorization": "Bearer not-a-valid-jwt",
        },
    )

    assert response.status_code == 401
    assert response.status_code != 500
    assert response.headers.get("Access-Control-Allow-Origin") == PRESENCE_ORIGIN


def test_post_owner_media_invalid_token_returns_401_with_cors_header_not_500():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.post(
        "/api/presence/owner/nodes/1/media",
        data={"target_type": "profile_image"},
        headers={
            "Origin": PRESENCE_ORIGIN,
            "Authorization": "Bearer not-a-valid-jwt",
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 401
    assert response.status_code != 500
    assert response.headers.get("Access-Control-Allow-Origin") == PRESENCE_ORIGIN


def test_get_public_nodes_from_presence_frontend_succeeds_with_cors_header():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.get(
        "/api/presence/public/nodes",
        headers={"Origin": PRESENCE_ORIGIN},
    )
    assert response.status_code == 200, response.get_data(as_text=True)[:200]
    assert response.headers.get("Access-Control-Allow-Origin") == PRESENCE_ORIGIN


# ---------------------------------------------------------------------------
# 4. Disallowed origin does NOT receive Access-Control-Allow-Origin.
# ---------------------------------------------------------------------------


def test_disallowed_origin_does_not_receive_cors_grant_on_owner_preflight():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.options(
        "/api/presence/owner/nodes",
        headers={
            "Origin": DISALLOWED_ORIGIN,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    # Preflight may still 200 but must NOT reflect the attacker origin.
    assert response.headers.get("Access-Control-Allow-Origin") != DISALLOWED_ORIGIN
    assert response.headers.get("Access-Control-Allow-Origin") in (None, "")


# ---------------------------------------------------------------------------
# 5. Existing approved origins still work alongside the new Presence origin.
# ---------------------------------------------------------------------------


def test_multiple_approved_origins_each_receive_their_own_cors_grant():
    other_origin = "https://mudyin.com"
    app = _build_app([PRESENCE_ORIGIN, other_origin])
    client = app.test_client()

    for origin in (PRESENCE_ORIGIN, other_origin):
        response = client.options(
            "/api/presence/public/nodes",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code in (200, 204)
        assert response.headers.get("Access-Control-Allow-Origin") == origin


# ---------------------------------------------------------------------------
# 6. Auth is not bypassed on the actual GET — even with the correct origin,
#    no token still returns a non-200.
# ---------------------------------------------------------------------------


def test_owner_routes_require_real_auth_even_with_correct_origin():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    # POST /api/presence/owner/beta/start without auth must be denied.
    response = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Cors Bypass Attempt", "presence_type": "artist"},
        headers={"Origin": PRESENCE_ORIGIN},
    )
    assert response.status_code == 401
    assert response.status_code != 201, "beta/start must NOT succeed without auth"
    body = response.get_json()
    assert body["ok"] is False
    assert body["error"]["code"] == "auth_required"
    # CORS header still present.
    assert response.headers.get("Access-Control-Allow-Origin") == PRESENCE_ORIGIN


def test_beta_start_requires_auth_but_returns_cors_for_current_presence_origin():
    app = _build_app([PRESENCE_ORIGIN])
    client = app.test_client()

    response = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Cors Auth Diagnosis", "presence_type": "artist"},
        headers={"Origin": YOUR_PRESENCE_ORIGIN},
    )

    assert response.status_code == 401
    assert response.status_code != 201
    body = response.get_json()
    assert body["ok"] is False
    assert body["error"]["code"] == "auth_required"
    assert response.headers.get("Access-Control-Allow-Origin") == YOUR_PRESENCE_ORIGIN
