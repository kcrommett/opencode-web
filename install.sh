#!/bin/bash

# OC Web One-Liner Installer
# Usage: curl -sSL https://raw.githubusercontent.com/kcrommett/opencode-web/main/install.sh | bash

set -e

echo "Installing OC Web..."

# Check if bun is available
if command -v bun &> /dev/null; then
    echo "Using bun to install..."
    bunx opencode-web@latest --version 2>/dev/null || {
        echo "Installing opencode-web globally..."
        bun add -g opencode-web@latest
    }
    echo "Installation complete!"
    echo "Run with: opencode-web"
elif command -v npm &> /dev/null; then
    echo "Using npm to install..."
    npx opencode-web@latest --version 2>/dev/null || {
        echo "Installing opencode-web globally..."
        npm install -g opencode-web@latest
    }
    echo "Installation complete!"
    echo "Run with: opencode-web"
elif command -v yarn &> /dev/null; then
    echo "Using yarn to install..."
    yarn global add opencode-web@latest
    echo "Installation complete!"
    echo "Run with: opencode-web"
else
    echo "ERROR: No package manager found (bun, npm, or yarn required)"
    echo "Please install one of these package managers and try again."
    exit 1
fi

echo ""
echo "Once started, open http://localhost:3000 in your browser"
echo "Use PORT environment variable to change port: PORT=8080 opencode-web"