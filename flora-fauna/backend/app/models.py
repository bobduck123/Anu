from datetime import datetime, timedelta, timezone
from sqlalchemy import event
from itsdangerous.serializer import Serializer
from werkzeug.security import generate_password_hash, check_password_hash
from flask import current_app

from .extensions import db
from .time_utils import now_utc


def utcnow():
    return now_utc()


def to_naive_utc(value):
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


class User(db.Model):
    __table_args__ = (
        db.Index('ix_user_global_subject_id', 'global_subject_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    global_subject_id = db.Column(db.String(120), nullable=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    pseudonym = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(50), default='participant')
    encrypted_identity_ref = db.Column(db.String(500), nullable=True)  # encrypted private identity reference
    is_suspended = db.Column(db.Boolean, default=False)
    suspension_reason = db.Column(db.String(500), nullable=True)
    bio = db.Column(db.String(500), nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)
    banner_url = db.Column(db.String(500), nullable=True)
    profile_theme = db.Column(db.String(50), default='default')
    location = db.Column(db.String(200), nullable=True)
    website_url = db.Column(db.String(300), nullable=True)
    points = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    points_to_level_up = db.Column(db.Integer, default=100)
    actions = db.relationship('Action', backref='user', lazy=True)
    todos = db.relationship('Todo', backref='user', lazy=True)
    purchased_tickets = db.relationship('Ticket', backref='user', lazy=True)
    favorites = db.relationship('Favorite', backref='user', lazy='dynamic')
    articles = db.relationship('Article', backref='author', lazy=True)
    feedbacks = db.relationship('Feedback', backref='user', lazy=True)
    comments = db.relationship('Comment', backref='user', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)
    microcosms = db.relationship('Microcosm', secondary='microcosm_user', back_populates='members')
    created_microcosms = db.relationship('Microcosm', backref='creator', lazy=True)
    sent_messages = db.relationship('Message', foreign_keys='Message.sender_id', backref='sender', lazy=True)
    received_messages = db.relationship('Message', foreign_keys='Message.receiver_id', backref='receiver', lazy=True)

    def get_reset_token(self, expires_sec=1800):
        s = Serializer(current_app.config['SECRET_KEY'], expires_sec)
        return s.dumps({'user_id': self.id}).decode('utf-8')

    @staticmethod
    def verify_reset_token(token):
        s = Serializer(current_app.config['SECRET_KEY'])
        try:
            user_id = s.loads(token)['user_id']
        except:
            return None
        return User.query.get(user_id)

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def get_completed_todos(self):
        return Todo.query.filter_by(user_id=self.id, is_completed=True).all()

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'pseudonym': self.pseudonym,
            'role': self.role,
            'points': self.points,
            'level': self.level,
            'points_to_level_up': self.points_to_level_up,
            'node_id': self.node_id,
            'globalSubjectId': self.global_subject_id,
            'bio': self.bio,
            'avatarUrl': self.avatar_url,
            'bannerUrl': self.banner_url,
            'profileTheme': self.profile_theme,
            'location': self.location,
            'websiteUrl': self.website_url,
        }


class Event(db.Model):
    __table_args__ = (
        db.Index('ix_event_date', 'date'),
        db.Index('ix_event_city', 'city'),
        db.Index('ix_event_user_id', 'user_id'),
        db.Index('ix_event_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    address = db.Column(db.String(200), nullable=True)
    city = db.Column(db.String(50), nullable=True)
    country = db.Column(db.String(50), nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    is_online = db.Column(db.Boolean, default=False)
    is_global = db.Column(db.Boolean, default=False)
    date = db.Column(db.DateTime, nullable=False)
    time = db.Column(db.Time, nullable=False)
    venue_id = db.Column(db.Integer, db.ForeignKey('venue.id'), nullable=False)
    attendees = db.Column(db.Integer, default=0)
    goal = db.Column(db.Integer, nullable=False)  # Single goal
    points_assigned = db.Column(db.Integer, default=0)
    tickets = db.relationship('Ticket', backref='event', lazy=True)
    reminder_week = db.Column(db.String(500), nullable=True)  # Custom reminder messages
    reminder_day = db.Column(db.String(500), nullable=True)
    reminder_hours = db.Column(db.String(500), nullable=True)
    risk_tier_id = db.Column(db.Integer, db.ForeignKey('risk_tier.id'), nullable=True)
    min_cert_level = db.Column(db.Integer, nullable=True)
    compliance_checklist_complete = db.Column(db.Boolean, default=False)
    compliance_signed_at = db.Column(db.DateTime, nullable=True)
    compliance_signed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'nodeId': self.node_id,
            'title': self.title,
            'description': self.description,
            'date': self.date.isoformat(),
            'time': self.time.isoformat(),
            'address': self.address,
            'city': self.city,
            'country': self.country,
            'longitude': self.longitude,
            'latitude': self.latitude,
            'is_online': self.is_online,
            'is_global': self.is_global,
            'venue_id': self.venue_id,
            'attendees': self.attendees,
            'goal': self.goal,
            'points_assigned': self.points_assigned,
            'reminder_week': self.reminder_week,
            'reminder_day': self.reminder_day,
            'reminder_hours': self.reminder_hours,
            'risk_tier_id': self.risk_tier_id,
            'min_cert_level': self.min_cert_level,
            'compliance_checklist_complete': self.compliance_checklist_complete,
            'compliance_signed_at': self.compliance_signed_at.isoformat() if self.compliance_signed_at else None,
            'compliance_signed_by': self.compliance_signed_by,
            'user_id': self.user_id
        }


class Venue(db.Model):
    __table_args__ = (
        db.Index('ix_venue_city', 'city'),
        db.Index('ix_venue_country', 'country'),
        db.Index('ix_venue_user_id', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), nullable=False)
    city = db.Column(db.String(100), nullable=False)  # Add city field
    country = db.Column(db.String(100), nullable=False)  # Add country field
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    is_online = db.Column(db.Boolean, default=False)
    is_global = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'city': self.city,
            'country': self.country,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'is_online': self.is_online,
            'is_global': self.is_global,
            'user_id': self.user_id
        }


class Microcosm(db.Model):
    __table_args__ = (
        db.Index('ix_microcosm_creator_id', 'creator_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    members = db.relationship('User', secondary='microcosm_user', back_populates='microcosms')
    articles = db.relationship('Article', backref='microcosm', lazy=True)
    teams = db.relationship('Team', backref='microcosm', lazy=True)


microcosm_user = db.Table('microcosm_user',
    db.Column('microcosm_id', db.Integer, db.ForeignKey('microcosm.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)


class Article(db.Model):
    __table_args__ = (
        db.Index('ix_article_category', 'category'),
        db.Index('ix_article_author_id', 'author_id'),
        db.Index('ix_article_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author_pseudonym = db.Column(db.String(80), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=True)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    comments = db.relationship('Comment', backref='article', lazy=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    featured = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'nodeId': self.node_id,
            'title': self.title,
            'content': self.content,
            'author_pseudonym': self.author_pseudonym,
            'microcosm_id': self.microcosm_id,
            'author_id': self.author_id,
            'category': self.category,
            'featured': self.featured,
        }


class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'), nullable=False)


class Action(db.Model):
    __table_args__ = (
        db.Index('ix_action_user_id', 'user_id'),
        db.Index('ix_action_end_date', 'end_date'),
        db.Index('ix_action_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    title = db.Column(db.String(100), nullable=False)
    details = db.Column(db.String(1000), nullable=False)
    instructions = db.Column(db.String(1000), nullable=True)
    action_tile = db.Column(db.String(200), nullable=True)
    action_type = db.Column(db.String(50), nullable=False)
    is_online = db.Column(db.Boolean, default=False)
    is_global = db.Column(db.Boolean, default=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    address = db.Column(db.String(200), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=True)
    start_date = db.Column(db.DateTime, nullable=False, default=utcnow)
    end_date = db.Column(db.DateTime, nullable=False)
    first_milestone = db.Column(db.String(100), nullable=True)
    second_milestone = db.Column(db.String(100), nullable=True)
    final_milestone = db.Column(db.String(100), nullable=True)
    points_assigned = db.Column(db.Integer, nullable=False)
    recurrence = db.Column(db.String(50), nullable=False, default='none')
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    completions = db.Column(db.Integer, default=0)  # Add completions attribute
    created_at = db.Column(db.DateTime, default=utcnow)

    def get_recurring_actions(self):
        actions = []
        if self.recurrence == 'none':
            return actions

        interval = {
            'daily': timedelta(days=1),
            'weekly': timedelta(weeks=1),
            'monthly': timedelta(weeks=4),
        }.get(self.recurrence, timedelta(days=0))

        if interval <= timedelta(0):
            return actions

        end_date = to_naive_utc(self.end_date)
        if end_date is None:
            return actions

        current_date = end_date + interval
        horizon = utcnow() + timedelta(days=365)  # Limit to 1 year

        while current_date <= horizon:
            new_action = Action(
                title=self.title,
                details=self.details,
                instructions=self.instructions,
                action_tile=self.action_tile,
                action_type=self.action_type,
                is_online=self.is_online,
                is_global=self.is_global,
                latitude=self.latitude,
                longitude=self.longitude,
                address=self.address,
                city=self.city,
                country=self.country,
                start_date=current_date,
                end_date=end_date,
                first_milestone=self.first_milestone,
                second_milestone=self.second_milestone,
                final_milestone=self.final_milestone,
                points_assigned=self.points_assigned,
                recurrence='none',  # Stop further recursion
                user_id=self.user_id,
                completions=self.completions  # Maintain completions value
            )
            actions.append(new_action)
            current_date += interval
        return actions

    def to_dict(self, include_recurring=True):
        action_dict = {
            'id': self.id,
            'nodeId': self.node_id,
            'title': self.title,
            'details': self.details,
            'instructions': self.instructions,
            'action_tile': self.action_tile,
            'action_type': self.action_type,
            'is_online': self.is_online,
            'is_global': self.is_global,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'city': self.city,
            'country': self.country,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'first_milestone': self.first_milestone,
            'second_milestone': self.second_milestone,
            'final_milestone': self.final_milestone,
            'points_assigned': self.points_assigned,
            'recurrence': self.recurrence,
            'user_id': self.user_id,
            'completions': self.completions  # Include completions in dict
        }
        if include_recurring:
            action_dict['recurring_actions'] = [rec_action.to_dict(include_recurring=False) for rec_action in self.get_recurring_actions()]
        return action_dict

    def __repr__(self):
        return f'<Action {self.title}>'


class ActionProof(db.Model):
    __table_args__ = (
        db.Index('ix_action_proof_action_id', 'action_id'),
        db.Index('ix_action_proof_user_id', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    action_id = db.Column(db.Integer, db.ForeignKey('action.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    before_url = db.Column(db.String(500), nullable=True)
    after_url = db.Column(db.String(500), nullable=True)
    proof_url = db.Column(db.String(500), nullable=True)
    verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class ActionImpactMetric(db.Model):
    __table_args__ = (
        db.Index('ix_action_metric_action_id', 'action_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    action_id = db.Column(db.Integer, db.ForeignKey('action.id'), nullable=False)
    label = db.Column(db.String(120), nullable=False)
    value = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(40), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class Ticket(db.Model):
    __table_args__ = (
        db.Index('ix_ticket_event_id', 'event_id'),
        db.Index('ix_ticket_user_id', 'user_id'),
        db.Index('ix_ticket_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    ticket_type = db.Column(db.String(50), nullable=False, default="general")
    price = db.Column(db.Float, nullable=False, default=0.0)
    purchase_date = db.Column(db.DateTime, default=utcnow)


class Todo(db.Model):
    __table_args__ = (
        db.Index('ix_todo_user_id', 'user_id'),
        db.Index('ix_todo_is_completed', 'is_completed'),
    )
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    is_completed = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action_id = db.Column(db.Integer, db.ForeignKey('action.id'), nullable=False)
    action = db.relationship('Action', backref='todos', lazy=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)


class Feedback(db.Model):
    __table_args__ = (
        db.Index('ix_feedback_user_id', 'user_id'),
        db.Index('ix_feedback_type', 'type'),
        db.Index('ix_feedback_timestamp', 'timestamp'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # e.g., 'event', 'action', etc.
    item_id = db.Column(db.Integer, nullable=False)  # ID of the event, action, etc.
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'item_id': self.item_id,
            'content': self.content,
            'timestamp': self.timestamp.isoformat()
        }


class Comment(db.Model):
    __table_args__ = (
        db.Index('ix_comment_article_id', 'article_id'),
        db.Index('ix_comment_timestamp', 'timestamp'),
    )
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    article_id = db.Column(db.Integer, db.ForeignKey('article.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'user_id': self.user_id,
            'article_id': self.article_id,
            'timestamp': self.timestamp.isoformat()
        }


class Notification(db.Model):
    __table_args__ = (
        db.Index('ix_notification_user_id', 'user_id'),
        db.Index('ix_notification_is_read', 'is_read'),
        db.Index('ix_notification_timestamp', 'timestamp'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'message': self.message,
            'is_read': self.is_read,
            'timestamp': self.timestamp.isoformat()
        }


class Message(db.Model):
    __table_args__ = (
        db.Index('ix_message_sender_id', 'sender_id'),
        db.Index('ix_message_receiver_id', 'receiver_id'),
        db.Index('ix_message_timestamp', 'timestamp'),
    )
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }


class Node(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(40), default="active")
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)
    users = db.relationship('User', backref='node', lazy=True)


class NodeDomain(db.Model):
    __table_args__ = (
        db.UniqueConstraint('domain', name='uq_node_domain_domain'),
        db.Index('ix_node_domain_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    domain = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(40), default="active")
    tls_ready = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class NodeConfig(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', name='uq_node_config_node'),
        db.Index('ix_node_config_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    config_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class PartnerKey(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', 'key_id', name='uq_partner_key_node_key'),
        db.Index('ix_partner_key_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    key_id = db.Column(db.String(120), nullable=False)
    public_key = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(40), default="active")
    created_at = db.Column(db.DateTime, default=utcnow)
    rotated_at = db.Column(db.DateTime, nullable=True)


class IdentityLink(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', 'partner_user_hash', name='uq_identity_link_partner'),
        db.Index('ix_identity_link_node', 'node_id'),
        db.Index('ix_identity_link_global_subject', 'global_subject_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    partner_user_id = db.Column(db.String(500), nullable=False)  # encrypted value
    partner_user_hash = db.Column(db.String(128), nullable=False)
    global_subject_id = db.Column(db.String(120), nullable=False)
    link_confidence = db.Column(db.Float, default=1.0)
    auth_mode = db.Column(db.String(40), default="jwt")
    created_at = db.Column(db.DateTime, default=utcnow)
    last_seen_at = db.Column(db.DateTime, default=utcnow)


class BenefitsAccount(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', 'global_subject_id', name='uq_benefits_account_subject'),
        db.Index('ix_benefits_account_node', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    global_subject_id = db.Column(db.String(120), nullable=False)
    balance_cents = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class BenefitsLedgerEntry(db.Model):
    __table_args__ = (
        db.Index('ix_benefits_ledger_node', 'node_id'),
        db.Index('ix_benefits_ledger_subject', 'global_subject_id'),
        db.Index('ix_benefits_ledger_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    global_subject_id = db.Column(db.String(120), nullable=False)
    entry_type = db.Column(db.String(40), nullable=False)  # accrue|redeem|adjust
    amount_cents = db.Column(db.Integer, nullable=False)
    source_event_id = db.Column(db.String(120), nullable=True)
    metadata_json = db.Column(db.JSON, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class ConstellationMetricsWeeklyNode(db.Model):
    __table_args__ = (
        db.UniqueConstraint('constellation_id', 'node_id', 'week_start', name='uq_constellation_node_week'),
        db.Index('ix_constellation_node_week', 'node_id', 'week_start'),
    )
    id = db.Column(db.Integer, primary_key=True)
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    week_start = db.Column(db.Date, nullable=False)
    aggregates_json = db.Column(db.JSON, nullable=True)
    epsilon_used = db.Column(db.Float, default=0.0)
    min_cohort = db.Column(db.Integer, default=0)
    evidence_hash = db.Column(db.String(128), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class NodeStreak(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', name='uq_node_streak'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    current_streak = db.Column(db.Integer, default=0)
    best_streak = db.Column(db.Integer, default=0)
    last_week_start = db.Column(db.Date, nullable=True)
    reward_points_granted = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class MicrocosmStreak(db.Model):
    __table_args__ = (
        db.UniqueConstraint('microcosm_id', name='uq_microcosm_streak'),
    )
    id = db.Column(db.Integer, primary_key=True)
    microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=False)
    current_streak = db.Column(db.Integer, default=0)
    best_streak = db.Column(db.Integer, default=0)
    last_week_start = db.Column(db.Date, nullable=True)
    reward_points_granted = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class UserConsent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    consent_type = db.Column(db.String(100), nullable=False)
    granted = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    actor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    event = db.Column(db.String(120), nullable=False)
    entity_type = db.Column(db.String(120), nullable=True)
    entity_id = db.Column(db.String(120), nullable=True)
    metadata_json = db.Column(db.JSON, nullable=True)
    sensitive_read = db.Column(db.Boolean, default=False)
    ip_address = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class ImpactPool(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', 'slug', name='uq_impact_pool_node_slug'),
        db.Index('ix_impact_pool_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    slug = db.Column(db.String(120), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    category = db.Column(db.String(120), nullable=True)
    target_amount_cents = db.Column(db.Integer, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class ImpactLedgerEntry(db.Model):
    __table_args__ = (
        db.Index('ix_impact_ledger_node_id', 'node_id'),
        db.Index('ix_impact_ledger_pool_id', 'pool_id'),
        db.Index('ix_impact_ledger_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    pool_id = db.Column(db.Integer, db.ForeignKey('impact_pool.id'), nullable=False)
    entry_type = db.Column(db.String(50), nullable=False)  # credit|debit|reversal
    amount_cents = db.Column(db.Integer, nullable=False)
    description = db.Column(db.String(500), nullable=True)
    reference_id = db.Column(db.String(120), nullable=True)
    reference_type = db.Column(db.String(120), nullable=True)
    reversal_of = db.Column(db.Integer, db.ForeignKey('impact_ledger_entry.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


@event.listens_for(ImpactLedgerEntry, "before_update")
def _ledger_no_update(mapper, connection, target):
    raise ValueError("ImpactLedgerEntry is append-only; updates are not allowed.")


@event.listens_for(ImpactLedgerEntry, "before_delete")
def _ledger_no_delete(mapper, connection, target):
    raise ValueError("ImpactLedgerEntry is append-only; deletes are not allowed.")


class DumbDumbList(db.Model):
    __tablename__ = "dumb_dumb_list"
    __table_args__ = (
        db.UniqueConstraint('node_id', 'slug', name='uq_dumb_dumb_list_node_slug'),
        db.Index('ix_dumb_dumb_list_owner', 'owner_user_id'),
        db.Index('ix_dumb_dumb_list_public', 'is_public'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    owner_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    slug = db.Column(db.String(140), nullable=False)
    intro_text = db.Column(db.String(800), nullable=True)
    parody_disclaimer = db.Column(db.String(500), nullable=False)
    is_public = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    owner = db.relationship('User', backref=db.backref('dumb_dumb_lists', lazy=True))
    items = db.relationship(
        'DumbDumbItem',
        back_populates='list',
        lazy=True,
        cascade='all, delete-orphan',
        order_by='DumbDumbItem.created_at.asc()',
    )


class DumbDumbItem(db.Model):
    __tablename__ = "dumb_dumb_item"
    __table_args__ = (
        db.Index('ix_dumb_dumb_item_list', 'list_id'),
        db.Index('ix_dumb_dumb_item_pool', 'mutual_aid_pool_id'),
        db.Index('ix_dumb_dumb_item_active', 'is_active'),
    )
    id = db.Column(db.Integer, primary_key=True)
    list_id = db.Column(db.Integer, db.ForeignKey('dumb_dumb_list.id'), nullable=False)
    title = db.Column(db.String(120), nullable=False)
    parody_description = db.Column(db.String(600), nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    source_url = db.Column(db.String(500), nullable=True)
    source_site_name = db.Column(db.String(120), nullable=True)
    icon_key = db.Column(db.String(80), nullable=True)
    price_cents = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(12), nullable=False, default='usd')
    mutual_aid_pool_id = db.Column(db.Integer, db.ForeignKey('impact_pool.id'), nullable=False)
    impact_title = db.Column(db.String(160), nullable=False)
    impact_description = db.Column(db.String(500), nullable=False)
    quantity_limit = db.Column(db.Integer, nullable=True)
    quantity_sold = db.Column(db.Integer, nullable=False, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    list = db.relationship('DumbDumbList', back_populates='items')
    pool = db.relationship('ImpactPool')
    purchases = db.relationship(
        'DumbDumbPurchase',
        back_populates='item',
        lazy=True,
        cascade='all, delete-orphan',
        order_by='DumbDumbPurchase.created_at.desc()',
    )


class DumbDumbPurchase(db.Model):
    __tablename__ = "dumb_dumb_purchase"
    __table_args__ = (
        db.Index('ix_dumb_dumb_purchase_item', 'item_id'),
        db.Index('ix_dumb_dumb_purchase_buyer', 'buyer_user_id'),
        db.Index('ix_dumb_dumb_purchase_status', 'status'),
        db.Index('ix_dumb_dumb_purchase_destination', 'destination_pool_id'),
        db.Index('ix_dumb_dumb_purchase_created_at', 'created_at'),
        db.Index('ix_dumb_dumb_purchase_checkout_session', 'checkout_session_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    list_id = db.Column(db.Integer, db.ForeignKey('dumb_dumb_list.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('dumb_dumb_item.id'), nullable=False)
    buyer_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    amount_cents = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(12), nullable=False, default='usd')
    payment_intent_id = db.Column(db.String(200), nullable=True)
    external_payment_id = db.Column(db.String(200), nullable=True)
    checkout_session_id = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(40), nullable=False, default='checkout_pending')
    destination_pool_id = db.Column(db.Integer, db.ForeignKey('impact_pool.id'), nullable=False)
    receipt_snapshot_json = db.Column(db.JSON, nullable=True)
    inventory_reserved = db.Column(db.Boolean, default=False)
    reservation_expires_at = db.Column(db.DateTime, nullable=True)
    inventory_released_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    list = db.relationship('DumbDumbList')
    item = db.relationship('DumbDumbItem', back_populates='purchases')
    buyer = db.relationship('User')
    destination_pool = db.relationship('ImpactPool')


class MembershipPlan(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', 'name', name='uq_membership_plan_node_name'),
        db.Index('ix_membership_plan_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    amount_cents = db.Column(db.Integer, nullable=False)
    credit_grant_monthly = db.Column(db.Integer, default=0)
    pool_allocation_pct = db.Column(db.String(200), nullable=True)
    stripe_price_id = db.Column(db.String(200), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class Subscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('membership_plan.id'), nullable=False)
    stripe_customer_id = db.Column(db.String(200), nullable=True)
    stripe_subscription_id = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(80), default='pending')
    current_period_start = db.Column(db.DateTime, nullable=True)
    current_period_end = db.Column(db.DateTime, nullable=True)
    cancel_at_period_end = db.Column(db.Boolean, default=False)
    streak_months = db.Column(db.Integer, default=0)
    last_payment_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class SubscriptionEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    stripe_event_id = db.Column(db.String(200), unique=True, nullable=False)
    event_type = db.Column(db.String(120), nullable=False)
    payload = db.Column(db.JSON, nullable=True)
    processed_at = db.Column(db.DateTime, default=utcnow)


class ReliefRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount_requested_cents = db.Column(db.Integer, nullable=False)
    purpose = db.Column(db.String(80), nullable=False)
    description = db.Column(db.String(1000), nullable=True)
    urgency = db.Column(db.String(20), default='medium')
    contact_preference = db.Column(db.String(40), default='in-app')
    consent_data_processing = db.Column(db.Boolean, default=False)
    consent_case_worker_contact = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(80), default='submitted')
    council_id = db.Column(db.Integer, db.ForeignKey('micro_council.id'), nullable=True)
    approved_amount_cents = db.Column(db.Integer, nullable=True)
    escalation_level = db.Column(db.Integer, default=0)
    triage_score = db.Column(db.Integer, default=0)
    triage_reason = db.Column(db.String(500), nullable=True)
    triage_tags = db.Column(db.JSON, nullable=True)
    triage_updated_at = db.Column(db.DateTime, nullable=True)
    queue_position_estimate = db.Column(db.Integer, nullable=True)
    next_update_eta_hours = db.Column(db.Integer, default=48)
    submitted_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class MicroCouncil(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    cap_amount_cents = db.Column(db.Integer, nullable=False)
    quorum = db.Column(db.Integer, default=2)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class MicroCouncilMember(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    council_id = db.Column(db.Integer, db.ForeignKey('micro_council.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    role = db.Column(db.String(80), default="member")
    created_at = db.Column(db.DateTime, default=utcnow)


class CouncilVote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('relief_request.id'), nullable=False)
    council_id = db.Column(db.Integer, db.ForeignKey('micro_council.id'), nullable=False)
    voter_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    vote = db.Column(db.String(20), nullable=False)  # approve|reject
    amount_cents = db.Column(db.Integer, nullable=True)
    reason = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class ReliefDecision(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('relief_request.id'), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    decision = db.Column(db.String(50), nullable=False)  # approved|rejected|escalated|disbursed
    amount_cents = db.Column(db.Integer, nullable=True)
    reason = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class ReliefDisbursement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('relief_request.id'), nullable=False)
    amount_cents = db.Column(db.Integer, nullable=False)
    method = db.Column(db.String(80), nullable=True)
    reference = db.Column(db.String(200), nullable=True)
    disbursed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    disbursed_at = db.Column(db.DateTime, default=utcnow)


# Phase 2 stubs (models with TODOs)
class HouseholdProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(50), default='unverified')
    created_at = db.Column(db.DateTime, default=utcnow)


class VerificationRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    household_id = db.Column(db.Integer, db.ForeignKey('household_profile.id'), nullable=False)
    status = db.Column(db.String(50), default='pending')
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class EvidenceAttachment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    verification_id = db.Column(db.Integer, db.ForeignKey('verification_record.id'), nullable=False)
    storage_key = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class AllocationRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    pool_id = db.Column(db.Integer, db.ForeignKey('impact_pool.id'), nullable=False)
    amount_cents = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='pending')
    created_at = db.Column(db.DateTime, default=utcnow)


class AllocationApproval(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('allocation_request.id'), nullable=False)
    approver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class AllocationDisbursement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('allocation_request.id'), nullable=False)
    amount_cents = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class ImpactCreditTx(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    tx_type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    description = db.Column(db.String(500), nullable=True)
    source_type = db.Column(db.String(80), nullable=True)  # event|certification|governance|proof|decay
    reference_id = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class TimeEntry(db.Model):
    __table_args__ = (
        db.Index('ix_time_entry_user_id', 'user_id'),
        db.Index('ix_time_entry_microcosm_id', 'microcosm_id'),
        db.Index('ix_time_entry_guild_id', 'guild_id'),
        db.Index('ix_time_entry_occurred_at', 'occurred_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=True)
    guild_id = db.Column(db.Integer, db.ForeignKey('guild.id'), nullable=True)
    activity_type = db.Column(db.String(120), nullable=False)
    hours = db.Column(db.Float, nullable=False)
    occurred_at = db.Column(db.DateTime, nullable=False)
    verification_status = db.Column(db.String(40), default="pending")  # pending|verified|rejected
    proof_ref = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CommunityAsset(db.Model):
    __table_args__ = (
        db.Index('ix_community_asset_type', 'asset_type'),
        db.Index('ix_community_asset_node', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    asset_type = db.Column(db.String(120), nullable=False)
    location_text = db.Column(db.String(200), nullable=True)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    ownership_type = db.Column(db.String(80), nullable=True)
    capacity_notes = db.Column(db.String(300), nullable=True)
    booking_rules_json = db.Column(db.JSON, nullable=True)
    maintenance_notes = db.Column(db.String(500), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class AssetBooking(db.Model):
    __table_args__ = (
        db.Index('ix_asset_booking_asset', 'asset_id'),
        db.Index('ix_asset_booking_user', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    asset_id = db.Column(db.Integer, db.ForeignKey('community_asset.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=True)
    start_at = db.Column(db.DateTime, nullable=False)
    end_at = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(40), default="requested")  # requested|approved|denied|cancelled
    created_at = db.Column(db.DateTime, default=utcnow)


class Insight(db.Model):
    __table_args__ = (
        db.Index('ix_insight_domain_tag', 'domain_tag'),
        db.Index('ix_insight_microcosm_id', 'microcosm_id'),
        db.Index('ix_insight_node', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=True)
    domain_tag = db.Column(db.String(120), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    verification_level = db.Column(db.String(60), default="unverified")  # unverified|community-verified|guild-reviewed
    evidence_ref = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class Merchant(db.Model):
    __table_args__ = (
        db.Index('ix_merchant_domain', 'domain'),
        db.Index('ix_merchant_node', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    domain = db.Column(db.String(120), nullable=True)
    website = db.Column(db.String(200), nullable=True)
    location_text = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class MerchantTransaction(db.Model):
    __table_args__ = (
        db.Index('ix_merchant_tx_merchant', 'merchant_id'),
        db.Index('ix_merchant_tx_microcosm', 'microcosm_id'),
        db.Index('ix_merchant_tx_occurred', 'occurred_at'),
        db.Index('ix_merchant_tx_node', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    merchant_id = db.Column(db.Integer, db.ForeignKey('merchant.id'), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    occurred_at = db.Column(db.DateTime, nullable=False)
    receipt_ref = db.Column(db.String(200), nullable=True)
    dispute_flag = db.Column(db.Boolean, default=False)


class PoolPolicy(db.Model):
    __table_args__ = (
        db.Index('ix_pool_policy_pool', 'pool_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    pool_id = db.Column(db.Integer, db.ForeignKey('impact_pool.id'), nullable=False)
    max_draw_per_event = db.Column(db.Integer, nullable=False)
    min_floor = db.Column(db.Integer, nullable=False)
    allowed_event_types = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class BurnoutScore(db.Model):
    __table_args__ = (
        db.Index('ix_burnout_score_user', 'user_id'),
        db.Index('ix_burnout_score_microcosm', 'microcosm_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=True)
    score = db.Column(db.Float, nullable=False)
    window_days = db.Column(db.Integer, default=30)
    reasons_json = db.Column(db.JSON, nullable=True)
    computed_at = db.Column(db.DateTime, default=utcnow)


class CrisisScenario(db.Model):
    __table_args__ = (
        db.Index('ix_crisis_scenario_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    scenario_type = db.Column(db.String(120), nullable=False)
    params_json = db.Column(db.JSON, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CrisisRun(db.Model):
    __table_args__ = (
        db.Index('ix_crisis_run_scenario', 'scenario_id'),
        db.Index('ix_crisis_run_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    scenario_id = db.Column(db.Integer, db.ForeignKey('crisis_scenario.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    results_json = db.Column(db.JSON, nullable=True)
    computed_at = db.Column(db.DateTime, default=utcnow)


class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class Perk(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class StoryPost(db.Model):
    __table_args__ = (
        db.Index('ix_story_post_created_at', 'created_at'),
        db.Index('ix_story_post_user_id', 'user_id'),
        db.Index('ix_story_post_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    media_url = db.Column(db.String(500), nullable=True)
    featured = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class StoryReaction(db.Model):
    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_id', 'reaction_type', name='uq_story_reaction'),
        db.Index('ix_story_reaction_post_id', 'post_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('story_post.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reaction_type = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class CollaborativeChallenge(db.Model):
    __table_args__ = (
        db.UniqueConstraint('week_start', 'scope_type', 'scope_id', 'metric_type', name='uq_collab_challenge_scope'),
        db.Index('ix_collab_challenge_week_start', 'week_start'),
    )
    id = db.Column(db.Integer, primary_key=True)
    week_start = db.Column(db.Date, nullable=False)
    scope_type = db.Column(db.String(40), nullable=False)  # node|microcosm
    scope_id = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    metric_type = db.Column(db.String(80), nullable=False)
    target = db.Column(db.Integer, nullable=False)
    reward_points = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)


class CollaborativeProgress(db.Model):
    __table_args__ = (
        db.UniqueConstraint('challenge_id', name='uq_collab_progress'),
        db.Index('ix_collab_progress_challenge_id', 'challenge_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    challenge_id = db.Column(db.Integer, db.ForeignKey('collaborative_challenge.id'), nullable=False)
    progress = db.Column(db.Integer, default=0)
    completed_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class Team(db.Model):
    __table_args__ = (
        db.Index('ix_team_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class TeamMember(db.Model):
    __table_args__ = (
        db.UniqueConstraint('team_id', 'user_id', name='uq_team_member'),
        db.Index('ix_team_member_team_id', 'team_id'),
        db.Index('ix_team_member_user_id', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    role = db.Column(db.String(80), default="member")
    joined_at = db.Column(db.DateTime, default=utcnow)


class TeamChallenge(db.Model):
    __table_args__ = (
        db.UniqueConstraint('week_start', 'team_id', 'metric_type', name='uq_team_challenge'),
        db.Index('ix_team_challenge_week_start', 'week_start'),
    )
    id = db.Column(db.Integer, primary_key=True)
    week_start = db.Column(db.Date, nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    metric_type = db.Column(db.String(80), nullable=False)
    target = db.Column(db.Integer, nullable=False)
    reward_points = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)


class TeamChallengeProgress(db.Model):
    __table_args__ = (
        db.UniqueConstraint('challenge_id', name='uq_team_challenge_progress'),
        db.Index('ix_team_challenge_progress_id', 'challenge_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    challenge_id = db.Column(db.Integer, db.ForeignKey('team_challenge.id'), nullable=False)
    progress = db.Column(db.Integer, default=0)
    completed_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class TeamAction(db.Model):
    __table_args__ = (
        db.Index('ix_team_action_team_id', 'team_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('team.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(1000), nullable=True)
    due_date = db.Column(db.DateTime, nullable=True)
    points = db.Column(db.Integer, default=0)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class TeamActionCompletion(db.Model):
    __table_args__ = (
        db.Index('ix_team_action_completion_action_id', 'action_id'),
        db.Index('ix_team_action_completion_user_id', 'user_id'),
        db.Index('ix_team_action_completion_completed_at', 'completed_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    action_id = db.Column(db.Integer, db.ForeignKey('team_action.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    completed_at = db.Column(db.DateTime, default=utcnow)


class DiscoveryPack(db.Model):
    __table_args__ = (
        db.Index('ix_discovery_pack_city', 'city'),
        db.Index('ix_discovery_pack_created_at', 'created_at'),
        db.Index('ix_discovery_pack_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=True)
    center_lat = db.Column(db.Float, nullable=True)
    center_lng = db.Column(db.Float, nullable=True)
    reward_points = db.Column(db.Integer, default=0)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class DiscoveryPackItem(db.Model):
    __table_args__ = (
        db.Index('ix_discovery_pack_item_pack_id', 'pack_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    pack_id = db.Column(db.Integer, db.ForeignKey('discovery_pack.id'), nullable=False)
    item_type = db.Column(db.String(40), nullable=False)  # action|event
    item_id = db.Column(db.Integer, nullable=False)


class DiscoveryPackCompletion(db.Model):
    __table_args__ = (
        db.UniqueConstraint('pack_id', 'user_id', name='uq_pack_completion'),
        db.Index('ix_pack_completion_pack_id', 'pack_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    pack_id = db.Column(db.Integer, db.ForeignKey('discovery_pack.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    completed_at = db.Column(db.DateTime, default=utcnow)
    reward_points = db.Column(db.Integer, default=0)


class LearningTrack(db.Model):
    __table_args__ = (
        db.Index('ix_learning_track_pillar', 'pillar'),
        db.Index('ix_learning_track_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    pillar = db.Column(db.String(120), nullable=False)  # Civic Literacy | Sovereignty & Systems Literacy | Personal & Community Capacity
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    jurisdiction_default = db.Column(db.String(120), nullable=True)
    version = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class Module(db.Model):
    __table_args__ = (
        db.Index('ix_module_track_id', 'track_id'),
        db.Index('ix_module_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer, db.ForeignKey('learning_track.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    sequence = db.Column(db.Integer, default=0)
    completion_threshold = db.Column(db.Integer, default=100)  # percent
    retake_limit = db.Column(db.Integer, default=3)
    expiry_months = db.Column(db.Integer, nullable=True)
    version = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class Lesson(db.Model):
    __table_args__ = (
        db.Index('ix_lesson_module_id', 'module_id'),
        db.Index('ix_lesson_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    delivery_type = db.Column(db.String(80), default="text")  # text|video|document|scenario|quiz
    content_ref = db.Column(db.String(500), nullable=True)
    sequence = db.Column(db.Integer, default=0)
    version = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class Assessment(db.Model):
    __table_args__ = (
        db.Index('ix_assessment_module_id', 'module_id'),
        db.Index('ix_assessment_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    pass_score = db.Column(db.Integer, default=70)
    retake_limit = db.Column(db.Integer, default=3)
    version = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class Certification(db.Model):
    __table_args__ = (
        db.UniqueConstraint('certificate_uid', name='uq_certificate_uid'),
        db.Index('ix_certification_user_id', 'user_id'),
        db.Index('ix_certification_module_id', 'module_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    certificate_uid = db.Column(db.String(120), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=False)
    module_version = db.Column(db.Integer, default=1)
    issued_at = db.Column(db.DateTime, default=utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)
    revoked_at = db.Column(db.DateTime, nullable=True)
    revoke_reason = db.Column(db.String(500), nullable=True)
    public_visible = db.Column(db.Boolean, default=False)
    signature_hash = db.Column(db.String(256), nullable=True)
    status = db.Column(db.String(40), default="active")  # active|revoked|expired


class CompetencyProfile(db.Model):
    __table_args__ = (
        db.UniqueConstraint('user_id', name='uq_competency_profile_user'),
        db.Index('ix_competency_profile_user_id', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    profile_version = db.Column(db.Integer, default=1)
    competency_matrix = db.Column(db.JSON, nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class RiskTier(db.Model):
    __table_args__ = (
        db.Index('ix_risk_tier_level', 'level'),
    )
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    level = db.Column(db.Integer, nullable=False)
    min_cert_level = db.Column(db.Integer, nullable=False, default=1)
    compliance_required = db.Column(db.Boolean, default=True)


class JurisdictionOverlay(db.Model):
    __table_args__ = (
        db.Index('ix_jurisdiction_overlay_track_id', 'track_id'),
        db.Index('ix_jurisdiction_overlay_module_id', 'module_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    jurisdiction_code = db.Column(db.String(80), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('learning_track.id'), nullable=True)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lesson.id'), nullable=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessment.id'), nullable=True)
    overlay_payload = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class VersionHistory(db.Model):
    __table_args__ = (
        db.Index('ix_version_history_entity', 'entity_type', 'entity_id'),
        db.Index('ix_version_history_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(80), nullable=False)
    entity_id = db.Column(db.Integer, nullable=False)
    version = db.Column(db.Integer, nullable=False)
    change_summary = db.Column(db.String(500), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class InstructorRole(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class AuditRecord(db.Model):
    __table_args__ = (
        db.Index('ix_audit_record_created_at', 'created_at'),
        db.Index('ix_audit_record_actor_id', 'actor_id'),
        db.Index('ix_audit_record_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    actor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    action = db.Column(db.String(120), nullable=False)
    entity_type = db.Column(db.String(120), nullable=True)
    entity_id = db.Column(db.String(120), nullable=True)
    payload = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CompletionRecord(db.Model):
    __table_args__ = (
        db.Index('ix_completion_record_user_id', 'user_id'),
        db.Index('ix_completion_record_entity', 'entity_type', 'entity_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    entity_type = db.Column(db.String(80), nullable=False)  # lesson|module|assessment
    entity_id = db.Column(db.Integer, nullable=False)
    progress_percent = db.Column(db.Integer, default=0)
    completed_at = db.Column(db.DateTime, nullable=True)
    score = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class GovernanceEligibilityLink(db.Model):
    __table_args__ = (
        db.Index('ix_governance_eligibility_role', 'role_key'),
    )
    id = db.Column(db.Integer, primary_key=True)
    role_key = db.Column(db.String(120), nullable=False)
    required_cert_level = db.Column(db.Integer, default=1)
    required_competency = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class WeeklyChallenge(db.Model):
    __table_args__ = (
        db.UniqueConstraint('week_start', 'challenge_type', 'audience', name='uq_weekly_challenge_rotation'),
        db.Index('ix_weekly_challenge_week_start', 'week_start'),
    )
    id = db.Column(db.Integer, primary_key=True)
    week_start = db.Column(db.Date, nullable=False)
    challenge_type = db.Column(db.String(80), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    target = db.Column(db.Integer, nullable=False)
    reward_points = db.Column(db.Integer, nullable=False, default=0)
    audience = db.Column(db.String(40), nullable=False, default="any")  # any|participant|organizer
    created_at = db.Column(db.DateTime, default=utcnow)


class UserWeeklyChallenge(db.Model):
    __table_args__ = (
        db.UniqueConstraint('user_id', 'challenge_id', name='uq_user_weekly_challenge'),
        db.Index('ix_user_weekly_challenge_user_id', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    challenge_id = db.Column(db.Integer, db.ForeignKey('weekly_challenge.id'), nullable=False)
    progress = db.Column(db.Integer, default=0)
    completed_at = db.Column(db.DateTime, nullable=True)
    reward_granted = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


# ============================================================================
# I. GOVERNANCE ROLE FRAMEWORK (Requirement 1)
# ============================================================================

GOVERNANCE_ROLES = [
    "Participant",
    "VerifiedOrganizer",
    "NodeCurator",
    "TreasuryGuardian",
    "GovernanceObserver",
]


class GovernanceRoleAssignment(db.Model):
    __table_args__ = (
        db.Index('ix_gov_role_user_id', 'user_id'),
        db.Index('ix_gov_role_type', 'role_type'),
        db.Index('ix_gov_role_active', 'is_active'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    role_type = db.Column(db.String(80), nullable=False)
    assigned_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    starts_at = db.Column(db.DateTime, default=utcnow)
    ends_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    reason = db.Column(db.String(500), nullable=True)
    required_cert_level = db.Column(db.Integer, nullable=True)
    required_trust_score = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    @property
    def is_expired(self):
        if self.ends_at and utcnow() > self.ends_at:
            return True
        return False


class GovernanceVote(db.Model):
    __table_args__ = (
        db.Index('ix_gov_vote_proposal', 'proposal_type', 'proposal_id'),
        db.Index('ix_gov_vote_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    proposal_type = db.Column(db.String(120), nullable=False)
    proposal_id = db.Column(db.String(120), nullable=True)
    voter_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    vote = db.Column(db.String(20), nullable=False)  # approve | reject | abstain
    reason = db.Column(db.String(500), nullable=True)
    weight = db.Column(db.Float, default=1.0)
    created_at = db.Column(db.DateTime, default=utcnow)


class GovernanceProposal(db.Model):
    __table_args__ = (
        db.Index('ix_gov_proposal_node', 'node_id'),
        db.Index('ix_gov_proposal_status', 'status'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    proposal_type = db.Column(db.String(120), nullable=False)
    title = db.Column(db.String(200), nullable=True)
    details_json = db.Column(db.JSON, nullable=True)
    status = db.Column(db.String(40), default="pending")
    quorum_min = db.Column(db.Integer, default=2)
    created_at = db.Column(db.DateTime, default=utcnow)
    closed_at = db.Column(db.DateTime, nullable=True)


# ============================================================================
# II. SOVEREIGNTY FLOOR ENFORCEMENT (Requirement 2)
# ============================================================================

class SovereigntyConfig(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', 'config_key', name='uq_sovereignty_config'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    config_key = db.Column(db.String(120), nullable=False)
    config_value = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(500), nullable=True)
    is_immutable = db.Column(db.Boolean, default=True)
    last_changed_by_vote_id = db.Column(db.Integer, db.ForeignKey('governance_vote.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


SOVEREIGNTY_DEFAULTS = {
    "sovereignty_pool_min_pct": 15.0,
    "ops_pool_max_pct": 30.0,
    "infrastructure_pool_min_pct": 10.0,
    "relief_disbursement_cap_pct": 20.0,
    "endowment_auto_divert_pct": 5.0,
}


# ============================================================================
# III. INCIDENT & ESCALATION FRAMEWORK (Requirement 3)
# ============================================================================

class Incident(db.Model):
    __table_args__ = (
        db.Index('ix_incident_severity', 'severity'),
        db.Index('ix_incident_status', 'status'),
        db.Index('ix_incident_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=True)
    reported_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    severity = db.Column(db.String(40), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(40), default='open')
    event_frozen = db.Column(db.Boolean, default=False)
    escrow_frozen = db.Column(db.Boolean, default=False)
    organizer_suspended = db.Column(db.Boolean, default=False)
    suspended_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    review_assigned_to = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


@event.listens_for(Incident, "before_delete")
def _incident_no_delete(mapper, connection, target):
    raise ValueError("Incident records are immutable; deletes are not allowed.")


# ============================================================================
# IV. ESCROW EVENT MODEL (Requirement 5)
# ============================================================================

class EscrowRecord(db.Model):
    __table_args__ = (
        db.Index('ix_escrow_event_id', 'event_id'),
        db.Index('ix_escrow_status', 'status'),
        db.Index('ix_escrow_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    organizer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    total_amount_cents = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(40), default='held')
    incident_flag = db.Column(db.Boolean, default=False)
    release_approved_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    release_approved_at = db.Column(db.DateTime, nullable=True)
    timeout_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class EscrowSettlement(db.Model):
    __table_args__ = (
        db.Index('ix_escrow_settlement_escrow_id', 'escrow_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    escrow_id = db.Column(db.Integer, db.ForeignKey('escrow_record.id'), nullable=False)
    pool_id = db.Column(db.Integer, db.ForeignKey('impact_pool.id'), nullable=False)
    amount_cents = db.Column(db.Integer, nullable=False)
    settlement_type = db.Column(db.String(80), nullable=False)
    reference_id = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


@event.listens_for(EscrowSettlement, "before_delete")
def _escrow_settlement_no_delete(mapper, connection, target):
    raise ValueError("EscrowSettlement records cannot be deleted.")


# ============================================================================
# V. ENDOWMENT SHADOW STRUCTURE (Requirement 6)
# ============================================================================

class EndowmentConfig(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', name='uq_endowment_config_node'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    locked_capital_cents = db.Column(db.Integer, default=0)
    is_locked = db.Column(db.Boolean, default=True)
    min_hold_years = db.Column(db.Integer, default=3)
    auto_divert_pct = db.Column(db.Float, default=5.0)
    governance_withdrawal_threshold = db.Column(db.Float, default=75.0)
    compounding_rate_pct = db.Column(db.Float, default=2.0)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


# ============================================================================
# VIII. CERTIFICATION PRIVILEGE MAPPING (Requirement 8)
# ============================================================================

class PrivilegeMapping(db.Model):
    __table_args__ = (
        db.Index('ix_privilege_mapping_cert_level', 'min_cert_level'),
    )
    id = db.Column(db.Integer, primary_key=True)
    privilege_key = db.Column(db.String(120), nullable=False)
    min_cert_level = db.Column(db.Integer, nullable=False, default=1)
    required_module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=True)
    description = db.Column(db.String(500), nullable=True)
    auto_revoke_on_expiry = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


# ============================================================================
# X. IDENTITY & ZKP-READY VERIFICATION (Requirements 10, 11)
# ============================================================================

class IdentityVerificationToken(db.Model):
    __table_args__ = (
        db.Index('ix_identity_token_user_id', 'user_id'),
        db.Index('ix_identity_token_status', 'status'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    provider = db.Column(db.String(120), nullable=False)
    token_hash = db.Column(db.String(256), nullable=False)
    verification_level = db.Column(db.String(40), default='basic')
    verified_at = db.Column(db.DateTime, nullable=True)
    revoked_at = db.Column(db.DateTime, nullable=True)
    revoke_reason = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(40), default='pending')
    public_badge = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


# ============================================================================
# XII. TRUST SCORE ENGINE (Requirement 12)
# ============================================================================

class TrustScore(db.Model):
    __table_args__ = (
        db.UniqueConstraint('user_id', name='uq_trust_score_user'),
        db.Index('ix_trust_score_user_id', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    contribution_score = db.Column(db.Float, default=0.0)
    event_completion_multiplier = db.Column(db.Float, default=1.0)
    certification_weight = db.Column(db.Float, default=0.0)
    time_decay_factor = db.Column(db.Float, default=1.0)
    incident_penalty = db.Column(db.Float, default=0.0)
    composite_score = db.Column(db.Float, default=0.0)
    governance_eligible = db.Column(db.Boolean, default=False)
    last_computed_at = db.Column(db.DateTime, default=utcnow)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


# ============================================================================
# XIII. VENDOR CAPACITY TRACKING (Requirement 13)
# ============================================================================

class Vendor(db.Model):
    __table_args__ = (
        db.Index('ix_vendor_node_id', 'node_id'),
        db.Index('ix_vendor_status', 'status'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    maturity_score = db.Column(db.Float, default=0.0)
    certification_complete = db.Column(db.Boolean, default=False)
    grant_eligible = db.Column(db.Boolean, default=False)
    equipment_access = db.Column(db.Boolean, default=False)
    total_revenue_cents = db.Column(db.Integer, default=0)
    status = db.Column(db.String(40), default='active')
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


# ============================================================================
# XIV. EQUIPMENT & ASSET REGISTRY (Requirement 14)
# ============================================================================

class EquipmentAsset(db.Model):
    __table_args__ = (
        db.Index('ix_equipment_node_id', 'node_id'),
        db.Index('ix_equipment_type', 'asset_type'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    asset_type = db.Column(db.String(120), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    value_cents = db.Column(db.Integer, default=0)
    depreciation_rate_pct = db.Column(db.Float, default=0.0)
    custodian_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    availability_schedule = db.Column(db.JSON, nullable=True)
    insurance_coverage = db.Column(db.String(500), nullable=True)
    incident_log = db.Column(db.JSON, nullable=True)
    status = db.Column(db.String(40), default='available')
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


# ============================================================================
# XV. INFRASTRUCTURE ASSET REGISTRY (Requirement 15)
# ============================================================================

class InfrastructureAsset(db.Model):
    __table_args__ = (
        db.Index('ix_infra_asset_node_id', 'node_id'),
        db.Index('ix_infra_asset_type', 'asset_type'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    asset_type = db.Column(db.String(120), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    address = db.Column(db.String(200), nullable=True)
    lease_start = db.Column(db.DateTime, nullable=True)
    lease_end = db.Column(db.DateTime, nullable=True)
    capex_cents = db.Column(db.Integer, default=0)
    annual_revenue_cents = db.Column(db.Integer, default=0)
    roi_projection_json = db.Column(db.JSON, nullable=True)
    status = db.Column(db.String(40), default='active')
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


# ============================================================================
# XVI. ENERGY OFFSET CALCULATOR (Requirement 16)
# ============================================================================

class EnergyOffsetRecord(db.Model):
    __table_args__ = (
        db.Index('ix_energy_offset_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    venue_id = db.Column(db.Integer, db.ForeignKey('venue.id'), nullable=True)
    power_usage_kwh = db.Column(db.Float, nullable=False)
    solar_generation_kwh = db.Column(db.Float, default=0.0)
    savings_estimate_cents = db.Column(db.Integer, default=0)
    payback_months = db.Column(db.Integer, nullable=True)
    energy_fund_allocation_cents = db.Column(db.Integer, default=0)
    period_start = db.Column(db.DateTime, nullable=True)
    period_end = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


# ============================================================================
# XVIII. CULTURAL ARCHIVE LAYER (Requirement 18)
# ============================================================================

class CulturalArchiveEntry(db.Model):
    __table_args__ = (
        db.Index('ix_archive_entry_type', 'entry_type'),
        db.Index('ix_archive_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    entry_type = db.Column(db.String(80), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    storage_ref = db.Column(db.String(500), nullable=True)
    tags = db.Column(db.JSON, nullable=True)
    metadata_json = db.Column(db.JSON, nullable=True)
    is_immutable = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


@event.listens_for(CulturalArchiveEntry, "before_delete")
def _archive_no_delete(mapper, connection, target):
    if target.is_immutable:
        raise ValueError("Immutable archive entries cannot be deleted.")


# ============================================================================
# XIX. CRISIS MODE CAPABILITY (Requirement 19)
# ============================================================================

class CrisisMode(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', name='uq_crisis_mode_node'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=False)
    read_only = db.Column(db.Boolean, default=False)
    event_submission_frozen = db.Column(db.Boolean, default=False)
    escrow_frozen = db.Column(db.Boolean, default=False)
    high_risk_blocked = db.Column(db.Boolean, default=False)
    activated_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    activated_at = db.Column(db.DateTime, nullable=True)
    deactivated_at = db.Column(db.DateTime, nullable=True)
    reason = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


# ============================================================================
# XIX-B. SYSTEMIC SHOCK PREPAREDNESS (System Modes, Resilience, Simulation)
# ============================================================================

class SystemState(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', name='uq_system_state_node'),
        db.Index('ix_system_state_node_id', 'node_id'),
        db.Index('ix_system_state_mode', 'current_mode'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    current_mode = db.Column(db.String(40), nullable=False, default="NORMAL")
    activated_at = db.Column(db.DateTime, nullable=True)
    activated_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    expiry_at = db.Column(db.DateTime, nullable=True)
    evidence_hash = db.Column(db.String(128), nullable=True)
    formula_version = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class SystemParameterBounds(db.Model):
    __table_args__ = (
        db.UniqueConstraint('key', 'version', name='uq_system_param_bounds'),
        db.Index('ix_system_param_key', 'key'),
        db.Index('ix_system_param_active', 'active'),
    )
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    version = db.Column(db.Integer, default=1)
    lower_bound = db.Column(db.Float, nullable=True)
    upper_bound = db.Column(db.Float, nullable=True)
    default_value = db.Column(db.Float, nullable=True)
    description = db.Column(db.String(500), nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class ResilienceSnapshot(db.Model):
    __table_args__ = (
        db.Index('ix_resilience_node_id', 'node_id'),
        db.Index('ix_resilience_week_start', 'week_start'),
        db.Index('ix_resilience_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    week_start = db.Column(db.Date, nullable=True)
    resilience_score = db.Column(db.Float, nullable=False, default=0.0)
    submetrics_json = db.Column(db.JSON, nullable=True)
    recommended_mode = db.Column(db.String(40), nullable=True)
    formula_version = db.Column(db.Integer, nullable=True)
    evidence_hash = db.Column(db.String(128), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class SystemSimulationRun(db.Model):
    __table_args__ = (
        db.Index('ix_system_sim_node_id', 'node_id'),
        db.Index('ix_system_sim_started_at', 'started_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    started_at = db.Column(db.DateTime, default=utcnow)
    config_json = db.Column(db.JSON, nullable=True)
    outputs_json = db.Column(db.JSON, nullable=True)
    resilience_score = db.Column(db.Float, nullable=True)
    worst_case_runway = db.Column(db.Float, nullable=True)
    capture_prob = db.Column(db.Float, nullable=True)
    overload_prob = db.Column(db.Float, nullable=True)


class CrisisDigest(db.Model):
    __table_args__ = (
        db.Index('ix_crisis_digest_node_id', 'node_id'),
        db.Index('ix_crisis_digest_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    mode = db.Column(db.String(40), nullable=False)
    summary_json = db.Column(db.JSON, nullable=True)
    evidence_hash = db.Column(db.String(128), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

# ============================================================================
# XXII. MODULE REVIEW CYCLE (Requirement 22)
# ============================================================================

class ModuleReviewCycle(db.Model):
    __table_args__ = (
        db.Index('ix_module_review_module_id', 'module_id'),
        db.Index('ix_module_review_next_review', 'next_review_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=False)
    last_reviewed_at = db.Column(db.DateTime, nullable=True)
    next_review_at = db.Column(db.DateTime, nullable=False)
    review_triggered_by = db.Column(db.String(80), nullable=True)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    status = db.Column(db.String(40), default='pending')
    community_feedback_count = db.Column(db.Integer, default=0)
    version_before = db.Column(db.Integer, nullable=True)
    version_after = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


# ============================================================================
# XXIII. FEATURE FLAG SYSTEM (Requirement 23)
# ============================================================================

class FeatureFlag(db.Model):
    __table_args__ = (
        db.UniqueConstraint('name', name='uq_feature_flag_name'),
    )
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    enabled = db.Column(db.Boolean, default=False)
    rollout_percentage = db.Column(db.Float, default=0.0)
    allowed_roles = db.Column(db.JSON, nullable=True)
    activated_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


# ============================================================================
# XXI. PRIVACY & DATA MINIMISATION (Requirement 21)
# ============================================================================

class DataExportRequest(db.Model):
    __table_args__ = (
        db.Index('ix_data_export_user_id', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(40), default='pending')
    export_url = db.Column(db.String(500), nullable=True)
    requested_at = db.Column(db.DateTime, default=utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)


class AccountDeletionRequest(db.Model):
    __table_args__ = (
        db.Index('ix_account_deletion_user_id', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(40), default='pending')
    reason = db.Column(db.String(500), nullable=True)
    requested_at = db.Column(db.DateTime, default=utcnow)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)


class CapitalMetricSnapshot(db.Model):
    __table_args__ = (
        db.Index('ix_capital_metric_snapshot_pool_id', 'pool_id'),
        db.Index('ix_capital_metric_snapshot_bucket', 'bucket'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    pool_id = db.Column(db.Integer, db.ForeignKey('impact_pool.id'), nullable=False)
    bucket = db.Column(db.String(20), nullable=False)  # daily|weekly|monthly
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)
    inflow_cents = db.Column(db.Integer, default=0)
    outflow_cents = db.Column(db.Integer, default=0)
    net_flow_cents = db.Column(db.Integer, default=0)
    balance_cents = db.Column(db.Integer, default=0)
    allocation_ratio = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=utcnow)


class CapitalStressFlag(db.Model):
    __table_args__ = (
        db.Index('ix_capital_stress_flag_node_id', 'node_id'),
        db.Index('ix_capital_stress_flag_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    flag_type = db.Column(db.String(120), nullable=False)
    severity = db.Column(db.String(40), default="medium")
    message = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class TreasurySimulation(db.Model):
    __table_args__ = (
        db.Index('ix_treasury_sim_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    revenue_drop_pct = db.Column(db.Float, default=0.0)
    relief_surge_pct = db.Column(db.Float, default=0.0)
    ops_cost_increase_pct = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=utcnow)


class TreasurySimulationRun(db.Model):
    __table_args__ = (
        db.Index('ix_treasury_sim_run_sim_id', 'simulation_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    simulation_id = db.Column(db.Integer, db.ForeignKey('treasury_simulation.id'), nullable=False)
    results_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CapitalResilienceIndex(db.Model):
    __table_args__ = (
        db.Index('ix_capital_resilience_node_id', 'node_id'),
        db.Index('ix_capital_resilience_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    index_value = db.Column(db.Float, nullable=False)
    formula_version = db.Column(db.Integer, default=1)
    components_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)



class CredentialLadderStage(db.Model):
    __table_args__ = (
        db.UniqueConstraint('slug', name='uq_credential_ladder_slug'),
        db.Index('ix_credential_ladder_level', 'level'),
    )
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(120), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    level = db.Column(db.Integer, nullable=False)
    required_module_ids = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CredentialDependency(db.Model):
    __table_args__ = (
        db.UniqueConstraint('module_id', 'required_module_id', name='uq_credential_dependency'),
        db.Index('ix_credential_dependency_module_id', 'module_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=False)
    required_module_id = db.Column(db.Integer, db.ForeignKey('module.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class ExternalReviewer(db.Model):
    __table_args__ = (
        db.UniqueConstraint('email', name='uq_external_reviewer_email'),
    )
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    organization = db.Column(db.String(200), nullable=True)
    email = db.Column(db.String(200), nullable=False)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class ExternalValidationRecord(db.Model):
    __table_args__ = (
        db.Index('ix_external_validation_cert_id', 'certification_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    certification_id = db.Column(db.Integer, db.ForeignKey('certification.id'), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('external_reviewer.id'), nullable=False)
    status = db.Column(db.String(80), default="pending")
    notes = db.Column(db.String(500), nullable=True)
    validated_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CertificationSkillTag(db.Model):
    __table_args__ = (
        db.Index('ix_cert_skill_cert_id', 'certification_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    certification_id = db.Column(db.Integer, db.ForeignKey('certification.id'), nullable=False)
    skill_tag = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class SovereigntyIndex(db.Model):
    __table_args__ = (
        db.Index('ix_sovereignty_index_node_id', 'node_id'),
        db.Index('ix_sovereignty_index_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    index_value = db.Column(db.Float, nullable=False)
    formula_version = db.Column(db.Integer, default=1)
    components_json = db.Column(db.JSON, nullable=True)
    public_visible = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class SovereigntyIndexConfig(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', name='uq_sovereignty_index_node'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    public_visible = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class FormulaDefinition(db.Model):
    __table_args__ = (
        db.UniqueConstraint('key', 'version', name='uq_formula_definition'),
        db.Index('ix_formula_definition_key', 'key'),
    )
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    version = db.Column(db.Integer, nullable=False)
    json_schema = db.Column(db.JSON, nullable=True)
    default_params_json = db.Column(db.JSON, nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class FormulaConfig(db.Model):
    __table_args__ = (
        db.Index('ix_formula_config_key', 'key'),
    )
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    version = db.Column(db.Integer, nullable=False)
    params_json = db.Column(db.JSON, nullable=True)
    activated_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    activated_at = db.Column(db.DateTime, default=utcnow)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    notes = db.Column(db.String(500), nullable=True)


class FormulaRunLog(db.Model):
    __table_args__ = (
        db.Index('ix_formula_run_log_key', 'key'),
        db.Index('ix_formula_run_log_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    version = db.Column(db.Integer, nullable=False)
    run_context_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    actor_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)


class MetricDefinition(db.Model):
    __table_args__ = (
        db.UniqueConstraint('key', 'version', name='uq_metric_definition'),
        db.Index('ix_metric_definition_key', 'key'),
    )
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    version = db.Column(db.Integer, nullable=False)
    required_event_types = db.Column(db.JSON, nullable=True)
    param_schema = db.Column(db.JSON, nullable=True)
    output_units = db.Column(db.String(120), nullable=True)
    confidence_method = db.Column(db.String(120), nullable=True)
    audit_behavior = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class MetricRunLog(db.Model):
    __table_args__ = (
        db.Index('ix_metric_run_log_key', 'key'),
        db.Index('ix_metric_run_log_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    version = db.Column(db.Integer, nullable=False)
    input_snapshot_hash = db.Column(db.String(128), nullable=True)
    run_context_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    actor_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)


class ModelDefinition(db.Model):
    __table_args__ = (
        db.UniqueConstraint('key', 'version', name='uq_model_definition'),
        db.Index('ix_model_definition_key', 'key'),
    )
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    version = db.Column(db.Integer, nullable=False)
    param_schema = db.Column(db.JSON, nullable=True)
    required_inputs = db.Column(db.JSON, nullable=True)
    min_sample_size = db.Column(db.Integer, nullable=True)
    output_units = db.Column(db.String(120), nullable=True)
    confidence_method = db.Column(db.String(120), nullable=True)
    uncertainty_format = db.Column(db.String(120), nullable=True)
    convexity_property = db.Column(db.String(120), nullable=True)
    fallback_mode = db.Column(db.String(200), nullable=True)
    complexity_bound = db.Column(db.String(200), nullable=True)
    update_policy = db.Column(db.String(120), nullable=True)
    requires_backtest = db.Column(db.Boolean, default=True)
    requires_calibration = db.Column(db.Boolean, default=True)
    cooling_period_days = db.Column(db.Integer, default=7)
    created_at = db.Column(db.DateTime, default=utcnow)


class ModelConfig(db.Model):
    __table_args__ = (
        db.Index('ix_model_config_key', 'key'),
    )
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    version = db.Column(db.Integer, nullable=False)
    params_json = db.Column(db.JSON, nullable=True)
    activated_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    activated_at = db.Column(db.DateTime, default=utcnow)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    notes = db.Column(db.String(500), nullable=True)
    cooling_until = db.Column(db.DateTime, nullable=True)
    backtest_report_json = db.Column(db.JSON, nullable=True)
    calibration_report_json = db.Column(db.JSON, nullable=True)
    active = db.Column(db.Boolean, default=True)
    is_stable = db.Column(db.Boolean, default=True)


class ModelRunLog(db.Model):
    __table_args__ = (
        db.Index('ix_model_run_log_key', 'key'),
        db.Index('ix_model_run_log_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    version = db.Column(db.Integer, nullable=False)
    input_snapshot_hash = db.Column(db.String(128), nullable=True)
    run_context_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    actor_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)


class EventPrimitive(db.Model):
    __table_args__ = (
        db.Index('ix_event_primitive_time', 'timestamp'),
        db.Index('ix_event_primitive_type', 'event_type'),
    )
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=utcnow)
    actor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    entity_type = db.Column(db.String(120), nullable=True)
    entity_id = db.Column(db.String(120), nullable=True)
    event_type = db.Column(db.String(120), nullable=False)
    props = db.Column(db.JSON, nullable=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    consent = db.Column(db.Boolean, default=True)
    signature = db.Column(db.String(256), nullable=True)


class PosteriorRecord(db.Model):
    __table_args__ = (
        db.UniqueConstraint('posterior_key', 'subject_id', name='uq_posterior_subject'),
        db.Index('ix_posterior_key', 'posterior_key'),
    )
    id = db.Column(db.Integer, primary_key=True)
    posterior_key = db.Column(db.String(120), nullable=False)  # reliability|competency
    subject_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    version = db.Column(db.Integer, default=1)
    params_json = db.Column(db.JSON, nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class PosteriorUpdateEvent(db.Model):
    __table_args__ = (
        db.Index('ix_posterior_update_key', 'posterior_key'),
        db.Index('ix_posterior_update_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    posterior_key = db.Column(db.String(120), nullable=False)
    model_key = db.Column(db.String(120), nullable=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    formula_version = db.Column(db.Integer, default=1)
    delta_params_json = db.Column(db.JSON, nullable=True)
    evidence_hash = db.Column(db.String(128), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class EpsilonBudget(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', name='uq_epsilon_budget_node'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    epsilon_total = db.Column(db.Float, default=1.0)
    epsilon_spent = db.Column(db.Float, default=0.0)
    epsilon_annual_limit = db.Column(db.Float, default=1.0)
    annual_reset_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class EpsilonConsumption(db.Model):
    __table_args__ = (
        db.Index('ix_epsilon_consumption_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    epsilon = db.Column(db.Float, default=0.0)
    purpose = db.Column(db.String(200), nullable=True)
    query_key = db.Column(db.String(120), nullable=True)
    sensitivity = db.Column(db.Float, default=1.0)
    clipping_rule = db.Column(db.String(200), nullable=True)
    epsilon_before = db.Column(db.Float, default=0.0)
    epsilon_after = db.Column(db.Float, default=0.0)
    epsilon_annual_limit = db.Column(db.Float, default=1.0)
    scope = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CompetencyDomain(db.Model):
    __table_args__ = (
        db.Index('ix_competency_domain_node', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    node_scope = db.Column(db.String(40), default="node")  # node|global
    created_at = db.Column(db.DateTime, default=utcnow)


class CompetencyNode(db.Model):
    __table_args__ = (
        db.Index('ix_competency_node_domain_id', 'domain_id'),
        db.UniqueConstraint('domain_id', 'slug', name='uq_competency_node_slug'),
    )
    id = db.Column(db.Integer, primary_key=True)
    domain_id = db.Column(db.Integer, db.ForeignKey('competency_domain.id'), nullable=False)
    slug = db.Column(db.String(120), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    proficiency_scale = db.Column(db.JSON, nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CompetencyEdge(db.Model):
    __table_args__ = (
        db.Index('ix_competency_edge_parent', 'parent_node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    parent_node_id = db.Column(db.Integer, db.ForeignKey('competency_node.id'), nullable=False)
    child_node_id = db.Column(db.Integer, db.ForeignKey('competency_node.id'), nullable=False)
    edge_type = db.Column(db.String(80), default="prerequisite")
    created_at = db.Column(db.DateTime, default=utcnow)


class OrganiserCompetencyProfile(db.Model):
    __table_args__ = (
        db.UniqueConstraint('user_id', 'node_id', name='uq_organiser_competency_profile'),
        db.Index('ix_organiser_competency_user', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    proficiency_level = db.Column(db.Float, default=0.0)
    confidence_score = db.Column(db.Float, default=0.0)
    details_json = db.Column(db.JSON, nullable=True)
    last_updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class CompetencyEvidence(db.Model):
    __table_args__ = (
        db.Index('ix_competency_evidence_user', 'user_id'),
        db.Index('ix_competency_evidence_node', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    evidence_type = db.Column(db.String(80), nullable=False)
    ref_type = db.Column(db.String(80), nullable=True)
    ref_id = db.Column(db.String(120), nullable=True)
    weight = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=utcnow)


class PeerEndorsement(db.Model):
    __table_args__ = (
        db.Index('ix_peer_endorsement_endorser', 'endorser_user_id'),
        db.Index('ix_peer_endorsement_endorsed', 'endorsed_user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    endorser_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    endorsed_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    rating = db.Column(db.Integer, default=3)
    note = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class SkillDecayRecord(db.Model):
    __table_args__ = (
        db.Index('ix_skill_decay_user', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    decay_amount = db.Column(db.Float, default=0.0)
    formula_version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=utcnow)


class NeedsSignal(db.Model):
    __table_args__ = (
        db.Index('ix_needs_signal_node', 'node_id'),
        db.Index('ix_needs_signal_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    domain_id = db.Column(db.Integer, db.ForeignKey('competency_domain.id'), nullable=True)
    competency_node_id = db.Column(db.Integer, db.ForeignKey('competency_node.id'), nullable=True)
    severity_0_100 = db.Column(db.Integer, default=0)
    reason_codes_json = db.Column(db.JSON, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)
    created_by_system = db.Column(db.Boolean, default=True)
    visible_level = db.Column(db.String(40), default="organizer")


class NeedsSignalInputSnapshot(db.Model):
    __table_args__ = (
        db.Index('ix_needs_signal_snapshot_node', 'node_id'),
        db.Index('ix_needs_signal_snapshot_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    snapshot_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class OrganiserPerformanceSnapshot(db.Model):
    __table_args__ = (
        db.Index('ix_org_perf_user', 'user_id'),
        db.Index('ix_org_perf_period', 'period_start', 'period_end'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)
    events_created = db.Column(db.Integer, default=0)
    events_completed = db.Column(db.Integer, default=0)
    completion_rate = db.Column(db.Float, default=0.0)
    attendance_avg = db.Column(db.Float, default=0.0)
    retention_rate = db.Column(db.Float, default=0.0)
    budget_variance_pct = db.Column(db.Float, default=0.0)
    incident_count = db.Column(db.Integer, default=0)
    compliance_checklist_pass_rate = db.Column(db.Float, default=0.0)
    feedback_score = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=utcnow)
    formula_version = db.Column(db.Integer, default=1)


class Guild(db.Model):
    __table_args__ = (
        db.Index('ix_guild_node', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    type = db.Column(db.String(80), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class GuildMembership(db.Model):
    __table_args__ = (
        db.Index('ix_guild_membership_guild', 'guild_id'),
        db.Index('ix_guild_membership_user', 'user_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    guild_id = db.Column(db.Integer, db.ForeignKey('guild.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    role_in_guild = db.Column(db.String(80), default="member")
    joined_at = db.Column(db.DateTime, default=utcnow)
    left_at = db.Column(db.DateTime, nullable=True)


class GuildRotation(db.Model):
    __table_args__ = (
        db.Index('ix_guild_rotation_guild', 'guild_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    guild_id = db.Column(db.Integer, db.ForeignKey('guild.id'), nullable=False)
    role_name = db.Column(db.String(120), nullable=False)
    current_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    starts_at = db.Column(db.DateTime, default=utcnow)
    ends_at = db.Column(db.DateTime, nullable=True)
    rotation_policy_json = db.Column(db.JSON, nullable=True)


class GuildGoal(db.Model):
    __table_args__ = (
        db.Index('ix_guild_goal_guild', 'guild_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    guild_id = db.Column(db.Integer, db.ForeignKey('guild.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    metric_key = db.Column(db.String(120), nullable=False)
    target_value = db.Column(db.Float, default=0.0)
    period_start = db.Column(db.DateTime, nullable=True)
    period_end = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class GuildPerformanceSnapshot(db.Model):
    __table_args__ = (
        db.Index('ix_guild_perf_guild', 'guild_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    guild_id = db.Column(db.Integer, db.ForeignKey('guild.id'), nullable=False)
    period_start = db.Column(db.DateTime, nullable=True)
    period_end = db.Column(db.DateTime, nullable=True)
    metrics_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CollisionCheck(db.Model):
    __table_args__ = (
        db.Index('ix_collision_event', 'event_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    score = db.Column(db.Float, default=0.0)
    reasons_json = db.Column(db.JSON, nullable=True)
    formula_version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=utcnow)
    acknowledged_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)


class CollisionReview(db.Model):
    __table_args__ = (
        db.Index('ix_collision_review_event', 'event_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'), nullable=False)
    status = db.Column(db.String(40), default="pending")  # pending|approved|rejected
    reviewer_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    notes = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class OrganiserBurnoutSnapshot(db.Model):
    __table_args__ = (
        db.Index('ix_burnout_user', 'user_id'),
        db.Index('ix_burnout_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    load_score = db.Column(db.Float, default=0.0)
    burnout_risk = db.Column(db.String(40), default="low")
    formula_version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=utcnow)


class InstitutionalModeConfig(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', name='uq_institutional_mode_node'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    enabled = db.Column(db.Boolean, default=False)
    quorum_min = db.Column(db.Integer, default=2)
    external_observer_enabled = db.Column(db.Boolean, default=False)
    extended_audit_logging = db.Column(db.Boolean, default=False)
    worm_audit_suggestion = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class ExternalObserverSeat(db.Model):
    __table_args__ = (
        db.Index('ix_external_observer_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    organization = db.Column(db.String(200), nullable=True)
    email = db.Column(db.String(200), nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class FederationProtocolVersion(db.Model):
    __table_args__ = (
        db.Index('ix_federation_protocol_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    version_label = db.Column(db.String(120), nullable=False)
    active = db.Column(db.Boolean, default=True)
    activated_at = db.Column(db.DateTime, default=utcnow)


class NodeRecognitionMapping(db.Model):
    __table_args__ = (
        db.Index('ix_node_recognition_from', 'from_node_id'),
        db.Index('ix_node_recognition_to', 'to_node_id'),
        db.UniqueConstraint('from_node_id', 'to_node_id', name='uq_node_recognition'),
    )
    id = db.Column(db.Integer, primary_key=True)
    from_node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    to_node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    recognition_level = db.Column(db.String(80), default="basic")
    active = db.Column(db.Boolean, default=True)
    notes = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class MutualAidFlag(db.Model):
    __table_args__ = (
        db.Index('ix_mutual_aid_from', 'from_node_id'),
        db.Index('ix_mutual_aid_to', 'to_node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    from_node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    to_node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    status = db.Column(db.String(40), default="active")
    notes = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CrossNodeMetricSnapshot(db.Model):
    __table_args__ = (
        db.Index('ix_cross_node_metric_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    total_nodes = db.Column(db.Integer, default=0)
    total_treasury_cents = db.Column(db.Integer, default=0)
    total_users = db.Column(db.Integer, default=0)
    total_certified_users = db.Column(db.Integer, default=0)
    average_sovereignty_index = db.Column(db.Float, default=0.0)
    mutual_aid_pairs = db.Column(db.Integer, default=0)
    protocol_versions = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class OrganizerLoadSnapshot(db.Model):
    __table_args__ = (
        db.Index('ix_organizer_load_user_id', 'user_id'),
        db.Index('ix_organizer_load_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    event_count_30d = db.Column(db.Integer, default=0)
    governance_votes_30d = db.Column(db.Integer, default=0)
    volunteer_hours = db.Column(db.Float, default=0.0)
    load_score = db.Column(db.Float, default=0.0)
    alert_level = db.Column(db.String(40), default="normal")
    created_at = db.Column(db.DateTime, default=utcnow)


class GovernanceScenario(db.Model):
    __table_args__ = (
        db.Index('ix_governance_scenario_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(1000), nullable=True)
    risk_tier = db.Column(db.String(80), nullable=True)
    learning_track_id = db.Column(db.Integer, db.ForeignKey('learning_track.id'), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class GovernanceScenarioStep(db.Model):
    __table_args__ = (
        db.Index('ix_governance_scenario_step_scenario_id', 'scenario_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    scenario_id = db.Column(db.Integer, db.ForeignKey('governance_scenario.id'), nullable=False)
    prompt = db.Column(db.String(1000), nullable=False)
    options_json = db.Column(db.JSON, nullable=True)
    sequence = db.Column(db.Integer, default=0)


class GovernanceScenarioRun(db.Model):
    __table_args__ = (
        db.Index('ix_governance_scenario_run_user_id', 'user_id'),
        db.Index('ix_governance_scenario_run_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    scenario_id = db.Column(db.Integer, db.ForeignKey('governance_scenario.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    decisions_json = db.Column(db.JSON, nullable=True)
    simulated_impact_json = db.Column(db.JSON, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class TransparencyVisibilityConfig(db.Model):
    __table_args__ = (
        db.UniqueConstraint('node_id', name='uq_transparency_visibility_node'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    show_balances = db.Column(db.Boolean, default=True)
    show_allocation_breakdown = db.Column(db.Boolean, default=True)
    show_vote_summary = db.Column(db.Boolean, default=False)
    show_cert_counts = db.Column(db.Boolean, default=True)
    show_incident_summary = db.Column(db.Boolean, default=True)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class ConflictOfInterestDeclaration(db.Model):
    __table_args__ = (
        db.Index('ix_coi_actor_id', 'actor_id'),
        db.Index('ix_coi_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    related_entity_type = db.Column(db.String(120), nullable=True)
    related_entity_id = db.Column(db.String(120), nullable=True)
    declaration = db.Column(db.String(1000), nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CreditDecayLog(db.Model):
    __table_args__ = (
        db.Index('ix_credit_decay_user_id', 'user_id'),
        db.Index('ix_credit_decay_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    formula_version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=utcnow)


class GovernanceInfluenceSnapshot(db.Model):
    __table_args__ = (
        db.Index('ix_gov_influence_user_id', 'user_id'),
        db.Index('ix_gov_influence_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    influence_score = db.Column(db.Float, default=0.0)
    cap_applied = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class MarketplaceListing(db.Model):
    __tablename__ = "marketplace_listing"
    __table_args__ = (
        db.Index('ix_marketplace_listing_seller_id', 'seller_id'),
        db.Index('ix_marketplace_listing_category', 'category'),
    )
    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=False, default=0.0)
    category = db.Column(db.String(100), nullable=True)
    impact = db.Column(db.String(100), default="environmental")
    image_url = db.Column(db.String(500), nullable=True)
    in_stock = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    seller = db.relationship('User', backref='marketplace_listings')

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "category": self.category,
            "impact": self.impact,
            "imageUrl": self.image_url,
            "inStock": self.in_stock,
            "isActive": self.is_active,
            "sellerId": str(self.seller_id),
            "sellerPseudonym": self.seller.pseudonym if self.seller else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class MarketplaceReview(db.Model):
    __tablename__ = "marketplace_review"
    __table_args__ = (
        db.UniqueConstraint('listing_id', 'user_id', name='uq_marketplace_review'),
        db.Index('ix_marketplace_review_listing_id', 'listing_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey('marketplace_listing.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    comment = db.Column(db.String(1000), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    reviewer = db.relationship('User')
    listing = db.relationship('MarketplaceListing', backref='reviews')

    def to_dict(self):
        return {
            "id": self.id,
            "listingId": self.listing_id,
            "userId": self.user_id,
            "reviewerPseudonym": self.reviewer.pseudonym if self.reviewer else None,
            "rating": self.rating,
            "comment": self.comment,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class WallPost(db.Model):
    __tablename__ = "wall_post"
    __table_args__ = (
        db.Index('ix_wall_post_profile_user_id', 'profile_user_id'),
        db.Index('ix_wall_post_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    profile_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    author_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    media_url = db.Column(db.String(500), nullable=True)
    post_type = db.Column(db.String(50), default='text')  # text, image, link, milestone
    pinned = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    profile_user = db.relationship('User', foreign_keys=[profile_user_id], backref='wall_posts_received')
    author = db.relationship('User', foreign_keys=[author_id], backref='wall_posts_authored')

    def to_dict(self):
        return {
            "id": self.id,
            "profileUserId": self.profile_user_id,
            "authorId": self.author_id,
            "authorPseudonym": self.author.pseudonym if self.author else None,
            "content": self.content,
            "mediaUrl": self.media_url,
            "postType": self.post_type,
            "pinned": self.pinned,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class WallPostReaction(db.Model):
    __tablename__ = "wall_post_reaction"
    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_id', name='uq_wall_post_reaction'),
    )
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('wall_post.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    reaction_type = db.Column(db.String(30), default='like')
    created_at = db.Column(db.DateTime, default=utcnow)


class LearningNomination(db.Model):
    __tablename__ = "learning_nomination"
    __table_args__ = (
        db.Index('ix_learning_nomination_nominee_id', 'nominee_id'),
        db.Index('ix_learning_nomination_status', 'status'),
    )
    id = db.Column(db.Integer, primary_key=True)
    nominator_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    nominee_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('learning_track.id'), nullable=False)
    reason = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(30), default='pending')  # pending, accepted, declined
    created_at = db.Column(db.DateTime, default=utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    nominator = db.relationship('User', foreign_keys=[nominator_id])
    nominee = db.relationship('User', foreign_keys=[nominee_id])

    def to_dict(self):
        return {
            "id": self.id,
            "nominatorId": self.nominator_id,
            "nominatorPseudonym": self.nominator.pseudonym if self.nominator else None,
            "nomineeId": self.nominee_id,
            "nomineePseudonym": self.nominee.pseudonym if self.nominee else None,
            "trackId": self.track_id,
            "reason": self.reason,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class CommunityFeedItem(db.Model):
    """Denormalized community feed for aggregation."""
    __tablename__ = "community_feed_item"
    __table_args__ = (
        db.Index('ix_community_feed_created_at', 'created_at'),
        db.Index('ix_community_feed_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    item_type = db.Column(db.String(50), nullable=False)  # wall_post, story, article, action_completed, event_created, milestone
    item_id = db.Column(db.Integer, nullable=False)
    summary = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


# ── Constellations ────────────────────────────────────────────

class Constellation(db.Model):
    __table_args__ = (
        db.Index('ix_constellation_node_id', 'node_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.String(1000), nullable=True)
    domain = db.Column(db.String(120), nullable=True)  # e.g. "procurement", "food", "energy"
    geo_label = db.Column(db.String(200), nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "nodeId": self.node_id,
            "name": self.name,
            "description": self.description,
            "domain": self.domain,
            "geoLabel": self.geo_label,
            "active": self.active,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class ConstellationMembership(db.Model):
    __tablename__ = "constellation_membership"
    __table_args__ = (
        db.UniqueConstraint('constellation_id', 'microcosm_id', name='uq_constellation_microcosm'),
        db.Index('ix_const_membership_constellation', 'constellation_id'),
        db.Index('ix_const_membership_microcosm', 'microcosm_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id'), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=utcnow)

    constellation = db.relationship('Constellation', backref='memberships')
    microcosm = db.relationship('Microcosm', backref='constellation_memberships')


class ConstellationMetricsWeekly(db.Model):
    __tablename__ = "constellation_metrics_weekly"
    __table_args__ = (
        db.UniqueConstraint('constellation_id', 'microcosm_id', 'week_start', name='uq_const_metric_week'),
        db.Index('ix_const_metrics_week', 'week_start'),
        db.Index('ix_const_metrics_constellation', 'constellation_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id'), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=False)
    week_start = db.Column(db.Date, nullable=False)
    # Canonical variables
    volume_moved = db.Column(db.Float, default=0.0)
    savings_per_unit = db.Column(db.Float, default=0.0)
    logistics_cost = db.Column(db.Float, default=0.0)
    quality_median = db.Column(db.Float, default=0.0)
    delivery_reliability = db.Column(db.Float, default=0.0)
    disputes_rate = db.Column(db.Float, default=0.0)
    participation = db.Column(db.Float, default=0.0)
    accessibility = db.Column(db.Float, default=0.0)
    equity_fairness = db.Column(db.Float, default=0.0)
    burnout_index = db.Column(db.Float, default=0.0)
    reliability_lcb = db.Column(db.Float, default=0.0)
    proof_integrity_lcb = db.Column(db.Float, default=0.0)
    # Computed scores
    perf_score = db.Column(db.Float, nullable=True)
    perf_decomposition = db.Column(db.JSON, nullable=True)
    evidence_hash = db.Column(db.String(128), nullable=True)
    formula_version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=utcnow)


class ConstellationBrief(db.Model):
    __tablename__ = "constellation_brief"
    __table_args__ = (
        db.Index('ix_const_brief_constellation', 'constellation_id'),
        db.Index('ix_const_brief_week', 'week_start'),
    )
    id = db.Column(db.Integer, primary_key=True)
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id'), nullable=False)
    week_start = db.Column(db.Date, nullable=False)
    summary_json = db.Column(db.JSON, nullable=False)
    top_performers = db.Column(db.JSON, nullable=True)
    risk_flags = db.Column(db.JSON, nullable=True)
    synergy_pairs = db.Column(db.JSON, nullable=True)
    evidence_hash = db.Column(db.String(128), nullable=True)
    formula_version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=utcnow)

    constellation = db.relationship('Constellation', backref='briefs')


class ConstellationSuggestion(db.Model):
    __tablename__ = "constellation_suggestion"
    __table_args__ = (
        db.Index('ix_const_suggestion_constellation', 'constellation_id'),
        db.Index('ix_const_suggestion_target', 'target_microcosm_id'),
    )
    id = db.Column(db.Integer, primary_key=True)
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id'), nullable=False)
    target_microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=False)
    suggestion_type = db.Column(db.String(80), nullable=False)  # coordinate, merge, learn_from, split_load
    title = db.Column(db.String(200), nullable=False)
    rationale = db.Column(db.String(1000), nullable=True)
    related_microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=True)
    score_impact = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(40), default='pending')  # pending, accepted, dismissed
    evidence_hash = db.Column(db.String(128), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    constellation = db.relationship('Constellation', backref='suggestions')

    def to_dict(self):
        return {
            "id": self.id,
            "constellationId": self.constellation_id,
            "targetMicrocosmId": self.target_microcosm_id,
            "suggestionType": self.suggestion_type,
            "title": self.title,
            "rationale": self.rationale,
            "relatedMicrocosmId": self.related_microcosm_id,
            "scoreImpact": self.score_impact,
            "status": self.status,
            "evidenceHash": self.evidence_hash,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class ConstellationDriftAlert(db.Model):
    __tablename__ = "constellation_drift_alert"
    __table_args__ = (
        db.Index('ix_const_drift_constellation', 'constellation_id'),
        db.Index('ix_const_drift_severity', 'severity'),
        db.Index('ix_const_drift_created_at', 'created_at'),
    )
    id = db.Column(db.Integer, primary_key=True)
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id'), nullable=False)
    week_start = db.Column(db.Date, nullable=False)
    alert_type = db.Column(db.String(80), nullable=False)  # hhi_volume, gini_tenure, sybil, collusion, baseline_manipulation, reaction_manipulation
    severity = db.Column(db.String(40), nullable=False)  # info, warning, critical
    metric_name = db.Column(db.String(120), nullable=False)
    metric_value = db.Column(db.Float, nullable=False)
    threshold = db.Column(db.Float, nullable=False)
    detail_json = db.Column(db.JSON, nullable=True)
    response_action = db.Column(db.String(120), nullable=True)  # soft_correction, uplift_proof, drift_alert, capture_review
    resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    evidence_hash = db.Column(db.String(128), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    constellation = db.relationship('Constellation', backref='drift_alerts')

    def to_dict(self):
        return {
            "id": self.id,
            "constellationId": self.constellation_id,
            "weekStart": self.week_start.isoformat() if self.week_start else None,
            "alertType": self.alert_type,
            "severity": self.severity,
            "metricName": self.metric_name,
            "metricValue": self.metric_value,
            "threshold": self.threshold,
            "detailJson": self.detail_json,
            "responseAction": self.response_action,
            "resolved": self.resolved,
            "evidenceHash": self.evidence_hash,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }


class ConstellationRanking(db.Model):
    __tablename__ = "constellation_ranking"
    __table_args__ = (
        db.UniqueConstraint('constellation_id', 'microcosm_id', 'week_start', name='uq_const_ranking_week'),
        db.Index('ix_const_ranking_constellation', 'constellation_id'),
        db.Index('ix_const_ranking_week', 'week_start'),
    )
    id = db.Column(db.Integer, primary_key=True)
    constellation_id = db.Column(db.Integer, db.ForeignKey('constellation.id'), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey('microcosm.id'), nullable=False)
    week_start = db.Column(db.Date, nullable=False)
    rank = db.Column(db.Integer, nullable=False)
    raw_perf = db.Column(db.Float, nullable=False)
    anti_capture_weight = db.Column(db.Float, nullable=False, default=1.0)
    featured_score = db.Column(db.Float, nullable=False)
    is_featured = db.Column(db.Boolean, default=False)
    is_best_practice = db.Column(db.Boolean, default=False)
    gate_failures = db.Column(db.JSON, nullable=True)  # list of gate names that blocked featuring
    component_contributions = db.Column(db.JSON, nullable=False)  # {variable: weighted_contribution}
    evidence_hash = db.Column(db.String(128), nullable=True)
    formula_version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=utcnow)

    constellation = db.relationship('Constellation', backref='rankings')


class ConstellationParameterBounds(db.Model):
    __tablename__ = "constellation_parameter_bounds"
    __table_args__ = (
        db.UniqueConstraint('param_key', 'version', name='uq_const_param_bounds'),
    )
    id = db.Column(db.Integer, primary_key=True)
    param_key = db.Column(db.String(120), nullable=False)
    version = db.Column(db.Integer, nullable=False, default=1)
    lower_bound = db.Column(db.Float, nullable=False)
    upper_bound = db.Column(db.Float, nullable=False)
    default_value = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(500), nullable=True)
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


# ============================================================================
# EDUCATION STACK (Institutional Indigenous Knowledge Integration)
# ============================================================================

class IndigenousPlantKnowledge(db.Model):
    __tablename__ = "indigenous_plant_knowledge"
    __table_args__ = (
        db.Index("ix_indigenous_plant_region", "region"),
        db.Index("ix_indigenous_plant_season", "season"),
        db.Index("ix_indigenous_plant_sensitivity", "sensitivity_level"),
        db.Index("ix_indigenous_plant_verification", "verification_status"),
        db.Index("ix_indigenous_plant_microcosm", "microcosm_id"),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=True)
    microcosm_id = db.Column(db.Integer, db.ForeignKey("microcosm.id"), nullable=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=True)
    region = db.Column(db.String(120), nullable=False)
    language_group = db.Column(db.String(120), nullable=False)
    indigenous_name = db.Column(db.String(200), nullable=False)
    scientific_name = db.Column(db.String(200), nullable=True)
    season = db.Column(db.String(80), nullable=False)
    traditional_uses = db.Column(db.Text, nullable=False)
    preparation_methods = db.Column(db.Text, nullable=True)
    cultural_context = db.Column(db.Text, nullable=True)
    scientific_notes = db.Column(db.Text, nullable=True)
    sensitivity_level = db.Column(db.String(20), nullable=False, default="public")
    verification_status = db.Column(db.String(30), nullable=False, default="pending")
    elder_verified = db.Column(db.Boolean, default=False)
    custodial_region_tag = db.Column(db.String(140), nullable=True)
    attribution_community = db.Column(db.String(200), nullable=True)
    attribution_custodian = db.Column(db.String(200), nullable=True)
    lineage_reference = db.Column(db.String(220), nullable=True)
    language_code = db.Column(db.String(20), nullable=True)
    geo_lat = db.Column(db.Float, nullable=True)
    geo_lng = db.Column(db.Float, nullable=True)
    offline_package_ref = db.Column(db.String(220), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    verified_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    media_assets = db.relationship(
        "PlantMediaAsset",
        backref="plant",
        lazy=True,
        cascade="all, delete-orphan",
    )
    ecological_relationships = db.relationship(
        "PlantEcologicalRelationship",
        foreign_keys="PlantEcologicalRelationship.plant_id",
        backref="plant",
        lazy=True,
        cascade="all, delete-orphan",
    )
    landscape_states = db.relationship(
        "PlantLandscapeState",
        backref="plant",
        lazy=True,
        cascade="all, delete-orphan",
    )
    approvals = db.relationship(
        "KnowledgeApprovalRecord",
        backref="knowledge_entry",
        lazy=True,
        cascade="all, delete-orphan",
    )
    audit_log_entries = db.relationship(
        "KnowledgeAuditLog",
        backref="knowledge_entry",
        lazy=True,
        cascade="all, delete-orphan",
    )


class PlantMediaAsset(db.Model):
    __tablename__ = "plant_media_asset"
    __table_args__ = (
        db.Index("ix_plant_media_plant_id", "plant_id"),
        db.Index("ix_plant_media_type", "media_type"),
    )
    id = db.Column(db.Integer, primary_key=True)
    plant_id = db.Column(db.Integer, db.ForeignKey("indigenous_plant_knowledge.id"), nullable=False)
    media_type = db.Column(db.String(40), nullable=False, default="illustration")
    asset_url = db.Column(db.String(500), nullable=False)
    thumbnail_url = db.Column(db.String(500), nullable=True)
    alt_text = db.Column(db.String(255), nullable=True)
    is_transparent_illustration = db.Column(db.Boolean, default=False)
    language_code = db.Column(db.String(20), nullable=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)


class PlantEcologicalRelationship(db.Model):
    __tablename__ = "plant_ecological_relationship"
    __table_args__ = (
        db.Index("ix_plant_relationship_plant_id", "plant_id"),
        db.Index("ix_plant_relationship_related", "related_plant_id"),
        db.Index("ix_plant_relationship_type", "relationship_type"),
    )
    id = db.Column(db.Integer, primary_key=True)
    plant_id = db.Column(db.Integer, db.ForeignKey("indigenous_plant_knowledge.id"), nullable=False)
    related_plant_id = db.Column(db.Integer, db.ForeignKey("indigenous_plant_knowledge.id"), nullable=True)
    relationship_type = db.Column(db.String(40), nullable=False)
    related_label = db.Column(db.String(180), nullable=True)
    soil_type = db.Column(db.String(120), nullable=True)
    seasonal_cycle = db.Column(db.String(140), nullable=True)
    ethical_harvest_constraint = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class PlantLandscapeState(db.Model):
    __tablename__ = "plant_landscape_state"
    __table_args__ = (
        db.UniqueConstraint("plant_id", "state_label", name="uq_plant_landscape_state"),
        db.Index("ix_plant_landscape_state_label", "state_label"),
    )
    id = db.Column(db.Integer, primary_key=True)
    plant_id = db.Column(db.Integer, db.ForeignKey("indigenous_plant_knowledge.id"), nullable=False)
    state_label = db.Column(db.String(30), nullable=False)  # before|degraded|regenerated
    biodiversity_index = db.Column(db.Float, nullable=True)
    soil_health_index = db.Column(db.Float, nullable=True)
    canopy_cover_pct = db.Column(db.Float, nullable=True)
    narrative = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class KnowledgeLineage(db.Model):
    __tablename__ = "knowledge_lineage"
    __table_args__ = (
        db.UniqueConstraint("parent_knowledge_id", "child_knowledge_id", "relation_type", name="uq_knowledge_lineage"),
        db.Index("ix_knowledge_lineage_parent", "parent_knowledge_id"),
        db.Index("ix_knowledge_lineage_child", "child_knowledge_id"),
    )
    id = db.Column(db.Integer, primary_key=True)
    parent_knowledge_id = db.Column(db.Integer, db.ForeignKey("indigenous_plant_knowledge.id"), nullable=False)
    child_knowledge_id = db.Column(db.Integer, db.ForeignKey("indigenous_plant_knowledge.id"), nullable=False)
    relation_type = db.Column(db.String(60), nullable=False, default="derived_from")
    notes = db.Column(db.String(500), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class KnowledgeApprovalRecord(db.Model):
    __tablename__ = "knowledge_approval_record"
    __table_args__ = (
        db.Index("ix_knowledge_approval_knowledge_id", "knowledge_id"),
        db.Index("ix_knowledge_approval_decision", "decision"),
    )
    id = db.Column(db.Integer, primary_key=True)
    knowledge_id = db.Column(db.Integer, db.ForeignKey("indigenous_plant_knowledge.id"), nullable=False)
    verifier_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    decision = db.Column(db.String(30), nullable=False)  # approved|rejected
    notes = db.Column(db.String(500), nullable=True)
    elder_verification_flag = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class KnowledgeAuditLog(db.Model):
    __tablename__ = "knowledge_audit_log"
    __table_args__ = (
        db.Index("ix_knowledge_audit_knowledge_id", "knowledge_id"),
        db.Index("ix_knowledge_audit_created_at", "created_at"),
    )
    id = db.Column(db.Integer, primary_key=True)
    knowledge_id = db.Column(db.Integer, db.ForeignKey("indigenous_plant_knowledge.id"), nullable=False)
    actor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    action = db.Column(db.String(120), nullable=False)
    details = db.Column(db.String(1000), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class EducationProgram(db.Model):
    __tablename__ = "education_program"
    __table_args__ = (
        db.Index("ix_education_program_region", "region"),
        db.Index("ix_education_program_active", "is_active"),
        db.Index("ix_education_program_microcosm", "microcosm_id"),
    )
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=True)
    microcosm_id = db.Column(db.Integer, db.ForeignKey("microcosm.id"), nullable=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=True)
    title = db.Column(db.String(220), nullable=False)
    description = db.Column(db.Text, nullable=True)
    region = db.Column(db.String(120), nullable=True)
    language_group = db.Column(db.String(120), nullable=True)
    branch_code = db.Column(db.String(80), nullable=True)
    accreditation_code = db.Column(db.String(120), nullable=True)
    offline_package_ref = db.Column(db.String(220), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class EducationProgramModule(db.Model):
    __tablename__ = "education_program_module"
    __table_args__ = (
        db.UniqueConstraint("program_id", "module_id", name="uq_education_program_module"),
        db.Index("ix_education_program_module_program_id", "program_id"),
        db.Index("ix_education_program_module_module_id", "module_id"),
    )
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey("education_program.id"), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey("module.id"), nullable=False)
    sequence = db.Column(db.Integer, default=0)
    depth_tier_required = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=utcnow)


class EducationBadge(db.Model):
    __tablename__ = "education_badge"
    __table_args__ = (
        db.UniqueConstraint("slug", name="uq_education_badge_slug"),
        db.Index("ix_education_badge_active", "is_active"),
    )
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(120), nullable=False)
    title = db.Column(db.String(180), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    cultural_note = db.Column(db.String(500), nullable=True)
    icon_ref = db.Column(db.String(240), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class EducationTopic(db.Model):
    __tablename__ = "education_topic"
    __table_args__ = (
        db.Index("ix_education_topic_program_id", "program_id"),
        db.Index("ix_education_topic_module_id", "module_id"),
        db.Index("ix_education_topic_depth_tier", "depth_tier"),
        db.Index("ix_education_topic_sensitivity", "sensitivity_level"),
    )
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey("education_program.id"), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey("module.id"), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey("microcosm.id"), nullable=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=True)
    title = db.Column(db.String(220), nullable=False)
    description = db.Column(db.Text, nullable=True)
    depth_tier = db.Column(db.Integer, nullable=False, default=1)
    assessment_type = db.Column(db.String(80), nullable=False, default="reflection")
    reflection_prompt = db.Column(db.Text, nullable=True)
    action_link_id = db.Column(db.Integer, db.ForeignKey("action.id"), nullable=True)
    badge_link_id = db.Column(db.Integer, db.ForeignKey("education_badge.id"), nullable=True)
    sensitivity_level = db.Column(db.String(20), nullable=False, default="public")
    branch_code = db.Column(db.String(80), nullable=True)
    offline_package_ref = db.Column(db.String(220), nullable=True)
    sequence = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    experiences = db.relationship(
        "EducationInteractiveExperience",
        backref="topic",
        lazy=True,
        cascade="all, delete-orphan",
    )


class EducationInteractiveExperience(db.Model):
    __tablename__ = "education_interactive_experience"
    __table_args__ = (
        db.Index("ix_education_experience_topic_id", "topic_id"),
        db.Index("ix_education_experience_type", "experience_type"),
    )
    id = db.Column(db.Integer, primary_key=True)
    topic_id = db.Column(db.Integer, db.ForeignKey("education_topic.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    experience_type = db.Column(db.String(80), nullable=False, default="interactive")
    content_ref = db.Column(db.String(500), nullable=True)
    narration_ref = db.Column(db.String(500), nullable=True)
    mapping_ref = db.Column(db.String(500), nullable=True)
    sequence = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class EducationUserProgress(db.Model):
    __tablename__ = "education_user_progress"
    __table_args__ = (
        db.UniqueConstraint("user_id", "program_id", "module_id", "topic_id", name="uq_education_user_progress"),
        db.Index("ix_education_progress_user_id", "user_id"),
        db.Index("ix_education_progress_topic_id", "topic_id"),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey("education_program.id"), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey("module.id"), nullable=False)
    topic_id = db.Column(db.Integer, db.ForeignKey("education_topic.id"), nullable=False)
    completion_percent = db.Column(db.Integer, default=0)
    depth_tier_unlocked = db.Column(db.Integer, default=1)
    status = db.Column(db.String(40), nullable=False, default="in_progress")
    completed_at = db.Column(db.DateTime, nullable=True)
    last_activity_at = db.Column(db.DateTime, default=utcnow)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class EducationReflection(db.Model):
    __tablename__ = "education_reflection"
    __table_args__ = (
        db.Index("ix_education_reflection_user_id", "user_id"),
        db.Index("ix_education_reflection_topic_id", "topic_id"),
        db.Index("ix_education_reflection_submitted_at", "submitted_at"),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey("education_program.id"), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey("module.id"), nullable=False)
    topic_id = db.Column(db.Integer, db.ForeignKey("education_topic.id"), nullable=False)
    prompt = db.Column(db.Text, nullable=False)
    response_text = db.Column(db.Text, nullable=False)
    submitted_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class EducationBadgeAward(db.Model):
    __tablename__ = "education_badge_award"
    __table_args__ = (
        db.Index("ix_education_badge_award_user", "user_id"),
        db.Index("ix_education_badge_award_badge", "badge_id"),
        db.Index("ix_education_badge_award_topic", "topic_id"),
    )
    id = db.Column(db.Integer, primary_key=True)
    badge_id = db.Column(db.Integer, db.ForeignKey("education_badge.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey("education_program.id"), nullable=True)
    module_id = db.Column(db.Integer, db.ForeignKey("module.id"), nullable=True)
    topic_id = db.Column(db.Integer, db.ForeignKey("education_topic.id"), nullable=True)
    awarded_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    award_reason = db.Column(db.String(400), nullable=True)
    awarded_at = db.Column(db.DateTime, default=utcnow)


class EducationRegenerationLink(db.Model):
    __tablename__ = "education_regeneration_link"
    __table_args__ = (
        db.Index("ix_education_regen_program", "program_id"),
        db.Index("ix_education_regen_module", "module_id"),
        db.Index("ix_education_regen_topic", "topic_id"),
        db.Index("ix_education_regen_action", "action_id"),
    )
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey("education_program.id"), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey("module.id"), nullable=False)
    topic_id = db.Column(db.Integer, db.ForeignKey("education_topic.id"), nullable=True)
    action_id = db.Column(db.Integer, db.ForeignKey("action.id"), nullable=False)
    action_category = db.Column(db.String(80), nullable=False)
    unlock_threshold = db.Column(db.Integer, nullable=False, default=100)
    requires_verification = db.Column(db.Boolean, default=True)
    cultural_guidance = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class EducationRegenerationLog(db.Model):
    __tablename__ = "education_regeneration_log"
    __table_args__ = (
        db.UniqueConstraint("user_id", "regeneration_link_id", name="uq_education_regeneration_log"),
        db.Index("ix_education_regen_log_user", "user_id"),
        db.Index("ix_education_regen_log_status", "completion_status"),
    )
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    regeneration_link_id = db.Column(db.Integer, db.ForeignKey("education_regeneration_link.id"), nullable=False)
    action_id = db.Column(db.Integer, db.ForeignKey("action.id"), nullable=False)
    completion_status = db.Column(db.String(30), nullable=False, default="pending")
    proof_note = db.Column(db.String(500), nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    verified_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


# ---------------------------------------------------------------------------
# Phase 1 — Weekly Cost-Lowering Engine (WCLE)
# ---------------------------------------------------------------------------

class WCLERun(db.Model):
    """A bulk-buying run organised by an organizer for a group of households."""
    __tablename__ = "wcle_run"
    __table_args__ = (
        db.Index("ix_wcle_run_organizer", "organizer_user_id"),
        db.Index("ix_wcle_run_microcosm", "microcosm_id"),
        db.Index("ix_wcle_run_status", "status"),
        db.Index("ix_wcle_run_date", "run_date"),
        db.Index("ix_wcle_run_postcode", "postcode"),
    )

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    supplier_type = db.Column(
        db.String(40), nullable=False, default="CUSTOM"
    )  # FLEMINGTON, COSTCO, BUTCHER, ALDI, CUSTOM
    location_name = db.Column(db.String(200), nullable=True)
    address = db.Column(db.String(300), nullable=True)
    suburb = db.Column(db.String(100), nullable=True)
    postcode = db.Column(db.String(10), nullable=True)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)

    organizer_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    microcosm_id = db.Column(db.Integer, db.ForeignKey("microcosm.id"), nullable=True)
    run_date = db.Column(db.DateTime, nullable=False)
    pledge_deadline = db.Column(db.DateTime, nullable=False)
    pickup_window_start = db.Column(db.DateTime, nullable=True)
    pickup_window_end = db.Column(db.DateTime, nullable=True)

    status = db.Column(
        db.String(20), nullable=False, default="DRAFT"
    )  # DRAFT, OPEN, CLOSED, EXECUTED, COMPLETED, CANCELLED

    coordination_fee_per_household_cents = db.Column(db.Integer, nullable=False, default=0)
    max_households = db.Column(db.Integer, nullable=True)

    retail_equivalent_total_cents = db.Column(db.Integer, nullable=True)
    bulk_estimate_total_cents = db.Column(db.Integer, nullable=True)
    bulk_actual_total_cents = db.Column(db.Integer, nullable=True)

    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    # Relationships
    packs = db.relationship("WCLEPack", backref="run", lazy="dynamic")
    pledges = db.relationship("WCLEPledge", backref="run", lazy="dynamic")
    receipts = db.relationship("WCLERunReceipt", backref="run", lazy="dynamic")
    organizer = db.relationship("User", foreign_keys=[organizer_user_id])
    microcosm = db.relationship("Microcosm", foreign_keys=[microcosm_id])

    VALID_STATUSES = ("DRAFT", "OPEN", "CLOSED", "EXECUTED", "COMPLETED", "CANCELLED")
    VALID_SUPPLIER_TYPES = ("FLEMINGTON", "COSTCO", "BUTCHER", "ALDI", "CUSTOM")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "supplier_type": self.supplier_type,
            "location_name": self.location_name,
            "address": self.address,
            "suburb": self.suburb,
            "postcode": self.postcode,
            "lat": self.lat,
            "lng": self.lng,
            "organizer_user_id": self.organizer_user_id,
            "microcosm_id": self.microcosm_id,
            "run_date": self.run_date.isoformat() if self.run_date else None,
            "pledge_deadline": self.pledge_deadline.isoformat() if self.pledge_deadline else None,
            "pickup_window_start": self.pickup_window_start.isoformat() if self.pickup_window_start else None,
            "pickup_window_end": self.pickup_window_end.isoformat() if self.pickup_window_end else None,
            "status": self.status,
            "coordination_fee_per_household_cents": self.coordination_fee_per_household_cents,
            "max_households": self.max_households,
            "retail_equivalent_total_cents": self.retail_equivalent_total_cents,
            "bulk_estimate_total_cents": self.bulk_estimate_total_cents,
            "bulk_actual_total_cents": self.bulk_actual_total_cents,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class WCLEPack(db.Model):
    """A pre-defined pack of items within a run that households can pledge for."""
    __tablename__ = "wcle_pack"
    __table_args__ = (
        db.Index("ix_wcle_pack_run_id", "run_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    run_id = db.Column(db.Integer, db.ForeignKey("wcle_run.id"), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    items_json = db.Column(db.Text, nullable=False, default="[]")
    adjustable_quantities = db.Column(db.Boolean, default=False)
    waste_buffer_bps = db.Column(db.Integer, default=500)  # basis points, 500 = 5%
    retail_estimate_cents = db.Column(db.Integer, nullable=True)
    bulk_estimate_cents = db.Column(db.Integer, nullable=True)

    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    pledges = db.relationship("WCLEPledge", backref="pack", lazy="dynamic")

    def to_dict(self):
        import json as _json
        items = []
        if self.items_json:
            try:
                items = _json.loads(self.items_json) if isinstance(self.items_json, str) else self.items_json
            except (_json.JSONDecodeError, TypeError):
                items = []
        return {
            "id": self.id,
            "run_id": self.run_id,
            "name": self.name,
            "description": self.description,
            "items": items,
            "adjustable_quantities": self.adjustable_quantities,
            "waste_buffer_bps": self.waste_buffer_bps,
            "retail_estimate_cents": self.retail_estimate_cents,
            "bulk_estimate_cents": self.bulk_estimate_cents,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class WCLEPledge(db.Model):
    """A household's commitment to purchase items from a run."""
    __tablename__ = "wcle_pledge"
    __table_args__ = (
        db.Index("ix_wcle_pledge_run_id", "run_id"),
        db.Index("ix_wcle_pledge_user_id", "user_id"),
        db.Index("ix_wcle_pledge_pack_id", "pack_id"),
        db.Index("ix_wcle_pledge_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    run_id = db.Column(db.Integer, db.ForeignKey("wcle_run.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    pack_id = db.Column(db.Integer, db.ForeignKey("wcle_pack.id"), nullable=True)
    custom_items_json = db.Column(db.Text, nullable=True)

    status = db.Column(
        db.String(20), nullable=False, default="DRAFT"
    )  # DRAFT, CONFIRMED, CANCELLED, FULFILLED, NO_SHOW

    estimated_retail_cents = db.Column(db.Integer, nullable=True)
    estimated_bulk_cents = db.Column(db.Integer, nullable=True)
    final_allocated_bulk_cents = db.Column(db.Integer, nullable=True)
    final_coordination_fee_cents = db.Column(db.Integer, nullable=True)
    final_total_cents = db.Column(db.Integer, nullable=True)
    savings_cents = db.Column(db.Integer, nullable=True)

    pickup_confirmed_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    user = db.relationship("User", foreign_keys=[user_id])

    VALID_STATUSES = ("DRAFT", "CONFIRMED", "CANCELLED", "FULFILLED", "NO_SHOW")

    def to_dict(self):
        import json as _json
        custom_items = None
        if self.custom_items_json:
            try:
                custom_items = _json.loads(self.custom_items_json) if isinstance(self.custom_items_json, str) else self.custom_items_json
            except (_json.JSONDecodeError, TypeError):
                custom_items = None
        return {
            "id": self.id,
            "run_id": self.run_id,
            "user_id": self.user_id,
            "pack_id": self.pack_id,
            "custom_items": custom_items,
            "status": self.status,
            "estimated_retail_cents": self.estimated_retail_cents,
            "estimated_bulk_cents": self.estimated_bulk_cents,
            "final_allocated_bulk_cents": self.final_allocated_bulk_cents,
            "final_coordination_fee_cents": self.final_coordination_fee_cents,
            "final_total_cents": self.final_total_cents,
            "savings_cents": self.savings_cents,
            "pickup_confirmed_at": self.pickup_confirmed_at.isoformat() if self.pickup_confirmed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class WCLERunReceipt(db.Model):
    """Receipt evidence for a completed run's actual bulk purchase cost."""
    __tablename__ = "wcle_run_receipt"
    __table_args__ = (
        db.Index("ix_wcle_receipt_run_id", "run_id"),
        db.UniqueConstraint("receipt_hash", name="uq_wcle_receipt_hash"),
    )

    id = db.Column(db.Integer, primary_key=True)
    run_id = db.Column(db.Integer, db.ForeignKey("wcle_run.id"), nullable=False)
    receipt_type = db.Column(db.String(20), nullable=False, default="MANUAL_ENTRY")  # PHOTO, MANUAL_ENTRY
    receipt_hash = db.Column(db.String(64), nullable=False)  # SHA-256
    receipt_meta_json = db.Column(db.Text, nullable=True)  # store name, timestamp, totals
    bulk_actual_total_cents = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    VALID_RECEIPT_TYPES = ("PHOTO", "MANUAL_ENTRY")

    def to_dict(self):
        import json as _json
        meta = None
        if self.receipt_meta_json:
            try:
                meta = _json.loads(self.receipt_meta_json) if isinstance(self.receipt_meta_json, str) else self.receipt_meta_json
            except (_json.JSONDecodeError, TypeError):
                meta = None
        return {
            "id": self.id,
            "run_id": self.run_id,
            "receipt_type": self.receipt_type,
            "receipt_hash": self.receipt_hash,
            "receipt_meta": meta,
            "bulk_actual_total_cents": self.bulk_actual_total_cents,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class WCLERetailBaselinePrice(db.Model):
    """Tracked retail prices used to compute savings vs bulk purchase prices."""
    __tablename__ = "wcle_retail_baseline_price"
    __table_args__ = (
        db.Index("ix_wcle_baseline_item_key", "item_key"),
        db.Index("ix_wcle_baseline_retailer", "retailer"),
        db.Index("ix_wcle_baseline_captured_at", "captured_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    item_key = db.Column(db.String(200), nullable=False)  # normalised item key
    retailer = db.Column(db.String(40), nullable=False)  # WOOLWORTHS, COLES, ALDI, OTHER
    price_cents = db.Column(db.Integer, nullable=False)
    unit = db.Column(db.String(40), nullable=False)  # kg, each, bunch, etc
    postcode = db.Column(db.String(10), nullable=True)
    captured_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    source_note = db.Column(db.String(500), nullable=True)  # url/screenshot id/manual
    created_at = db.Column(db.DateTime, default=utcnow)

    VALID_RETAILERS = ("WOOLWORTHS", "COLES", "ALDI", "OTHER")

    def to_dict(self):
        return {
            "id": self.id,
            "item_key": self.item_key,
            "retailer": self.retailer,
            "price_cents": self.price_cents,
            "unit": self.unit,
            "postcode": self.postcode,
            "captured_at": self.captured_at.isoformat() if self.captured_at else None,
            "source_note": self.source_note,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# Calendar & Scheduling Models
# ---------------------------------------------------------------------------

class Shift(db.Model):
    """A volunteer shift that can be signed up for."""
    __tablename__ = "shift"
    __table_args__ = (
        db.Index("ix_shift_node_id", "node_id"),
        db.Index("ix_shift_date", "date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey("node.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    location = db.Column(db.String(300), nullable=True)
    max_volunteers = db.Column(db.Integer, nullable=False, default=10)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)

    assignments = db.relationship("ShiftAssignment", backref="shift", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "node_id": self.node_id,
            "title": self.title,
            "description": self.description,
            "date": self.date.isoformat() if self.date else None,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "location": self.location,
            "max_volunteers": self.max_volunteers,
            "created_by": self.created_by,
            "assigned_count": self.assignments.count() if self.assignments else 0,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ShiftAssignment(db.Model):
    """Assignment of a volunteer to a shift."""
    __tablename__ = "shift_assignment"
    __table_args__ = (
        db.UniqueConstraint("shift_id", "user_id", name="uq_shift_user"),
        db.Index("ix_shift_assignment_user", "user_id"),
    )

    VALID_STATUSES = ("pending", "confirmed", "completed", "cancelled")

    id = db.Column(db.Integer, primary_key=True)
    shift_id = db.Column(db.Integer, db.ForeignKey("shift.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "shift_id": self.shift_id,
            "user_id": self.user_id,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Availability(db.Model):
    """Weekly availability slots for a user."""
    __tablename__ = "availability"
    __table_args__ = (
        db.Index("ix_availability_user", "user_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)  # 0=Mon ... 6=Sun
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "day_of_week": self.day_of_week,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
        }


class RecurringEvent(db.Model):
    """Recurrence rule attached to an Event."""
    __tablename__ = "recurring_event"

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("event.id"), nullable=False, unique=True)
    recurrence_rule = db.Column(db.String(300), nullable=False)  # iCal RRULE string
    until_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "recurrence_rule": self.recurrence_rule,
            "until_date": self.until_date.isoformat() if self.until_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ---------------------------------------------------------------------------
# Cultural Intelligence Architecture (Connector/Fusion/Graph/Worlds/Coordination)
# ---------------------------------------------------------------------------


class ConnectorRegistration(db.Model):
    __tablename__ = "ci_connector_registration"
    __table_args__ = (
        db.UniqueConstraint("name", name="uq_ci_connector_name"),
        db.Index("ix_ci_connector_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(140), nullable=False)
    connector_type = db.Column(db.String(80), nullable=False)
    source_slug = db.Column(db.String(120), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="active")
    config_json = db.Column(db.JSON, nullable=True)
    last_pulled_at = db.Column(db.DateTime, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)


class ConnectorPullJob(db.Model):
    __tablename__ = "ci_connector_pull_job"
    __table_args__ = (
        db.Index("ix_ci_connector_pull_job_status", "status"),
        db.Index("ix_ci_connector_pull_job_not_before", "not_before"),
        db.Index("ix_ci_connector_pull_job_connector", "connector_id"),
        db.Index("ix_ci_connector_pull_job_request_key", "request_key"),
        db.Index("ix_ci_connector_pull_job_lease_expires", "lease_expires_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    connector_id = db.Column(db.Integer, db.ForeignKey("ci_connector_registration.id"), nullable=False)
    requested_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="queued")
    attempts = db.Column(db.Integer, nullable=False, default=0)
    max_attempts = db.Column(db.Integer, nullable=False, default=5)
    last_error = db.Column(db.String(500), nullable=True)
    payload_json = db.Column(db.JSON, nullable=True)
    request_key = db.Column(db.String(160), nullable=True)
    worker_id = db.Column(db.String(120), nullable=True)
    not_before = db.Column(db.DateTime, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    lease_expires_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    dead_letter_reason = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "connector_id": self.connector_id,
            "requested_by": self.requested_by,
            "status": self.status,
            "attempts": self.attempts,
            "max_attempts": self.max_attempts,
            "last_error": self.last_error,
            "payload": self.payload_json or {},
            "request_key": self.request_key,
            "worker_id": self.worker_id,
            "not_before": self.not_before.isoformat() if self.not_before else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "lease_expires_at": self.lease_expires_at.isoformat() if self.lease_expires_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "dead_letter_reason": self.dead_letter_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class RawSignal(db.Model):
    __tablename__ = "ci_raw_signal"
    __table_args__ = (
        db.Index("ix_ci_raw_signal_connector_id", "connector_id"),
        db.Index("ix_ci_raw_signal_external_id", "external_id"),
        db.Index("ix_ci_raw_signal_ingested_at", "ingested_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    connector_id = db.Column(db.Integer, db.ForeignKey("ci_connector_registration.id"), nullable=False)
    source_slug = db.Column(db.String(120), nullable=False)
    external_id = db.Column(db.String(180), nullable=True)
    payload_json = db.Column(db.JSON, nullable=False)
    ingested_at = db.Column(db.DateTime, default=utcnow)


class UniversalEventObject(db.Model):
    __tablename__ = "ci_ueo"
    __table_args__ = (
        db.UniqueConstraint("fingerprint", name="uq_ci_ueo_fingerprint"),
        db.Index("ix_ci_ueo_occurred_at", "occurred_at"),
        db.Index("ix_ci_ueo_source_slug", "source_slug"),
    )

    id = db.Column(db.Integer, primary_key=True)
    raw_signal_id = db.Column(db.Integer, db.ForeignKey("ci_raw_signal.id"), nullable=True)
    source_slug = db.Column(db.String(120), nullable=False)
    external_id = db.Column(db.String(180), nullable=True)
    event_type = db.Column(db.String(120), nullable=False)
    title = db.Column(db.String(240), nullable=False)
    summary = db.Column(db.Text, nullable=True)
    occurred_at = db.Column(db.DateTime, nullable=False)
    region = db.Column(db.String(120), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    entity_refs_json = db.Column(db.JSON, nullable=True)
    importance_hint = db.Column(db.Float, nullable=True)
    confidence = db.Column(db.Float, nullable=False, default=0.5)
    normalized_json = db.Column(db.JSON, nullable=False)
    fingerprint = db.Column(db.String(96), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class FusedEvent(db.Model):
    __tablename__ = "ci_fused_event"
    __table_args__ = (
        db.UniqueConstraint("dedupe_key", name="uq_ci_fused_event_dedupe_key"),
        db.Index("ix_ci_fused_event_cluster_key", "cluster_key"),
        db.Index("ix_ci_fused_event_occurred_at", "occurred_at"),
        db.Index("ix_ci_fused_event_score", "total_score"),
    )

    id = db.Column(db.Integer, primary_key=True)
    dedupe_key = db.Column(db.String(120), nullable=False)
    event_type = db.Column(db.String(120), nullable=False)
    canonical_title = db.Column(db.String(240), nullable=False)
    summary = db.Column(db.Text, nullable=True)
    occurred_at = db.Column(db.DateTime, nullable=False)
    region = db.Column(db.String(120), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    cluster_key = db.Column(db.String(120), nullable=True)
    source_count = db.Column(db.Integer, nullable=False, default=1)
    confidence = db.Column(db.Float, nullable=False, default=0.5)
    novelty_score = db.Column(db.Float, nullable=False, default=0.0)
    proximity_score = db.Column(db.Float, nullable=False, default=0.0)
    importance_score = db.Column(db.Float, nullable=False, default=0.0)
    total_score = db.Column(db.Float, nullable=False, default=0.0)
    fused_payload = db.Column(db.JSON, nullable=False, default=dict)
    first_seen_at = db.Column(db.DateTime, default=utcnow)
    last_seen_at = db.Column(db.DateTime, default=utcnow)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "dedupe_key": self.dedupe_key,
            "event_type": self.event_type,
            "canonical_title": self.canonical_title,
            "summary": self.summary,
            "occurred_at": self.occurred_at.isoformat() if self.occurred_at else None,
            "region": self.region,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "cluster_key": self.cluster_key,
            "source_count": self.source_count,
            "confidence": self.confidence,
            "novelty_score": self.novelty_score,
            "proximity_score": self.proximity_score,
            "importance_score": self.importance_score,
            "total_score": self.total_score,
            "fused_payload": self.fused_payload,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
        }


class FusedEventEvidence(db.Model):
    __tablename__ = "ci_fused_event_evidence"
    __table_args__ = (
        db.UniqueConstraint("fused_event_id", "ueo_id", name="uq_ci_fused_event_evidence"),
        db.Index("ix_ci_fused_event_evidence_fused_event", "fused_event_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    fused_event_id = db.Column(db.Integer, db.ForeignKey("ci_fused_event.id"), nullable=False)
    ueo_id = db.Column(db.Integer, db.ForeignKey("ci_ueo.id"), nullable=False)
    corroborates = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class StoryCluster(db.Model):
    __tablename__ = "ci_story_cluster"
    __table_args__ = (
        db.UniqueConstraint("cluster_key", name="uq_ci_story_cluster_key"),
        db.Index("ix_ci_story_cluster_score", "score"),
        db.Index("ix_ci_story_cluster_updated_at", "updated_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    cluster_key = db.Column(db.String(120), nullable=False)
    label = db.Column(db.String(240), nullable=False)
    entity_anchor = db.Column(db.String(180), nullable=True)
    window_start = db.Column(db.DateTime, nullable=True)
    window_end = db.Column(db.DateTime, nullable=True)
    centroid_lat = db.Column(db.Float, nullable=True)
    centroid_lng = db.Column(db.Float, nullable=True)
    event_count = db.Column(db.Integer, nullable=False, default=0)
    score = db.Column(db.Float, nullable=False, default=0.0)
    metadata_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "cluster_key": self.cluster_key,
            "label": self.label,
            "entity_anchor": self.entity_anchor,
            "window_start": self.window_start.isoformat() if self.window_start else None,
            "window_end": self.window_end.isoformat() if self.window_end else None,
            "centroid_lat": self.centroid_lat,
            "centroid_lng": self.centroid_lng,
            "event_count": self.event_count,
            "score": self.score,
            "metadata": self.metadata_json or {},
        }


class ClusterEventLink(db.Model):
    __tablename__ = "ci_cluster_event_link"
    __table_args__ = (
        db.UniqueConstraint("cluster_id", "fused_event_id", name="uq_ci_cluster_event_link"),
        db.Index("ix_ci_cluster_event_cluster_id", "cluster_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    cluster_id = db.Column(db.Integer, db.ForeignKey("ci_story_cluster.id"), nullable=False)
    fused_event_id = db.Column(db.Integer, db.ForeignKey("ci_fused_event.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class GraphEntity(db.Model):
    __tablename__ = "ci_graph_entity"
    __table_args__ = (
        db.Index("ix_ci_graph_entity_name", "canonical_name"),
        db.Index("ix_ci_graph_entity_type", "entity_type"),
    )

    id = db.Column(db.Integer, primary_key=True)
    canonical_name = db.Column(db.String(220), nullable=False)
    entity_type = db.Column(db.String(120), nullable=False, default="topic")
    external_ids_json = db.Column(db.JSON, nullable=True)
    aliases_json = db.Column(db.JSON, nullable=True)
    metadata_json = db.Column(db.JSON, nullable=True)
    trust_score = db.Column(db.Float, nullable=False, default=0.5)
    merged_into_id = db.Column(db.Integer, db.ForeignKey("ci_graph_entity.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "canonical_name": self.canonical_name,
            "entity_type": self.entity_type,
            "external_ids": self.external_ids_json or {},
            "aliases": self.aliases_json or [],
            "metadata": self.metadata_json or {},
            "trust_score": self.trust_score,
        }


class GraphEdge(db.Model):
    __tablename__ = "ci_graph_edge"
    __table_args__ = (
        db.Index("ix_ci_graph_edge_source", "source_entity_id"),
        db.Index("ix_ci_graph_edge_target", "target_entity_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    source_entity_id = db.Column(db.Integer, db.ForeignKey("ci_graph_entity.id"), nullable=False)
    target_entity_id = db.Column(db.Integer, db.ForeignKey("ci_graph_entity.id"), nullable=False)
    relation_type = db.Column(db.String(120), nullable=False)
    weight = db.Column(db.Float, nullable=False, default=1.0)
    metadata_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "source_entity_id": self.source_entity_id,
            "target_entity_id": self.target_entity_id,
            "relation_type": self.relation_type,
            "weight": self.weight,
            "metadata": self.metadata_json or {},
        }


class GraphClaim(db.Model):
    __tablename__ = "ci_graph_claim"
    __table_args__ = (
        db.Index("ix_ci_graph_claim_entity", "entity_id"),
        db.Index("ix_ci_graph_claim_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    entity_id = db.Column(db.Integer, db.ForeignKey("ci_graph_entity.id"), nullable=False)
    claim_text = db.Column(db.String(1000), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="candidate")
    confidence = db.Column(db.Float, nullable=False, default=0.5)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "entity_id": self.entity_id,
            "claim_text": self.claim_text,
            "status": self.status,
            "confidence": self.confidence,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class GraphEvidence(db.Model):
    __tablename__ = "ci_graph_evidence"
    __table_args__ = (
        db.Index("ix_ci_graph_evidence_claim", "claim_id"),
        db.Index("ix_ci_graph_evidence_fused_event", "fused_event_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    claim_id = db.Column(db.Integer, db.ForeignKey("ci_graph_claim.id"), nullable=False)
    fused_event_id = db.Column(db.Integer, db.ForeignKey("ci_fused_event.id"), nullable=True)
    ueo_id = db.Column(db.Integer, db.ForeignKey("ci_ueo.id"), nullable=True)
    source_url = db.Column(db.String(500), nullable=True)
    excerpt = db.Column(db.String(1000), nullable=True)
    evidence_type = db.Column(db.String(80), nullable=False, default="signal")
    reliability_score = db.Column(db.Float, nullable=False, default=0.5)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "claim_id": self.claim_id,
            "fused_event_id": self.fused_event_id,
            "ueo_id": self.ueo_id,
            "source_url": self.source_url,
            "excerpt": self.excerpt,
            "evidence_type": self.evidence_type,
            "reliability_score": self.reliability_score,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class GraphEventLink(db.Model):
    __tablename__ = "ci_graph_event_link"
    __table_args__ = (
        db.UniqueConstraint("entity_id", "fused_event_id", name="uq_ci_graph_event_link"),
        db.Index("ix_ci_graph_event_link_entity", "entity_id"),
        db.Index("ix_ci_graph_event_link_event", "fused_event_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    entity_id = db.Column(db.Integer, db.ForeignKey("ci_graph_entity.id"), nullable=False)
    fused_event_id = db.Column(db.Integer, db.ForeignKey("ci_fused_event.id"), nullable=False)
    link_role = db.Column(db.String(80), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class CILearningModule(db.Model):
    __tablename__ = "ci_learning_module"
    __table_args__ = (
        db.UniqueConstraint("slug", name="uq_ci_learning_module_slug"),
        db.Index("ix_ci_learning_module_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(160), nullable=False)
    title = db.Column(db.String(220), nullable=False)
    description = db.Column(db.Text, nullable=True)
    content_json = db.Column(db.JSON, nullable=False, default=dict)
    linked_entity_id = db.Column(db.Integer, db.ForeignKey("ci_graph_entity.id"), nullable=True)
    linked_cluster_id = db.Column(db.Integer, db.ForeignKey("ci_story_cluster.id"), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="draft")
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    published_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "title": self.title,
            "description": self.description,
            "content": self.content_json or {},
            "linked_entity_id": self.linked_entity_id,
            "linked_cluster_id": self.linked_cluster_id,
            "status": self.status,
            "published_at": self.published_at.isoformat() if self.published_at else None,
        }


class CIGuidedJourney(db.Model):
    __tablename__ = "ci_guided_journey"
    __table_args__ = (
        db.UniqueConstraint("slug", name="uq_ci_guided_journey_slug"),
        db.Index("ix_ci_guided_journey_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(160), nullable=False)
    title = db.Column(db.String(220), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), nullable=False, default="draft")
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "title": self.title,
            "description": self.description,
            "status": self.status,
        }


class CIGuidedJourneyModule(db.Model):
    __tablename__ = "ci_guided_journey_module"
    __table_args__ = (
        db.UniqueConstraint("journey_id", "module_id", name="uq_ci_guided_journey_module"),
        db.Index("ix_ci_guided_journey_module_journey", "journey_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    journey_id = db.Column(db.Integer, db.ForeignKey("ci_guided_journey.id"), nullable=False)
    module_id = db.Column(db.Integer, db.ForeignKey("ci_learning_module.id"), nullable=False)
    sequence = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utcnow)


class CIQuestTemplate(db.Model):
    __tablename__ = "ci_quest_template"
    __table_args__ = (
        db.UniqueConstraint("slug", name="uq_ci_quest_template_slug"),
        db.Index("ix_ci_quest_template_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(160), nullable=False)
    title = db.Column(db.String(220), nullable=False)
    description = db.Column(db.Text, nullable=True)
    trigger_event_type = db.Column(db.String(120), nullable=True)
    trigger_entity_type = db.Column(db.String(120), nullable=True)
    min_cluster_score = db.Column(db.Float, nullable=False, default=0.0)
    linked_module_id = db.Column(db.Integer, db.ForeignKey("ci_learning_module.id"), nullable=True)
    reward_points = db.Column(db.Integer, nullable=False, default=0)
    commitment_type = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="active")
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "slug": self.slug,
            "title": self.title,
            "description": self.description,
            "trigger_event_type": self.trigger_event_type,
            "trigger_entity_type": self.trigger_entity_type,
            "min_cluster_score": self.min_cluster_score,
            "linked_module_id": self.linked_module_id,
            "reward_points": self.reward_points,
            "commitment_type": self.commitment_type,
            "status": self.status,
        }


class CIQuestInstance(db.Model):
    __tablename__ = "ci_quest_instance"
    __table_args__ = (
        db.Index("ix_ci_quest_instance_user", "user_id"),
        db.Index("ix_ci_quest_instance_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    quest_template_id = db.Column(db.Integer, db.ForeignKey("ci_quest_template.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    cluster_id = db.Column(db.Integer, db.ForeignKey("ci_story_cluster.id"), nullable=True)
    linked_module_id = db.Column(db.Integer, db.ForeignKey("ci_learning_module.id"), nullable=True)
    status = db.Column(db.String(30), nullable=False, default="active")
    progress_percent = db.Column(db.Float, nullable=False, default=0.0)
    started_at = db.Column(db.DateTime, default=utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "quest_template_id": self.quest_template_id,
            "user_id": self.user_id,
            "cluster_id": self.cluster_id,
            "linked_module_id": self.linked_module_id,
            "status": self.status,
            "progress_percent": self.progress_percent,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class CIQuestProgress(db.Model):
    __tablename__ = "ci_quest_progress"
    __table_args__ = (
        db.Index("ix_ci_quest_progress_instance", "quest_instance_id"),
        db.Index("ix_ci_quest_progress_created_at", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    quest_instance_id = db.Column(db.Integer, db.ForeignKey("ci_quest_instance.id"), nullable=False)
    step_key = db.Column(db.String(160), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="logged")
    notes = db.Column(db.String(500), nullable=True)
    evidence_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class WorldSnapshot(db.Model):
    __tablename__ = "ci_world_snapshot"
    __table_args__ = (
        db.UniqueConstraint("world_id", "version", name="uq_ci_world_snapshot_world_version"),
        db.Index("ix_ci_world_snapshot_world", "world_id"),
        db.Index("ix_ci_world_snapshot_created_at", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    world_id = db.Column(db.String(120), nullable=False)
    version = db.Column(db.Integer, nullable=False)
    scene_graph_json = db.Column(db.JSON, nullable=False, default=dict)
    semantic_map_json = db.Column(db.JSON, nullable=False, default=dict)
    layers_json = db.Column(db.JSON, nullable=False, default=dict)
    permissions_manifest_json = db.Column(db.JSON, nullable=False, default=dict)
    education_links_json = db.Column(db.JSON, nullable=False, default=dict)
    asset_list_json = db.Column(db.JSON, nullable=False, default=list)
    snapshot_manifest_json = db.Column(db.JSON, nullable=False, default=dict)
    manifest_hash = db.Column(db.String(96), nullable=True)
    signature = db.Column(db.String(256), nullable=False)
    signature_key_id = db.Column(db.String(120), nullable=False)
    published_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_manifest(self):
        return {
            "world_id": self.world_id,
            "version": self.version,
            "asset_list": self.asset_list_json or [],
            "scene_graph": self.scene_graph_json or {},
            "semantic_map": self.semantic_map_json or {},
            "layers": self.layers_json or {},
            "permissions_manifest": self.permissions_manifest_json or {},
            "education_links": self.education_links_json or {},
            "meta": self.snapshot_manifest_json or {},
        }


class WorldPatch(db.Model):
    __tablename__ = "ci_world_patch"
    __table_args__ = (
        db.Index("ix_ci_world_patch_world", "world_id"),
        db.Index("ix_ci_world_patch_version", "to_version"),
    )

    id = db.Column(db.Integer, primary_key=True)
    world_id = db.Column(db.String(120), nullable=False)
    from_version = db.Column(db.Integer, nullable=False)
    to_version = db.Column(db.Integer, nullable=False)
    operations_json = db.Column(db.JSON, nullable=False, default=list)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "world_id": self.world_id,
            "from_version": self.from_version,
            "to_version": self.to_version,
            "operations": self.operations_json or [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Commitment(db.Model):
    __tablename__ = "ci_commitment"
    __table_args__ = (
        db.Index("ix_ci_commitment_user", "user_id"),
        db.Index("ix_ci_commitment_state", "state"),
    )

    VALID_STATES = (
        "proposed",
        "confirmed",
        "active",
        "completed",
        "verified",
        "archived",
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    title = db.Column(db.String(220), nullable=False)
    description = db.Column(db.Text, nullable=True)
    source_type = db.Column(db.String(120), nullable=True)
    source_id = db.Column(db.String(120), nullable=True)
    state = db.Column(db.String(30), nullable=False, default="proposed")
    trust_score = db.Column(db.Float, nullable=False, default=0.5)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    archived_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "description": self.description,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "state": self.state,
            "trust_score": self.trust_score,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "archived_at": self.archived_at.isoformat() if self.archived_at else None,
        }


class CommitmentEvidence(db.Model):
    __tablename__ = "ci_commitment_evidence"
    __table_args__ = (
        db.Index("ix_ci_commitment_evidence_commitment", "commitment_id"),
        db.Index("ix_ci_commitment_evidence_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    commitment_id = db.Column(db.Integer, db.ForeignKey("ci_commitment.id"), nullable=False)
    evidence_type = db.Column(db.String(120), nullable=False, default="checkin")
    payload_json = db.Column(db.JSON, nullable=False, default=dict)
    status = db.Column(db.String(30), nullable=False, default="submitted")
    submitted_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    verified_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "commitment_id": self.commitment_id,
            "evidence_type": self.evidence_type,
            "payload": self.payload_json or {},
            "status": self.status,
            "submitted_by": self.submitted_by,
            "verified_by": self.verified_by,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class QuestCommitmentLink(db.Model):
    __tablename__ = "ci_quest_commitment_link"
    __table_args__ = (
        db.UniqueConstraint("quest_instance_id", "commitment_id", name="uq_ci_quest_commitment_link"),
    )

    id = db.Column(db.Integer, primary_key=True)
    quest_instance_id = db.Column(db.Integer, db.ForeignKey("ci_quest_instance.id"), nullable=False)
    commitment_id = db.Column(db.Integer, db.ForeignKey("ci_commitment.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow)


class ControlAuditEvent(db.Model):
    __tablename__ = "control_audit_event"
    __table_args__ = (
        db.Index("ix_control_audit_event_created_at", "created_at"),
        db.Index("ix_control_audit_event_actor", "actor_id"),
        db.Index("ix_control_audit_event_action", "action"),
        db.Index("ix_control_audit_event_chain_index", "chain_index"),
        db.Index("ix_control_audit_event_hash", "event_hash"),
    )

    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    action = db.Column(db.String(160), nullable=False)
    target_type = db.Column(db.String(120), nullable=True)
    target_id = db.Column(db.String(120), nullable=True)
    method = db.Column(db.String(20), nullable=True)
    route = db.Column(db.String(320), nullable=True)
    ip_address = db.Column(db.String(64), nullable=True)
    payload = db.Column(db.JSON, nullable=True)
    chain_index = db.Column(db.Integer, nullable=False, default=0)
    prev_hash = db.Column(db.String(96), nullable=True)
    event_hash = db.Column(db.String(96), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class ControlAuditCheckpoint(db.Model):
    __tablename__ = "control_audit_checkpoint"
    __table_args__ = (
        db.Index("ix_control_audit_checkpoint_created_at", "created_at"),
        db.Index("ix_control_audit_checkpoint_to_event", "to_event_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    from_event_id = db.Column(db.Integer, nullable=False)
    to_event_id = db.Column(db.Integer, nullable=False)
    event_count = db.Column(db.Integer, nullable=False, default=0)
    checkpoint_hash = db.Column(db.String(96), nullable=False)
    signature = db.Column(db.Text, nullable=True)
    signature_key_id = db.Column(db.String(120), nullable=True)
    storage_uri = db.Column(db.String(500), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "from_event_id": self.from_event_id,
            "to_event_id": self.to_event_id,
            "event_count": self.event_count,
            "checkpoint_hash": self.checkpoint_hash,
            "signature": self.signature,
            "signature_key_id": self.signature_key_id,
            "storage_uri": self.storage_uri,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ControlTokenGrant(db.Model):
    __tablename__ = "control_token_grant"
    __table_args__ = (
        db.UniqueConstraint("jti", name="uq_control_token_grant_jti"),
        db.Index("ix_control_token_grant_user", "user_id"),
        db.Index("ix_control_token_grant_expires_at", "expires_at"),
        db.Index("ix_control_token_grant_revoked_at", "revoked_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(64), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    token_use = db.Column(db.String(30), nullable=False, default="control")
    audience = db.Column(db.String(80), nullable=False, default="control")
    role = db.Column(db.String(80), nullable=True)
    scopes_json = db.Column(db.JSON, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    revoked_at = db.Column(db.DateTime, nullable=True)
    revoked_reason = db.Column(db.String(300), nullable=True)
    issued_by_ip = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "jti": self.jti,
            "user_id": self.user_id,
            "token_use": self.token_use,
            "audience": self.audience,
            "role": self.role,
            "scopes": self.scopes_json or [],
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
            "revoked_reason": self.revoked_reason,
            "issued_by_ip": self.issued_by_ip,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ControlIdempotencyRecord(db.Model):
    __tablename__ = "control_idempotency_record"
    __table_args__ = (
        db.UniqueConstraint(
            "actor_id",
            "method",
            "route",
            "idempotency_key",
            name="uq_control_idempotency_scope",
        ),
        db.Index("ix_control_idempotency_created_at", "created_at"),
        db.Index("ix_control_idempotency_key", "idempotency_key"),
    )

    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    method = db.Column(db.String(20), nullable=False)
    route = db.Column(db.String(320), nullable=False)
    idempotency_key = db.Column(db.String(160), nullable=False)
    status_code = db.Column(db.Integer, nullable=False, default=200)
    response_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


class WorldSigningKey(db.Model):
    __tablename__ = "world_signing_key"
    __table_args__ = (
        db.UniqueConstraint("key_id", name="uq_world_signing_key_key_id"),
        db.Index("ix_world_signing_key_active", "is_active"),
        db.Index("ix_world_signing_key_valid_to", "valid_to"),
    )

    id = db.Column(db.Integer, primary_key=True)
    key_id = db.Column(db.String(120), nullable=False)
    public_key_pem = db.Column(db.Text, nullable=False)
    private_key_file = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    valid_from = db.Column(db.DateTime, nullable=True)
    valid_to = db.Column(db.DateTime, nullable=True)
    rotated_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=utcnow)


@event.listens_for(AuditLog, "before_update")
def _audit_log_no_update(mapper, connection, target):
    raise ValueError("AuditLog is append-only; updates are not allowed.")


@event.listens_for(AuditLog, "before_delete")
def _audit_log_no_delete(mapper, connection, target):
    raise ValueError("AuditLog is append-only; deletes are not allowed.")


@event.listens_for(ControlAuditEvent, "before_update")
def _control_audit_no_update(mapper, connection, target):
    raise ValueError("ControlAuditEvent is append-only; updates are not allowed.")


@event.listens_for(ControlAuditEvent, "before_delete")
def _control_audit_no_delete(mapper, connection, target):
    raise ValueError("ControlAuditEvent is append-only; deletes are not allowed.")


@event.listens_for(ControlAuditCheckpoint, "before_update")
def _control_audit_checkpoint_no_update(mapper, connection, target):
    raise ValueError("ControlAuditCheckpoint is append-only; updates are not allowed.")


@event.listens_for(ControlAuditCheckpoint, "before_delete")
def _control_audit_checkpoint_no_delete(mapper, connection, target):
    raise ValueError("ControlAuditCheckpoint is append-only; deletes are not allowed.")


@event.listens_for(ControlIdempotencyRecord, "before_update")
def _control_idempotency_no_update(mapper, connection, target):
    raise ValueError("ControlIdempotencyRecord is append-only; updates are not allowed.")


@event.listens_for(ControlIdempotencyRecord, "before_delete")
def _control_idempotency_no_delete(mapper, connection, target):
    raise ValueError("ControlIdempotencyRecord is append-only; deletes are not allowed.")


@event.listens_for(WorldSnapshot, "before_update")
def _world_snapshot_no_update(mapper, connection, target):
    raise ValueError("WorldSnapshot is immutable; updates are not allowed.")


@event.listens_for(WorldSnapshot, "before_delete")
def _world_snapshot_no_delete(mapper, connection, target):
    raise ValueError("WorldSnapshot is immutable; deletes are not allowed.")

