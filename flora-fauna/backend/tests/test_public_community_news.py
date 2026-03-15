import os
from types import SimpleNamespace
from unittest.mock import patch

os.environ["FLASK_ENV"] = "testing"
os.environ["SECRET_KEY"] = "test-secret-key-for-community-news-route-1234"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-for-community-news-route-1234"

from backend_factory import load_create_app  # noqa: E402


SAMPLE_RSS = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Trusted Feed</title>
    <item>
      <title>Community climate briefing</title>
      <link>https://example.com/news/climate</link>
      <description><![CDATA[<p>Trusted source summary for community readers.</p>]]></description>
      <pubDate>Sun, 15 Mar 2026 09:00:00 GMT</pubDate>
      <guid>climate-1</guid>
    </item>
    <item>
      <title>Food resilience update</title>
      <link>https://example.com/news/food</link>
      <description>Public-interest agriculture coverage.</description>
      <pubDate>Sun, 15 Mar 2026 08:00:00 GMT</pubDate>
      <guid>food-1</guid>
    </item>
  </channel>
</rss>
"""


def _mock_response():
    return SimpleNamespace(
        content=SAMPLE_RSS,
        raise_for_status=lambda: None,
    )


def test_public_community_news_returns_normalized_items():
    create_app = load_create_app()
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "AUTO_CREATE_ALL": True,
        }
    )
    client = app.test_client()

    with patch("manara_backend_app.api.public.requests.get", return_value=_mock_response()):
        response = client.get("/public/community-news?limit=2")

    assert response.status_code == 200
    payload = response.get_json()["data"]
    assert payload["stale"] is False
    assert len(payload["items"]) == 2
    assert payload["items"][0]["title"] == "Community climate briefing"
    assert payload["items"][0]["source_name"] in {"BBC News", "The Guardian"}
    assert payload["items"][0]["summary"] == "Trusted source summary for community readers."
