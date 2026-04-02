#!/bin/bash

# Quick PNA Test Script
# Run this to verify Private Network Access is working

set -e

API_URL="${API_URL:-https://api-mock.transtrack.id}"

echo "═══════════════════════════════════════════════════════════"
echo "  Testing Private Network Access (PNA) Implementation"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "API URL: $API_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: CORS Headers Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CORS_RESPONSE=$(curl -s -I -X OPTIONS \
  -H "Origin: $API_URL" \
  -H "Access-Control-Request-Method: POST" \
  "$API_URL/api/proxy/request" 2>/dev/null | grep -i "access-control" || echo "NO_CORS_HEADERS")

if echo "$CORS_RESPONSE" | grep -q "access-control"; then
    echo -e "${GREEN}✓ CORS headers present${NC}"
    echo "$CORS_RESPONSE" | head -5
else
    echo -e "${RED}✗ No CORS headers found${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Private Network Access Header Check (KEY TEST)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PNA_RESPONSE=$(curl -s -I -X OPTIONS \
  -H "Origin: $API_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Private-Network: true" \
  "$API_URL/api/proxy/request" 2>/dev/null | grep -i "access-control-allow-private-network" || echo "")

if echo "$PNA_RESPONSE" | grep -q "true"; then
    echo -e "${GREEN}✓ PNA enabled: Access-Control-Allow-Private-Network: true${NC}"
    echo "$PNA_RESPONSE"
else
    echo -e "${RED}✗ PNA header missing!${NC}"
    echo -e "${YELLOW}This means the server isn't configured for Private Network Access${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Proxy Endpoint Response"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PROXY_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: $API_URL" \
  -d '{"url": "http://localhost:9999", "method": "GET"}' \
  "$API_URL/api/proxy/request" 2>/dev/null | head -c 500)

if [ -n "$PROXY_RESPONSE" ]; then
    echo -e "${GREEN}✓ Proxy endpoint responding${NC}"
    echo "Response preview:"
    echo "$PROXY_RESPONSE"
else
    echo -e "${RED}✗ No response from proxy endpoint${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if all tests passed
if echo "$PNA_RESPONSE" | grep -q "true"; then
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════╗"
    echo "║  ✓ PNA Implementation is WORKING correctly!      ║"
    echo "║                                                    ║"
    echo "║  Backend engineers can now test local APIs:      ║"
    echo "║  - localhost:8080                                  ║"
    echo "║  - 127.0.0.1:3000                                ║"
    echo "║  - 192.168.x.x (local network)                    ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo -e "${NC}"
else
    echo -e "${YELLOW}"
    echo "╔════════════════════════════════════════════════════╗"
    echo "║  ⚠ PNA Implementation needs attention              ║"
    echo "║                                                    ║"
    echo "║  Possible causes:                                 ║"
    echo "║  1. Server hasn't been deployed yet               ║"
    echo "║  2. Nginx/Traefik stripping headers               ║"
    echo "║  3. Wrong API URL                                 ║"
    echo "║                                                    ║"
    echo "║  Check the detailed testing guide:                ║"
    echo "║  docs/TESTING_PNA.md                              ║"
    echo "╚════════════════════════════════════════════════════╝"
    echo -e "${NC}"
fi

echo ""
echo "To test manually in browser:"
echo "1. Open $API_URL"
echo "2. Open DevTools → Network tab"
echo "3. Send request to http://localhost:8080"
echo "4. Check OPTIONS request has 'access-control-allow-private-network: true'"
echo ""
