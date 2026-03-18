"""
Flora Fauna Civic Commons - Hardened Configuration
Security-First Configuration with Strict Validation
"""

import os
import secrets
import json
import tempfile
from typing import List, Optional
from sqlalchemy.pool import NullPool


class ConfigError(Exception):
    """Raised when configuration validation fails."""
    pass


class SecurityValidationError(ConfigError):
    """Raised when security validation fails."""
    pass


_TRUE_VALUES = {"1", "true", "yes", "y", "on"}


def _is_truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in _TRUE_VALUES


def _is_vercel_runtime() -> bool:
    return _is_truthy(os.environ.get("VERCEL"))


def _is_placeholder_value(value: str | None) -> bool:
    raw = str(value or "").strip()
    if not raw:
        return True
    normalized = raw.lower()
    return (
        normalized.startswith("todo")
        or "replace_me" in normalized
        or "<" in raw
        or "required_" in normalized
    )


def _allow_beta_placeholder_infra() -> bool:
    return _is_truthy(os.environ.get("BETA_ALLOW_PLACEHOLDER_INFRA"))


def _default_writable_runtime_root() -> str:
    if "WRITABLE_RUNTIME_ROOT" in os.environ:
        return os.environ.get("WRITABLE_RUNTIME_ROOT", "").strip()
    if _is_vercel_runtime():
        return os.path.join(tempfile.gettempdir(), "manara")
    return ""


def _resolve_runtime_path(path_value: str) -> str:
    raw = str(path_value or "").strip()
    if not raw:
        return raw
    if os.path.isabs(raw):
        return raw

    runtime_root = _default_writable_runtime_root()
    if runtime_root:
        return os.path.join(runtime_root, raw.replace("/", os.sep))

    return raw


def resolve_runtime_environment() -> str:
    """
    Resolve runtime environment with safe defaults.

    Priority:
    1. FLASK_ENV
    2. APP_ENV
    3. ENVIRONMENT
    4. VERCEL_ENV
    5. development
    """
    raw = (
        os.environ.get("FLASK_ENV")
        or os.environ.get("APP_ENV")
        or os.environ.get("ENVIRONMENT")
        or os.environ.get("VERCEL_ENV")
        or "development"
    ).strip().lower()

    aliases = {
        "prod": "production",
        "stage": "production",
        "staging": "production",
        "test": "testing",
        "dev": "development",
        "local": "development",
    }
    return aliases.get(raw, raw)


def requires_strict_secret_enforcement() -> bool:
    """
    Determine whether fallback secrets must be disallowed.

    This protects deployment environments where FLASK_ENV might be omitted.
    """
    if _is_truthy(os.environ.get("REQUIRE_STRICT_SECRETS")):
        return True

    runtime_env = resolve_runtime_environment()
    if runtime_env in {"production"}:
        return True

    if _is_truthy(os.environ.get("VERCEL")):
        vercel_env = (os.environ.get("VERCEL_ENV") or "").strip().lower()
        if vercel_env in {"production", "preview"}:
            return True

    return False


def validate_core_secret_pair(secret_key: Optional[str], jwt_secret_key: Optional[str]) -> list[str]:
    errors: list[str] = []
    if not secret_key:
        errors.append("SECRET_KEY must be set in environment")
    elif len(secret_key) < 32:
        errors.append("SECRET_KEY must be at least 32 characters")

    if not jwt_secret_key:
        errors.append("JWT_SECRET_KEY must be set in environment")
    elif len(jwt_secret_key) < 32:
        errors.append("JWT_SECRET_KEY must be at least 32 characters")

    if secret_key and jwt_secret_key and secret_key == jwt_secret_key:
        errors.append("JWT_SECRET_KEY must be different from SECRET_KEY")
    return errors


class Config:
    """
    Base configuration class.
    
    SECURITY NOTICE: This configuration class enforces secure defaults.
    - No fallback secrets are allowed
    - All sensitive values must be provided via environment variables
    - Debug mode is disabled by default
    """
    
    # =========================================================================
    # CRITICAL SECURITY SETTINGS - NO FALLBACKS ALLOWED
    # =========================================================================
    
    # These must be set in environment - no defaults, no fallbacks
    SECRET_KEY: Optional[str] = None
    JWT_SECRET_KEY: Optional[str] = None
    
    # Database - SQLite allowed only in development
    SQLALCHEMY_DATABASE_URI: Optional[str] = None
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }
    
    # File Upload Security
    UPLOAD_FOLDER = 'static/uploads'
    ALLOWED_EXTENSIONS: set = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'webp'}
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB strict limit (SEC-2026-005)
    
    # Payment Processing
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    
    # Encryption
    ENCRYPTION_MASTER_KEY: Optional[str] = None
    
    # =========================================================================
    # SECURITY HEADERS & POLICIES
    # =========================================================================
    
    # Force HTTPS in production
    FORCE_HTTPS = False
    
    # HSTS Configuration
    HSTS_MAX_AGE = 31536000  # 1 year
    HSTS_INCLUDE_SUBDOMAINS = True
    HSTS_PRELOAD = True
    
    # Content Security Policy
    CSP_DIRECTIVES = {
        'default-src': "'self'",
        'script-src': ["'self'", "'strict-dynamic'"],
        'style-src': ["'self'", "'unsafe-inline'"],  # Allow inline styles for now
        'img-src': ["'self'", 'data:', 'https:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'media-src': ["'self'"],
        'object-src': "'none'",
        'frame-src': "'none'",
        'base-uri': "'self'",
        'form-action': "'self'",
        'frame-ancestors': "'none'",
    }
    
    # Rate Limiting
    RATELIMIT_STORAGE_URI = "memory://"
    RATELIMIT_STRATEGY = "fixed-window"
    RATELIMIT_DEFAULT_LIMITS = ["100 per minute"]
    
    # =========================================================================
    # APPLICATION SETTINGS
    # =========================================================================
    
    # Debug Mode - STRICTLY DISABLED by default
    DEBUG = False
    TESTING = False
    FLASK_ENV = "development"
    
    # Node Configuration
    DEFAULT_NODE_SLUG = 'au-nsw-sydney'
    
    # Differential Privacy Settings
    DP_EPSILON = 1.0
    DP_MIN_COHORT = 30
    DP_DELTA = 1e-5
    
    # Relief System Configuration
    RELIEF_CAP_RATIO = 0.1
    RELIEF_MAX_GRANT_DEFAULT = 50000  # cents
    RELIEF_ESCALATION_THRESHOLD = 25000  # cents
    
    # Audit & Compliance
    AUDIT_LOG_SENSITIVE_READS = True
    DATA_RETENTION_DAYS_EVIDENCE = 365
    AUDIT_CHECKPOINT_STORAGE_ROOT = "static/audit_checkpoints"
    
    # Alpha/Feature Flags
    ALPHA_PUBLIC = False
    ALPHA_SEED = False
    ALPHA_AUTH_OPTIONAL = False
    ALPHA_DEFAULT_USERNAME = 'alpha_public'
    AUTO_CREATE_ALL = False

    # Public vs Control plane JWT audiences
    PUBLIC_JWT_AUDIENCE = "public"
    CONTROL_PLANE_JWT_AUDIENCE = "control"
    PUBLIC_JWT_SECRET_KEY: Optional[str] = None
    CONTROL_JWT_SECRET_KEY: Optional[str] = None
    CONTROL_ACCESS_TOKEN_EXPIRES_MINUTES = 15
    CONTROL_CONNECTOR_PULL_ASYNC_DEFAULT = False
    CONTROL_REQUIRE_TOKEN_USE_CLAIM = True
    CONTROL_REQUIRE_TOKEN_GRANT = True
    CONTROL_ROLE_SCOPES = {}
    CONTROL_PLANE_ALLOWED_ROLES: List[str] = []
    CONTROL_PLANE_HOSTS: List[str] = []
    CONTROL_PLANE_SHARED_SECRET: Optional[str] = None
    CONNECTOR_PULL_JOB_LEASE_SECONDS = 180
    CONNECTOR_PULL_JOB_STALE_SECONDS = 900

    # World snapshot publishing/signing
    WORLD_STORAGE_ROOT = "static/worlds"
    WORLD_SIGNING_PRIVATE_KEY_FILE: Optional[str] = None
    WORLD_SIGNING_PUBLIC_KEY_FILE: Optional[str] = None
    WORLD_SIGNING_KEY_ID = "dev-ed25519"
    
    # Hell/Earth/Heaven Architecture
    HELL_ROUTING_CAPACITY = 25
    HELL_K_ANON_MIN = 3
    HELL_TRUSTED_QUORUM = 2
    HELL_LEADER_QUORUM = 1
    
    # Mail Settings
    MAIL_SERVER = 'smtp.example.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False
    MAIL_USERNAME: Optional[str] = None
    MAIL_PASSWORD: Optional[str] = None
    MAIL_DEFAULT_SENDER: Optional[tuple] = None
    FRONTEND_BASE_URL: Optional[str] = None
    
    # CORS - Strict defaults
    CORS_ORIGINS: List[str] = []
    CORS_SUPPORTS_CREDENTIALS = True
    BETA_ALLOW_PLACEHOLDER_INFRA = False
    BETA_PLACEHOLDER_DATABASE = False
    BETA_PLACEHOLDER_STRIPE = False
    
    def __init__(self):
        """Initialize configuration from environment variables."""
        self._load_from_environment()
        self._ensure_upload_folder()
    
    def _load_from_environment(self):
        """Load configuration from environment variables."""
        self.FLASK_ENV = resolve_runtime_environment()
        self.BETA_ALLOW_PLACEHOLDER_INFRA = _allow_beta_placeholder_infra()

        # Core secrets - NO FALLBACKS
        self.SECRET_KEY = os.environ.get('SECRET_KEY')
        self.JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
        
        # Database
        raw_database_url = os.environ.get('DATABASE_URL')
        self.BETA_PLACEHOLDER_DATABASE = self.BETA_ALLOW_PLACEHOLDER_INFRA and _is_placeholder_value(raw_database_url)
        self.SQLALCHEMY_DATABASE_URI = (
            'sqlite:///:memory:' if self.BETA_PLACEHOLDER_DATABASE else raw_database_url
        )
        is_vercel_database = (
            _is_vercel_runtime()
            and self.SQLALCHEMY_DATABASE_URI
            and 'sqlite' not in self.SQLALCHEMY_DATABASE_URI.lower()
        )
        uses_supabase_transaction_pooler = bool(
            is_vercel_database
            and 'pooler.supabase.com:6543' in (self.SQLALCHEMY_DATABASE_URI or '')
        )
        # Detect Neon pooler (uses -pooler suffix in hostname)
        uses_neon_pooler = bool(
            is_vercel_database
            and '-pooler.' in (self.SQLALCHEMY_DATABASE_URI or '')
            and 'neon.tech' in (self.SQLALCHEMY_DATABASE_URI or '')
        )
        if is_vercel_database:
            self.SQLALCHEMY_ENGINE_OPTIONS.update({
                'pool_size': 1,
                'max_overflow': 0,
                'pool_pre_ping': True,
            })
        if uses_supabase_transaction_pooler or uses_neon_pooler:
            # For serverless SQLAlchemy with external poolers (Supabase/Neon),
            # use NullPool to let the external pooler manage connections.
            self.SQLALCHEMY_ENGINE_OPTIONS = {
                'poolclass': NullPool,
                'pool_pre_ping': True,
                'connect_args': {
                    'connect_timeout': 10,
                    'options': '-c statement_timeout=30000',  # 30s timeout
                },
            }

        # Connection pooling overrides
        if 'poolclass' not in self.SQLALCHEMY_ENGINE_OPTIONS:
            self.SQLALCHEMY_ENGINE_OPTIONS['pool_size'] = int(
                os.environ.get('DB_POOL_SIZE', 1 if is_vercel_database else 10)
            )
            self.SQLALCHEMY_ENGINE_OPTIONS['max_overflow'] = int(
                os.environ.get('DB_MAX_OVERFLOW', 0 if is_vercel_database else 20)
            )
            self.SQLALCHEMY_ENGINE_OPTIONS['pool_timeout'] = int(
                os.environ.get('DB_POOL_TIMEOUT', 30)
            )
            self.SQLALCHEMY_ENGINE_OPTIONS['pool_recycle'] = int(
                os.environ.get('DB_POOL_RECYCLE', 1800)
            )
        if self.SQLALCHEMY_DATABASE_URI and self.SQLALCHEMY_DATABASE_URI.startswith('sqlite'):
            self.SQLALCHEMY_ENGINE_OPTIONS = {}
        
        # File upload limits (5MB max)
        max_content = os.environ.get('MAX_CONTENT_LENGTH')
        if max_content:
            self.MAX_CONTENT_LENGTH = min(int(max_content), 5 * 1024 * 1024)
        self.UPLOAD_FOLDER = _resolve_runtime_path(
            os.environ.get('UPLOAD_FOLDER', self.UPLOAD_FOLDER)
        )
        
        # Stripe
        raw_stripe_secret_key = os.environ.get('STRIPE_SECRET_KEY')
        raw_stripe_webhook_secret = os.environ.get('STRIPE_WEBHOOK_SECRET')
        raw_stripe_publishable_key = os.environ.get('STRIPE_PUBLISHABLE_KEY')
        self.BETA_PLACEHOLDER_STRIPE = self.BETA_ALLOW_PLACEHOLDER_INFRA and (
            _is_placeholder_value(raw_stripe_secret_key)
            or _is_placeholder_value(raw_stripe_webhook_secret)
            or _is_placeholder_value(raw_stripe_publishable_key)
        )
        self.STRIPE_SECRET_KEY = None if self.BETA_PLACEHOLDER_STRIPE else raw_stripe_secret_key
        self.STRIPE_WEBHOOK_SECRET = None if self.BETA_PLACEHOLDER_STRIPE else raw_stripe_webhook_secret
        self.STRIPE_PUBLISHABLE_KEY = None if self.BETA_PLACEHOLDER_STRIPE else raw_stripe_publishable_key
        
        # Encryption
        self.ENCRYPTION_MASTER_KEY = os.environ.get('ENCRYPTION_MASTER_KEY')
        self.AUDIT_CHECKPOINT_STORAGE_ROOT = _resolve_runtime_path(
            os.environ.get("AUDIT_CHECKPOINT_STORAGE_ROOT", "static/audit_checkpoints")
        )
        
        # Security settings
        self.FORCE_HTTPS = os.environ.get('FORCE_HTTPS', '').lower() == 'true'
        
        # Rate limiting
        self.RATELIMIT_STORAGE_URI = os.environ.get(
            'RATELIMIT_STORAGE_URI', 'memory://'
        )
        
        # Debug mode - only via explicit env var
        self.DEBUG = os.environ.get('DEBUG', '').lower() == 'true'
        self.TESTING = os.environ.get('TESTING', '').lower() == 'true'
        
        # Alpha flags
        self.ALPHA_PUBLIC = os.environ.get('ALPHA_PUBLIC', '').lower() == 'true'
        self.ALPHA_SEED = os.environ.get('ALPHA_SEED', '').lower() == 'true'
        self.AUTO_CREATE_ALL = os.environ.get('AUTO_CREATE_ALL', '').lower() == 'true'
        self.ALPHA_AUTH_OPTIONAL = os.environ.get(
            'ALPHA_AUTH_OPTIONAL', ''
        ).lower() == 'true'

        # Plane separation and control-plane auth
        self.PUBLIC_JWT_AUDIENCE = os.environ.get("PUBLIC_JWT_AUDIENCE", "public")
        self.CONTROL_PLANE_JWT_AUDIENCE = os.environ.get("CONTROL_PLANE_JWT_AUDIENCE", "control")
        self.PUBLIC_JWT_SECRET_KEY = os.environ.get("PUBLIC_JWT_SECRET_KEY")
        self.CONTROL_JWT_SECRET_KEY = os.environ.get("CONTROL_JWT_SECRET_KEY")
        self.CONTROL_ACCESS_TOKEN_EXPIRES_MINUTES = int(
            os.environ.get("CONTROL_ACCESS_TOKEN_EXPIRES_MINUTES", 15)
        )
        self.CONTROL_CONNECTOR_PULL_ASYNC_DEFAULT = _is_truthy(
            os.environ.get("CONTROL_CONNECTOR_PULL_ASYNC_DEFAULT")
        )
        self.CONTROL_REQUIRE_TOKEN_USE_CLAIM = _is_truthy(
            os.environ.get("CONTROL_REQUIRE_TOKEN_USE_CLAIM") or "true"
        )
        self.CONTROL_REQUIRE_TOKEN_GRANT = _is_truthy(
            os.environ.get("CONTROL_REQUIRE_TOKEN_GRANT") or "true"
        )
        control_roles = os.environ.get("CONTROL_PLANE_ALLOWED_ROLES", "")
        if control_roles.strip():
            self.CONTROL_PLANE_ALLOWED_ROLES = [
                r.strip() for r in control_roles.split(",") if r.strip()
            ]
        scope_matrix_raw = os.environ.get("CONTROL_ROLE_SCOPES_JSON", "").strip()
        if scope_matrix_raw:
            try:
                parsed = json.loads(scope_matrix_raw)
                if isinstance(parsed, dict):
                    self.CONTROL_ROLE_SCOPES = parsed
            except Exception:
                # Ignore invalid override to preserve startup behavior.
                self.CONTROL_ROLE_SCOPES = {}
        control_hosts = os.environ.get("CONTROL_PLANE_HOSTS", "")
        if control_hosts.strip():
            self.CONTROL_PLANE_HOSTS = [
                h.strip() for h in control_hosts.split(",") if h.strip()
            ]
        self.CONTROL_PLANE_SHARED_SECRET = os.environ.get("CONTROL_PLANE_SHARED_SECRET")
        self.CONNECTOR_PULL_JOB_LEASE_SECONDS = int(
            os.environ.get("CONNECTOR_PULL_JOB_LEASE_SECONDS", 180)
        )
        self.CONNECTOR_PULL_JOB_STALE_SECONDS = int(
            os.environ.get("CONNECTOR_PULL_JOB_STALE_SECONDS", 900)
        )

        # World snapshot signing/storage
        self.WORLD_STORAGE_ROOT = os.environ.get("WORLD_STORAGE_ROOT", "static/worlds")
        self.WORLD_STORAGE_ROOT = _resolve_runtime_path(self.WORLD_STORAGE_ROOT)
        self.WORLD_SIGNING_PRIVATE_KEY_FILE = os.environ.get("WORLD_SIGNING_PRIVATE_KEY_FILE")
        self.WORLD_SIGNING_PUBLIC_KEY_FILE = os.environ.get("WORLD_SIGNING_PUBLIC_KEY_FILE")
        self.WORLD_SIGNING_KEY_ID = os.environ.get("WORLD_SIGNING_KEY_ID", "dev-ed25519")
        
        # CORS origins - comma-separated list
        cors_origins = os.environ.get('CORS_ORIGINS', '')
        if cors_origins:
            self.CORS_ORIGINS = [o.strip() for o in cors_origins.split(',') if o.strip()]
        
        # Mail settings
        self.MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.example.com')
        self.MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
        self.MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
        self.MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
        self.FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL')
        mail_sender_name = os.environ.get('MAIL_SENDER_NAME', 'Manara Commons')
        if self.MAIL_USERNAME:
            self.MAIL_DEFAULT_SENDER = (mail_sender_name, self.MAIL_USERNAME)

    def _ensure_upload_folder(self):
        """Ensure upload folder exists."""
        for path_value in (
            self.UPLOAD_FOLDER,
            self.AUDIT_CHECKPOINT_STORAGE_ROOT,
            self.WORLD_STORAGE_ROOT,
        ):
            if path_value and not os.path.exists(path_value):
                os.makedirs(path_value, mode=0o755, exist_ok=True)
    
    def validate(self):
        """
        Validate configuration.
        
        Raises:
            ConfigError: If configuration is invalid
        """
        errors = []
        
        # Check required secrets
        errors.extend(validate_core_secret_pair(self.SECRET_KEY, self.JWT_SECRET_KEY))
        
        # Check database
        if not self.SQLALCHEMY_DATABASE_URI:
            errors.append("DATABASE_URL must be set in environment")
        
        if errors:
            raise ConfigError(f"Configuration validation failed: {'; '.join(errors)}")
    
    @classmethod
    def generate_secret(cls) -> str:
        """Generate a cryptographically secure secret key."""
        return secrets.token_hex(32)


class DevelopmentConfig(Config):
    """Development configuration with relaxed security."""
    
    def __init__(self):
        super().__init__()
        # In development, allow SQLite fallback
        if not self.SQLALCHEMY_DATABASE_URI:
            self.SQLALCHEMY_DATABASE_URI = 'sqlite:///site.db'
            # Disable pooling for SQLite
            self.SQLALCHEMY_ENGINE_OPTIONS = {}
        
        # Allow more relaxed CORS in development
        if not self.CORS_ORIGINS:
            self.CORS_ORIGINS = [
                'http://localhost:3000',
                'http://localhost:3001',
                'http://127.0.0.1:3000',
            ]
    
    def validate(self):
        """Development validation - warnings instead of errors for missing secrets."""
        if requires_strict_secret_enforcement():
            errors = validate_core_secret_pair(self.SECRET_KEY, self.JWT_SECRET_KEY)
            if errors:
                raise SecurityValidationError(
                    "\n".join(
                        ["STRICT SECRET ENFORCEMENT VIOLATION:"] + errors
                    )
                )

        runtime_env = resolve_runtime_environment()
        if runtime_env not in {"development", "testing"}:
            control_hosts = self.CONTROL_PLANE_HOSTS or []
            if not control_hosts:
                raise SecurityValidationError(
                    "STRICT CONTROL PLANE VIOLATION:\n"
                    "CONTROL_PLANE_HOSTS must be explicitly set for non-development runtimes"
                )
            if not (self.CONTROL_PLANE_SHARED_SECRET and len(str(self.CONTROL_PLANE_SHARED_SECRET).strip()) >= 16):
                raise SecurityValidationError(
                    "STRICT CONTROL PLANE VIOLATION:\n"
                    "CONTROL_PLANE_SHARED_SECRET must be explicitly set (>= 16 chars) for non-development runtimes"
                )

        if not self.SECRET_KEY:
            print("WARNING: SECRET_KEY not set. Using development fallback (INSECURE!)")
            self.SECRET_KEY = 'dev-secret-key-not-for-production-' + secrets.token_hex(16)
        
        if not self.JWT_SECRET_KEY:
            print("WARNING: JWT_SECRET_KEY not set. Using development fallback (INSECURE!)")
            self.JWT_SECRET_KEY = 'dev-jwt-secret-not-for-production-' + secrets.token_hex(16)
        
        if not self.SQLALCHEMY_DATABASE_URI:
            self.SQLALCHEMY_DATABASE_URI = 'sqlite:///site.db'


class ProductionConfig(Config):
    """
    Production configuration with strict security enforcement.
    
    This configuration will FAIL TO START if:
    - Any required secret is missing
    - DEBUG is set to true
    - DATABASE_URL is not set
    - CORS_ORIGINS is not set
    """
    
    # Force HTTPS
    FORCE_HTTPS = True
    
    def __init__(self):
        super().__init__()
        # Explicitly disable debug
        self.DEBUG = False
        self.TESTING = False
    
    def validate(self):
        """
        Strict production validation.
        
        Raises:
            SecurityValidationError: If any security requirement is not met
        """
        errors = []
        security_errors = []
        
        # Critical: No debug mode in production
        if os.environ.get('DEBUG', '').lower() == 'true':
            security_errors.append(
                "DEBUG must not be 'true' in production. "
                "Set FLASK_ENV=production and remove DEBUG=true"
            )
        
        # Critical: Secrets must be explicitly set
        if not os.environ.get('SECRET_KEY'):
            security_errors.append(
                "SECRET_KEY must be explicitly set in environment (no fallback allowed)"
            )
        else:
            secret_key = os.environ.get('SECRET_KEY', '')
            if len(secret_key) < 32:
                security_errors.append(
                    f"SECRET_KEY must be >= 32 characters (got {len(secret_key)})"
                )
            # Check it's not a known default
            if secret_key in ('your_secret_key', 'secret', 'password', 'admin'):
                security_errors.append(
                    "SECRET_KEY appears to be a default/weak value"
                )
        
        if not os.environ.get('JWT_SECRET_KEY'):
            security_errors.append(
                "JWT_SECRET_KEY must be explicitly set in environment (no fallback allowed)"
            )
        else:
            jwt_secret = os.environ.get('JWT_SECRET_KEY', '')
            if len(jwt_secret) < 32:
                security_errors.append(
                    f"JWT_SECRET_KEY must be >= 32 characters (got {len(jwt_secret)})"
                )

        # Critical: split JWT keys for public/control token signing
        public_jwt_secret = os.environ.get("PUBLIC_JWT_SECRET_KEY", "").strip()
        control_jwt_secret = os.environ.get("CONTROL_JWT_SECRET_KEY", "").strip()
        if not public_jwt_secret:
            security_errors.append(
                "PUBLIC_JWT_SECRET_KEY must be explicitly set in production"
            )
        elif len(public_jwt_secret) < 32:
            security_errors.append(
                f"PUBLIC_JWT_SECRET_KEY must be >= 32 characters (got {len(public_jwt_secret)})"
            )
        if not control_jwt_secret:
            security_errors.append(
                "CONTROL_JWT_SECRET_KEY must be explicitly set in production"
            )
        elif len(control_jwt_secret) < 32:
            security_errors.append(
                f"CONTROL_JWT_SECRET_KEY must be >= 32 characters (got {len(control_jwt_secret)})"
            )
        if public_jwt_secret and control_jwt_secret and public_jwt_secret == control_jwt_secret:
            security_errors.append(
                "CONTROL_JWT_SECRET_KEY must be different from PUBLIC_JWT_SECRET_KEY"
            )
        
        # Critical: PostgreSQL required in production
        db_url = os.environ.get('DATABASE_URL', '')
        if not db_url and not self.BETA_PLACEHOLDER_DATABASE:
            security_errors.append(
                "DATABASE_URL must be set in production (SQLite not allowed)"
            )
        elif db_url and 'sqlite' in db_url.lower() and not self.BETA_PLACEHOLDER_DATABASE:
            security_errors.append(
                "SQLite is not allowed in production. Use PostgreSQL."
            )
        
        # Critical: CORS origins must be explicitly set
        cors_origins = os.environ.get('CORS_ORIGINS', '').strip()
        if not cors_origins:
            security_errors.append(
                "CORS_ORIGINS must be explicitly set in production (comma-separated list)"
            )

        # Critical: Control plane hosts must be explicit (no fallback)
        control_hosts = os.environ.get('CONTROL_PLANE_HOSTS', '').strip()
        if not control_hosts:
            security_errors.append(
                "CONTROL_PLANE_HOSTS must be explicitly set in production (comma-separated list)"
            )
        
        # Critical: Control plane shared secret must be explicit for gateway defense-in-depth
        control_secret = os.environ.get('CONTROL_PLANE_SHARED_SECRET', '').strip()
        if not control_secret:
            security_errors.append(
                "CONTROL_PLANE_SHARED_SECRET must be explicitly set in production"
            )
        elif len(control_secret) < 16:
            security_errors.append(
                f"CONTROL_PLANE_SHARED_SECRET must be >= 16 characters (got {len(control_secret)})"
            )
        
        # Critical: Stripe keys required
        if not os.environ.get('STRIPE_SECRET_KEY') and not self.BETA_PLACEHOLDER_STRIPE:
            security_errors.append(
                "STRIPE_SECRET_KEY must be set in production"
            )
        
        # Warning: Encryption key recommended
        if not os.environ.get('ENCRYPTION_MASTER_KEY'):
            errors.append(
                "WARNING: ENCRYPTION_MASTER_KEY not set - sensitive data will not be encrypted"
            )
        
        # Fail on security errors
        if security_errors:
            raise SecurityValidationError(
                "\n".join(["PRODUCTION SECURITY VIOLATION:"] + security_errors)
            )
        
        # Check secrets are different
        if os.environ.get('SECRET_KEY') == os.environ.get('JWT_SECRET_KEY'):
            security_errors.append(
                "JWT_SECRET_KEY must be different from SECRET_KEY"
            )
        
        if security_errors:
            raise SecurityValidationError(
                "\n".join(["PRODUCTION SECURITY VIOLATION:"] + security_errors)
            )
        
        if errors:
            print("\n".join(errors))

        if self.BETA_PLACEHOLDER_DATABASE or self.BETA_PLACEHOLDER_STRIPE:
            print(
                "BETA PLACEHOLDER INFRA MODE ENABLED: startup is allowed with TODO database/Stripe values. "
                "DB-backed and Stripe-backed features remain unavailable until real credentials are configured."
            )
        
        # Call parent validation
        super().validate()


class TestingConfig(Config):
    """Testing configuration."""
    
    TESTING = True
    DEBUG = False
    
    def __init__(self):
        super().__init__()
        self.SQLALCHEMY_DATABASE_URI = os.environ.get(
            'TEST_DATABASE_URL', 'sqlite:///:memory:'
        )
        self.SQLALCHEMY_ENGINE_OPTIONS = {}
        self.WTF_CSRF_ENABLED = False
        
        # Use test secrets
        if not self.SECRET_KEY:
            self.SECRET_KEY = 'test-secret-key-' + secrets.token_hex(16)
        if not self.JWT_SECRET_KEY:
            self.JWT_SECRET_KEY = 'test-jwt-secret-' + secrets.token_hex(16)


# Configuration mapping
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig,
}


def get_config() -> Config:
    """
    Get the appropriate configuration based on environment.
    
    Returns:
        Config instance
    
    Raises:
        ConfigError: If configuration cannot be loaded
    """
    env = resolve_runtime_environment()
    config_class = config_by_name.get(env, DevelopmentConfig)
    
    config = config_class()
    config.validate()
    
    return config
