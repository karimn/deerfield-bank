#!/bin/bash
# Manual trigger for recurring transactions processing
# Usage: ./test-recurring.sh

echo "🔄 Triggering recurring transactions processing..."
echo ""

response=$(curl -s -X POST https://deerfield-bank.vercel.app/api/automation/process-recurring -H "Content-Type: application/json")

echo "$response" | jq '.' 2>/dev/null || echo "$response"

# Parse the response to show a summary
processed=$(echo "$response" | jq -r '.processed' 2>/dev/null)
errors=$(echo "$response" | jq -r '.errors' 2>/dev/null)

if [ "$processed" != "null" ]; then
  echo ""
  echo "✅ Success: Processed $processed transactions with $errors errors"
else
  echo ""
  echo "❌ Error: Check response above"
fi
