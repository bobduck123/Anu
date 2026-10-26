"""G2 owner link editing on a never-published private Presence draft."""

import os
from datetime import timedelta

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-g2-draft-links-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-g2-draft-links-1234"

from flask_jwt_extended import create_access_token  # noqa: E402

from backend_factory import load_create_app  # noqa: E402


def _app():
    return load_create_app()(
        {
            "TESTING": True,
            "FLASK_ENV": "production",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
            "RATELIMIT_ENABLED": False,
        }
    )


def _seed_users(app):
    from manara_backend_app.extensions import db
    from manara_backend_app.models import Node, User

    with app.app_context():
        tenant_a = Node(name="G2 Tenant A", slug="g2-tenant-a", status="active")
        tenant_b = Node(name="G2 Tenant B", slug="g2-tenant-b", status="active")
        db.session.add_all([tenant_a, tenant_b])
        db.session.flush()
        db.session.add_all(
            [
                User(
                    username="g2-owner-a",
                    pseudonym="G2 Owner A",
                    email="g2-owner-a@example.test",
                    password="hash",
                    role="participant",
                    node_id=tenant_a.id,
                ),
                User(
                    username="g2-owner-b",
                    pseudonym="G2 Owner B",
                    email="g2-owner-b@example.test",
                    password="hash",
                    role="participant",
                    node_id=tenant_b.id,
                ),
            ]
        )
        db.session.commit()


def _headers(app, username):
    with app.app_context():
        token = create_access_token(
            identity=username,
            additional_claims={
                "aud": "public",
                "token_use": "public",
                "requires_mfa": False,
                "role": "participant",
                "username": username,
            },
            expires_delta=timedelta(minutes=30),
        )
    return {"Authorization": f"Bearer {token}"}


def _put(client, url, payload, headers):
    current = client.get(url, headers=headers)
    revision = current.get_json()["meta"]["revision"]
    return client.put(url, json=payload, headers={**headers, "If-Match": revision})


def test_owner_patch_cannot_publish_and_reset_history():
    app = _app()
    _seed_users(app)
    client = app.test_client()
    headers = _headers(app, "g2-owner-a")
    started = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Bypass Probe", "desired_slug": "bypass-probe"},
        headers=headers,
    )
    assert started.status_code == 201, started.get_json()
    node_id = started.get_json()["data"]["id"]
    endpoint = f"/api/presence/owner/nodes/{node_id}"
    published = client.patch(endpoint, json={"public_status": "public"}, headers=headers)
    assert published.status_code == 400, published.get_json()
    assert client.get("/api/presence/public/bypass-probe").status_code == 404
    node = client.get(endpoint, headers=headers).get_json()["data"]
    assert node["published_at"] is None


def test_revision_identity_validation_and_publication_boundary():
    app = _app()
    _seed_users(app)
    client = app.test_client()
    headers = _headers(app, "g2-owner-a")
    started = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "Revision Probe", "desired_slug": "revision-probe"}, headers=headers,
    )
    node_id = started.get_json()["data"]["id"]
    url = f"/api/presence/owner/nodes/{node_id}/links"
    first = client.get(url, headers=headers).get_json()
    revision = first["meta"]["revision"]
    assert first["meta"]["editable"] is True
    assert client.put(url, json={"links": []}, headers=headers).status_code == 428

    saved = client.put(url, json={"links": [
        {"label": "One", "url": "https://example.org/one"},
        {"label": "Two", "url": "https://example.org/two"},
    ]}, headers={**headers, "If-Match": revision})
    assert saved.status_code == 200, saved.get_json()
    old_ids = [row["id"] for row in saved.get_json()["data"]]
    new_revision = saved.get_json()["meta"]["revision"]
    assert new_revision != revision
    stale = client.put(url, json={"links": []}, headers={**headers, "If-Match": revision})
    assert stale.status_code == 409
    assert stale.get_json()["error"]["code"] == "stale_draft"
    assert stale.get_json()["error"]["details"]["current_revision"] == new_revision

    # An existing ID names a retained link, even when reordered and edited.
    changed = _put(client, url, {"links": [
        {"id": old_ids[1], "label": "Two renamed", "url": "https://example.org/two"},
        {"label": "Three", "url": "https://example.org/three"},
    ]}, headers)
    assert changed.status_code == 200, changed.get_json()
    changed_rows = changed.get_json()["data"]
    assert changed_rows[0]["id"] == old_ids[1]
    assert changed_rows[1]["id"] not in old_ids
    assert changed_rows[1]["id"] > max(old_ids)
    before = changed_rows
    cases = [
        ({"id": old_ids[0], "label": "Bad", "url": "https://example.org"}, "id", "invalid_id"),
        ({"label": "Bad", "url": "http://localhost/x"}, "url", "unsafe_url"),
        ({"label": "L" * 121, "url": "https://example.org"}, "label", "too_long"),
        ({"label": "Bad", "url": "https://example.org/" + "x" * 700}, "url", "too_long"),
    ]
    for item, field, reason in cases:
        rejected = _put(client, url, {"links": [item]}, headers)
        assert rejected.status_code == 400, rejected.get_json()
        assert rejected.get_json()["error"]["details"]["field_errors"] == [
            {"index": 0, "field": field, "reason": reason, **({"max": 120 if field == "label" else 700} if reason == "too_long" else {})}
        ]
        assert client.get(url, headers=headers).get_json()["data"] == before

    cleared = _put(client, url, {"links": []}, headers)
    assert cleared.status_code == 200
    replacement = _put(client, url, {"links": [
        {"label": "Fresh", "url": "https://example.org/fresh"}
    ]}, headers)
    assert replacement.get_json()["data"][0]["id"] > max(row["id"] for row in before)
    restored = _put(client, url, {"links": [
        {"label": "Two renamed", "url": "https://example.org/two"},
        {"label": "Three", "url": "https://example.org/three"},
    ]}, headers)
    assert restored.status_code == 200

    published = client.post(f"/api/presence/owner/nodes/{node_id}/publish", headers=headers)
    assert published.status_code == 200
    assert published.get_json()["data"]["published_at"] is not None
    locked = client.put(url, json={"links": []}, headers={**headers, "If-Match": restored.get_json()["meta"]["revision"]})
    assert locked.status_code == 409
    assert locked.get_json()["error"]["code"] == "draft_only"
    assert client.get(url, headers=headers).get_json()["meta"]["lock_reason"] == "previously_published"
    assert [row["label"] for row in client.get("/api/presence/public/revision-probe").get_json()["data"]["links"]] == ["Two renamed", "Three"]


def test_owner_can_shape_private_links_then_publish_once():
    app = _app()
    _seed_users(app)
    client = app.test_client()
    owner_headers = _headers(app, "g2-owner-a")
    other_headers = _headers(app, "g2-owner-b")

    started = client.post(
        "/api/presence/owner/beta/start",
        json={"display_name": "G2 Link Pilot", "desired_slug": "g2-link-pilot", "presence_type": "artist"},
        headers=owner_headers,
        base_url="http://public.test",
    )
    assert started.status_code == 201, started.get_json()
    node_id = started.get_json()["data"]["id"]
    link_url = f"/api/presence/owner/nodes/{node_id}/links"
    public_url = "/api/presence/public/g2-link-pilot"
    original_links = [
        {"label": "Shop", "url": "https://example.org/shop", "link_type": "shop"},
        {"label": "Private preview", "url": "https://example.org/preview", "is_visible": False},
    ]

    saved = _put(client, link_url, {"links": original_links}, owner_headers)
    assert saved.status_code == 200, saved.get_json()
    assert [(item["label"], item["sort_order"], item["is_visible"]) for item in saved.get_json()["data"]] == [
        ("Shop", 0, True),
        ("Private preview", 1, False),
    ]
    assert client.get(public_url).status_code == 404
    owner_links = client.get(link_url, headers=owner_headers)
    assert owner_links.status_code == 200
    assert [item["label"] for item in owner_links.get_json()["data"]] == ["Shop", "Private preview"]

    # A malformed replacement must leave every previously saved row intact.
    invalid_payloads = [
        {"links": [{"label": "Unsafe", "url": "javascript:alert(1)"}]},
        {"links": [{"label": "Unsafe", "url": "data:text/html,hello"}]},
        {"links": [original_links[0], {"label": "No URL"}]},
        {"links": [original_links[0], {"label": "Bad flag", "url": "https://example.org", "is_visible": "false"}]},
        {"links": [original_links[0], {"label": "Foreign ID", "url": "https://example.org", "node_id": 999}]},
        {"links": "not an array"},
        {"links": [original_links[0]] * 51},
        {"links": original_links, "owner_user_id": 999},
    ]
    for payload in invalid_payloads:
        rejected = _put(client, link_url, payload, owner_headers)
        assert rejected.status_code == 400, rejected.get_json()
        links = client.get(link_url, headers=owner_headers).get_json()["data"]
        assert [item["url"] for item in links] == ["https://example.org/shop", "https://example.org/preview"]

    assert client.get(link_url).status_code == 401
    assert client.get(link_url, headers=other_headers).status_code == 403
    assert client.put(link_url, json={"links": []}).status_code == 401
    assert client.put(link_url, json={"links": []}, headers=other_headers).status_code == 403

    sanitized = _put(
        client,
        link_url,
        {"links": [{"label": "<img src=x onerror=alert(1)>Shop", "url": "https://example.org/shop"}]},
        owner_headers,
    )
    assert sanitized.status_code == 200
    assert sanitized.get_json()["data"][0]["label"] == "Shop"

    cleared = _put(client, link_url, {"links": []}, owner_headers)
    assert cleared.status_code == 200 and cleared.get_json()["data"] == []
    assert client.get(link_url, headers=owner_headers).get_json()["data"] == []
    restored = _put(client, link_url, {"links": original_links}, owner_headers)
    assert restored.status_code == 200

    published = client.post(f"/api/presence/owner/nodes/{node_id}/publish", headers=owner_headers)
    assert published.status_code == 200, published.get_json()
    public = client.get(public_url)
    assert public.status_code == 200, public.get_json()
    assert [item["label"] for item in public.get_json()["data"]["links"]] == ["Shop"]
    assert client.put(link_url, json={"links": []}, headers=owner_headers).status_code == 409
    assert [item["label"] for item in client.get(public_url).get_json()["data"]["links"]] == ["Shop"]

    unpublished = client.post(f"/api/presence/owner/nodes/{node_id}/unpublish", headers=owner_headers)
    assert unpublished.status_code == 200
    assert client.get(public_url).status_code == 404
    assert client.put(link_url, json={"links": []}, headers=owner_headers).status_code == 409
