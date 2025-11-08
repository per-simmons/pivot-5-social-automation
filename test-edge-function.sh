#!/bin/bash

# Test script for render_social Edge Function
# This tests the function with a generic Unsplash image

set -e

echo "🧪 Testing Pivot 5 Social Media Image Compositor"
echo "================================================"
echo ""

# Configuration
FUNCTION_URL="${SUPABASE_URL}/functions/v1/render_social"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
TEST_IMAGE_URL="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80"
TEST_POST_ID="test-$(date +%s)"

# Test data
TEST_CATEGORY="TOOLS"
TEST_HEADLINE="Testing AI-Powered Social Media Automation"
TEST_FOOTER="@pivot5 • pivot5.com"

echo "📋 Test Configuration:"
echo "   Post ID: ${TEST_POST_ID}"
echo "   Category: ${TEST_CATEGORY}"
echo "   Headline: ${TEST_HEADLINE}"
echo "   Image: ${TEST_IMAGE_URL}"
echo ""

# Function to test a ratio
test_ratio() {
  local ratio=$1
  echo "🎨 Testing ratio: ${ratio}"

  response=$(curl -s -X POST "${FUNCTION_URL}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{
      "ratio": "'"${ratio}"'",
      "imageUrl": "'"${TEST_IMAGE_URL}"'",
      "category": "'"${TEST_CATEGORY}"'",
      "headline": "'"${TEST_HEADLINE}"'",
      "footer": "'"${TEST_FOOTER}"'",
      "focal": [0.5, 0.5],
      "postId": "'"${TEST_POST_ID}"'"
    }')

  # Check if response contains error
  if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
    echo "   ❌ Error: $(echo "$response" | jq -r '.error')"
    return 1
  fi

  # Extract public URL
  public_url=$(echo "$response" | jq -r '.publicUrl')
  width=$(echo "$response" | jq -r '.width')
  height=$(echo "$response" | jq -r '.height')

  echo "   ✅ Success!"
  echo "   📐 Dimensions: ${width}x${height}"
  echo "   🔗 URL: ${public_url}"
  echo ""
}

# Test all three ratios
echo "🚀 Starting tests..."
echo ""

test_ratio "4:5"
test_ratio "1:1"
test_ratio "9:16"

echo "================================================"
echo "✨ All tests complete!"
echo ""
echo "📸 View your test images in Supabase Storage:"
echo "   Bucket: pivot5"
echo "   Path: social/${TEST_POST_ID}/"
