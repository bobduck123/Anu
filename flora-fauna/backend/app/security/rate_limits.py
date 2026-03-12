"""
Flora Fauna Civic Commons - Rate Limiting Configuration

Security-focused rate limits for all endpoints.
Uses Flask-Limiter with Redis backend for production.
"""

from functools import wraps
from flask import request, jsonify
from ..extensions import limiter


# =============================================================================
# Rate Limit Definitions
# =============================================================================

# Authentication endpoints - strict limits to prevent brute force
AUTH_LOGIN_LIMIT = "5 per minute"      # SEC-2026-010: 5/min for login
AUTH_REGISTER_LIMIT = "3 per minute"   # SEC-2026-010: 3/min for registration
AUTH_RESET_LIMIT = "3 per hour"        # Password reset attempts

# API endpoints - moderate limits
API_READ_LIMIT = "100 per minute"      # General API reads
API_WRITE_LIMIT = "30 per minute"      # General API writes

# Relief system - higher limits due to sensitive nature
RELIEF_REQUEST_LIMIT = "10 per hour"   # SEC-2026-010: 10/hour for relief requests
RELIEF_VOTE_LIMIT = "20 per hour"      # Voting on relief requests

# Run/WCLE system
RUN_CREATE_LIMIT = "10 per hour"       # SEC-2026-010: 10/hour for run creation
PACK_CREATE_LIMIT = "20 per hour"      # Creating packs

# File uploads
UPLOAD_LIMIT = "10 per minute"         # File uploads

# Admin endpoints
ADMIN_READ_LIMIT = "60 per minute"     # Admin panel reads
ADMIN_WRITE_LIMIT = "10 per minute"    # Admin writes (destructive)

# Public endpoints - generous limits
PUBLIC_READ_LIMIT = "200 per minute"   # Public transparency data

# Search endpoints
SEARCH_LIMIT = "30 per minute"         # Search queries


# =============================================================================
# Rate Limit Decorators
# =============================================================================

def rate_limit_auth_login(f):
    """Rate limit for login endpoint."""
    return limiter.limit(AUTH_LOGIN_LIMIT)(f)


def rate_limit_auth_register(f):
    """Rate limit for registration endpoint."""
    return limiter.limit(AUTH_REGISTER_LIMIT)(f)


def rate_limit_auth_reset(f):
    """Rate limit for password reset."""
    return limiter.limit(AUTH_RESET_LIMIT)(f)


def rate_limit_api_read(f):
    """Rate limit for general API reads."""
    return limiter.limit(API_READ_LIMIT)(f)


def rate_limit_api_write(f):
    """Rate limit for general API writes."""
    return limiter.limit(API_WRITE_LIMIT)(f)


def rate_limit_relief_request(f):
    """Rate limit for relief requests."""
    return limiter.limit(RELIEF_REQUEST_LIMIT)(f)


def rate_limit_relief_vote(f):
    """Rate limit for relief voting."""
    return limiter.limit(RELIEF_VOTE_LIMIT)(f)


def rate_limit_run_create(f):
    """Rate limit for run creation."""
    return limiter.limit(RUN_CREATE_LIMIT)(f)


def rate_limit_upload(f):
    """Rate limit for file uploads."""
    return limiter.limit(UPLOAD_LIMIT)(f)


def rate_limit_admin_write(f):
    """Rate limit for admin write operations."""
    return limiter.limit(ADMIN_WRITE_LIMIT)(f)


def rate_limit_public(f):
    """Rate limit for public endpoints."""
    return limiter.limit(PUBLIC_READ_LIMIT)(f)


def rate_limit_search(f):
    """Rate limit for search endpoints."""
    return limiter.limit(SEARCH_LIMIT)(f)


# =============================================================================
# Dynamic Rate Limits by User Role
# =============================================================================

def get_user_tier_limit(default_limit: str, premium_limit: str = None):
    """
    Get rate limit based on user role.
    
    Args:
        default_limit: Default rate limit string
        premium_limit: Premium tier limit (optional)
    
    Returns:
        Rate limit string or callable
    """
    def limit_func():
        from flask_jwt_extended import get_jwt_identity
        identity = get_jwt_identity()
        
        # Check for admin/premium users
        if isinstance(identity, dict):
            role = identity.get('role', '')
            if role in ('admin', 'node_admin', 'board_member'):
                return premium_limit or default_limit
        
        return default_limit
    
    return limit_func


# =============================================================================
# Rate Limit Error Handler
# =============================================================================

def register_rate_limit_handlers(app):
    """Register rate limit error handlers with the app."""
    
    @app.errorhandler(429)
    def rate_limit_handler(e):
        """Handle rate limit exceeded (429)."""
        return jsonify({
            "ok": False,
            "error": {
                "code": "RateLimitExceeded",
                "message": "Rate limit exceeded. Please slow down your requests.",
                "retry_after": e.description if hasattr(e, 'description') else None,
            }
        }), 429
    
    # Custom rate limit response
    @limiter.request_filter
    def exempt_localhost():
        """Exempt health checks from rate limiting."""
        return request.path == '/health' or request.path.startswith('/health/')


# =============================================================================
# Rate Limit Testing Utilities
# =============================================================================

def get_rate_limit_headers(response) -> dict:
    """
    Extract rate limit headers from response.
    
    Returns:
        Dict with limit, remaining, reset information
    """
    headers = {}
    
    # Standard rate limit headers
    if 'X-RateLimit-Limit' in response.headers:
        headers['limit'] = response.headers['X-RateLimit-Limit']
    if 'X-RateLimit-Remaining' in response.headers:
        headers['remaining'] = response.headers['X-RateLimit-Remaining']
    if 'X-RateLimit-Reset' in response.headers:
        headers['reset'] = response.headers['X-RateLimit-Reset']
    
    return headers


class RateLimitTestClient:
    """Test client helper for rate limit testing."""
    
    def __init__(self, client):
        self.client = client
        self.requests_made = 0
    
    def hit_endpoint(self, method: str, url: str, count: int = 1, **kwargs):
        """Hit an endpoint multiple times."""
        responses = []
        for _ in range(count):
            response = self.client.open(method=method, path=url, **kwargs)
            responses.append(response)
            self.requests_made += 1
        return responses
    
    def find_rate_limit_triggered(self, responses) -> bool:
        """Check if any response hit rate limit."""
        return any(r.status_code == 429 for r in responses)
