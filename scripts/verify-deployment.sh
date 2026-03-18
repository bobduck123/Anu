#!/bin/bash

# Anu Platform - Deployment Verification Script
# This script helps verify that the correct Supabase project is connected to Vercel

set -e

echo "=========================================="
echo "Anu Platform - Deployment Verification"
echo "=========================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm i -g vercel"
    exit 1
fi

echo "1️⃣  Checking Vercel projects..."
echo ""

# List all projects
vercel projects ls

echo ""
echo "2️⃣  Checking anu_frontend environment variables..."
echo ""

if vercel env ls --project=anu_frontend &> /dev/null; then
    vercel env ls --project=anu_frontend
    echo ""
    echo "✅ anu_frontend project found"
else
    echo "❌ anu_frontend project not found"
fi

echo ""
echo "3️⃣  Checking anu_backend environment variables..."
echo ""

if vercel env ls --project=anu_backend &> /dev/null; then
    vercel env ls --project=anu_backend
    echo ""
    echo "✅ anu_backend project found"
else
    echo "❌ anu_backend project not found"
fi

echo ""
echo "4️⃣  Checking anu_impact_service environment variables..."
echo ""

if vercel env ls --project=anu_impact_service &> /dev/null; then
    vercel env ls --project=anu_impact_service
    echo ""
    echo "✅ anu_impact_service project found"
else
    echo "❌ anu_impact_service project not found"
fi

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify the Supabase URL in each project"
echo "2. Should all point to: https://olgtqkgqjmxtivmlqsfb.supabase.co"
echo "3. If not, update environment variables"
echo ""
echo "To update an environment variable:"
echo "  vercel env add VARIABLE_NAME --project=project_name"
echo ""
