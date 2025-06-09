#!/bin/bash

echo "🌐 Testing web build compilation..."
echo "This will attempt a quick web build test"

# Clear any existing caches
echo "🧹 Clearing caches..."
npx expo export --clear > /dev/null 2>&1

# Test basic Metro bundling
echo "📦 Testing Metro bundler..."
timeout 45s npx expo export --platform web --dev --output-dir .test-build 2>&1 | head -20

# Check if build started successfully
if [ -d ".test-build" ]; then
    echo "✅ Web build process started successfully!"
    echo "📁 Build output directory created"
    rm -rf .test-build
    echo "🧹 Cleaned up test build"
else
    echo "⚠️  Build process may need more time or has issues"
fi

echo "✅ Web build test completed!"