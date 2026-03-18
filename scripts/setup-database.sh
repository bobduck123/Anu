#!/bin/bash
# Database Connection Setup for Anu Platform
# This script helps configure database connections for all services

set -e

echo "================================"
echo "Anu Platform - Database Setup"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env files exist and create if needed
setup_env_file() {
    local service=$1
    local env_file=$2
    
    if [ ! -f "$env_file" ]; then
        echo -e "${YELLOW}Creating $env_file from template...${NC}"
        cp "${env_file}.example" "$env_file"
        echo -e "${GREEN}✓ Created $env_file${NC}"
    else
        echo -e "${GREEN}✓ $env_file already exists${NC}"
    fi
}

# Verify Supabase connection
verify_supabase() {
    local db_url=$1
    
    echo ""
    echo -e "${YELLOW}Verifying Supabase connection...${NC}"
    
    if command -v psql &> /dev/null; then
        if psql "$db_url" -c "SELECT 1;" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Supabase connection successful${NC}"
            return 0
        else
            echo -e "${RED}✗ Failed to connect to Supabase${NC}"
            echo "Please check your DATABASE_URL environment variable"
            return 1
        fi
    else
        echo -e "${YELLOW}! psql not found, skipping connection verification${NC}"
        echo "Install PostgreSQL tools if you want to verify the connection"
    fi
}

echo ""
echo "Step 1: Setting up environment files..."
echo "----------------------------------------"

# Setup flora-fauna
cd flora-fauna/backend
setup_env_file "flora-fauna" ".env"
cd ../../

# Setup impact-service
cd services/impact-service
setup_env_file "impact-service" ".env"
cd ../../

# Setup frontend
cd frontend-next
setup_env_file "frontend-next" ".env.local"
cd ../../

echo ""
echo "Step 2: Verifying configuration..."
echo "----------------------------------------"

# Read DATABASE_URL from impact-service .env
if [ -f "services/impact-service/.env" ]; then
    export $(grep DATABASE_URL services/impact-service/.env | xargs)
    
    if [ -n "$DATABASE_URL" ] && [ "$DATABASE_URL" != "postgresql://postgres:your-password@your-host:5432/postgres?schema=public" ]; then
        verify_supabase "$DATABASE_URL"
    else
        echo -e "${YELLOW}! DATABASE_URL not configured in impact-service .env${NC}"
        echo "Please update DATABASE_URL with your Supabase connection string"
    fi
fi

echo ""
echo "Step 3: Database connection summary..."
echo "----------------------------------------"

echo ""
echo "Flora-Fauna Backend (Flask):"
echo "  Location: flora-fauna/backend"
echo "  Schema: public (001_core_schema)"
echo "  Models: User, Event, Action, Microcosm, Article, etc."
echo ""

echo "Impact Service (Node.js):"
echo "  Location: services/impact-service"
echo "  Schemas: public (002_impact_schema) + falak (003_falak_schema)"
echo "  Models: MembershipPlan, ImpactPool, FalakTenant, FalakNode, etc."
echo ""

echo "Frontend (Next.js):"
echo "  Location: frontend-next"
echo "  Uses: Supabase Auth + Client SDK"
echo ""

echo "Next steps:"
echo "1. Update all .env files with your actual Supabase connection details"
echo "2. Run: cd services/impact-service && npm run db:migrate"
echo "3. Run: cd flora-fauna/backend && python -m flask db upgrade"
echo "4. Start each service on its respective port"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
