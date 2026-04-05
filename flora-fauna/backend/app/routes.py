import os
from flask import Blueprint, request, jsonify, current_app as app, g, send_from_directory
from .models import User, Action, Todo, db, Event, Article, Venue, Feedback, Notification, Favorite, Ticket, Message, Microcosm, Comment, ActionProof, ActionImpactMetric, EventPrimitive, StoryPost, AuditRecord
from .security.mode_guard import require_mode_allows
from datetime import datetime, timedelta
from flask_jwt_extended import get_jwt, get_jwt_identity
from flask import current_app
from .security.alpha import alpha_jwt_required
from .config import Config
from werkzeug.utils import secure_filename
from flask_cors import cross_origin
from marshmallow import ValidationError
from .schemas import (
    ActionSchema,
    EventSchema,
    VenueSchema,
    ArticleSchema,
    CommentSchema,
    MessageSchema,
    MicrocosmSchema,
    NotificationSchema,
    FeedbackSchema,
    TicketSchema,
    TodoSchema,
    UserUpdateSchema,
)
from .services import credit_engine_service
from .services.feature_flag_service import is_enabled
from .services.collision_detection_service import check_collision, record_collision
try:
    from geopy.distance import geodesic
except Exception:
    def geodesic(a, b):
        class _D:
            km = 0.0
        return _D()


routes = Blueprint('routes', __name__)


def _upload_public_url(filename: str) -> str:
    return f"{request.host_url.rstrip('/')}/media/uploads/{filename}"


@routes.route('/media/uploads/<path:filename>', methods=['GET'])
def uploaded_media(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


def _resolve_user_from_identity(identity):
    candidates = []

    if isinstance(identity, dict):
        for key in ("username", "email", "sub"):
            value = identity.get(key)
            if isinstance(value, str) and value.strip():
                candidates.append(value.strip())
    elif isinstance(identity, str) and identity.strip():
        candidates.append(identity.strip())

    try:
        claims = get_jwt() or {}
    except Exception:
        claims = {}

    for key in ("username", "preferred_username", "email", "sub"):
        value = claims.get(key)
        if isinstance(value, str) and value.strip():
            candidates.append(value.strip())

    normalized_candidates = []
    for candidate in candidates:
        normalized = (
            candidate.split("control::", 1)[1]
            if candidate.startswith("control::")
            else candidate
        )
        if normalized and normalized not in normalized_candidates:
            normalized_candidates.append(normalized)

    for candidate in normalized_candidates:
        user = User.query.filter_by(username=candidate).first()
        if user:
            return user

    for candidate in normalized_candidates:
        if "@" in candidate:
            user = User.query.filter_by(email=candidate).first()
            if user:
                return user

    for candidate in normalized_candidates:
        user = User.query.filter_by(global_subject_id=candidate).first()
        if user:
            return user

    return None


def _normalize_identity(identity):
    if identity is None and current_app.config.get("ALPHA_PUBLIC") and current_app.config.get("ALPHA_AUTH_OPTIONAL"):
        return {"username": Config.ALPHA_DEFAULT_USERNAME}

    user = _resolve_user_from_identity(identity)
    if user:
        return {"username": user.username}

    if isinstance(identity, dict):
        return identity
    if isinstance(identity, str) and identity.startswith("control::"):
        return {"username": identity.split("control::", 1)[1]}
    return {"username": identity}


def _current_user():
    identity = get_jwt_identity()
    if identity is None and current_app.config.get("ALPHA_PUBLIC") and current_app.config.get("ALPHA_AUTH_OPTIONAL"):
        return User.query.filter_by(username=Config.ALPHA_DEFAULT_USERNAME).first()

    user = _resolve_user_from_identity(identity)
    if user:
        return user

    if isinstance(identity, dict):
        username = identity.get("username")
    else:
        username = identity
    if isinstance(username, str) and username.startswith("control::"):
        username = username.split("control::", 1)[1]
    if not username:
        return None
    return User.query.filter_by(username=username).first()


def _has_destructive_content(text):
    if not text:
        return False
    banned = ["kill", "harm", "threat", "violence", "attack", "abuse"]
    lower = text.lower()
    return any(word in lower for word in banned)


def _pagination_params(default_limit=50, max_limit=100):
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", default_limit))
    if limit < 1:
        limit = default_limit
    if limit > max_limit:
        limit = max_limit
    if page < 1:
        page = 1
    return page, limit


def _maybe_paginate(query, default_limit=50, max_limit=100):
    if "page" in request.args or "limit" in request.args:
        page, limit = _pagination_params(default_limit, max_limit)
        total = query.count()
        items = query.offset((page - 1) * limit).limit(limit).all()
        pagination = {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
        return items, pagination
    items = query.limit(max_limit).all()
    return items, None


@routes.route('/api/users/<int:id>', methods=['GET'])
@alpha_jwt_required()
def get_user(id):
    user = User.query.get_or_404(id)
    return jsonify(user.to_dict()), 200


@routes.route('/api/users/me', methods=['GET'])
@alpha_jwt_required()
def get_current_user():
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify(user.to_dict()), 200


@routes.route('/api/members', methods=['GET'])
def get_members():
    users, pagination = _maybe_paginate(User.query.order_by(User.id.asc()))
    members = [{
        'id': u.id,
        'pseudonym': u.pseudonym,
        'role': u.role,
        'level': u.level,
        'points': u.points,
        'node_id': u.node_id
    } for u in users]
    if pagination:
        return jsonify({"ok": True, "data": members, "pagination": pagination}), 200
    return jsonify({"ok": True, "data": members}), 200


def parse_float(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


@routes.route('/api/users/<int:id>', methods=['PUT'])
@alpha_jwt_required()
def update_user(id):
    user = User.query.get_or_404(id)
    data = request.get_json() or {}
    if not data.get("venue_id"):
        data["is_online"] = True
    try:
        payload = UserUpdateSchema().load(data, partial=True)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    if 'points' in payload:
        user.points = payload.get('points', user.points)
    if 'level' in payload:
        user.level = payload.get('level', user.level)
    if 'points_to_level_up' in payload:
        user.points_to_level_up = payload.get('points_to_level_up', user.points_to_level_up)
    db.session.commit()
    return jsonify(user.to_dict()), 200


@routes.route('/api/public/profile/<string:username>', methods=['GET'])
def get_public_profile(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    month_ago = datetime.utcnow() - timedelta(days=30)
    featured_articles = Article.query.filter_by(author_id=user.id, featured=True).count()
    featured_stories = StoryPost.query.filter_by(user_id=user.id, featured=True).count()
    featured_recent = StoryPost.query.filter(
        StoryPost.user_id == user.id,
        StoryPost.featured == True,
        StoryPost.created_at >= month_ago,
    ).count()
    return jsonify({
        'username': user.username,
        'pseudonym': user.pseudonym,
        'role': user.role,
        'level': user.level,
        'points': user.points,
        'bio': user.bio,
        'avatarUrl': user.avatar_url,
        'bannerUrl': user.banner_url,
        'profileTheme': user.profile_theme,
        'location': user.location,
        'websiteUrl': user.website_url,
        'featured_articles': featured_articles,
        'featured_stories': featured_stories,
        'featured_this_month': featured_recent,
    }), 200


@routes.route('/apply-organizer', methods=['POST'])
@alpha_jwt_required()
def apply_organizer():
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if user:
        user.role = 'organizer'
        db.session.commit()
        return jsonify(message='Role updated to organizer'), 200
    else:
        return jsonify(message='User not found'), 404


@routes.route('/api/auth/organizer-application-status', methods=['GET'])
@alpha_jwt_required()
def organizer_application_status():
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if not user:
        return jsonify({"hasApplied": False, "isOrganizer": False, "role": "participant"}), 200
    is_org = user.role == "organizer"
    return jsonify({
        "hasApplied": is_org,
        "isOrganizer": is_org,
        "role": user.role,
    }), 200


@routes.route('/auth/organizer-application-status', methods=['GET'])
@alpha_jwt_required()
def organizer_application_status_alias():
    return organizer_application_status()


@routes.route('/api/actions', methods=['GET'])
@cross_origin(supports_credentials=True)
def get_actions():
    query = Action.query
    if getattr(g, "node_id", None):
        query = query.filter_by(node_id=g.node_id)
    actions, pagination = _maybe_paginate(query.order_by(Action.id.desc()))
    payload = [action.to_dict() for action in actions]
    if pagination:
        return jsonify({"data": payload, "pagination": pagination}), 200
    return jsonify(payload), 200


@routes.route('/api/actions', methods=['POST'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def create_action():
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if user.role != 'organizer':
        return jsonify({'message': 'Permission denied'}), 403
    form_data = request.form.to_dict(flat=True)
    try:
        data = ActionSchema().load(form_data)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400

    is_online = bool(data.get('is_online'))
    is_global = bool(data.get('is_global'))
    latitude = None if is_online or is_global else parse_float(data.get('latitude'))
    longitude = None if is_online or is_global else parse_float(data.get('longitude'))

    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    if not (file and allowed_file(file.filename)):
        return jsonify({'message': 'File type not allowed'}), 400
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(file_path):
        if 'X-Confirm-Overwrite' not in request.headers and not current_app.config.get("ALPHA_PUBLIC"):
            return jsonify({'message': 'File already exists. Do you want to overwrite it?'}), 409
    file.save(file_path)
    file_url = _upload_public_url(filename)

    start_date = data.get('start_date')
    end_date = data.get('end_date')
    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time())
    else:
        start_dt = datetime.utcnow()
    if end_date:
        end_dt = datetime.combine(end_date, datetime.min.time())
    else:
        # Default to 30 days from start to satisfy NOT NULL constraint
        end_dt = start_dt + timedelta(days=30)

    new_action = Action(
        node_id=user.node_id,
        title=data['title'],
        details=data['details'],
        instructions=data.get('instructions'),
        action_tile=file_url or None,
        action_type=data.get('action_type'),
        is_online=is_online,
        is_global=is_global,
        latitude=latitude,
        longitude=longitude,
        address=data.get('address', None) if not is_online and not is_global else None,
        city=data.get('city', None) if not is_online and not is_global else None,
        country=data.get('country', None) if not is_online and not is_global else None,
        start_date=start_dt,
        end_date=end_dt,
        first_milestone=data.get('first_milestone'),
        second_milestone=data.get('second_milestone'),
        final_milestone=data.get('final_milestone', 100),
        points_assigned=data['points_assigned'],
        recurrence=data.get('recurrence', 'none'),
        user_id=user.id,
        completions=0  # Initialize completions
    )
    db.session.add(new_action)
    db.session.commit()
    return jsonify(new_action.to_dict()), 201


@routes.route('/api/actions/<int:action_id>', methods=['PUT'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def update_action(action_id):
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if user.role != 'organizer':
        return jsonify({'message': 'Permission denied'}), 403
    action = Action.query.get_or_404(action_id)
    form_data = request.form.to_dict(flat=True)
    try:
        data = ActionSchema().load(form_data, partial=True)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400

    is_online = bool(data.get('is_online')) if 'is_online' in data else action.is_online
    is_global = bool(data.get('is_global')) if 'is_global' in data else action.is_global
    latitude = None if is_online or is_global else parse_float(data.get('latitude'))
    longitude = None if is_online or is_global else parse_float(data.get('longitude'))

    if 'file' in request.files:
        file = request.files['file']
        if file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(file_path):
                if 'X-Confirm-Overwrite' not in request.headers and not current_app.config.get("ALPHA_PUBLIC"):
                    return jsonify({'message': 'File already exists. Do you want to overwrite it?'}), 409
            file.save(file_path)
            file_url = _upload_public_url(filename)
            action.action_tile = file_url

    if 'title' in data:
        action.title = data['title']
    if 'details' in data:
        action.details = data['details']
    if 'instructions' in data:
        action.instructions = data['instructions']
    if 'action_type' in data:
        action.action_type = data.get('action_type')
    action.is_online = is_online
    action.is_global = is_global
    if 'latitude' in data or 'longitude' in data:
        action.latitude = latitude
        action.longitude = longitude
    if 'address' in data or 'city' in data or 'country' in data:
        action.address = data.get('address', None) if not is_online and not is_global else None
        action.city = data.get('city', None) if not is_online and not is_global else None
        action.country = data.get('country', None) if not is_online and not is_global else None
    if 'start_date' in data:
        action.start_date = datetime.combine(data['start_date'], datetime.min.time()) if data.get('start_date') else None
    if 'end_date' in data:
        action.end_date = datetime.combine(data['end_date'], datetime.min.time()) if data.get('end_date') else None
    if 'first_milestone' in data:
        action.first_milestone = data.get('first_milestone')
    if 'second_milestone' in data:
        action.second_milestone = data.get('second_milestone')
    if 'final_milestone' in data:
        action.final_milestone = data.get('final_milestone', 100)
    if 'points_assigned' in data:
        action.points_assigned = data['points_assigned']
    if 'recurrence' in data:
        action.recurrence = data['recurrence']

    db.session.commit()
    return jsonify(action.to_dict()), 200


@routes.route('/api/actions/<int:action_id>', methods=['GET'])
def get_action_detail(action_id):
    action = Action.query.get_or_404(action_id)
    return jsonify(action.to_dict()), 200


@routes.route('/api/actions/<int:action_id>', methods=['DELETE'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def delete_action(action_id):
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    if user.role != 'organizer':
        return jsonify({'message': 'Permission denied'}), 403
    action = Action.query.get_or_404(action_id)
    # Clean up dependent records to avoid FK constraint errors
    Todo.query.filter_by(action_id=action_id).delete(synchronize_session=False)
    ActionProof.query.filter_by(action_id=action_id).delete(synchronize_session=False)
    ActionImpactMetric.query.filter_by(action_id=action_id).delete(synchronize_session=False)
    db.session.delete(action)
    db.session.commit()
    return jsonify({'message': 'Action deleted successfully'}), 200


def update_pandl(user_id, points_earned):
    user = User.query.get(user_id)
    if user:
        user.points += points_earned
        while user.points >= user.points_to_level_up:
            user.points -= user.points_to_level_up  # Deduct points for level up
            user.level += 1  # Increase level
            user.points_to_level_up = int(user.points_to_level_up * 1.5)  # Update points needed for next level
        db.session.commit()


@routes.route('/complete_action/<int:action_id>', methods=['POST'])
@alpha_jwt_required()
def complete_action(action_id):
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if not user:
        return jsonify({"error": {"code": "not_found", "message": "User not found"}}), 404
    action = Action.query.get(action_id)
    if not action:
        return jsonify({"error": {"code": "not_found", "message": "Action not found"}}), 404
    action.completions = (action.completions or 0) + 1
    todo = Todo.query.filter_by(user_id=user.id, action_id=action_id).first()
    if todo:
        todo.is_completed = True
        if todo.completed_at is None:
            todo.completed_at = datetime.utcnow()
    else:
        todo = Todo(
            title=action.title,
            is_completed=True,
            completed_at=datetime.utcnow(),
            user_id=user.id,
            action_id=action_id,
        )
        db.session.add(todo)
    update_pandl(user.id, action.points_assigned)
    # Audit + credits
    db.session.add(AuditRecord(
        actor_id=user.id,
        action="action_completed",
        entity_type="action",
        entity_id=str(action.id),
        payload={"title": action.title, "points": action.points_assigned},
    ))
    if is_enabled("civic_credit_engine"):
        credit_engine_service.award_credit(
            user_id=user.id,
            node_id=user.node_id or 1,
            amount=int(action.points_assigned or 0),
            source_type="action_complete",
            description=f"Completed action: {action.title}",
            reference_id=str(action.id),
        )
    db.session.commit()
    return jsonify({"success": True, "newCompletions": action.completions}), 200


@routes.route('/action/<int:action_id>', methods=['GET'])
def get_action(action_id):
    action = Action.query.get(action_id)
    if action:
        return jsonify({
            'id': action.id,
            'title': action.title,
            'details': action.details,
            'instructions': action.instructions,
            'city': action.city,
            'country': action.country,
            'completions': action.completions,
            'end_date': action.end_date.strftime('%Y-%m-%d') if action.end_date else None
        })
    return jsonify({'message': 'Action not found'}), 404


@routes.route('/api/actions/<int:action_id>/proofs', methods=['GET'])
def get_action_proofs(action_id):
    Action.query.get_or_404(action_id)
    proofs = ActionProof.query.filter_by(action_id=action_id).order_by(ActionProof.created_at.desc()).all()
    payload = [{
        "id": proof.id,
        "action_id": proof.action_id,
        "user_id": proof.user_id,
        "before_url": proof.before_url,
        "after_url": proof.after_url,
        "proof_url": proof.proof_url,
        "verified": proof.verified,
        "created_at": proof.created_at.isoformat() if proof.created_at else None,
    } for proof in proofs]
    return jsonify(payload), 200


@routes.route('/api/actions/<int:action_id>/proofs', methods=['POST'])
@alpha_jwt_required()
def create_action_proof(action_id):
    user = _current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404
    Action.query.get_or_404(action_id)
    data = request.get_json() or {}
    proof = ActionProof(
        action_id=action_id,
        user_id=user.id,
        before_url=data.get("before_url"),
        after_url=data.get("after_url"),
        proof_url=data.get("proof_url"),
        verified=bool(data.get("verified")) if not current_app.config.get("ALPHA_PUBLIC") else True,
    )
    db.session.add(proof)
    db.session.commit()
    if is_enabled("civic_credit_engine") and proof.verified:
        credit_engine_service.award_credit(
            user_id=user.id,
            node_id=user.node_id or 1,
            amount=8,
            source_type="proof",
            description="Verified impact proof",
            reference_id=str(proof.id),
        )
    return jsonify({
        "id": proof.id,
        "action_id": proof.action_id,
        "user_id": proof.user_id,
        "before_url": proof.before_url,
        "after_url": proof.after_url,
        "proof_url": proof.proof_url,
        "verified": proof.verified,
        "created_at": proof.created_at.isoformat() if proof.created_at else None,
    }), 201


@routes.route('/api/actions/<int:action_id>/metrics', methods=['GET'])
def get_action_metrics(action_id):
    Action.query.get_or_404(action_id)
    metrics = ActionImpactMetric.query.filter_by(action_id=action_id).order_by(ActionImpactMetric.created_at.desc()).all()
    payload = [{
        "id": metric.id,
        "action_id": metric.action_id,
        "label": metric.label,
        "value": metric.value,
        "unit": metric.unit,
        "created_at": metric.created_at.isoformat() if metric.created_at else None,
    } for metric in metrics]
    return jsonify(payload), 200


@routes.route('/api/actions/<int:action_id>/metrics', methods=['POST'])
@alpha_jwt_required()
def create_action_metric(action_id):
    user = _current_user()
    if not user:
        return jsonify({"message": "User not found"}), 404
    Action.query.get_or_404(action_id)
    data = request.get_json() or {}
    label = (data.get("label") or "").strip()
    if not label:
        return jsonify({"message": "Label is required"}), 400
    try:
        value = float(data.get("value"))
    except (TypeError, ValueError):
        return jsonify({"message": "Value must be numeric"}), 400
    metric = ActionImpactMetric(
        action_id=action_id,
        label=label[:120],
        value=value,
        unit=(data.get("unit") or "")[:40] or None,
    )
    db.session.add(metric)
    db.session.commit()
    return jsonify({
        "id": metric.id,
        "action_id": metric.action_id,
        "label": metric.label,
        "value": metric.value,
        "unit": metric.unit,
        "created_at": metric.created_at.isoformat() if metric.created_at else None,
    }), 201


@routes.route('/api/add_to_todo/<int:action_id>', methods=['POST'])
@alpha_jwt_required()
def add_to_todo(action_id):
    try:
        current_user = _normalize_identity(get_jwt_identity())
        user = User.query.filter_by(username=current_user['username']).first()
        if not user:
            return jsonify({'message': 'User not found'}), 404
        action = Action.query.get(action_id)
        if not action:
            return jsonify({'message': 'Action not found'}), 404
        data = request.get_json(silent=True) or request.form.to_dict(flat=True)
        title = (data.get('title') or action.title or "").strip()
        if not title:
            return jsonify({"message": "Validation error", "errors": {"title": ["Title is required"]}}), 400
        try:
            payload = TodoSchema().load({"title": title})
        except ValidationError as exc:
            return jsonify({"message": "Validation error", "errors": exc.messages}), 400
        existing = Todo.query.filter_by(user_id=user.id, action_id=action_id).first()
        if existing:
            return jsonify({"message": "Action already in todo list", "id": existing.id}), 200
        new_todo = Todo(
            title=payload.get('title'),
            is_completed=False,
            user_id=user.id,
            action_id=action_id
        )
        db.session.add(new_todo)
        db.session.commit()
        return jsonify({"message": "Action added to ToDo list", "id": new_todo.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Failed to add action to ToDo list", "error": str(e)}), 500


@routes.route('/api/todos', methods=['GET'])
@alpha_jwt_required()
def get_todos():
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if not user:
        return jsonify({"ok": False, "message": "User not found"}), 404
    todos, pagination = _maybe_paginate(Todo.query.filter_by(user_id=user.id).order_by(Todo.id.desc()))
    payload = [{
        'id': todo.id,
        'action_id': todo.action_id,
        'is_completed': todo.is_completed,
        'title': (todo.action.title if todo.action else todo.title),
        'details': todo.action.details if todo.action else None,
        'instructions': todo.action.instructions if todo.action else None,
        'action_tile': todo.action.action_tile if todo.action else None,
        'action_type': todo.action.action_type if todo.action else None,
        'is_online': todo.action.is_online if todo.action else None,
        'is_global': todo.action.is_global if todo.action else None,
        'latitude': todo.action.latitude if todo.action else None,
        'longitude': todo.action.longitude if todo.action else None,
        'address': todo.action.address if todo.action else None,
        'city': todo.action.city if todo.action else None,
        'country': todo.action.country if todo.action else None,
        'completions': todo.action.completions if todo.action else None,
        'end_date': todo.action.end_date.strftime('%Y-%m-%d') if todo.action and todo.action.end_date else None,
        'first_milestone': todo.action.first_milestone if todo.action else None,
        'second_milestone': todo.action.second_milestone if todo.action else None,
        'final_milestone': todo.action.final_milestone if todo.action else None,
        'points_assigned': todo.action.points_assigned if todo.action else None
    } for todo in todos]
    if pagination:
        return jsonify({"ok": True, "data": payload, "pagination": pagination}), 200
    return jsonify({"ok": True, "data": payload}), 200


def allowed_file(filename):
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in app.config['ALLOWED_EXTENSIONS']


def upload_file(query):
    if 'file' not in query.files:
        return jsonify({'message': 'No file part'}), 400
    file = query.files['file']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            if 'X-Confirm-Overwrite' not in query.headers:
                return jsonify({'message': 'File already exists. Do you want to overwrite it?'}), 409
        file.save(file_path)
        file_url = _upload_public_url(filename)
        return jsonify({'file_url': file_url}), 200
    return jsonify({'message': 'File type not allowed'}), 400


@routes.route('/api/events', methods=['POST'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
@require_mode_allows("event_create")
def create_event():
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if user.role != 'organizer':
        return jsonify({'message': 'Permission denied'}), 403

    data = request.get_json() or {}
    try:
        payload = EventSchema().load(data)
    except ValidationError as exc:
        return jsonify({
            "error": {
                "code": "validation_error",
                "message": "Validation error",
                "details": exc.messages,
            }
        }), 422
    if not payload.get("venue_id"):
        payload["is_online"] = True
        virtual = Venue.query.filter_by(name="Virtual Venue", user_id=user.id).first()
        if not virtual:
            virtual = Venue(
                name="Virtual Venue",
                address="Online",
                city="Online",
                country="Global",
                latitude=0.0,
                longitude=0.0,
                is_online=True,
                is_global=True,
                user_id=user.id,
            )
            db.session.add(virtual)
            db.session.commit()
        payload["venue_id"] = virtual.id
    if is_enabled("OIL_COLLISION_DETECTION"):
        score, reasons, formula_version, cfg = check_collision(payload, actor_id=user.id)
        if score >= cfg["hard_stop_threshold"]:
            from .services.collision_detection_service import create_review
            create_review(event_id=payload.get("id") or 0, actor_id=user.id, status="pending", notes="Auto review created")
            return jsonify({
                "message": "Event requires manual review due to collision risk",
                "collision": {"score": score, "reasons": reasons},
                "manual_review_required": True,
            }), 409
        if score >= cfg["score_threshold"] and not payload.get("collision_acknowledged", False):
            return jsonify({
                "message": "Collision risk detected. Acknowledgement required.",
                "collision": {"score": score, "reasons": reasons},
                "acknowledgement_required": True,
            }), 409
    event = Event(
        node_id=user.node_id,
        title=payload['title'],
        description=payload['description'],
        address=payload.get('address'),
        city=payload.get('city'),
        country=payload.get('country'),
        latitude=payload.get('latitude'),
        longitude=payload.get('longitude'),
        date=datetime.combine(payload['date'], datetime.min.time()),
        time=payload['time'],
        venue_id=payload.get('venue_id'),
        is_online=payload.get('is_online', False),
        is_global=payload.get('is_global', False),
        goal=payload['goal'],
        reminder_week=payload.get('reminder_week', ''),
        reminder_day=payload.get('reminder_day', ''),
        reminder_hours=payload.get('reminder_hours', ''),
        risk_tier_id=payload.get('risk_tier_id'),
        min_cert_level=payload.get('min_cert_level'),
        compliance_checklist_complete=payload.get('compliance_checklist_complete', False),
        user_id=user.id  # Assign user_id here
    )
    db.session.add(event)
    db.session.commit()
    db.session.add(EventPrimitive(
        actor_id=user.id,
        entity_type="event",
        entity_id=str(event.id),
        event_type="event_created",
        props={"city": event.city, "goal": event.goal},
        node_id=user.node_id,
        consent=True,
    ))
    db.session.commit()
    if is_enabled("OIL_COLLISION_DETECTION"):
        score, reasons, formula_version, _ = check_collision(payload, actor_id=user.id)
        record_collision(
            event.id,
            score,
            reasons,
            formula_version,
            actor_id=user.id,
            acknowledged_by=user.id if payload.get("collision_acknowledged") else None,
        )
    return jsonify(event.to_dict()), 201


@routes.route('/api/events', methods=['GET'])
def get_events():
    query = Event.query
    if getattr(g, "node_id", None):
        query = query.filter_by(node_id=g.node_id)
    events, pagination = _maybe_paginate(query.order_by(Event.id.desc()))
    payload = [event.to_dict() for event in events]
    if pagination:
        return jsonify({"ok": True, "data": payload, "pagination": pagination}), 200
    return jsonify({"ok": True, "data": payload}), 200


@routes.route('/api/events/<int:id>', methods=['GET'])
def get_event(id):
    event = Event.query.get_or_404(id)
    return jsonify(event.to_dict()), 200


@routes.route('/api/events/<int:id>', methods=['PUT'])
@alpha_jwt_required()
def update_event(id):
    event = Event.query.get_or_404(id)
    data = request.get_json() or {}
    try:
        payload = EventSchema().load(data, partial=True)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    if is_enabled("OIL_COLLISION_DETECTION"):
        score, reasons, formula_version, cfg = check_collision(payload, actor_id=event.user_id)
        if score >= cfg["hard_stop_threshold"]:
            from .services.collision_detection_service import create_review
            create_review(event_id=event.id, actor_id=event.user_id, status="pending", notes="Auto review created")
            return jsonify({
                "message": "Event update requires manual review due to collision risk",
                "collision": {"score": score, "reasons": reasons},
                "manual_review_required": True,
            }), 409
        if score >= cfg["score_threshold"] and not payload.get("collision_acknowledged", False):
            return jsonify({
                "message": "Collision risk detected. Acknowledgement required.",
                "collision": {"score": score, "reasons": reasons},
                "acknowledgement_required": True,
            }), 409
    if 'title' in payload:
        event.title = payload.get('title', event.title)
    if 'description' in payload:
        event.description = payload.get('description', event.description)
    if 'date' in payload:
        event.date = datetime.combine(payload['date'], datetime.min.time()) if payload.get('date') else event.date
    if 'time' in payload:
        event.time = payload.get('time', event.time)
    if 'address' in payload:
        event.address = payload.get('address', event.address)
    if 'city' in payload:
        event.city = payload.get('city', event.city)
    if 'country' in payload:
        event.country = payload.get('country', event.country)
    if 'latitude' in payload:
        event.latitude = payload.get('latitude', event.latitude)
    if 'longitude' in payload:
        event.longitude = payload.get('longitude', event.longitude)
    if 'is_online' in payload:
        event.is_online = payload.get('is_online', event.is_online)
    if 'is_global' in payload:
        event.is_global = payload.get('is_global', event.is_global)
    if 'venue_id' in payload:
        event.venue_id = payload.get('venue_id', event.venue_id)
    db.session.commit()
    if is_enabled("OIL_COLLISION_DETECTION"):
        score, reasons, formula_version, _ = check_collision(payload, actor_id=event.user_id)
        record_collision(
            event.id,
            score,
            reasons,
            formula_version,
            actor_id=event.user_id,
            acknowledged_by=event.user_id if payload.get("collision_acknowledged") else None,
        )
    return jsonify(event.to_dict()), 200


@routes.route('/api/events/<int:id>/attend', methods=['POST'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def attend_event(id):
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    event = Event.query.get_or_404(id)

    if not event:
        return jsonify({'message': 'Event not found'}), 404

    event.attendees += 1
    db.session.commit()

    if event.attendees == event.goal:
        update_pandl(event.user_id, event.points_assigned)
        organizer = User.query.get(event.user_id)
        if organizer and is_enabled("civic_credit_engine"):
            credit_engine_service.award_credit(
                user_id=organizer.id,
                node_id=organizer.node_id or 1,
                amount=12,
                source_type="event",
                description="Event delivery credit",
                reference_id=str(event.id),
            )

    return jsonify(event.to_dict()), 200


@routes.route('/api/events/<int:id>', methods=['DELETE'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def delete_event(id):
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if user.role != 'organizer':
        return jsonify({'message': 'Permission denied'}), 403

    event = Event.query.get_or_404(id)
    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Event deleted successfully'}), 200


@routes.route('/api/events/<int:event_id>/compliance', methods=['POST'])
@alpha_jwt_required()
def sign_event_compliance(event_id):
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    event = Event.query.get_or_404(event_id)
    data = request.get_json() or {}
    event.compliance_checklist_complete = bool(data.get('compliance_checklist_complete', True))
    event.compliance_signed_at = datetime.utcnow()
    event.compliance_signed_by = user.id
    db.session.commit()
    return jsonify({
        'event_id': event.id,
        'compliance_checklist_complete': event.compliance_checklist_complete,
        'compliance_signed_at': event.compliance_signed_at.isoformat() if event.compliance_signed_at else None,
        'compliance_signed_by': event.compliance_signed_by,
    }), 200


@routes.route('/api/articles', methods=['POST'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def create_article():
    data = request.get_json() or {}
    try:
        payload = ArticleSchema().load(data)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    if _has_destructive_content(payload.get("title")) or _has_destructive_content(payload.get("content")):
        return jsonify({"message": "Content violates community safety guidelines"}), 400
    current_user = _normalize_identity(get_jwt_identity())
    username = current_user.get('username')
    if not username:
        return jsonify({'message': 'Invalid user'}), 401

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    new_article = Article(
        node_id=user.node_id,
        title=payload['title'],
        content=payload['content'],
        author_pseudonym=user.pseudonym,
        microcosm_id=payload.get('microcosm_id'),
        author_id=user.id,
        category=payload['category']  # Add category to the Article model
    )
    db.session.add(new_article)
    db.session.commit()

    payload = new_article.to_dict()
    payload['author_pseudonym'] = user.pseudonym
    return jsonify(payload), 201


@routes.route('/api/articles', methods=['GET'])
def get_articles():
    articles_query = Article.query
    if getattr(g, "node_id", None):
        articles_query = articles_query.filter_by(node_id=g.node_id)
    articles_query = articles_query.order_by(Article.featured.desc(), Article.created_at.desc())
    if "page" in request.args or "limit" in request.args:
        articles, pagination = _maybe_paginate(articles_query)
        payload = [article.to_dict() for article in articles]
        return jsonify({"data": payload, "pagination": pagination}), 200
    articles = articles_query.limit(100).all()
    categorized_articles = {
        'opinion': [article.to_dict() for article in articles if article.category == 'Opinion'],
        'news': [article.to_dict() for article in articles if article.category == 'News'],
        'creative': [article.to_dict() for article in articles if article.category == 'Creative']
    }
    return jsonify(categorized_articles), 200


@routes.route('/api/articles/<int:article_id>/comments', methods=['GET'])
def get_article_comments(article_id):
    comments, pagination = _maybe_paginate(
        Comment.query.filter_by(article_id=article_id).order_by(Comment.timestamp.asc())
    )
    payload = []
    for comment in comments:
        data = comment.to_dict()
        data['author_pseudonym'] = comment.user.pseudonym if comment.user else None
        payload.append(data)
    if pagination:
        return jsonify({"data": payload, "pagination": pagination}), 200
    return jsonify(payload), 200


@routes.route('/api/articles/<int:article_id>/comments', methods=['POST'])
@alpha_jwt_required()
def add_article_comment(article_id):
    current_user = _normalize_identity(get_jwt_identity())
    username = current_user.get('username')
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    data = request.get_json() or {}
    try:
        payload = CommentSchema().load(data)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    if _has_destructive_content(payload.get("content")):
        return jsonify({"message": "Content violates community safety guidelines"}), 400
    article = Article.query.get_or_404(article_id)
    new_comment = Comment(
        content=payload['content'],
        user_id=user.id,
        article_id=article.id
    )
    db.session.add(new_comment)
    db.session.commit()
    payload = new_comment.to_dict()
    payload['author_pseudonym'] = user.pseudonym
    return jsonify(payload), 201


@routes.route('/api/articles/<int:id>', methods=['GET'])
def get_article(id):
    article = Article.query.get_or_404(id)
    return jsonify(article.to_dict()), 200


@routes.route('/api/articles/<int:id>', methods=['PUT'])
@alpha_jwt_required()
def update_article(id):
    article = Article.query.get_or_404(id)
    data = request.get_json() or {}
    try:
        payload = ArticleSchema().load(data, partial=True)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    if 'title' in payload:
        article.title = payload.get('title', article.title)
    if 'content' in payload:
        article.content = payload.get('content', article.content)
    if 'category' in payload:
        article.category = payload.get('category', article.category)  # Update category
    if 'microcosm_id' in payload:
        article.microcosm_id = payload.get('microcosm_id', article.microcosm_id)
    db.session.commit()
    return jsonify(article.to_dict()), 200


@routes.route('/api/articles/<int:id>/feature', methods=['POST'])
@alpha_jwt_required()
def feature_article(id):
    article = Article.query.get_or_404(id)
    payload = request.get_json() or {}
    featured = bool(payload.get('featured', True))
    article.featured = featured
    db.session.commit()
    return jsonify(article.to_dict()), 200


@routes.route('/api/articles/<int:id>/like', methods=['POST'])
@alpha_jwt_required()
def like_article(id):
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    article = Article.query.get_or_404(id)

    favorite = Favorite.query.filter_by(user_id=user.id, favorite_id=article.id, favorite_type='article').first()
    if favorite:
        return jsonify({'message': 'Already liked'}), 400

    new_favorite = Favorite(user_id=user.id, favorite_id=article.id, favorite_type='article')
    db.session.add(new_favorite)
    update_pandl(article.user_id, 1)
    db.session.commit()

    return jsonify({'message': 'Article liked successfully'}), 200


@routes.route('/api/articles/<int:id>/unlike', methods=['POST'])
@alpha_jwt_required()
def unlike_article(id):
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    article = Article.query.get_or_404(id)

    favorite = Favorite.query.filter_by(user_id=user.id, favorite_id=article.id, favorite_type='article').first()
    if not favorite:
        return jsonify({'message': 'Not liked yet'}), 400

    db.session.delete(favorite)
    update_pandl(article.user_id, -1)
    db.session.commit()

    return jsonify({'message': 'Article unliked successfully'}), 200


@routes.route('/api/articles/<int:id>', methods=['DELETE'])
@alpha_jwt_required()
def delete_article(id):
    article = Article.query.get_or_404(id)
    db.session.delete(article)
    db.session.commit()
    return jsonify({'message': 'Article deleted successfully'}), 200


@routes.route('/api/venues', methods=['POST'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def create_venue():
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if user.role != 'organizer':
        return jsonify({'message': 'Permission denied'}), 403

    data = request.get_json() or {}
    try:
        payload = VenueSchema().load(data)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400

    try:
        venue = Venue(
            name=payload['name'],
            address=payload['address'],
            city=payload['city'],  # Ensure city is passed
            country=payload['country'],  # Ensure country is passed
            latitude=payload['latitude'],
            longitude=payload['longitude'],
            is_online=payload.get('is_online', False),
            is_global=payload.get('is_global', False),
            user_id=user.id  # Assign user_id here
        )
        db.session.add(venue)
        db.session.commit()
        return jsonify(venue.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error creating venue: {e}")
        return jsonify({'message': 'Failed to create venue', 'error': str(e)}), 500


@routes.route('/api/venues', methods=['GET'])
def get_venues():
    venues, pagination = _maybe_paginate(Venue.query.order_by(Venue.id.desc()))
    payload = [venue.to_dict() for venue in venues]
    if pagination:
        return jsonify({"data": payload, "pagination": pagination}), 200
    return jsonify(payload), 200


@routes.route('/api/venues/<int:id>', methods=['GET'])
def get_venue(id):
    venue = Venue.query.get_or_404(id)
    return jsonify(venue.to_dict()), 200


@routes.route('/api/venues/<int:id>', methods=['PUT'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def update_venue(id):
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if user.role != 'organizer':
        return jsonify({'message': 'Permission denied'}), 403

    data = request.get_json() or {}
    try:
        payload = VenueSchema().load(data, partial=True)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    venue = Venue.query.get_or_404(id)
    if 'name' in payload:
        venue.name = payload.get('name', venue.name)
    if 'address' in payload:
        venue.address = payload.get('address', venue.address)
    if 'city' in payload:
        venue.city = payload.get('city', venue.city)
    if 'country' in payload:
        venue.country = payload.get('country', venue.country)
    if 'latitude' in payload:
        venue.latitude = float(payload.get('latitude', venue.latitude))
    if 'longitude' in payload:
        venue.longitude = float(payload.get('longitude', venue.longitude))
    db.session.commit()
    return jsonify(venue.to_dict()), 200


@routes.route('/api/venues/<int:id>', methods=['DELETE'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def delete_venue(id):
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if user.role != 'organizer':
        return jsonify({'message': 'Permission denied'}), 403

    venue = Venue.query.get_or_404(id)
    db.session.delete(venue)
    db.session.commit()
    return jsonify({'message': 'Venue deleted successfully'}), 200


@routes.route('/api/notifications', methods=['POST'])
@alpha_jwt_required()
def create_notification():
    data = request.get_json() or {}
    try:
        payload = NotificationSchema().load(data)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    notification = Notification(user_id=payload['user_id'], message=payload['message'])
    db.session.add(notification)
    db.session.commit()
    return jsonify(notification.to_dict()), 201


@routes.route('/api/notifications', methods=['GET'])
@alpha_jwt_required()
def get_notifications():
    user = _current_user()
    if not user:
        return jsonify([]), 200
    user_id = user.id
    notifications, pagination = _maybe_paginate(
        Notification.query.filter_by(user_id=user_id).order_by(Notification.id.desc())
    )
    payload = [notification.to_dict() for notification in notifications]
    if pagination:
        return jsonify({"data": payload, "pagination": pagination}), 200
    return jsonify(payload), 200


@routes.route('/api/notifications/<int:id>', methods=['PUT'])
@alpha_jwt_required()
def update_notification(id):
    notification = Notification.query.get_or_404(id)
    data = request.get_json() or {}
    try:
        payload = NotificationSchema().load(data, partial=True)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    if 'message' in payload:
        notification.message = payload.get('message', notification.message)
    db.session.commit()
    return jsonify(notification.to_dict()), 200


@routes.route('/api/notifications/<int:id>', methods=['DELETE'])
@alpha_jwt_required()
def delete_notification(id):
    notification = Notification.query.get_or_404(id)
    db.session.delete(notification)
    db.session.commit()
    return jsonify({'message': 'Notification deleted successfully'}), 200


def add_favorite(user_id, favorite_id, favorite_type):
    if favorite_type not in ['event', 'venue', 'article']:
        return jsonify({'message': 'Invalid favorite type'}), 400

    favorite = Favorite(user_id=user_id, favorite_id=favorite_id, favorite_type=favorite_type)
    db.session.add(favorite)
    db.session.commit()
    return jsonify({'message': f'{favorite_type.capitalize()} favorited successfully'}), 200


@routes.route('/api/favorite', methods=['POST'])
@alpha_jwt_required()
def favorite_item():
    user = _current_user()
    if not user:
        return jsonify({'message': 'No user context'}), 200
    user_id = user.id
    data = request.get_json()
    favorite_id = data.get('favorite_id')
    favorite_type = data.get('favorite_type')

    if not favorite_id or not favorite_type:
        return jsonify({'message': 'Favorite ID and type are required'}), 400

    return add_favorite(user_id, favorite_id, favorite_type)


@routes.route('/api/feedback', methods=['POST'])
@alpha_jwt_required()
def give_feedback():
    user = _current_user()
    if not user:
        return jsonify({'message': 'No user context'}), 200
    user_id = user.id
    data = request.get_json() or {}
    if "item_id" not in data and "id" in data:
        data["item_id"] = data.get("id")
    try:
        payload = FeedbackSchema().load(data)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    feedback_type = payload.get('type')  # e.g., 'event', 'action', 'venue', 'article', 'organiser', 'user', 'general'
    feedback_id = payload.get('item_id')  # ID of the event, action, etc.
    feedback_content = payload.get('content')

    feedback = Feedback(user_id=user_id, type=feedback_type, item_id=feedback_id, content=feedback_content)
    db.session.add(feedback)
    db.session.commit()

    return jsonify({'message': 'Feedback submitted successfully'}), 201


@routes.route('/api/feedback/<int:id>', methods=['GET'])
@alpha_jwt_required()
def get_feedback(id):
    feedback = Feedback.query.get_or_404(id)
    return jsonify(feedback.to_dict()), 200


@routes.route('/api/feedback/<int:id>', methods=['PUT'])
@alpha_jwt_required()
def update_feedback(id):
    feedback = Feedback.query.get_or_404(id)
    data = request.get_json() or {}
    try:
        payload = FeedbackSchema().load(data, partial=True)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    if 'content' in payload:
        feedback.content = payload.get('content', feedback.content)
    db.session.commit()
    return jsonify(feedback.to_dict()), 200


@routes.route('/api/feedback/<int:id>', methods=['DELETE'])
@alpha_jwt_required()
def delete_feedback(id):
    feedback = Feedback.query.get_or_404(id)
    db.session.delete(feedback)
    db.session.commit()
    return jsonify({'message': 'Feedback deleted successfully'}), 200


@routes.route('/api/tickets', methods=['POST'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def create_ticket():
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    data = request.get_json() or {}
    try:
        payload = TicketSchema().load(data)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    new_ticket = Ticket(
        user_id=user.id,
        event_id=payload['event_id'],
        ticket_type=payload['ticket_type'],
        price=payload['price']
    )
    db.session.add(new_ticket)
    db.session.commit()
    return jsonify(new_ticket.to_dict()), 201


@routes.route('/api/events/<int:event_id>/tickets', methods=['GET'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def get_tickets_by_event(event_id):
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    event = Event.query.get_or_404(event_id)
    if user.role != 'organizer' or event.venue_id != user.id:
        return jsonify({'message': 'Permission denied'}), 403
    tickets = Ticket.query.filter_by(event_id=event_id).all()
    return jsonify([ticket.to_dict() for ticket in tickets]), 200


def calculate_distance(lat1, lon1, lat2, lon2):
    return geodesic((lat1, lon1), (lat2, lon2)).km


@routes.route('/api/prioritized_actions', methods=['POST'])
def get_prioritized_actions():
    data = request.json
    user_location = data['user_location']
    max_display = data['max_display']

    physical_actions = Action.query.filter_by(is_online=False, is_global=False).all()
    online_actions = Action.query.filter_by(is_online=True).all()

    # Sort physical actions by distance, end date, and completions
    physical_actions.sort(key=lambda x: (
        calculate_distance(user_location[0], user_location[1], x.latitude, x.longitude),
        x.end_date,
        x.completions
    ))

    # Sort online actions by end date and completions
    online_actions.sort(key=lambda x: (
        x.end_date,
        x.completions
    ))

    actions = physical_actions + online_actions
    return jsonify([action.to_dict() for action in actions[:max_display]])


@routes.route('/api/tickets/<int:id>', methods=['DELETE'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def delete_ticket(id):
    ticket = Ticket.query.get_or_404(id)
    db.session.delete(ticket)
    db.session.commit()
    return jsonify({'message': 'Ticket deleted successfully'}), 200


@routes.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('query')
    results = {
        'actions': Action.query.filter(Action.title.ilike(f'%{query}%')).all(),
        'events': Event.query.filter(Event.title.ilike(f'%{query}%')).all(),
        'articles': Article.query.filter(Article.title.ilike(f'%{query}%')).all(),
        'venues': Venue.query.filter(Venue.name.ilike(f'%{query}%')).all()
    }
    results = {key: [item.to_dict() for item in value] for key, value in results.items()}
    return jsonify(results), 200


@routes.route('/api/messages', methods=['POST'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def send_message():
    data = request.get_json() or {}
    try:
        payload = MessageSchema().load(data)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    current_user = _normalize_identity(get_jwt_identity())
    username = current_user.get('username') if isinstance(current_user, dict) else current_user
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    new_message = Message(
        sender_id=user.id,
        receiver_id=payload['receiver_id'],
        content=payload['content']
    )
    db.session.add(new_message)
    db.session.commit()

    return jsonify({"message": "Message sent successfully"}), 201


@routes.route('/api/messages', methods=['GET'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def get_messages():
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    messages, pagination = _maybe_paginate(Message.query.filter(
        (Message.sender_id == user.id) | (Message.receiver_id == user.id)
    ).order_by(Message.timestamp.desc()))
    payload = [msg.to_dict() for msg in messages]
    if pagination:
        return jsonify({"data": payload, "pagination": pagination}), 200
    return jsonify(payload), 200


@routes.route('/api/microcosms', methods=['POST'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
@require_mode_allows("microcosm_create")
def create_microcosm():
    data = request.get_json() or {}
    try:
        payload = MicrocosmSchema().load(data)
    except ValidationError as exc:
        return jsonify({"message": "Validation error", "errors": exc.messages}), 400
    current_user = _normalize_identity(get_jwt_identity())

    # Ensure current_user is a string (username)
    if isinstance(current_user, dict):
        current_user = current_user.get('username')

    user = User.query.filter_by(username=current_user).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    name = payload.get('name')
    existing = Microcosm.query.filter_by(name=name).first()
    if existing:
        return jsonify({"message": "Microcosm already exists", "id": existing.id}), 200

    new_microcosm = Microcosm(name=name, description=payload.get('description'), creator_id=user.id, node_id=user.node_id)
    db.session.add(new_microcosm)
    db.session.commit()

    return jsonify({"message": "Microcosm created successfully"}), 201


@routes.route('/api/microcosms', methods=['GET'])
@alpha_jwt_required()
@cross_origin(supports_credentials=True)
def get_microcosms():
    query = Microcosm.query
    if getattr(g, "node_id", None):
        query = query.filter_by(node_id=g.node_id)
    microcosms, pagination = _maybe_paginate(query.order_by(Microcosm.id.desc()))
    microcosms_list = [{"id": m.id, "name": m.name, "description": m.description, "creator_id": m.creator_id} for m in microcosms]
    if pagination:
        return jsonify({"data": microcosms_list, "pagination": pagination}), 200
    return jsonify(microcosms_list), 200


@routes.route('/api/completed_actions/<int:user_id>', methods=['GET'])
@alpha_jwt_required()
def get_completed_actions(user_id):
    current_user = _normalize_identity(get_jwt_identity())
    user = User.query.filter_by(username=current_user['username']).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    if user.id != user_id and user.role not in ["node_admin", "platform_admin", "board_member"]:
        return jsonify({'message': 'Permission denied'}), 403
    completed_actions = Todo.query.filter_by(user_id=user_id, is_completed=True).order_by(Todo.completed_at.desc()).all()
    payload = [{
        'id': todo.id,
        'action_id': todo.action_id,
        'is_completed': todo.is_completed,
        'completed_at': todo.completed_at.isoformat() if todo.completed_at else None,
        'title': (todo.action.title if todo.action else todo.title),
        'details': todo.action.details if todo.action else None,
        'points_assigned': todo.action.points_assigned if todo.action else None
    } for todo in completed_actions]
    return jsonify({"ok": True, "data": payload}), 200
