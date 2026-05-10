from __future__ import annotations

from dataclasses import dataclass
from typing import Any


def normalize_hostname(hostname: str | None) -> str:
    if not hostname:
        return ""

    value = str(hostname).split(",")[0].strip().lower()
    if value.startswith("http://"):
        value = value[len("http://") :]
    elif value.startswith("https://"):
        value = value[len("https://") :]
    value = value.split("/")[0].strip()
    if value.startswith("[") and "]" in value:
        return value[1 : value.index("]")]
    return value.split(":")[0].strip()


@dataclass(frozen=True)
class WhiteLabelSiteRegistryEntry:
    site_id: str
    slug: str
    canonical_name: str
    short_name: str
    allowed_domains: tuple[str, ...]
    deployment_aliases: tuple[str, ...]
    tenant_scope: str
    manifest_defaults: dict[str, Any]
    enabled_features: tuple[str, ...]
    required_runtime_env: tuple[str, ...] = ()

    @property
    def all_hosts(self) -> tuple[str, ...]:
        return self.allowed_domains + self.deployment_aliases


MUDYIN_SITE = WhiteLabelSiteRegistryEntry(
    site_id="mudyin",
    slug="mudyin",
    canonical_name="Mudyin",
    short_name="Mudyin",
    allowed_domains=("www.mudyin.com", "mudyin.com"),
    deployment_aliases=("mudyin-live.vercel.app", "mudyin.vercel.app"),
    tenant_scope="node:mudyin",
    enabled_features=("enquiries", "booking_requests", "events", "programs", "resources", "impact"),
    required_runtime_env=("DATABASE_URL", "CONTROL_PLANE_HOSTS", "CONTROL_PLANE_SHARED_SECRET"),
    manifest_defaults={
        "site_key": "mudyin-public",
        "site_name": "Mudyin",
        "tagline": "Aboriginal-led mentoring, healing, and community connection pathways.",
        "canonical_domains": ["www.mudyin.com", "mudyin.com"],
        "deployment_aliases": ["mudyin-live.vercel.app", "mudyin.vercel.app"],
        "preview_host": "mudyin-live.vercel.app",
        "theme_tokens": {
            "primary_color": "#6f8a78",
            "secondary_color": "#b87555",
            "accent_color": "#c8a75d",
        },
        "nav_items": [
            {"label": "About", "href": "/about"},
            {"label": "Programs", "href": "/programs", "module": "programs"},
            {"label": "Events", "href": "/events", "module": "events"},
            {"label": "Impact", "href": "/impact", "module": "impact"},
            {"label": "Resources", "href": "/resources", "module": "resources"},
            {"label": "Contact", "href": "/contact", "module": "enquiries"},
        ],
        "footer_links": [
            {"label": "About", "href": "/about"},
            {"label": "Contact", "href": "/contact"},
            {"label": "Privacy", "href": "/privacy"},
            {"label": "Terms", "href": "/terms"},
            {"label": "Code of Conduct", "href": "/code-of-conduct"},
        ],
        "enabled_public_modules": [
            "enquiries",
            "booking_requests",
            "events",
            "programs",
            "resources",
            "impact",
        ],
        "feature_flags": {
            "enquiries": True,
            "booking_requests": True,
            "live_bookings": False,
            "donations": False,
            "events": True,
            "practitioners": False,
        },
        "legal_links": {
            "privacy": "/privacy",
            "terms": "/terms",
            "code_of_conduct": "/code-of-conduct",
        },
        "trust_links": {
            "trust_center": "/trust",
            "transparency": "/transparency",
            "archive": "/archive",
        },
        "contact": {
            "email": "info@mudyin.com",
            "public_contact_url": "/contact",
            "location_label": "Campbelltown, NSW",
        },
    },
)


WHITE_LABEL_SITES: tuple[WhiteLabelSiteRegistryEntry, ...] = (MUDYIN_SITE,)


def get_white_label_site_by_slug(slug: str | None) -> WhiteLabelSiteRegistryEntry | None:
    normalized = (slug or "").strip().lower()
    if not normalized:
        return None
    return next((site for site in WHITE_LABEL_SITES if site.slug == normalized), None)


def find_white_label_site_by_deployment_alias(hostname: str | None) -> WhiteLabelSiteRegistryEntry | None:
    host = normalize_hostname(hostname)
    if not host:
        return None
    return next((site for site in WHITE_LABEL_SITES if host in site.deployment_aliases), None)


def find_white_label_site_by_allowed_domain(hostname: str | None) -> WhiteLabelSiteRegistryEntry | None:
    host = normalize_hostname(hostname)
    if not host:
        return None
    return next((site for site in WHITE_LABEL_SITES if host in site.allowed_domains), None)


def find_white_label_site_by_public_hint(hint: str | None) -> WhiteLabelSiteRegistryEntry | None:
    normalized = (hint or "").strip().lower()
    if not normalized:
        return None
    return next(
        (
            site
            for site in WHITE_LABEL_SITES
            if normalized in {site.site_id, site.slug, site.short_name.lower()}
        ),
        None,
    )


def list_white_label_deployment_aliases() -> list[str]:
    return sorted({host for site in WHITE_LABEL_SITES for host in site.deployment_aliases})
