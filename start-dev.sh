#!/bin/bash

echo "🚀 Starting KB-Atlas Development Server"
echo "========================================="

# Kill any existing Metro processes
pkill -f metro 2>/dev/null || true
pkill -f expo 2>/dev/null || true

# Clear Metro cache
echo "🧹 Clearing Metro cache..."
npx expo start --clear

echo ""
echo "📱 Development Options:"
echo "1. Press 'w' to open in web browser"
echo "2. Press 'i' to open iOS simulator"
echo "3. Press 'a' to open Android emulator"
echo "4. Scan QR code with Expo Go app"
echo ""
echo "✨ Enhanced OpenAI Agents SDK is ready!"
echo "   - Latest models: GPT-4.5, GPT-4.1, o3-mini, o4-mini"
echo "   - Advanced UI controls for all SDK features"
echo "   - Agent Builder with comprehensive tools"
echo "   - MCP integration for external tools"
echo ""