#!/bin/bash
# Auto-generated script with detected Node.js path

cd "$(dirname "$0")"

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "Building project..."
    /opt/homebrew/bin/npm run build
fi

echo "Starting DeepWiki MCP Server..."
echo "Press Ctrl+C to stop"
echo ""

# Start the server
/opt/homebrew/bin/node dist/index.js
