#!/bin/bash

# Remove ALL console output from runtime files to fix JSON-RPC communication
# MCP servers must only output JSON-RPC messages to stdout/stderr

echo "Removing all console output from MCP runtime files..."

# Files to process
files=(
  "src/automation/deepwiki-automator.ts"
  "src/tools/wiki-parser.ts"
  "src/tools/wiki-question.ts"
  "src/cache/cache-manager.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Comment out all console.log and console.error lines
    sed -i '' 's/^\([[:space:]]*\)console\.\(log\|error\)(/\1\/\/ console.\2(/g' "$file"
  fi
done

# Also update the index.ts to remove the console redirect
sed -i '' '/const originalConsoleLog/,/console\.log = console\.error;/d' "src/index.ts"

echo "Done! All console output has been commented out."
echo ""
echo "Now rebuilding the project..."
