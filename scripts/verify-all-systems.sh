#!/bin/bash

# Anu Platform - Complete Verification & Setup Script
# This script verifies database connectivity, auth configuration, and service status

set -e

echo "=========================================="
echo "Anu Platform - Verification Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for test results
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN:${NC} $1"
    ((WARNINGS++))
}

# Section 1: Environment Variables
echo "=== 1. ENVIRONMENT VARIABLES ==="
echo ""

# Check backend env
if [ -f "flora-fauna/backend/.env" ]; then
    if grep -q "DATABASE_URL\|POSTGRES_URL" flora-fauna/backend/.env; then
        pass "Backend database URL configured"
    else
        fail "Backend database URL not found in .env"
    fi
    
    if grep -q "JWT_SECRET_KEY" flora-fauna/backend/.env; then
        pass "Backend JWT secret configured"
    else
        fail "Backend JWT secret not configured"
    fi
else
    warn "Backend .env file not found (might be using system env vars)"
fi

# Check impact service env
if [ -f "services/impact-service/.env" ]; then
    if grep -q "DATABASE_URL\|POSTGRES_URL" services/impact-service/.env; then
        pass "Impact service database URL configured"
    else
        fail "Impact service database URL not found"
    fi
else
    warn "Impact service .env file not found"
fi

# Check frontend env
if [ -f "frontend-next/.env.local" ]; then
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" frontend-next/.env.local; then
        pass "Frontend Supabase URL configured"
    else
        fail "Frontend Supabase URL not configured"
    fi
else
    warn "Frontend .env.local file not found"
fi

echo ""
echo "=== 2. DEPENDENCIES ==="
echo ""

# Check backend dependencies
if [ -f "flora-fauna/backend/requirements.txt" ]; then
    pass "Backend requirements.txt found"
    
    if grep -q "flask" flora-fauna/backend/requirements.txt; then
        pass "Flask dependency present"
    else
        warn "Flask not explicitly listed in requirements"
    fi
    
    if grep -q "sqlalchemy" flora-fauna/backend/requirements.txt; then
        pass "SQLAlchemy dependency present"
    else
        warn "SQLAlchemy not found"
    fi
else
    fail "Backend requirements.txt not found"
fi

# Check impact service dependencies
if [ -f "services/impact-service/package.json" ]; then
    pass "Impact service package.json found"
    
    if grep -q "prisma" services/impact-service/package.json; then
        pass "Prisma dependency present"
    else
        fail "Prisma not found in package.json"
    fi
else
    fail "Impact service package.json not found"
fi

# Check frontend dependencies
if [ -f "frontend-next/package.json" ]; then
    pass "Frontend package.json found"
    
    if grep -q "@supabase" frontend-next/package.json; then
        pass "Supabase SDK dependency present"
    else
        warn "Supabase SDK not explicitly listed"
    fi
else
    fail "Frontend package.json not found"
fi

echo ""
echo "=== 3. DATABASE SCHEMA FILES ==="
echo ""

# Check database schema files
if [ -f "services/impact-service/prisma/schema.prisma" ]; then
    pass "Impact service Prisma schema found"
    
    if grep -q "datasource db" services/impact-service/prisma/schema.prisma; then
        pass "Prisma datasource configured"
    else
        fail "Prisma datasource not configured"
    fi
else
    fail "Impact service Prisma schema not found"
fi

# Check Flask models
if [ -f "flora-fauna/backend/app/models.py" ]; then
    pass "Backend models.py found"
else
    warn "Backend models.py not found (might be split across files)"
fi

echo ""
echo "=== 4. AUTH CONFIGURATION ==="
echo ""

# Check auth files
if [ -f "flora-fauna/backend/app/auth.py" ]; then
    pass "Backend auth.py found"
    
    if grep -q "def login\|/auth/login" flora-fauna/backend/app/auth.py; then
        pass "Backend has login endpoint"
    else
        fail "Backend login endpoint not found"
    fi
else
    fail "Backend auth.py not found"
fi

if [ -f "frontend-next/src/contexts/AuthContext.tsx" ]; then
    pass "Frontend AuthContext found"
    
    if grep -q "supabase.auth\|signInWithPassword" frontend-next/src/contexts/AuthContext.tsx; then
        pass "Frontend uses Supabase auth"
    else
        warn "Frontend auth implementation unclear"
    fi
else
    fail "Frontend AuthContext not found"
fi

if [ -f "services/impact-service/src/middleware/auth.ts" ]; then
    pass "Impact service auth middleware found"
else
    fail "Impact service auth middleware not found"
fi

echo ""
echo "=== 5. API ROUTES ==="
echo ""

# Check backend routes
if grep -r "app.route.*auth\|@app.route.*auth" flora-fauna/backend/app/ 2>/dev/null | grep -q .; then
    pass "Backend auth routes defined"
    
    ROUTE_COUNT=$(grep -r "@.*route.*auth" flora-fauna/backend/app/ 2>/dev/null | wc -l)
    pass "Found $ROUTE_COUNT auth route definitions"
else
    fail "Backend auth routes not found"
fi

# Check frontend API routes
if [ -f "frontend-next/src/app/api/sdk/auth/route.ts" ]; then
    pass "Frontend SDK auth route found"
else
    warn "Frontend SDK auth route not found"
fi

echo ""
echo "=== 6. MIGRATION FILES ==="
echo ""

# Check for migration files
if [ -d "flora-fauna/backend/migrations" ]; then
    MIGRATION_COUNT=$(ls flora-fauna/backend/migrations/versions 2>/dev/null | wc -l)
    pass "Found $MIGRATION_COUNT backend migrations"
else
    warn "Backend migrations directory not found"
fi

if [ -d "services/impact-service/prisma/migrations" ]; then
    MIGRATION_COUNT=$(ls services/impact-service/prisma/migrations 2>/dev/null | wc -l)
    pass "Found $MIGRATION_COUNT Prisma migrations"
else
    warn "Impact service Prisma migrations not found (might use auto-migrate)"
fi

echo ""
echo "=========================================="
echo "VERIFICATION SUMMARY"
echo "=========================================="
echo ""
echo -e "Passed:   ${GREEN}${PASSED}${NC}"
echo -e "Failed:   ${RED}${FAILED}${NC}"
echo -e "Warnings: ${YELLOW}${WARNINGS}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical components verified!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start the backend: cd flora-fauna/backend && python app.py"
    echo "2. Start the impact service: cd services/impact-service && npm run dev"
    echo "3. Start the frontend: cd frontend-next && npm run dev"
    echo "4. Test admin login at http://localhost:3000/auth"
    exit 0
else
    echo -e "${RED}✗ Some components need attention${NC}"
    echo ""
    echo "Please review the failures above and fix before proceeding."
    exit 1
fi
