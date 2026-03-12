"""
Flora Fauna Civic Commons - Security Middleware

Input validation, sanitization, and security enforcement.
"""

import re
from functools import wraps
from flask import request, jsonify, current_app
from marshmallow import ValidationError
import bleach


# =============================================================================
# Input Sanitization
# =============================================================================

def sanitize_string(value: str, max_length: int = 1000, allow_html: bool = False) -> str:
    """
    Sanitize a string input.
    
    Args:
        value: Input string
        max_length: Maximum allowed length
        allow_html: Whether to allow specific HTML tags
    
    Returns:
        Sanitized string
    """
    if not isinstance(value, str):
        value = str(value)
    
    # Trim to max length
    value = value[:max_length]
    
    if allow_html:
        # Allow specific safe HTML tags
        allowed_tags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li']
        allowed_attrs = {}
        value = bleach.clean(value, tags=allowed_tags, attributes=allowed_attrs, strip=True)
    else:
        # Strip all HTML
        value = bleach.clean(value, tags=[], strip=True)
    
    return value.strip()


def sanitize_email(email: str) -> str:
    """Sanitize and normalize email address."""
    if not email:
        return email
    
    # Convert to lowercase and strip
    email = email.lower().strip()
    
    # Basic email validation regex
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    if not email_pattern.match(email):
        raise ValueError("Invalid email format")
    
    return email


def sanitize_username(username: str) -> str:
    """Sanitize username input."""
    if not username:
        return username
    
    username = username.strip()
    
    # Only allow alphanumeric, underscore, hyphen
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        raise ValueError("Username can only contain letters, numbers, underscores, and hyphens")
    
    # Length check
    if len(username) < 3 or len(username) > 30:
        raise ValueError("Username must be between 3 and 30 characters")
    
    return username


# =============================================================================
# SQL Injection Detection
# =============================================================================

SQL_INJECTION_PATTERNS = [
    r'(--|#|/\*|\*/)',  # SQL comments
    r'(;\s*drop\s+table|;\s*delete\s+from|;\s*insert\s+into|;\s*update\s+.*set)',
    r'(union\s+select|select\s+.*from|exec\s*\(|execute\s*\()',
    r"('\s*or\s*'|\"\s*or\s*\"|\d+\s*=\s*\d+)",  # Boolean conditions
    r'(xp_|sp_|sys_)',  # Extended stored procedures
]

SQL_PATTERN = re.compile('|'.join(SQL_INJECTION_PATTERNS), re.IGNORECASE)


def detect_sql_injection(value: str) -> bool:
    """
    Detect potential SQL injection in string.
    
    Args:
        value: String to check
    
    Returns:
        True if potential SQL injection detected
    """
    if not isinstance(value, str):
        return False
    
    return bool(SQL_PATTERN.search(value))


def sanitize_sql_input(value: str) -> str:
    """
    Sanitize input for SQL contexts.
    
    Args:
        value: Input string
    
    Returns:
        Sanitized string
    
    Raises:
        SecurityError: If SQL injection detected
    """
    if detect_sql_injection(value):
        current_app.logger.warning(f"Potential SQL injection detected: {value[:50]}...")
        raise SecurityError("Invalid characters in input")
    
    return value


# =============================================================================
# XSS Prevention
# =============================================================================

XSS_PATTERNS = [
    r'<script[^>]*>.*?</script>',
    r'javascript:',
    r'on\w+\s*=',
    r'<iframe[^>]*>',
    r'<object[^>]*>',
    r'<embed[^>]*>',
]

XSS_PATTERN = re.compile('|'.join(XSS_PATTERNS), re.IGNORECASE | re.DOTALL)


def detect_xss(value: str) -> bool:
    """Detect potential XSS in string."""
    if not isinstance(value, str):
        return False
    
    return bool(XSS_PATTERN.search(value))


# =============================================================================
# Security Decorators
# =============================================================================

class SecurityError(Exception):
    """Security-related error."""
    pass


def validate_json(schema_class):
    """
    Decorator to validate JSON input using marshmallow schema.
    
    Args:
        schema_class: Marshmallow Schema class
    
    Usage:
        @validate_json(ActionSchema)
        def create_action():
            # request.validated_json contains validated data
            ...
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            json_data = request.get_json()
            if json_data is None:
                return jsonify({
                    "ok": False,
                    "error": {
                        "code": "InvalidRequest",
                        "message": "Request body must be valid JSON"
                    }
                }), 400
            
            schema = schema_class()
            try:
                validated = schema.load(json_data)
                request.validated_json = validated
            except ValidationError as err:
                return jsonify({
                    "ok": False,
                    "error": {
                        "code": "ValidationError",
                        "message": "Input validation failed",
                        "details": err.messages
                    }
                }), 400
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


def sanitize_request_params(*param_names, max_length=1000):
    """
    Decorator to sanitize request parameters.
    
    Args:
        param_names: Names of parameters to sanitize
        max_length: Maximum length for each parameter
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            for param in param_names:
                value = request.args.get(param) or request.form.get(param)
                if value:
                    try:
                        sanitized = sanitize_string(value, max_length)
                        # Store sanitized value back
                        if param in request.args:
                            request.args = request.args.copy()
                            request.args[param] = sanitized
                    except Exception as e:
                        current_app.logger.warning(f"Sanitization error for {param}: {e}")
                        return jsonify({
                            "ok": False,
                            "error": {
                                "code": "InvalidInput",
                                "message": f"Invalid value for parameter: {param}"
                            }
                        }), 400
            
            return f(*args, **kwargs)
        return wrapper
    return decorator


def require_content_type(content_type='application/json'):
    """
    Decorator to require specific Content-Type header.
    
    Args:
        content_type: Required content type
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if request.content_type and not request.content_type.startswith(content_type):
                return jsonify({
                    "ok": False,
                    "error": {
                        "code": "InvalidContentType",
                        "message": f"Content-Type must be {content_type}"
                    }
                }), 415
            return f(*args, **kwargs)
        return wrapper
    return decorator


# =============================================================================
# Request Security Checks
# =============================================================================

def check_request_security():
    """
    Perform security checks on the current request.
    
    Returns:
        Tuple (is_safe, error_response) 
    """
    # Check for suspicious headers
    user_agent = request.headers.get('User-Agent', '')
    if not user_agent or len(user_agent) > 1000:
        current_app.logger.warning("Suspicious User-Agent detected")
        # Don't block, just log
    
    # Check request size
    content_length = request.content_length
    max_size = current_app.config.get('MAX_CONTENT_LENGTH', 5 * 1024 * 1024)
    if content_length and content_length > max_size:
        return False, (jsonify({
            "ok": False,
            "error": {
                "code": "PayloadTooLarge",
                "message": f"Request size {content_length} exceeds maximum {max_size}"
            }
        }), 413)
    
    return True, None


# =============================================================================
# Security Headers Helper
# =============================================================================

def add_security_headers(response):
    """
    Add security headers to response.
    
    Note: Most headers are handled by Flask-Talisman.
    This adds additional application-specific headers.
    """
    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'
    
    # XSS protection (legacy browsers)
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Referrer policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Permissions policy
    response.headers['Permissions-Policy'] = (
        'geolocation=(self), '
        'camera=(), '
        'microphone=(), '
        'payment=(), '
        'usb=(), '
        'vr=()'
    )
    
    return response


# =============================================================================
# File Upload Security
# =============================================================================

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def validate_file_upload(file_storage):
    """
    Validate a file upload.
    
    Args:
        file_storage: Flask FileStorage object
    
    Returns:
        Tuple (is_valid, error_message)
    """
    if not file_storage:
        return False, "No file provided"
    
    # Check filename
    filename = file_storage.filename
    if not filename:
        return False, "Invalid filename"
    
    # Check extension
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"File type .{ext} not allowed"
    
    # Check content length
    file_storage.seek(0, 2)  # Seek to end
    size = file_storage.tell()
    file_storage.seek(0)  # Reset
    
    if size > MAX_FILE_SIZE:
        return False, f"File size {size} exceeds maximum {MAX_FILE_SIZE}"
    
    return True, None


# =============================================================================
# Audit Logging
# =============================================================================

def log_security_event(event_type: str, details: dict, severity: str = 'info'):
    """
    Log a security event.
    
    Args:
        event_type: Type of security event
        details: Event details
        severity: Event severity (info, warning, error)
    """
    from flask import has_request_context, request
    
    log_data = {
        'event_type': event_type,
        'severity': severity,
        'details': details,
    }
    
    if has_request_context():
        log_data.update({
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', '')[:200],
            'endpoint': request.endpoint,
            'method': request.method,
        })
    
    log_method = getattr(current_app.logger, severity, current_app.logger.info)
    log_method(f"Security event: {event_type}", extra=log_data)


# =============================================================================
# Registration with Flask App
# =============================================================================

def init_security_middleware(app):
    """Initialize security middleware with Flask app."""
    
    @app.before_request
    def security_checks():
        """Run security checks before each request."""
        is_safe, error = check_request_security()
        if not is_safe:
            return error
    
    @app.after_request
    def add_headers(response):
        """Add security headers after each request."""
        return add_security_headers(response)
