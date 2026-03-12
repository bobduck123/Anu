from flask import Blueprint, request, jsonify, session, url_for
from datetime import datetime, timedelta, timezone
from .models import db, User
from .services.systemic_mode_service import get_system_state, MODE_BLACK_SWAN
from .notify import send_email
from flask_jwt_extended import (
    create_access_token,
    decode_token,
    get_jwt,
    get_jwt_identity,
    unset_jwt_cookies,
    set_access_cookies,
)
from werkzeug.security import check_password_hash, generate_password_hash
from .extensions import limiter
from .security.alpha import alpha_jwt_required
from flask import current_app
from .config import Config
from .security.control_plane import (
    resolve_control_scopes_for_role,
    record_control_token_grant,
    revoke_control_token_grant,
)


auth = Blueprint('auth', __name__)


def _normalize_identity(identity):
    if identity is None and current_app.config.get("ALPHA_PUBLIC") and current_app.config.get("ALPHA_AUTH_OPTIONAL"):
        return {"username": Config.ALPHA_DEFAULT_USERNAME}
    if isinstance(identity, dict):
        return identity
    if isinstance(identity, str) and identity.startswith("control::"):
        return {"username": identity.split("control::", 1)[1]}
    return {"username": identity}


def _public_token_claims(role):
    return {
        "role": role,
        "aud": current_app.config.get("PUBLIC_JWT_AUDIENCE", "public"),
        "token_use": "public",
        "requires_mfa": False,
    }


@auth.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json() or {}
    if not data.get("username") or not data.get("password"):
        return jsonify(message='Missing username or password'), 400
    user = User.query.filter_by(username=data['username']).first()

    if user and check_password_hash(user.password, data['password']):
        access_token = create_access_token(
            identity=user.username,
            additional_claims=_public_token_claims(user.role),
        )
        return jsonify(access_token=access_token, message='Login successful!', role=user.role), 200
    return jsonify(message='Invalid credentials'), 401


@auth.route('/logout', methods=['GET'])
@alpha_jwt_required()
def logout():
    response = jsonify(message='Logout successful!')
    unset_jwt_cookies(response)
    session.clear()
    return response, 200


@auth.route('/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    data = request.get_json() or {}
    required = ["username", "email", "pseudonym", "password"]
    if any(not data.get(field) for field in required):
        return jsonify(message='Missing required fields'), 400
    existing_user = User.query.filter(
        (User.username == data['username']) | (User.email == data['email'])
    ).first()
    if existing_user:
        return jsonify(message='Username or email already exists'), 409
    from .models import Node
    default_node = Node.query.filter_by(is_default=True).first()
    role = "participant"
    if default_node:
        try:
            state = get_system_state(default_node.id)
            if state and state.current_mode == MODE_BLACK_SWAN:
                role = "governance_observer"
        except Exception:
            pass
    user = User(
        username=data['username'],
        email=data['email'],
        pseudonym=data['pseudonym'],
        password=generate_password_hash(data['password'], method='pbkdf2:sha256'),
        points=0,
        level=1,
        points_to_level_up=100,
        role=role,
        node_id=default_node.id if default_node else None
    )
    db.session.add(user)
    db.session.commit()
    access_token = create_access_token(
        identity=user.username,
        additional_claims=_public_token_claims(role),
    )
    return jsonify(access_token=access_token, message='Registration successful!', role=role), 201


@auth.route('/control-token', methods=['POST'])
@alpha_jwt_required()
@limiter.limit("10 per minute")
def issue_control_token():
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user.get("username")).first()
    if not user:
        return jsonify(message='User not found'), 404

    allowed_roles = set(current_app.config.get("CONTROL_PLANE_ALLOWED_ROLES") or [
        "admin",
        "institution",
        "publisher",
        "platform_admin",
        "node_admin",
        "board_member",
        "treasury_guardian",
    ])
    if user.role not in allowed_roles:
        return jsonify(message='Control plane role required'), 403

    data = request.get_json(silent=True) or {}
    if not bool(data.get("requires_mfa")):
        return jsonify(message='MFA confirmation is required'), 400

    scopes = resolve_control_scopes_for_role(user.role)
    claims = {
        "role": user.role,
        "aud": current_app.config.get("CONTROL_PLANE_JWT_AUDIENCE", "control"),
        "token_use": "control",
        "scp": scopes,
        "requires_mfa": True,
        "node_id": user.node_id,
    }
    ttl_minutes = int(current_app.config.get("CONTROL_ACCESS_TOKEN_EXPIRES_MINUTES", 15) or 15)
    access_token = create_access_token(
        identity=f"control::{user.username}",
        additional_claims=claims,
        expires_delta=timedelta(minutes=max(1, ttl_minutes)),
    )
    token_payload = decode_token(access_token)
    exp_value = token_payload.get("exp")
    expires_at = None
    if exp_value is not None:
        try:
            expires_at = datetime.fromtimestamp(int(exp_value), tz=timezone.utc).replace(tzinfo=None)
        except Exception:
            expires_at = None
    record_control_token_grant(
        jti=str(token_payload.get("jti") or ""),
        user_id=user.id,
        role=user.role,
        audience=str(claims["aud"]),
        scopes=scopes,
        expires_at=expires_at,
        issued_by_ip=request.remote_addr,
    )
    db.session.commit()
    return jsonify(
        access_token=access_token,
        role=user.role,
        audience=claims["aud"],
        token_use=claims["token_use"],
        scopes=scopes,
    ), 200


@auth.route('/control-token/revoke', methods=['POST'])
@alpha_jwt_required()
@limiter.limit("30 per minute")
def revoke_control_token():
    claims = get_jwt() or {}
    expected_aud = current_app.config.get("CONTROL_PLANE_JWT_AUDIENCE", "control")
    if claims.get("aud") != expected_aud or claims.get("token_use") != "control":
        return jsonify(message='Control token required'), 400

    jti = str(claims.get("jti") or "").strip()
    if not jti:
        return jsonify(message='Token jti missing'), 400

    payload = request.get_json(silent=True) or {}
    reason = (payload.get("reason") or "revoked_by_holder").strip()[:300]
    row = revoke_control_token_grant(jti=jti, reason=reason)
    if not row:
        return jsonify(message='Control token grant not found'), 404
    db.session.commit()
    return jsonify(message='Control token revoked', jti=jti), 200


@auth.route('/check-login', methods=['GET'])
@alpha_jwt_required()
@limiter.limit("30 per minute")
def check_login():
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if user:
        return jsonify(isAuthenticated=True, username=user.username, role=user.role), 200
    return jsonify(isAuthenticated=False), 401


@auth.route('/api/users/reset_password', methods=['POST'])
@limiter.limit("5 per minute")
def reset_password():
    data = request.get_json() or {}
    user = User.query.filter_by(email=data.get('email')).first()
    if user:
        reset_token = user.get_reset_token()  # Assuming you have a method to generate a reset token
        reset_url = url_for('auth.reset_with_token', token=reset_token, _external=True)
        # Send email logic here, using a function like send_email(subject, recipient, body)
        send_email(
            'Password Reset Request',
            user.email,
            f'Please use the following link to reset your password: {reset_url}'
        )
        return jsonify({'message': 'Password reset email sent'}), 200
    return jsonify({'message': 'Email not found'}), 404


@auth.route('/reset_password/<token>', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
def reset_with_token(token):
    user = User.verify_reset_token(token)  # Assuming you have a method to verify the reset token
    if not user:
        return jsonify({'message': 'Invalid or expired token'}), 400
    if request.method == 'POST':
        data = request.get_json()
        user.set_password(data.get('password'))  # Assuming you have a method to set the user's password
        db.session.commit()
        return jsonify({'message': 'Password has been reset'}), 200
    return jsonify({'message': 'Provide new password'}), 200

