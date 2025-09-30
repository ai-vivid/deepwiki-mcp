#!/bin/bash

# DeepWiki MCP Setup Script

echo "DeepWiki MCP Setup"
echo "=================="
echo ""

# Function to find node/npm
find_node() {
    # Common paths to check
    local paths=(
        "/usr/local/bin/node"
        "/opt/homebrew/bin/node"
        "/usr/bin/node"
        "$HOME/.nvm/versions/node/*/bin/node"
        "$HOME/.volta/bin/node"
        "$HOME/.asdf/shims/node"
    )
    
    for path in "${paths[@]}"; do
        if [[ -f "$path" ]]; then
            echo "$path"
            return 0
        fi
    done
    
    # Try using which
    if command -v node >/dev/null 2>&1; then
        which node
        return 0
    fi
    
    return 1
}

find_npm() {
    # Common paths to check
    local paths=(
        "/usr/local/bin/npm"
        "/opt/homebrew/bin/npm"
        "/usr/bin/npm"
        "$HOME/.nvm/versions/node/*/bin/npm"
        "$HOME/.volta/bin/npm"
        "$HOME/.asdf/shims/npm"
    )
    
    for path in "${paths[@]}"; do
        if [[ -f "$path" ]]; then
            echo "$path"
            return 0
        fi
    done
    
    # Try using which
    if command -v npm >/dev/null 2>&1; then
        which npm
        return 0
    fi
    
    return 1
}

# Find Node.js
echo "Checking for Node.js..."
NODE_PATH=$(find_node)
if [[ -z "$NODE_PATH" ]]; then
    echo "❌ Node.js not found!"
    echo ""
    echo "Please install Node.js (version 18 or higher) from:"
    echo "  https://nodejs.org/"
    echo ""
    echo "Or using Homebrew:"
    echo "  brew install node"
    echo ""
    exit 1
fi

echo "✅ Found Node.js at: $NODE_PATH"
$NODE_PATH --version

# Find npm
echo ""
echo "Checking for npm..."
NPM_PATH=$(find_npm)
if [[ -z "$NPM_PATH" ]]; then
    echo "❌ npm not found!"
    exit 1
fi

echo "✅ Found npm at: $NPM_PATH"
$NPM_PATH --version

# Change to project directory
cd "$(dirname "$0")"

# Install dependencies
echo ""
echo "Installing dependencies..."
$NPM_PATH install

# Build the project
echo ""
echo "Building project..."
$NPM_PATH run build

# Install Playwright browsers
echo ""
echo "Installing Playwright browsers..."
$NPM_PATH exec playwright install chromium

# Create start script with found paths
cat > start-with-paths.sh << EOF
#!/bin/bash
# Auto-generated script with detected Node.js path

cd "\$(dirname "\$0")"

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "Building project..."
    $NPM_PATH run build
fi

echo "Starting DeepWiki MCP Server..."
echo "Press Ctrl+C to stop"
echo ""

# Start the server
$NODE_PATH dist/index.js
EOF

chmod +x start-with-paths.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "To use with Claude Desktop:"
echo "1. Add this to your Claude Desktop configuration:"
echo ""
echo '   {
     "mcpServers": {
       "deepwiki": {
         "command": "'$NODE_PATH'",
         "args": ["'$(pwd)/dist/index.js'"]
       }
     }
   }'
echo ""
echo "2. Restart Claude Desktop"
echo ""
echo "You can also run the test script to verify setup:"
echo "  $NODE_PATH dist/test.js"
echo ""
echo "Or start the server directly:"
echo "  ./start-with-paths.sh"
