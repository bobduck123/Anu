#!/bin/bash

# Test Admin Login Script
# Tests Supabase authentication for admin user

set -e

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://olgtqkgqjmxtivmlqsfb.supabase.co}"
SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY}"

ADMIN_EMAIL="admin@anu.eco"
ADMIN_PASSWORD="AnuAdmin2024!"

echo "========================================"
echo "Testing Anu Admin Login"
echo "========================================"
echo ""

if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
  echo "Set it with: export NEXT_PUBLIC_SUPABASE_ANON_KEY='your-key'"
  exit 1
fi

echo "Supabase URL: $SUPABASE_URL"
echo "Testing login for: $ADMIN_EMAIL"
echo ""

# Test login via Supabase REST API
echo "Sending login request..."
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if login was successful
if echo "$RESPONSE" | grep -q "access_token"; then
  echo "✓ Login successful!"
  ACCESS_TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')
  echo "Access token: ${ACCESS_TOKEN:0:20}..."
  
  # Get user info
  echo ""
  echo "Fetching user info..."
  USER_INFO=$(curl -s -X GET "$SUPABASE_URL/auth/v1/user" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "apikey: $SUPABASE_ANON_KEY")
  
  echo "$USER_INFO" | jq . 2>/dev/null || echo "$USER_INFO"
  
  if echo "$USER_INFO" | grep -q "is_admin"; then
    echo ""
    echo "✓ Admin user verified!"
  fi
else
  echo "✗ Login failed!"
  exit 1
fi
