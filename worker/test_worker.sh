#!/bin/bash

# Simple test script for the worker
# Usage: ./test_worker.sh [worker_url]

WORKER_URL="${1:-http://localhost:8000}"

echo "Testing worker at: $WORKER_URL"
echo ""

# Test 1: Health check
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/health")

if [ "$HEALTH_RESPONSE" -eq 200 ]; then
    echo "✅ Health check passed (200)"
    curl -s "$WORKER_URL/health" | python3 -m json.tool
else
    echo "❌ Health check failed ($HEALTH_RESPONSE)"
    curl -s "$WORKER_URL/health"
    exit 1
fi

echo ""
echo "2. Testing process endpoint..."

# Test 2: Process endpoint (will return 202 but job will fail without valid S3 file)
PROCESS_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$WORKER_URL/process" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-'$(date +%s)'",
    "s3Key": "uploads/test.pdf",
    "email": "test@example.com",
    "language": "Spanish"
  }')

HTTP_CODE=$(echo "$PROCESS_RESPONSE" | tail -n 1)
BODY=$(echo "$PROCESS_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 202 ]; then
    echo "✅ Process endpoint accepted job (202)"
    echo "$BODY" | python3 -m json.tool
else
    echo "❌ Process endpoint failed ($HTTP_CODE)"
    echo "$BODY"
    exit 1
fi

echo ""
echo "✅ All tests passed!"
echo ""
echo "Note: The job will fail in the background because there's no valid PDF in S3."
echo "Check worker logs to see the processing attempt."

