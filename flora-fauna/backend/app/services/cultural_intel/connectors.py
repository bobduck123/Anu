from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import timedelta
from typing import Any

from ...time_utils import now_utc


class BaseConnector(ABC):
    connector_type: str = "base"

    @abstractmethod
    def pull(self, config: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def normalize(self, raw_signal: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError


class MockSignalConnector(BaseConnector):
    connector_type = "mock_signals"

    def pull(self, config: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        now = now_utc()
        region = (config or {}).get("region", "AU-NSW-SYDNEY")
        return [
            {
                "id": f"mock-{int(now.timestamp())}-1",
                "title": "Community garden water stress",
                "summary": "Low rainfall has triggered irrigation pressure alerts.",
                "event_type": "environment.alert",
                "occurred_at": (now - timedelta(hours=2)).isoformat(),
                "region": region,
                "lat": -33.8688,
                "lng": 151.2093,
                "entity_refs": [{"name": "Sydney Community Garden", "entity_type": "place"}],
                "importance_hint": 0.68,
            },
            {
                "id": f"mock-{int(now.timestamp())}-2",
                "title": "Food co-op demand spike",
                "summary": "Demand increased 17% near neighborhood pantry hubs.",
                "event_type": "community.demand",
                "occurred_at": (now - timedelta(hours=1)).isoformat(),
                "region": region,
                "lat": -33.8700,
                "lng": 151.2067,
                "entity_refs": [
                    {"name": "Pantry Hub A", "entity_type": "facility"},
                    {"name": "Food Co-op", "entity_type": "organization"},
                ],
                "importance_hint": 0.74,
            },
        ]

    def normalize(self, raw_signal: dict[str, Any]) -> dict[str, Any]:
        return {
            "external_id": str(raw_signal.get("id") or ""),
            "event_type": raw_signal.get("event_type") or "unknown",
            "title": raw_signal.get("title") or "Untitled signal",
            "summary": raw_signal.get("summary"),
            "occurred_at": raw_signal.get("occurred_at"),
            "region": raw_signal.get("region"),
            "latitude": raw_signal.get("lat"),
            "longitude": raw_signal.get("lng"),
            "entity_refs": raw_signal.get("entity_refs") or [],
            "importance_hint": raw_signal.get("importance_hint"),
            "raw": raw_signal,
        }


class CisaAdvisoryConnectorStub(BaseConnector):
    """
    Real-connector stub for alpha: shape mirrors an external feed connector.
    Replace pull() with live fetch in production connector workers.
    """

    connector_type = "cisa_advisory_stub"

    def pull(self, config: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        now = now_utc()
        return [
            {
                "id": f"cisa-stub-{int(now.timestamp())}",
                "headline": "Critical infrastructure advisory (stub)",
                "description": "Connector stub event. Replace with live advisory pull worker.",
                "kind": "security.advisory",
                "published_at": now.isoformat(),
                "geo": {"region": "GLOBAL"},
                "references": [{"name": "Critical Infrastructure", "entity_type": "sector"}],
                "source_url": (config or {}).get("source_url", "https://example.invalid/advisory"),
                "priority": 0.7,
            }
        ]

    def normalize(self, raw_signal: dict[str, Any]) -> dict[str, Any]:
        geo = raw_signal.get("geo") or {}
        return {
            "external_id": str(raw_signal.get("id") or ""),
            "event_type": raw_signal.get("kind") or "security.advisory",
            "title": raw_signal.get("headline") or "Advisory",
            "summary": raw_signal.get("description"),
            "occurred_at": raw_signal.get("published_at"),
            "region": geo.get("region"),
            "latitude": None,
            "longitude": None,
            "entity_refs": raw_signal.get("references") or [],
            "importance_hint": raw_signal.get("priority"),
            "raw": raw_signal,
        }


CONNECTOR_REGISTRY: dict[str, BaseConnector] = {
    MockSignalConnector.connector_type: MockSignalConnector(),
    CisaAdvisoryConnectorStub.connector_type: CisaAdvisoryConnectorStub(),
}


def get_connector_impl(connector_type: str) -> BaseConnector | None:
    return CONNECTOR_REGISTRY.get(connector_type)
