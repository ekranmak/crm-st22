#!/bin/bash
set -e

echo "🚀 Starting CRM application..."
echo "📁 Current directory: $(pwd)"
echo "📦 Node version: $(node --version)"
echo "📦 npm version: $(npm --version)"
echo "💾 Available disk space:"
df -h | grep -E "^/|Device"

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "❌ ERROR: dist directory not found!"
    echo "Building project..."
    npm run build
fi

echo "✅ dist directory exists"
echo "📄 Contents of dist:"
ls -la dist/

# Start the server
echo "🎯 Starting Express server..."
node server.js
