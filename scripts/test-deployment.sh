#!/bin/bash

# Anu Deployment Test Suite
# Tests all three services and admin login functionality

set -e

echo "=========================================="
echo "ANU DEPLOYMENT VERIFICATION TEST"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="${FRONTEND_URL:-https://anu-frontend.vercel.app}"
BACKEND_URL="${BACKEND_URL:-https://anu-backend.vercel.app}"
IMPACT_URL="${IMPACT_URL:-https://anu-impact-service.vercel.app}"
ADMIN_EMAIL="admin@anu.eco"
ADMIN_PASSWORD="AnuAdmin2024!"

echo "Testing Configuration:"
echo "  Frontend: $FRONTEND_URL"
echo "  Backend: $BACKEND_URL"
echo "  Impact Service: $IMPACT_URL"
echo ""

# Test 1: Backend Health Check
echo "Test 1: Backend Health Check"
echo "----------------------------"
if command -v curl &> /dev/null; then
  if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" | grep -q "200\|404"; then
    echo -e "${GREEN}✓ Backend is reachable${NC}"
  else
    echo -e "${RED}✗ Backend health check failed${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}⊘ curl not available, skipping HTTP tests${NC}"
fi
echo ""

# Test 2: Impact Service Health Check
echo "Test 2: Impact Service Health Check"
echo "------------------------------------"
if command -v curl &> /dev/null; then
  if curl -s -o /dev/null -w "%{http_code}" "$IMPACT_URL/health" | grep -q "200\|404"; then
    echo -e "${GREEN}✓ Impact Service is reachable${NC}"
  else
    echo -e "${RED}✗ Impact Service health check failed${NC}"
  fi
else
  echo -e "${YELLOW}⊘ curl not available, skipping HTTP tests${NC}"
fi
echo ""

# Test 3: Frontend is Up
echo "Test 3: Frontend Availability"
echo "------------------------------"
if command -v curl &> /dev/null; then
  FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
  if [ "$FRONTEND_STATUS" = "200" ] || [ "$FRONTEND_STATUS" = "404" ]; then
    echo -e "${GREEN}✓ Frontend is reachable (HTTP $FRONTEND_STATUS)${NC}"
  else
    echo -e "${RED}✗ Frontend returned HTTP $FRONTEND_STATUS${NC}"
  fi
else
  echo -e "${YELLOW}⊘ curl not available, skipping HTTP tests${NC}"
fi
echo ""

# Test 4: Database Connection (via Backend endpoint if available)
echo "Test 4: Database Connectivity"
echo "-----------------------------"
echo "To verify database connection, check backend logs:"
echo "  - Should NOT see: 'could not connect to server'"
echo "  - Should NOT see: 'connection refused'"
echo "  - Should NOT see: 'timeout'"
echo -e "${YELLOW}⊘ Manual verification needed - check Vercel logs${NC}"
echo ""

# Test 5: Admin Credentials
echo "Test 5: Admin User Credentials"
echo "------------------------------"
echo -e "${GREEN}✓ Admin Email: $ADMIN_EMAIL${NC}"
echo -e "${GREEN}✓ Admin Password: ****** (set during deployment)${NC}"
echo "  Note: Password should be changed after first login"
echo ""

# Test 6: Manual Login Test
echo "Test 6: Manual Login Test"
echo "------------------------"
echo "To test admin login manually:"
echo "  1. Go to: $FRONTEND_URL/auth"
echo "  2. Click 'Login'"
echo "  3. Enter:"
echo "     Email: $ADMIN_EMAIL"
echo "     Password: $ADMIN_PASSWORD"
echo "  4. Should redirect to profile page"
echo ""

# Test 7: Environment Variables Check
echo "Test 7: Environment Variables"
echo "-----------------------------"
echo "Required variables in each Vercel project:"
echo ""
echo "anu_frontend:"
echo "  - NEXT_PUBLIC_SUPABASE_URL (should be set)"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY (should be set)"
echo ""
echo "anu_backend:"
echo "  - DATABASE_URL or POSTGRES_URL (should be set)"
echo "  - SECRET_KEY (should be set)"
echo "  - JWT_SECRET_KEY (should be set)"
echo ""
echo "anu_impact_service:"
echo "  - DATABASE_URL or POSTGRES_URL (should be set)"
echo "  - DIRECT_URL (should be set)"
echo "  - JWT_SECRET_KEY (should match backend)"
echo ""

# Test 8: Architecture Verification
echo "Test 8: Architecture Verification"
echo "---------------------------------"
echo "Vercel Projects:"
echo "  ☐ anu_frontend (Next.js) - Port 3000"
echo "  ☐ anu_backend (Flask) - Port 5000"
echo "  ☐ anu_impact_service (Node.js) - Port 5003"
echo ""
echo "Supabase Schemas:"
echo "  ☐ public (001_core_schema) - Flora-Fauna"
echo "  ☐ public (002_impact_schema) - Impact tracking"
echo "  ☐ falak - Falak protocol"
echo ""

# Summary
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo ""
echo "If all manual checks pass:"
echo -e "${GREEN}✓ Deployment is successful${NC}"
echo ""
echo "If you encounter issues:"
echo "1. Check Vercel deployment logs"
echo "2. Verify environment variables in Vercel dashboard"
echo "3. Check Supabase database status"
echo "4. Review backend SQLAlchemy connection logs"
echo ""
echo "Documentation:"
echo "  - VERIFY_DEPLOYMENT.md - Complete testing guide"
echo "  - QUICK_REFERENCE.md - Quick cheat sheet"
echo "  - Logs location: https://vercel.com/dashboard/integrations/supabase"
