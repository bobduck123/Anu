# Flora-Fauna Backend - Database Migration Guide

This guide explains how to set up and migrate the database for the Flora-Fauna Flask backend using SQLAlchemy and Flask-Migrate.

## Overview

The Flora-Fauna Backend connects to the **`public` schema** (001_core_schema) in Supabase PostgreSQL and uses:
- **SQLAlchemy** as the ORM
- **Flask-Migrate** for database migrations
- **Alembic** for version control of schema changes

**Key Models:**
- User, Node (tenant), Venue, Event
- Microcosm (community), Article, Comment
- Action, Todo, Ticket, Feedback
- Notification, Message, Favorite, Team

## Prerequisites

1. **Python** (3.9+)
2. **PostgreSQL** or **SQLite** (for development)
3. **Supabase Account** with PostgreSQL database provisioned
4. **pip** or **pipenv** package manager
5. **Flask** and dependencies from `requirements.txt`

## Setup Steps

### 1. Install Python Dependencies

From `flora-fauna/backend/`:

```bash
pip install -r requirements.txt
```

Or with pipenv:

```bash
pipenv install
```

### 2. Configure Environment Variables

Create `.env` file in `flora-fauna/backend/`:

```bash
# Development database (SQLite)
DATABASE_URL=sqlite:///site.db

# OR Production database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres"

# Database connection pool settings (for PostgreSQL)
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=1800

# Flask environment
FLASK_ENV=development
DEBUG=false

# Security secrets (min 32 characters)
SECRET_KEY="your_secret_key_here_min_32_chars"
JWT_SECRET_KEY="your_jwt_secret_key_here_min_32_chars"

# Stripe integration
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Other configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
FORCE_HTTPS=false
RATELIMIT_STORAGE_URI=memory://
```

### 3. Development with SQLite

For quick development/testing without PostgreSQL:

```bash
export DATABASE_URL=sqlite:///site.db
python -m flask db upgrade
```

SQLite will automatically create `site.db` in the project root.

### 4. Migration Setup

Initialize or upgrade migrations:

```bash
# Initialize migrations folder (first time only)
python -m flask db init

# Create new migration after schema changes
python -m flask db migrate -m "Add user model"

# Apply migrations to database
python -m flask db upgrade

# Rollback to previous migration
python -m flask db downgrade
```

### 5. Verify Database Connection

Test the connection:

```bash
python -c "
from app import create_app, db
app = create_app()
with app.app_context():
    result = db.session.execute('SELECT 1')
    print('✓ Database connection successful')
"
```

Or use Flask shell:

```bash
python -m flask shell
>>> db.session.execute('SELECT 1')
>>> exit()
```

## Database Initialization

### Using PostgreSQL (Production)

First, ensure the SQL schema exists by running the migration script:

```sql
-- Run 001_core_schema.sql in Supabase SQL editor
-- This creates all tables
```

Then initialize Flask-Migrate:

```bash
# For existing database schema
python -m flask db upgrade

# If no migrations exist yet, create initial migration
python -m flask db migrate -m "Initial migration from existing schema"
python -m flask db upgrade
```

### Creating Initial Seed Data

Create `flora-fauna/backend/seeds.py`:

```python
from app import create_app, db
from app.models import User, Node
from werkzeug.security import generate_password_hash

def seed_database():
    """Seed the database with initial data."""
    app = create_app()
    
    with app.app_context():
        # Create default node (tenant)
        node = Node.query.filter_by(slug='anu').first()
        if not node:
            node = Node(
                name='Anu',
                slug='anu',
                status='active',
                is_default=True
            )
            db.session.add(node)
            db.session.commit()
            print("✓ Created default node: Anu")
        
        # Create seed user
        user = User.query.filter_by(username='admin').first()
        if not user:
            user = User(
                node_id=node.id,
                username='admin',
                pseudonym='admin',
                email='admin@anu.eco',
                role='admin'
            )
            user.set_password('changeme123')
            db.session.add(user)
            db.session.commit()
            print("✓ Created admin user")
        
        print("✓ Database seeding complete")

if __name__ == '__main__':
    seed_database()
```

Run seed script:

```bash
python seeds.py
```

## Running the Application

### Development Server

```bash
# From flora-fauna/backend/
python app.py
```

Server runs on `http://localhost:5000`

With auto-reload:

```bash
python -m flask run --reload
```

### Using Gunicorn (Production-like)

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## Database Operations

### Access Flask Shell

Interactive Python shell with app context:

```bash
python -m flask shell
>>> from app.models import User
>>> users = User.query.all()
>>> len(users)
>>> exit()
```

### Query Examples

```bash
python -m flask shell

# Count users
from app.models import User
User.query.count()

# Find users by role
admin_users = User.query.filter_by(role='admin').all()

# Find users created after date
from datetime import datetime, timedelta
recent = User.query.filter(User.created_at > datetime.now() - timedelta(days=7)).all()

# Update user
user = User.query.get(1)
user.points = 100
db.session.commit()

# Delete user
db.session.delete(user)
db.session.commit()
```

### Export Data

Backup database to JSON:

```bash
python -m flask shell
>>> import json
>>> from app.models import User
>>> users = User.query.all()
>>> data = [u.to_dict() for u in users]
>>> with open('users_backup.json', 'w') as f:
>>>     json.dump(data, f)
```

## Migration Management

### Review Migration History

```bash
# Show current revision
python -m flask db current

# Show migration history
python -m flask db history

# Show branches
python -m flask db branches
```

### Create Branches for Multiple Environments

```bash
# Create migration on branch for staging
python -m flask db branch -m "Add impact tracking" staging

# Switch branch
python -m flask db upgrade staging
```

### Downgrade Database

```bash
# Rollback one migration
python -m flask db downgrade

# Rollback to specific revision
python -m flask db downgrade abc123456789

# Rollback all migrations
python -m flask db downgrade base
```

## Deployment to Vercel

### 1. Add Python Support

Create `runtime.txt`:

```
python-3.11
```

### 2. Configure Vercel with Python Service

Create `vercel.json`:

```json
{
  "version": 2,
  "functions": {
    "flora-fauna/backend/app.py": {
      "runtime": "python3.11"
    }
  },
  "env": {
    "FLASK_ENV": "production",
    "DATABASE_URL": "@database_url",
    "JWT_SECRET_KEY": "@jwt_secret",
    "STRIPE_SECRET_KEY": "@stripe_secret"
  }
}
```

### 3. Set Environment Variables

In Vercel project settings:

```
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
STRIPE_SECRET_KEY=...
FLASK_ENV=production
DEBUG=false
```

### 4. Database Migration on Deploy

Create `scripts/migrate-on-deploy.sh`:

```bash
#!/bin/bash
set -e

cd flora-fauna/backend

# Run database migrations
python -m flask db upgrade

# Seed initial data if needed
python seeds.py

echo "✓ Database migration complete"
```

Add to Vercel build command:

```bash
bash scripts/migrate-on-deploy.sh && gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## Troubleshooting

### Error: "No such table: user"

**Cause:** Database tables not created

**Fix:**
```bash
# For SQLite
python -m flask db upgrade

# For PostgreSQL
# Ensure 001_core_schema.sql was run first
python -m flask db upgrade
```

### Error: "Can't establish database connection"

**Cause:** Invalid DATABASE_URL

**Fix:**
1. Check `.env` file has correct connection string
2. Verify Supabase credentials
3. Check network/firewall (may need to whitelist IP)

### Error: "Cannot add or update a child row: a foreign key constraint fails"

**Cause:** Trying to create record with non-existent parent

**Fix:**
```python
from app.models import Node, User

# Create node first
node = Node(name='Test', slug='test', status='active')
db.session.add(node)
db.session.commit()

# Then create user with valid node_id
user = User(node_id=node.id, ...)
db.session.add(user)
db.session.commit()
```

### Alembic Migration Conflicts

**Cause:** Multiple migration branches

**Fix:**
```bash
# Check current state
python -m flask db current

# View available versions
python -m flask db branches

# Resolve conflicts manually
# Edit alembic/versions/ files
```

## Best Practices

1. **Always commit migrations to Git:**
   ```bash
   git add flora-fauna/backend/alembic/versions/
   git commit -m "Add migration: <description>"
   ```

2. **Test migrations locally first:**
   ```bash
   # Test on SQLite first
   python -m flask db upgrade
   python -m flask shell
   # Verify data integrity
   ```

3. **Use descriptive migration names:**
   ```bash
   python -m flask db migrate -m "Add impact_pool table and relationships"
   # Not: python -m flask db migrate
   ```

4. **Document schema changes:**
   Add comments to migration files explaining why changes were made

5. **Review auto-generated migrations:**
   Always review `alembic/versions/` before running `upgrade`

## References

- [Flask-Migrate Documentation](https://flask-migrate.readthedocs.io/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [SQLAlchemy ORM Documentation](https://docs.sqlalchemy.org/en/20/orm/)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
