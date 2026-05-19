"""
Flora Fauna Civic Commons - Hardened Application Factory
Security-First Application Initialization
"""

from flask import Flask, jsonify, g, request, make_response
from werkzeug.exceptions import HTTPException, RequestEntityTooLarge
from flask_cors import CORS
from .config import (
    get_config, ConfigError, SecurityValidationError,
    DevelopmentConfig, ProductionConfig, TestingConfig
)
from .extensions import db, migrate, scheduler, limiter
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_talisman import Talisman
from .security.encryption import EncryptionManager
from .health import health_bp
from .logging import init_logging
from .security.middleware import init_security_middleware
from .security.rate_limits import register_rate_limit_handlers
import uuid
import os
import click
import json
import time
from urllib.request import urlopen
from urllib.error import URLError, HTTPError
from flask import current_app
from werkzeug.security import generate_password_hash
from datetime import date, datetime, timedelta, time as time_obj
from sqlalchemy.exc import OperationalError, SQLAlchemyError
import re
import jwt as pyjwt

# Lazy imports for cold start optimization
# These are only imported when needed to reduce initial parse time
_sentry_sdk = None
_prometheus_metrics = None
_supabase_jwks_cache: dict[str, dict] = {}
_SUPABASE_JWKS_TTL_SECONDS = 300

def _get_sentry():
    """Lazy import Sentry SDK to reduce cold start time."""
    global _sentry_sdk
    if _sentry_sdk is None:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        _sentry_sdk = (sentry_sdk, FlaskIntegration)
    return _sentry_sdk

def _get_prometheus():
    """Lazy import Prometheus metrics to reduce cold start time."""
    global _prometheus_metrics
    if _prometheus_metrics is None:
        from prometheus_flask_exporter import PrometheusMetrics
        _prometheus_metrics = PrometheusMetrics
    return _prometheus_metrics


def _supabase_jwks_url_from_issuer(issuer: str) -> str:
    base = str(issuer or "").rstrip("/")
    return f"{base}/.well-known/jwks.json"


def _load_supabase_jwks(issuer: str, *, force_refresh: bool = False) -> dict[str, dict]:
    now = time.time()
    cached = _supabase_jwks_cache.get(issuer)
    if cached and not force_refresh and cached.get("expires_at", 0) > now:
        return cached.get("keys", {})

    url = _supabase_jwks_url_from_issuer(issuer)
    with urlopen(url, timeout=3) as response:
        payload = json.loads(response.read().decode("utf-8"))

    keys: dict[str, dict] = {}
    for item in payload.get("keys", []):
        kid = str(item.get("kid") or "").strip()
        if kid:
            keys[kid] = item

    _supabase_jwks_cache[issuer] = {
        "expires_at": now + _SUPABASE_JWKS_TTL_SECONDS,
        "keys": keys,
    }
    return keys


def _resolve_supabase_es256_public_key(issuer: str, kid: str):
    keys = _load_supabase_jwks(issuer)
    jwk = keys.get(kid)
    if not jwk:
        keys = _load_supabase_jwks(issuer, force_refresh=True)
        jwk = keys.get(kid)
    if not jwk:
        return None

    jwk_json = json.dumps(jwk)
    kty = str(jwk.get("kty") or "").upper()
    if kty == "EC":
        return pyjwt.algorithms.ECAlgorithm.from_jwk(jwk_json)
    if kty == "RSA":
        return pyjwt.algorithms.RSAAlgorithm.from_jwk(jwk_json)

    return None


mail = Mail()
encryption = EncryptionManager()
jwt = JWTManager()

# Security headers with Talisman
talisman = Talisman()


def create_app(config_overrides=None):
    """
    Application factory with security-hardened initialization.
    
    Args:
        config_overrides: Optional dict of config values to override
        
    Returns:
        Configured Flask application
        
    Raises:
        ConfigError: If configuration is invalid
        SecurityValidationError: If security requirements not met
    """
    app = Flask(
        __name__,
        static_folder='./static',
        static_url_path='/static'
    )
    
    # Load configuration
    try:
        config = get_config()
        app.config.from_object(config)
    except (ConfigError, SecurityValidationError) as exc:
        print(f"\n{'='*60}")
        print("CONFIGURATION ERROR")
        print(f"{'='*60}")
        print(str(exc))
        print(f"{'='*60}\n")
        raise
    
    # Apply config overrides (for testing)
    if config_overrides:
        app.config.update(config_overrides)
    
    # Initialize logging first
    init_logging()
    
    # Initialize Sentry lazily (reduces cold start by ~200ms)
    sentry_dsn = app.config.get('SENTRY_DSN') or os.environ.get('SENTRY_DSN')
    if sentry_dsn:
        sentry_sdk, FlaskIntegration = _get_sentry()
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=app.config.get('FLASK_ENV', 'development'),
            traces_sample_rate=float(
                os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.1')
            ),
            integrations=[FlaskIntegration()],
        )
    
    # Initialize JWT
    # Allow decoding both legacy symmetric tokens (HS256) and
    # Supabase asymmetric access tokens (ES256/RS256).
    app.config.setdefault("JWT_DECODE_ALGORITHMS", ["HS256", "ES256", "RS256"])
    app.config.setdefault("JWT_ALGORITHM", "HS256")
    jwt.init_app(app)
    _init_jwt_key_routing(app)
    _init_jwt_error_handlers(app)
    
    # Initialize Prometheus metrics lazily (only if enabled)
    if os.environ.get('ENABLE_PROMETHEUS', '').lower() in ('1', 'true', 'yes'):
        PrometheusMetrics = _get_prometheus()
        PrometheusMetrics(app)
    
    # Initialize database
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Initialize mail
    mail.init_app(app)
    
    # Initialize encryption
    encryption.init_app(app)
    
    # Initialize scheduler
    scheduler.init_app(app)
    
    # Initialize rate limiting
    limiter.init_app(app)
    
    # Initialize CORS with strict configuration
    _init_cors(app)
    
    # Initialize security headers with Talisman
    _init_talisman(app)
    
    # Register blueprints
    _register_blueprints(app)
    
    # Register error handlers
    _register_error_handlers(app)
    
    # Register request handlers
    _register_request_handlers(app)
    
    # Register CLI commands
    _register_cli_commands(app)
    
    # Initialize security middleware
    init_security_middleware(app)
    
    # Register rate limit handlers
    register_rate_limit_handlers(app)
    
    # Initialize database schema (development only)
    with app.app_context():
        _init_database(app)
    
    return app


def _init_jwt_key_routing(app):
    """
    Use separate JWT signing keys for public and control audiences when configured.
    Falls back to JWT_SECRET_KEY for backward compatibility in local/dev.
    """
    def _public_signing_key() -> str:
        return (
            app.config.get("PUBLIC_JWT_SECRET_KEY")
            or app.config.get("JWT_SECRET_KEY")
            or os.environ.get("SUPABASE_JWT_SECRET")
            or app.config.get("SECRET_KEY")
            or ""
        )

    def _control_signing_key() -> str:
        return (
            app.config.get("CONTROL_JWT_SECRET_KEY")
            or app.config.get("JWT_SECRET_KEY")
            or app.config.get("SECRET_KEY")
            or ""
        )

    @jwt.encode_key_loader
    def _jwt_encode_key(identity):
        if isinstance(identity, dict) and identity.get("token_use") == "control":
            return _control_signing_key()
        if isinstance(identity, str) and identity.startswith("control::"):
            return _control_signing_key()
        return _public_signing_key()

    @jwt.decode_key_loader
    def _jwt_decode_key(jwt_header, jwt_payload):
        aud = jwt_payload.get("aud")
        expected_control_aud = app.config.get("CONTROL_PLANE_JWT_AUDIENCE", "control")
        if aud == expected_control_aud:
            return _control_signing_key()

        iss = str(jwt_payload.get("iss") or "").strip()
        iss_lower = iss.lower()
        alg = str(jwt_header.get("alg") or "").upper()
        kid = str(jwt_header.get("kid") or "").strip()

        # Supabase modern projects may issue asymmetric JWTs (ES256/RS256).
        # In that case we must verify with JWKS public keys, not shared secrets.
        if "supabase.co/auth/v1" in iss_lower and alg in {"ES256", "RS256"} and kid:
            try:
                signing_key = _resolve_supabase_es256_public_key(iss, kid)
                if signing_key is not None:
                    return signing_key
            except (URLError, HTTPError, TimeoutError, ValueError) as exc:
                app.logger.warning(
                    f"Supabase JWKS lookup failed: issuer={iss} alg={alg} kid={kid} error={exc}"
                )
            except Exception as exc:
                app.logger.warning(
                    f"Unexpected Supabase JWKS error: issuer={iss} alg={alg} kid={kid} error={exc}"
                )

        # Legacy Supabase shared-secret JWT mode.
        supabase_secret = os.environ.get("SUPABASE_JWT_SECRET")
        if supabase_secret and "supabase.co/auth/v1" in iss_lower:
            return supabase_secret

        return _public_signing_key()


def _init_jwt_error_handlers(app):
    """Expose structured JWT auth failures and log cause for diagnostics."""

    @jwt.invalid_token_loader
    def _invalid_token(reason):
        app.logger.warning(f"JWT invalid token: {reason}")
        status = 401 if request.path.startswith("/api/presence/") else 422
        return jsonify({"msg": reason}), status

    @jwt.unauthorized_loader
    def _missing_token(reason):
        app.logger.info(f"JWT missing token: {reason}")
        return jsonify({"msg": reason}), 401

    @jwt.expired_token_loader
    def _expired_token(jwt_header, jwt_payload):
        app.logger.info("JWT expired token", extra={"sub": jwt_payload.get("sub")})
        return jsonify({"msg": "Token has expired"}), 401


# Presence frontends and other deployed ANU surfaces that should be allowed
# when an operator hasn't explicitly set CORS_ORIGINS (non-production only).
# Production still REQUIRES CORS_ORIGINS to be set explicitly — see below.
_DEFAULT_KNOWN_FRONTEND_ORIGINS: list[str] = [
    # Presence (the new public-world studio)
    "https://your-presence.vercel.app",
    "https://presence-gilt.vercel.app",
    # Mudyin (existing pilot site)
    "https://mudyin.com",
    "https://www.mudyin.com",
    "https://mudyin-live.vercel.app",
    "https://mudyin.vercel.app",
    # Manara / ANU
    "https://maanara.vercel.app",
]

_DEFAULT_LOCAL_DEV_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]


def _init_cors(app):
    """Initialize CORS with strict security settings.

    Origin policy:
      - Repo-owned Presence frontend aliases in
        _DEFAULT_KNOWN_FRONTEND_ORIGINS are always included so a Vercel alias
        migration does not block authenticated browser preflights before
        operators update production env.
      - If CORS_ORIGINS env/config is explicitly set → operator's choice wins,
        source of truth for arbitrary origins.
      - If CORS_ORIGINS is unset and ENV == 'production' → SecurityValidationError.
        Production must list its origins explicitly so misconfigurations are loud.
      - If CORS_ORIGINS is unset and ENV != 'production' → fall back to the
        documented known-frontend list plus localhost dev origins so a fresh
        development/staging boot is usable without invisible config.

    `supports_credentials=True` means we cannot use wildcard ('*') with
    credentials — Flask-CORS reflects only the matching origin in
    `Access-Control-Allow-Origin`. OPTIONS preflight is handled by
    flask-cors itself before route auth decorators run.
    """
    cors_origins = list(app.config.get('CORS_ORIGINS') or [])

    # In production, CORS_ORIGINS must be explicitly set.
    if app.config.get('ENV') == 'production' and not cors_origins:
        raise SecurityValidationError(
            "CORS_ORIGINS must be explicitly configured in production"
        )

    # Outside production, fall back to the curated known-frontend allowlist
    # so a fresh `flask run` / staging deploy is usable without invisible env.
    if not cors_origins:
        cors_origins = list(_DEFAULT_KNOWN_FRONTEND_ORIGINS) + list(_DEFAULT_LOCAL_DEV_ORIGINS)
    else:
        # Keep explicit env values, but append repo-owned frontends in a stable
        # order. This preserves disallow-by-default for unknown origins while
        # avoiding production CORS drift when the official Presence Vercel alias
        # changes from presence-gilt to your-presence.
        seen = set(cors_origins)
        for origin in _DEFAULT_KNOWN_FRONTEND_ORIGINS:
            if origin not in seen:
                cors_origins.append(origin)
                seen.add(origin)

    # Persist back into config so other modules (e.g. middleware) see the same
    # resolved list when introspecting.
    app.config['CORS_ORIGINS'] = cors_origins

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": cors_origins,
                "supports_credentials": True,
                "allow_headers": [
                    "Content-Type",
                    "Authorization",
                    "Accept",
                    "X-Requested-With",
                    "X-Request-ID",
                    "X-ANU-App-ID",
                    "X-ANU-Site",
                    "X-ANU-Site-Slug",
                ],
                "expose_headers": ["X-Request-ID"],
                "max_age": 600,
            },
            r"/auth/*": {
                "origins": cors_origins,
                "supports_credentials": True,
                "allow_headers": ["Content-Type", "Authorization", "Accept"],
                "max_age": 600,
            },
        }
    )


def _init_talisman(app):
    """Initialize Flask-Talisman security headers."""
    # Skip Talisman in testing
    if app.config.get('TESTING'):
        return
    
    # In development, allow localhost
    force_https = app.config.get('FORCE_HTTPS', False)
    
    talisman.init_app(
        app,
        force_https=force_https,
        strict_transport_security=force_https,
        strict_transport_security_max_age=31536000,  # 1 year
        strict_transport_security_include_subdomains=True,
        strict_transport_security_preload=True,
        content_security_policy=app.config.get('CSP_DIRECTIVES', {}),
        content_security_policy_nonce_in=['script-src'],
        referrer_policy='strict-origin-when-cross-origin',
        feature_policy={
            'geolocation': "'self'",
            'camera': "'none'",
            'microphone': "'none'",
        },
    )


def _register_blueprints(app):
    """Register all application blueprints."""
    from .auth import auth as auth_blueprint
    from .api.public_nodes import public_nodes_bp
    app.register_blueprint(auth_blueprint, url_prefix='/auth')
    
    from .routes import routes
    app.register_blueprint(routes)

    from .presence_redirect import presence_redirect_bp
    app.register_blueprint(presence_redirect_bp)
    
    from .api import api_bp
    app.register_blueprint(api_bp)
    
    from .api.public import public_bp
    from .api.public_connectors import public_connectors_bp
    from .api.public_archive import public_archive_bp
    from .api.public_sites import public_sites_bp
    from .api.public_transparency import public_transparency_bp
    from .api.public_trust import public_trust_bp
    app.register_blueprint(public_bp)
    app.register_blueprint(public_connectors_bp)
    app.register_blueprint(public_archive_bp)
    app.register_blueprint(public_sites_bp)
    app.register_blueprint(public_transparency_bp)
    app.register_blueprint(public_trust_bp)
    
    from .federation_portal import community_bp
    app.register_blueprint(community_bp)

    app.register_blueprint(health_bp)
    app.register_blueprint(public_nodes_bp)


def _register_error_handlers(app):
    """Register global error handlers."""

    def _beta_dependency_response(message: str, *, status_code: int = 503):
        return jsonify({
            "ok": False,
            "error": {
                "code": "BetaDependencyMissing",
                "message": message,
            },
            "dependencies": {
                "database": (
                    "todo"
                    if app.config.get("BETA_PLACEHOLDER_DATABASE")
                    else "configured"
                ),
                "stripe": (
                    "todo"
                    if app.config.get("BETA_PLACEHOLDER_STRIPE")
                    else "configured"
                ),
            },
            "request_id": getattr(g, 'request_id', None),
        }), status_code
    
    @app.errorhandler(ConfigError)
    def handle_config_error(error):
        """Handle configuration errors."""
        response = {
            "ok": False,
            "error": {
                "code": "ConfigurationError",
                "message": str(error),
            }
        }
        return jsonify(response), 500
    
    @app.errorhandler(SecurityValidationError)
    def handle_security_error(error):
        """Handle security validation errors."""
        response = {
            "ok": False,
            "error": {
                "code": "SecurityViolation",
                "message": "Security configuration error. Contact administrator.",
            }
        }
        # Log the actual error securely
        app.logger.error(f"Security validation error: {error}")
        return jsonify(response), 500
    
    @app.errorhandler(RequestEntityTooLarge)
    def handle_request_too_large(error):
        """Handle request entity too large (413)."""
        response = {
            "ok": False,
            "error": {
                "code": "PayloadTooLarge",
                "message": f"Request size exceeds maximum allowed ({app.config.get('MAX_CONTENT_LENGTH', 5242880)} bytes)",
            },
            "request_id": getattr(g, 'request_id', None),
        }
        return jsonify(response), 413
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(exc):
        """Handle HTTP exceptions."""
        if app.config.get('TESTING'):
            raise exc
        
        response = {
            "ok": False,
            "error": {
                "code": exc.name,
                "message": exc.description,
            },
            "request_id": getattr(g, 'request_id', None),
        }
        return jsonify(response), exc.code
    
    @app.errorhandler(Exception)
    def handle_exception(exc):
        """Handle unhandled exceptions."""
        if app.config.get('TESTING'):
            raise exc

        if isinstance(exc, SQLAlchemyError):
            db.session.rollback()

        if (
            app.config.get("BETA_PLACEHOLDER_DATABASE")
            and isinstance(exc, OperationalError)
            and "no such table" in str(exc).lower()
        ):
            return _beta_dependency_response(
                "This endpoint requires the production database. The backend is running in beta-limited mode until DATABASE_URL is configured."
            )
        
        # Log the error with traceback
        import traceback
        app.logger.exception("Unhandled exception")
        
        # Report to Sentry if configured (lazy check)
        try:
            sentry_sdk, _ = _get_sentry()
            if sentry_sdk.Hub.current.client:
                sentry_sdk.capture_exception(exc)
        except Exception:
            pass  # Sentry not initialized
        
        # Return generic error (don't expose internals)
        response = {
            "ok": False,
            "error": {
                "code": "InternalServerError",
                "message": "An unexpected error occurred",
            },
            "request_id": getattr(g, 'request_id', None),
        }
        return jsonify(response), 500


def _register_request_handlers(app):
    """Register request handlers."""
    
    @app.before_request
    def _request_id():
        """Generate and attach request ID."""
        g.request_id = str(uuid.uuid4())
        
        # Resolve node from request
        try:
            from .services.node_service import resolve_node_from_request
            node = resolve_node_from_request(request)
            g.node = node
            g.node_id = node.id if node else None
        except Exception:
            db.session.rollback()
            g.node = None
            g.node_id = None
    
    @app.after_request
    def _add_security_headers(response):
        """Add security headers to all responses."""
        # Add request ID header
        response.headers['X-Request-ID'] = getattr(g, 'request_id', 'unknown')
        
        # Prevent caching of sensitive data
        is_public_read = (
            request.method == "GET"
            and request.path.startswith("/api/public/")
            and not request.headers.get("Authorization")
        )
        if is_public_read:
            response.headers['Cache-Control'] = 'public, max-age=15, stale-while-revalidate=30'
        elif request.path.startswith(('/api/', '/auth/')):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        
        return response


def _register_cli_commands(app):
    """Register CLI commands."""
    
    @app.cli.command("generate-secrets")
    def generate_secrets():
        """Generate secure secrets for production."""
        from .config import Config
        print("\n" + "="*60)
        print("GENERATED SECRETS (Add to your .env file)")
        print("="*60)
        print(f"SECRET_KEY={Config.generate_secret()}")
        print(f"JWT_SECRET_KEY={Config.generate_secret()}")
        print(f"ENCRYPTION_MASTER_KEY={Config.generate_secret()}")
        print("="*60 + "\n")
    
    @app.cli.command("security-check")
    def security_check():
        """Run security configuration check."""
        from .config import ProductionConfig
        try:
            config = ProductionConfig()
            config.validate()
            print("✅ Production configuration is valid")
        except SecurityValidationError as e:
            print(f"❌ Security validation failed:\n{e}")
            exit(1)
        except ConfigError as e:
            print(f"⚠️ Configuration warning:\n{e}")
    
    @app.cli.command("hell-rebuild-projectors")
    @click.option("--node-id", type=int, default=None, help="Rebuild only this node's read models.")
    def hell_rebuild_projectors_cmd(node_id):
        from .services.hell_projector_service import rebuild_projectors
        summary = rebuild_projectors(node_id=node_id)
        click.echo(f"Rebuilt Hell projectors for node={node_id}: {summary}")

    @app.cli.command("seed-presence")
    def seed_presence_cmd():
        """Seed Presence Node templates and alpha demo nodes (legacy + DNA rooms)."""
        from .services.presence_service import (
            seed_presence_demo_data,
            seed_presence_dna_demo_data,
        )

        summary = seed_presence_demo_data()
        dna_summary = seed_presence_dna_demo_data()
        db.session.commit()
        click.echo(f"Seeded Presence Nodes: {summary}")
        click.echo(f"Seeded Presence DNA demo rooms: {dna_summary}")


def _init_database(app):
    """Initialize database schema and seed data."""
    # Register Hell/Earth/Heaven models
    from . import hell_models  # noqa: F401
    
    env = os.environ.get("FLASK_ENV", "development")
    database_uri = str(app.config.get("SQLALCHEMY_DATABASE_URI", ""))
    is_sqlite = database_uri.startswith("sqlite")
    auto_create_all = bool(app.config.get("AUTO_CREATE_ALL", False))
    is_vercel = os.environ.get("VERCEL", "").lower() in ("1", "true")
    
    # NEVER run db.create_all() on Vercel - use migrations instead
    # This prevents connection errors on cold starts
    if is_vercel and not is_sqlite:
        app.logger.info(
            "Skipping db.create_all() on Vercel serverless - use migrations for schema changes"
        )
        return
    
    if auto_create_all and app.config.get("BETA_PLACEHOLDER_DATABASE"):
        app.logger.warning(
            "AUTO_CREATE_ALL was requested but ignored because DATABASE_URL is still a placeholder."
        )
        return

    # Provision schema when explicitly requested, otherwise keep auto-create scoped to local SQLite.
    if auto_create_all:
        app.logger.warning(
            "AUTO_CREATE_ALL is enabled; ensuring database schema, default node, and optional alpha data exist."
        )
        db.create_all()
        _ensure_default_node()
        _ensure_alpha_user(app)
        _seed_alpha_data(app)
        if is_sqlite:
            _ensure_sqlite_schema(app)
    elif is_sqlite and env != "production":
        db.create_all()
        _ensure_sqlite_schema(app)
        _ensure_default_node()
        _ensure_alpha_user(app)
        _seed_alpha_data(app)


def _ensure_sqlite_schema(app):
    """Ensure minimal schema compatibility for local sqlite runs."""
    # ... (keep existing implementation)
    pass


def _ensure_default_node():
    """Ensure default node exists."""
    from .models import Node, db
    from .config import Config
    
    default_slug = Config.DEFAULT_NODE_SLUG
    node = Node.query.filter_by(slug=default_slug).first()
    if not node:
        node = Node(
            slug=default_slug,
            name="Default Node",
            is_default=True,
            status="active"
        )
        db.session.add(node)
        db.session.commit()
    if not node.status:
        node.status = "active"
        db.session.commit()


def _ensure_alpha_user(app):
    """Ensure alpha user exists for development."""
    if not app.config.get("ALPHA_PUBLIC"):
        return
    
    from .models import User, Node, db
    
    username = app.config.get("ALPHA_DEFAULT_USERNAME") or "alpha_public"
    user = User.query.filter_by(username=username).first()
    if user:
        return
    
    default_node = Node.query.filter_by(is_default=True).first()
    user = User(
        username=username,
        email="alpha@local",
        pseudonym="Alpha Public",
        password=generate_password_hash("alpha_public", method="pbkdf2:sha256"),
        role="organizer",
        points=0,
        level=1,
        points_to_level_up=100,
        node_id=default_node.id if default_node else None,
    )
    db.session.add(user)
    db.session.commit()


def _seed_alpha_data(app):
    """Seed alpha data for development."""
    if not app.config.get("ALPHA_SEED"):
        return
    try:
        from .services.presence_service import (
            seed_presence_demo_data,
            seed_presence_dna_demo_data,
        )

        seed_presence_demo_data()
        seed_presence_dna_demo_data()
        db.session.commit()
    except Exception:
        db.session.rollback()
        app.logger.exception("Presence alpha seed failed")


# Maintain backwards compatibility
from .models import User  # noqa: E402, F401
