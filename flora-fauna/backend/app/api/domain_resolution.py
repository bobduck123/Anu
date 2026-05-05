"""
Domain Resolution API for Multi-Tenant White-Label Support.

This module provides endpoints for:
1. Resolving custom domains to tenant/node configurations
2. Managing domain mappings for white-label sites
3. Vercel domain provisioning integration
"""

from functools import wraps
import json
import os
import requests
from flask import Blueprint, current_app, jsonify, request

from ..extensions import db
from ..models import Node, NodeDomain, NodeConfig
from ..schemas import DomainResolutionResponseSchema
from ..services.public_site_service import build_public_site_manifest_for_node, build_registry_only_public_site_manifest
from ..services.white_label_site_registry import (
    find_white_label_site_by_allowed_domain,
    find_white_label_site_by_deployment_alias,
    get_white_label_site_by_slug,
    normalize_hostname,
)
from ..security.control_plane import control_plane_required
from ..security.control_tenant_scope import resolve_effective_control_managed_node_ids
from flask_jwt_extended import get_jwt
from ..security.policy import get_current_user

domain_resolution_bp = Blueprint('domain_resolution', __name__)

DOMAIN_ADMIN_ROLES = {'admin', 'node_admin', 'platform_admin'}
DOMAIN_RESOLUTION_CONTRACT_VERSION = "2026-04-10"
domain_resolution_response_schema = DomainResolutionResponseSchema()


def _coerce_node_config_json(raw):
    if isinstance(raw, dict):
        return raw
    if raw is None:
        return {}
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except (TypeError, ValueError):
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _require_authenticated_user():
    user = get_current_user()
    if not user:
        return None, (jsonify({'error': 'Unauthorized'}), 401)
    return user, None


def _require_domain_admin(fn):
    @wraps(fn)
    @control_plane_required(scopes=["sites:domains:write"])
    def wrapper(*args, **kwargs):
        user, error_response = _require_authenticated_user()
        if error_response:
            return error_response

        if user.role not in DOMAIN_ADMIN_ROLES:
            return jsonify({'error': 'Forbidden'}), 403

        return fn(user, *args, **kwargs)

    return wrapper


def _registry_site_for_domain(domain: str):
    return find_white_label_site_by_deployment_alias(domain) or find_white_label_site_by_allowed_domain(domain)


def _registry_only_domain_response(registry_site, domain: str, *, resolution_status: str):
    manifest = build_registry_only_public_site_manifest(site=registry_site, resolved_host=domain)
    theme_tokens = manifest.get("theme_tokens") or {}
    brand_assets = manifest.get("brand_assets") or {}
    brand = {
        "primary_color": theme_tokens.get("primary_color"),
        "secondary_color": theme_tokens.get("secondary_color"),
        "accent_color": theme_tokens.get("accent_color"),
        "logo_url": brand_assets.get("logo_url"),
        "favicon_url": brand_assets.get("favicon_url"),
        "custom_css": theme_tokens.get("custom_css"),
    }
    response_data = domain_resolution_response_schema.dump({
        'contract_version': DOMAIN_RESOLUTION_CONTRACT_VERSION,
        'node_id': 0,
        'node_slug': registry_site.slug,
        'node_name': registry_site.canonical_name,
        'semantic_key': None,
        'white_label': True,
        'brand': brand,
        'site_manifest': manifest,
        'site_resolution': {
            'resolved': True,
            'resolution_status': resolution_status,
            'fallback_note': 'Registry metadata only; active tenant node bootstrap is still required for data APIs.',
            'host': domain,
        },
        'domain': domain,
        'tls_ready': domain in registry_site.deployment_aliases,
        'is_white_label': True,
        'brand_config': brand,
    })
    response = jsonify(response_data)
    response.headers['Cache-Control'] = 'public, max-age=120, stale-while-revalidate=300'
    return response


def _allowed_domain_node_ids(user) -> set[int] | None:
    claims = get_jwt() or {}
    return resolve_effective_control_managed_node_ids(user=user, claims=claims)


# -----------------------------------------------------------------------------
# Public Domain Resolution (called by middleware)
# -----------------------------------------------------------------------------

@domain_resolution_bp.route('/domains/resolve', methods=['GET'])
def resolve_domain():
    """
    Resolve a custom domain to its tenant/node configuration.
    
    This endpoint is called by the Next.js middleware for every request
    on a custom domain. It should be fast and cacheable.
    
    Query params:
        domain: The hostname to resolve (e.g., 'impact.example.com')
    
    Returns:
        - node_id: The tenant/node ID
        - node_slug: URL-friendly identifier
        - node_name: Display name
        - is_white_label: Whether this is a full white-label deployment
        - brand_config: Branding configuration (colors, logos, etc.)
    """
    domain = normalize_hostname(request.args.get('domain', ''))
    
    if not domain:
        return jsonify({'error': 'Domain parameter required'}), 400

    registry_site = _registry_site_for_domain(domain)

    try:
        # Look up domain in NodeDomain table
        node_domain = NodeDomain.query.filter(
            NodeDomain.domain == domain,
            NodeDomain.status == 'active'
        ).first()

        if not node_domain:
            # Check for wildcard subdomain patterns
            parts = domain.split('.')
            if len(parts) > 2:
                # Try parent domain (e.g., example.com from sub.example.com)
                parent_domain = '.'.join(parts[-2:])
                node_domain = NodeDomain.query.filter(
                    NodeDomain.domain == f'*.{parent_domain}',
                    NodeDomain.status == 'active'
                ).first()
    except Exception:
        current_app.logger.exception("Domain resolution storage lookup failed")
        db.session.rollback()
        if registry_site:
            return _registry_only_domain_response(
                registry_site,
                domain,
                resolution_status="resolved_registry_only_db_unavailable",
            )
        return jsonify({
            'ok': False,
            'error': {
                'code': 'service_unavailable',
                'message': 'Domain resolution temporarily unavailable',
            },
            'domain': domain,
        }), 503

    node = None
    tls_ready = False
    resolution_status = "resolved"
    if node_domain:
        node = Node.query.get(node_domain.node_id)
        tls_ready = bool(node_domain.tls_ready)
    else:
        if registry_site:
            node = (
                Node.query.filter(
                    Node.slug == registry_site.slug,
                    Node.status == 'active',
                )
                .order_by(Node.id.asc())
                .first()
            )
            tls_ready = True
            resolution_status = "resolved_deployment_alias"

    if not node_domain and not registry_site:
        return jsonify({'error': 'Domain not configured', 'domain': domain}), 404

    # Get node details
    if not node or node.status != 'active':
        if registry_site:
            return _registry_only_domain_response(
                registry_site,
                domain,
                resolution_status=(
                    "resolved_deployment_alias"
                    if domain in registry_site.deployment_aliases
                    else "resolved_registered_domain"
                ),
            )
        return jsonify({'error': 'Node not active'}), 404
    
    # Get node configuration for branding
    node_config = NodeConfig.query.filter_by(node_id=node.id).first()
    config_json = _coerce_node_config_json(node_config.config_json if node_config else {})
    
    # Extract brand configuration
    brand_config = config_json.get('branding', {}) or {}
    white_label_enabled = bool(config_json.get('white_label', {}).get('enabled', False)) or bool(
        get_white_label_site_by_slug(node.slug)
    )
    semantic_key = config_json.get('semantic_key')
    if semantic_key is not None:
        semantic_key = str(semantic_key).strip() or None

    brand = {
        'primary_color': brand_config.get('primary_color'),
        'secondary_color': brand_config.get('secondary_color'),
        'accent_color': brand_config.get('accent_color'),
        'logo_url': brand_config.get('logo_url'),
        'favicon_url': brand_config.get('favicon_url'),
        'custom_css': brand_config.get('custom_css'),
    }

    response_data = domain_resolution_response_schema.dump({
        'contract_version': DOMAIN_RESOLUTION_CONTRACT_VERSION,
        'node_id': node.id,
        'node_slug': node.slug,
        'node_name': node.name,
        'semantic_key': semantic_key,
        'white_label': white_label_enabled,
        'brand': brand,
        'site_manifest': build_public_site_manifest_for_node(
            node=node,
            config_json=config_json,
            resolved_host=domain,
        ),
        'site_resolution': {
            'resolved': True,
            'resolution_status': resolution_status,
            'fallback_note': None,
            'host': domain,
        },
        'domain': domain,
        'tls_ready': tls_ready,
        # Backward-compatible aliases
        'is_white_label': white_label_enabled,
        'brand_config': brand,
    })
    
    # Add cache headers for edge caching
    response = jsonify(response_data)
    response.headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=600'
    return response


# -----------------------------------------------------------------------------
# Domain Management (Admin)
# -----------------------------------------------------------------------------

@domain_resolution_bp.route('/domains', methods=['GET'])
@control_plane_required(scopes=["sites:domains:read"])
def list_domains():
    """List all domains for the current user's node or all nodes (admin)."""
    current_user, error_response = _require_authenticated_user()
    if error_response:
        return error_response

    allowed_node_ids = _allowed_domain_node_ids(current_user)
    if allowed_node_ids is None:
        domains = NodeDomain.query.order_by(NodeDomain.id.asc()).all()
    elif allowed_node_ids:
        domains = (
            NodeDomain.query.filter(NodeDomain.node_id.in_(sorted(allowed_node_ids)))
            .order_by(NodeDomain.id.asc())
            .all()
        )
    else:
        return jsonify({'domains': []})
    
    return jsonify({
        'domains': [
            {
                'id': d.id,
                'node_id': d.node_id,
                'domain': d.domain,
                'status': d.status,
                'tls_ready': d.tls_ready,
                'created_at': d.created_at.isoformat() if d.created_at else None,
            }
            for d in domains
        ]
    })


@domain_resolution_bp.route('/domains', methods=['POST'])
@_require_domain_admin
def add_domain(current_user):
    """
    Add a new custom domain for a node.
    
    This will:
    1. Create the domain record in the database
    2. Optionally trigger Vercel domain provisioning
    
    Body:
        - node_id: Target node ID
        - domain: The custom domain (e.g., 'impact.example.com')
        - provision_vercel: Whether to auto-provision on Vercel (default: true)
    """
    data = request.get_json() or {}
    node_id = data.get('node_id')
    domain = data.get('domain', '').lower().strip()
    provision_vercel = data.get('provision_vercel', True)
    
    if not node_id or not domain:
        return jsonify({'error': 'node_id and domain are required'}), 400

    if current_user.role == 'node_admin' and current_user.node_id != node_id:
        return jsonify({'error': 'Forbidden'}), 403
    
    # Validate node exists
    node = Node.query.get(node_id)
    if not node:
        return jsonify({'error': 'Node not found'}), 404
    
    # Check for duplicate domain
    existing = NodeDomain.query.filter_by(domain=domain).first()
    if existing:
        return jsonify({'error': 'Domain already registered'}), 409
    
    # Create domain record
    node_domain = NodeDomain(
        node_id=node_id,
        domain=domain,
        status='pending',
        tls_ready=False,
    )
    db.session.add(node_domain)
    db.session.commit()
    
    # Trigger Vercel domain provisioning if requested
    vercel_result = None
    if provision_vercel:
        vercel_result = _provision_vercel_domain(domain, node.slug)
        if vercel_result.get('success'):
            node_domain.status = 'active'
            node_domain.tls_ready = vercel_result.get('tls_ready', False)
            db.session.commit()
    
    return jsonify({
        'id': node_domain.id,
        'domain': node_domain.domain,
        'status': node_domain.status,
        'tls_ready': node_domain.tls_ready,
        'vercel_provisioning': vercel_result,
    }), 201


@domain_resolution_bp.route('/domains/<int:domain_id>', methods=['DELETE'])
@_require_domain_admin
def remove_domain(current_user, domain_id):
    """Remove a custom domain mapping."""
    node_domain = NodeDomain.query.get(domain_id)
    if not node_domain:
        return jsonify({'error': 'Domain not found'}), 404

    if current_user.role == 'node_admin' and current_user.node_id != node_domain.node_id:
        return jsonify({'error': 'Forbidden'}), 403
    
    # Optionally remove from Vercel
    _remove_vercel_domain(node_domain.domain)
    
    db.session.delete(node_domain)
    db.session.commit()
    
    return jsonify({'success': True, 'removed_domain': node_domain.domain})


@domain_resolution_bp.route('/domains/<int:domain_id>/verify', methods=['POST'])
@_require_domain_admin
def verify_domain(current_user, domain_id):
    """Verify domain DNS configuration and TLS status."""
    node_domain = NodeDomain.query.get(domain_id)
    if not node_domain:
        return jsonify({'error': 'Domain not found'}), 404

    if current_user.role == 'node_admin' and current_user.node_id != node_domain.node_id:
        return jsonify({'error': 'Forbidden'}), 403
    
    result = _verify_vercel_domain(node_domain.domain)
    
    if result.get('verified'):
        node_domain.status = 'active'
        node_domain.tls_ready = result.get('tls_ready', False)
        db.session.commit()
    
    return jsonify({
        'domain': node_domain.domain,
        'verified': result.get('verified', False),
        'tls_ready': result.get('tls_ready', False),
        'dns_records': result.get('dns_records', []),
        'errors': result.get('errors', []),
    })


# -----------------------------------------------------------------------------
# Vercel Domain API Integration
# -----------------------------------------------------------------------------

def _get_vercel_headers():
    """Get headers for Vercel API requests."""
    token = os.environ.get('VERCEL_API_TOKEN')
    if not token:
        return None
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }


def _provision_vercel_domain(domain: str, project_name: str = None) -> dict:
    """
    Provision a domain on Vercel.
    
    Args:
        domain: The custom domain to add
        project_name: Optional Vercel project name (defaults to env var)
    
    Returns:
        Dict with success status and provisioning details
    """
    headers = _get_vercel_headers()
    if not headers:
        return {'success': False, 'error': 'Vercel API token not configured'}
    
    project_id = project_name or os.environ.get('VERCEL_PROJECT_ID', 'frontend-next')
    team_id = os.environ.get('VERCEL_TEAM_ID')
    
    url = f'https://api.vercel.com/v10/projects/{project_id}/domains'
    if team_id:
        url += f'?teamId={team_id}'
    
    try:
        response = requests.post(
            url,
            headers=headers,
            json={'name': domain},
            timeout=10,
        )
        
        if response.status_code in (200, 201):
            data = response.json()
            return {
                'success': True,
                'domain': data.get('name'),
                'tls_ready': data.get('verification', []) == [],
                'verification': data.get('verification', []),
            }
        else:
            return {
                'success': False,
                'error': response.json().get('error', {}).get('message', 'Unknown error'),
                'status_code': response.status_code,
            }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def _remove_vercel_domain(domain: str) -> dict:
    """Remove a domain from Vercel."""
    headers = _get_vercel_headers()
    if not headers:
        return {'success': False, 'error': 'Vercel API token not configured'}
    
    project_id = os.environ.get('VERCEL_PROJECT_ID', 'frontend-next')
    team_id = os.environ.get('VERCEL_TEAM_ID')
    
    url = f'https://api.vercel.com/v9/projects/{project_id}/domains/{domain}'
    if team_id:
        url += f'?teamId={team_id}'
    
    try:
        response = requests.delete(url, headers=headers, timeout=10)
        return {'success': response.status_code in (200, 204)}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def _verify_vercel_domain(domain: str) -> dict:
    """Verify domain configuration on Vercel."""
    headers = _get_vercel_headers()
    if not headers:
        return {'verified': False, 'error': 'Vercel API token not configured'}
    
    project_id = os.environ.get('VERCEL_PROJECT_ID', 'frontend-next')
    team_id = os.environ.get('VERCEL_TEAM_ID')
    
    url = f'https://api.vercel.com/v9/projects/{project_id}/domains/{domain}'
    if team_id:
        url += f'?teamId={team_id}'
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return {
                'verified': data.get('verified', False),
                'tls_ready': not data.get('verification', []),
                'dns_records': _format_dns_records(data.get('verification', [])),
            }
        return {'verified': False, 'error': 'Domain not found on Vercel'}
    except Exception as e:
        return {'verified': False, 'error': str(e)}


def _format_dns_records(verification: list) -> list:
    """Format Vercel verification records for display."""
    records = []
    for v in verification:
        records.append({
            'type': v.get('type', 'CNAME'),
            'name': v.get('domain', ''),
            'value': v.get('value', ''),
            'reason': v.get('reason', ''),
        })
    return records
