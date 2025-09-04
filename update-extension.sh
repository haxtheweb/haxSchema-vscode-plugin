#!/bin/bash

echo "🚀 Updating HAXSchema VSCode Extension with new icon..."

# Check if icon exists
if [ ! -f "images/hax-icon.png" ]; then
    echo "❌ Icon not found! Please save your icon as images/hax-icon.png"
    echo "   Expected location: $(pwd)/images/hax-icon.png"
    exit 1
fi

echo "✅ Icon found: images/hax-icon.png"

# Increment version to ensure clean reinstall
echo "📦 Updating version..."
npm version patch --no-git-tag-version

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile

# Package extension
echo "📦 Packaging extension..."
vsce package

# Get the new version
VERSION=$(node -p "require('./package.json').version")
VSIX_FILE="haxschema-${VERSION}.vsix"

echo "📦 Created: $VSIX_FILE"

# Uninstall old version
echo "🗑️  Uninstalling old version..."
code --uninstall-extension haxtheweb.haxschema 2>/dev/null || true

# Install new version
echo "⬇️  Installing new version..."
code --install-extension "$VSIX_FILE"

echo "🎉 Extension updated successfully!"
echo "✨ The new HAX icon should now be visible in VSCode Extensions panel"
