#!/usr/bin/env python3
"""
Database & Auth Setup Verification Script
Validates that the database is working and auth routes are properly configured
"""

import os
import sys
import json
from urllib.parse import urlparse
from pathlib import Path

def check_environment_vars():
    """Check for required environment variables."""
    print("\n" + "="*70)
    print("ENVIRONMENT VARIABLES CHECK")
    print("="*70)
    
    required_vars = {
        'SECRET_KEY': 'Flask session secret (min 32 chars)',
        'JWT_SECRET_KEY': 'JWT signing key (min 32 chars)',
        'DATABASE_URL': 'Database connection string (postgres:// or sqlite://)',
    }
    
    optional_vars = {
        'POSTGRES_URL': 'Alternative DB URL format',
        'POSTGRES_PRISMA_URL': 'Prisma DB URL',
        'SUPABASE_URL': 'Supabase project URL',
        'SUPABASE_ANON_KEY': 'Supabase anon key',
        'ALPHA_PUBLIC': 'Enable public alpha mode',
        'ALPHA_AUTH_OPTIONAL': 'Make auth optional in alpha',
    }
    
    missing_required = []
    missing_optional = []
    
    for var, description in required_vars.items():
        value = os.environ.get(var)
        if not value:
            missing_required.append(f"  ✗ {var}: {description}")
        else:
            # Don't print full secret values
            if 'SECRET' in var or 'KEY' in var or 'PASSWORD' in var:
                print(f"  ✓ {var}: {'*' * 20} (set)")
            else:
                print(f"  ✓ {var}: {value[:50]}{'...' if len(value) > 50 else ''}")
    
    print("\n  Optional Variables:")
    for var, description in optional_vars.items():
        value = os.environ.get(var)
        if value:
            if len(value) > 50:
                print(f"  ✓ {var}: {value[:50]}...")
            else:
                print(f"  ✓ {var}: {value}")
        else:
            print(f"  - {var}: not set ({description})")
    
    if missing_required:
        print("\n  ⚠ MISSING REQUIRED VARIABLES:")
        for var in missing_required:
            print(var)
        return False
    
    return True


def check_database_url():
    """Validate database URL format."""
    print("\n" + "="*70)
    print("DATABASE URL VALIDATION")
    print("="*70)
    
    db_url = (
        os.environ.get('DATABASE_URL')
        or os.environ.get('POSTGRES_URL')
        or os.environ.get('POSTGRES_PRISMA_URL')
    )
    
    if not db_url:
        print("  ✗ No database URL found")
        return False
    
    try:
        parsed = urlparse(db_url)
        scheme = parsed.scheme
        
        if scheme == 'sqlite':
            print(f"  ✓ SQLite database detected: {parsed.path}")
            print("    ⓘ SQLite is only suitable for development/testing")
            return True
        
        elif scheme in ('postgres', 'postgresql'):
            hostname = parsed.hostname or 'localhost'
            port = parsed.port or 5432
            database = parsed.path.lstrip('/')
            
            print(f"  ✓ PostgreSQL database detected")
            print(f"    Host: {hostname}:{port}")
            print(f"    Database: {database}")
            
            # Check for known providers
            if 'supabase' in hostname:
                print(f"    Provider: Supabase")
            elif 'neon.tech' in hostname:
                print(f"    Provider: Neon")
            elif 'aws.amazon.com' in hostname or 'rds.amazonaws.com' in hostname:
                print(f"    Provider: AWS RDS")
            elif 'heroku' in hostname:
                print(f"    Provider: Heroku Postgres")
            
            return True
        
        else:
            print(f"  ✗ Unknown database scheme: {scheme}")
            return False
            
    except Exception as e:
        print(f"  ✗ Failed to parse database URL: {e}")
        return False


def check_auth_files():
    """Check that auth-related files exist and are configured."""
    print("\n" + "="*70)
    print("AUTH CONFIGURATION FILES CHECK")
    print("="*70)
    
    backend_auth = Path('/vercel/share/v0-project/flora-fauna/backend/app/auth.py')
    frontend_auth = Path('/vercel/share/v0-project/frontend-next/src/app/api/sdk/auth/route.ts')
    impact_auth = Path('/vercel/share/v0-project/services/impact-service/src/middleware/auth.ts')
    
    files_to_check = [
        (backend_auth, "Backend Auth Routes (Flask)"),
        (frontend_auth, "Frontend SDK Auth (Next.js)"),
        (impact_auth, "Impact Service Auth (Express)"),
    ]
    
    all_exist = True
    for filepath, description in files_to_check:
        if filepath.exists():
            size = filepath.stat().st_size
            print(f"  ✓ {description}: {filepath.relative_to(Path.cwd().parent.parent)}")
            print(f"    Size: {size} bytes")
        else:
            print(f"  ✗ {description}: NOT FOUND")
            print(f"    Expected: {filepath}")
            all_exist = False
    
    return all_exist


def check_backend_dependencies():
    """Check backend Python dependencies."""
    print("\n" + "="*70)
    print("BACKEND DEPENDENCIES CHECK")
    print("="*70)
    
    requirements_file = Path('/vercel/share/v0-project/flora-fauna/backend/requirements.txt')
    
    critical_packages = [
        'Flask',
        'Flask-SQLAlchemy',
        'Flask-JWT-Extended',
        'psycopg2-binary',
        'SQLAlchemy',
    ]
    
    if not requirements_file.exists():
        print(f"  ✗ requirements.txt not found: {requirements_file}")
        return False
    
    try:
        with open(requirements_file, 'r') as f:
            content = f.read()
        
        print(f"  ✓ requirements.txt found ({requirements_file.stat().st_size} bytes)")
        
        for package in critical_packages:
            if package in content or package.lower().replace('-', '_') in content.lower():
                print(f"  ✓ {package} included")
            else:
                print(f"  ⚠ {package} not found")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error reading requirements.txt: {e}")
        return False


def check_frontend_dependencies():
    """Check frontend dependencies."""
    print("\n" + "="*70)
    print("FRONTEND DEPENDENCIES CHECK")
    print("="*70)
    
    package_json = Path('/vercel/share/v0-project/frontend-next/package.json')
    
    if not package_json.exists():
        print(f"  ✗ package.json not found: {package_json}")
        return False
    
    try:
        with open(package_json, 'r') as f:
            data = json.load(f)
        
        deps = data.get('dependencies', {})
        dev_deps = data.get('devDependencies', {})
        all_deps = {**deps, **dev_deps}
        
        print(f"  ✓ package.json found")
        print(f"    Dependencies: {len(deps)}")
        print(f"    Dev Dependencies: {len(dev_deps)}")
        
        critical = ['next', 'react', 'react-dom']
        for pkg in critical:
            if pkg in all_deps:
                print(f"  ✓ {pkg}@{all_deps[pkg]}")
            else:
                print(f"  ⚠ {pkg} not found")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error reading package.json: {e}")
        return False


def check_impact_service_dependencies():
    """Check impact service dependencies."""
    print("\n" + "="*70)
    print("IMPACT SERVICE DEPENDENCIES CHECK")
    print("="*70)
    
    package_json = Path('/vercel/share/v0-project/services/impact-service/package.json')
    
    if not package_json.exists():
        print(f"  ✗ package.json not found: {package_json}")
        return False
    
    try:
        with open(package_json, 'r') as f:
            data = json.load(f)
        
        deps = data.get('dependencies', {})
        dev_deps = data.get('devDependencies', {})
        all_deps = {**deps, **dev_deps}
        
        print(f"  ✓ package.json found")
        print(f"    Dependencies: {len(deps)}")
        print(f"    Dev Dependencies: {len(dev_deps)}")
        
        critical = ['express', 'jsonwebtoken', 'typescript']
        for pkg in critical:
            if pkg in all_deps:
                print(f"  ✓ {pkg}@{all_deps[pkg]}")
            else:
                print(f"  ⚠ {pkg} not found")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error reading package.json: {e}")
        return False


def generate_report():
    """Generate comprehensive verification report."""
    print("\n" + "="*70)
    print("FLORA FAUNA - DATABASE & AUTH VERIFICATION")
    print("="*70)
    print(f"Timestamp: {__import__('datetime').datetime.now().isoformat()}")
    
    checks = [
        ("Environment Variables", check_environment_vars),
        ("Database URL", check_database_url),
        ("Auth Configuration Files", check_auth_files),
        ("Backend Dependencies", check_backend_dependencies),
        ("Frontend Dependencies", check_frontend_dependencies),
        ("Impact Service Dependencies", check_impact_service_dependencies),
    ]
    
    results = {}
    for name, check_func in checks:
        try:
            results[name] = check_func()
        except Exception as e:
            print(f"\n  ✗ Check failed with error: {e}")
            results[name] = False
    
    print("\n" + "="*70)
    print("VERIFICATION SUMMARY")
    print("="*70)
    
    for name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {name}")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    
    print(f"\nTotal: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n✓ All checks passed! Setup appears to be complete.")
        return 0
    else:
        print(f"\n⚠ {total - passed} check(s) failed. Please review the output above.")
        return 1


if __name__ == '__main__':
    sys.exit(generate_report())
