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
    enabled_features=("community", "education", "trust", "archive", "transparency"),
    required_runtime_env=("DATABASE_URL", "CONTROL_PLANE_HOSTS", "CONTROL_PLANE_SHARED_SECRET"),
    manifest_defaults={
        "site_key": "mudyin-public",
        "site_name": "Mudyin",
        "tagline": "Community programs, public records, and cultural participation pathways.",
        "canonical_domains": ["www.mudyin.com", "mudyin.com"],
        "deployment_aliases": ["mudyin-live.vercel.app", "mudyin.vercel.app"],
        "preview_host": "mudyin-live.vercel.app",
        "theme_tokens": {
            "primary_color": "#0f4a43",
            "secondary_color": "#1e6f63",
            "accent_color": "#d4a24d",
        },
        "nav_items": [
            {"label": "About", "href": "/about"},
            {"label": "Community", "href": "/community", "module": "community"},
            {"label": "Education", "href": "/education", "module": "education"},
            {"label": "Trust", "href": "/trust", "module": "trust"},
            {"label": "Transparency", "href": "/transparency", "module": "transparency"},
        ],
        "footer_links": [
            {"label": "About", "href": "/about"},
            {"label": "Contact", "href": "/contact"},
            {"label": "Privacy", "href": "/privacy"},
            {"label": "Terms", "href": "/terms"},
            {"label": "Code of Conduct", "href": "/code-of-conduct"},
            {"label": "Transparency", "href": "/transparency"},
        ],
        "enabled_public_modules": [
            "community",
            "education",
            "trust",
            "archive",
            "transparency",
        ],
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
            "email": "hello@mudyin.com",
            "public_contact_url": "/contact",
            "location_label": "Sydney, NSW",
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
