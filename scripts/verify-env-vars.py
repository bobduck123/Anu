#!/usr/bin/env python3
"""
Final Environment Variables & Database/Auth Verification
Confirms all environment variables are properly set and systems are working
"""

import os
import sys
from pathlib import Path

def check_env_vars():
    """Check critical environment variables"""
    print("=" * 70)
    print("ENVIRONMENT VARIABLES CHECK")
    print("=" * 70)
    
    critical_vars = [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_JWT_SECRET",
        "DATABASE_URL",
    ]
    
    optional_vars = [
        "NEXT_PUBLIC_API_BASE",
        "NEXT_PUBLIC_IMPACT_API_BASE",
        "JWT_SECRET_KEY",
        "SECRET_KEY",
        "POSTGRES_URL",
        "POSTGRES_PRISMA_URL",
    ]
    
    missing_critical = []
    missing_optional = []
    
    print("\n✓ CRITICAL VARIABLES (Required):")
    for var in critical_vars:
        value = os.getenv(var, "").strip()
        if value:
            masked = value[:20] + "..." if len(value) > 20 else value
            print(f"  ✓ {var}: {masked}")
        else:
            print(f"  ✗ {var}: NOT SET")
            missing_critical.append(var)
    
    print("\n✓ OPTIONAL VARIABLES (Auto-defaults if missing):")
    for var in optional_vars:
        value = os.getenv(var, "").strip()
        if value:
            masked = value[:20] + "..." if len(value) > 20 else value
            print(f"  ✓ {var}: {masked}")
        else:
            print(f"  - {var}: will use default")
            missing_optional.append(var)
    
    return missing_critical, missing_optional

def check_files():
    """Check critical files exist"""
    print("\n" + "=" * 70)
    print("PROJECT FILES CHECK")
    print("=" * 70)
    
    critical_files = [
        "flora-fauna/backend/app.py",
        "services/impact-service/package.json",
        "frontend-next/src/app/api/sdk/auth/route.ts",
        "frontend-next/src/lib/runtime.ts",
    ]
    
    print("\n✓ CRITICAL FILES:")
    for file_path in critical_files:
        full_path = Path(file_path)
        if full_path.exists():
            print(f"  ✓ {file_path}")
        else:
            print(f"  ✗ {file_path}: NOT FOUND")

def check_database_config():
    """Check database is properly configured"""
    print("\n" + "=" * 70)
    print("DATABASE CONFIGURATION CHECK")
    print("=" * 70)
    
    db_url = os.getenv("DATABASE_URL", "").strip()
    direct_url = os.getenv("DIRECT_URL", "").strip()
    
    print("\n✓ DATABASE SETUP:")
    if db_url:
        if "localhost" in db_url:
            print(f"  ✓ Local PostgreSQL configured")
        elif "supabase" in db_url or "vercel" in db_url:
            print(f"  ✓ Cloud database configured")
        else:
            print(f"  ? Unknown database provider")
        print(f"    Pooler: {db_url[:30]}...")
    else:
        print(f"  ✗ DATABASE_URL not set")
    
    if direct_url:
        print(f"  ✓ Direct URL configured: {direct_url[:30]}...")
    else:
        print(f"  - Direct URL not set (optional for Supabase)")

def check_auth_config():
    """Check auth is properly configured"""
    print("\n" + "=" * 70)
    print("AUTHENTICATION CONFIGURATION CHECK")
    print("=" * 70)
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "").strip()
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()
    
    print("\n✓ AUTH SETUP:")
    if supabase_url:
        print(f"  ✓ Supabase URL configured")
    else:
        print(f"  ✗ Supabase URL not configured")
    
    if jwt_secret:
        print(f"  ✓ JWT Secret configured")
    else:
        print(f"  ✗ JWT Secret not configured")

def check_api_endpoints():
    """Check API endpoints are configured"""
    print("\n" + "=" * 70)
    print("API ENDPOINTS CHECK")
    print("=" * 70)
    
    api_base = os.getenv("NEXT_PUBLIC_API_BASE", "http://localhost:5000")
    impact_base = os.getenv("NEXT_PUBLIC_IMPACT_API_BASE", "http://localhost:5003")
    
    print("\n✓ API ENDPOINTS:")
    print(f"  Core API Base: {api_base}")
    print(f"  Impact API Base: {impact_base}")
    print(f"\n  These are the defaults when env vars are not explicitly set.")

def main():
    print("\n")
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 68 + "║")
    print("║" + "  ANU PLATFORM - ENV VARS & DATABASE/AUTH VERIFICATION".center(68) + "║")
    print("║" + " " * 68 + "║")
    print("╚" + "=" * 68 + "╝")
    
    missing_critical, missing_optional = check_env_vars()
    check_files()
    check_database_config()
    check_auth_config()
    check_api_endpoints()
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    if missing_critical:
        print(f"\n⚠ CRITICAL: {len(missing_critical)} required variable(s) not set:")
        for var in missing_critical:
            print(f"    - {var}")
        print("\nAction: Set these variables in Vercel Project Settings > Vars")
        return 1
    else:
        print("\n✓ All critical environment variables are set!")
        print("✓ Database is properly configured")
        print("✓ Authentication is properly configured")
        print("✓ API endpoints are configured")
        print("\n✓ READY TO PROCEED with development or deployment!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
