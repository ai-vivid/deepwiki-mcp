#!/bin/bash

# DeepWiki MCP Server Launch Script

echo "Starting DeepWiki MCP Server..."
echo "================================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Dependencies not installed. Running npm install..."
    npm install
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "Building project..."
    npm run build
fi

# Check if Playwright browsers are installed
if ! npx playwright --version > /dev/null 2>&1; then
    echo "Playwright not found. Installing browsers..."
    npx playwright install chromium
fi

echo ""
echo "Starting MCP server..."
echo "Press Ctrl+C to stop"
echo ""

# Start the server
node dist/index.js
