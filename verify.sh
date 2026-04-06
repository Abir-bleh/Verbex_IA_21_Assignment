#!/bin/bash

# Verbex Deployment Verification Script
# This script tests key endpoints to verify all services are running

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Verbex Platform Verification Script"
echo "======================================"

# Configuration
AUTH_URL="${AUTH_URL:-http://localhost:8081}"
AGENT_URL="${AGENT_URL:-http://localhost:8082}"
CHAT_URL="${CHAT_URL:-http://localhost:8083}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for testing endpoints
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -n "Testing: $description... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" -H "Content-Type: application/json" -d "$data" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [[ "$http_code" =~ ^$expected_status ]]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected $expected_status, got $http_code)"
        echo "Response: $body"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Health checks
echo ""
echo "📋 Health Checks:"
test_endpoint "GET" "$AUTH_URL/health" "" "200" "Auth Service Health"
test_endpoint "GET" "$AGENT_URL/health" "" "200" "Agent Service Health"
test_endpoint "GET" "$CHAT_URL/health" "" "200" "Chat Service Health"

# Auth Service Tests
echo ""
echo "🔐 Auth Service Tests:"

# Sign up test
SIGNUP_DATA='{"email":"testuser_'$(date +%s)'@example.com","password":"TestPassword123"}'
test_endpoint "POST" "$AUTH_URL/auth/signup" "$SIGNUP_DATA" "200" "Sign Up"

# Login test (will fail if user doesn't exist, which is expected)
LOGIN_DATA='{"email":"testuser@example.com","password":"TestPassword123"}'
test_endpoint "POST" "$AUTH_URL/auth/login" "$LOGIN_DATA" "401" "Login (Expected Unauthorized for non-existent user)"

# Agent Service Tests
echo ""
echo "🤖 Agent Service Tests:"
test_endpoint "GET" "$AGENT_URL/models" "" "200" "List Available Models"

# Chat Service Tests
echo ""
echo "💬 Chat Service Tests:"

# Get public agents should work (even if empty)
test_endpoint "GET" "$CHAT_URL/analytics/test-agent-id" "" "200" "Analytics Endpoint"

# Summary
echo ""
echo "======================================"
echo -e "Summary: ${GREEN}${TESTS_PASSED} passed${NC}, ${RED}${TESTS_FAILED} failed${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Sign up with an email and password"
    echo "3. Create an agent"
    echo "4. Test the chat interface"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please check the service logs.${NC}"
    echo ""
    echo "Troubleshooting tips:"
    echo "- Ensure Docker Compose is running: docker-compose up"
    echo "- Check service logs: docker-compose logs <service-name>"
    echo "- Verify database connection: check PostgreSQL is accessible"
    echo "- Check environment variables in .env"
    exit 1
fi
