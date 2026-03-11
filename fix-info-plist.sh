#!/bin/bash
set -e

echo "🔧 Fixing Info.plist for URL scheme..."

APP_PATH="src-tauri/target/release/bundle/macos/Mock Service.app"
PLIST_PATH="$APP_PATH/Contents/Info.plist"

if [ ! -f "$PLIST_PATH" ]; then
    echo "❌ Error: Info.plist not found at $PLIST_PATH"
    echo "Make sure you ran 'bun tauri:build' first"
    exit 1
fi

# Backup original
cp "$PLIST_PATH" "$PLIST_PATH.backup"

# Check if already has CFBundleURLTypes
if plutil -extract CFBundleURLTypes xml1 -o - "$PLIST_PATH" 2>/dev/null | grep -q "CFBundleURLSchemes"; then
    echo "✅ CFBundleURLTypes already exists, skipping..."
else
    # Add CFBundleURLTypes using Python (safer than PlistBuddy)
    python3 << EOF
import plistlib
import sys

with open('$PLIST_PATH', 'rb') as f:
    plist = plistlib.load(f)

# Add URL schemes (both old and new for backward compatibility)
plist['CFBundleURLTypes'] = [{
    'CFBundleURLName': 'id.mock-service.oauth',
    'CFBundleURLSchemes': ['mockservice', 'id.mock-service']
}]

with open('$PLIST_PATH', 'wb') as f:
    plistlib.dump(plist, f)

print("✅ CFBundleURLTypes added successfully")
EOF
fi

# Clean up any backup file that might interfere with signing
rm -f "$PLIST_PATH.backup"

# Re-sign the app (required after modifying plist)
echo "🔏 Re-signing the app..."

# Clear all extended attributes (macOS uses -c not -cr)
xattr -c "$APP_PATH" 2>/dev/null || true

# Sign the entire app bundle with deep signing
codesign --force --deep --sign - "$APP_PATH"

# Clear quarantine
echo "🧹 Clearing quarantine attributes..."
xattr -d com.apple.quarantine "$APP_PATH" 2>/dev/null || true

echo ""
echo "✅ Done! You can verify with:"
echo "  plutil -p \"$PLIST_PATH\" | grep -A5 CFBundleURLTypes"
echo ""
echo "📦 Install the fixed app:"
echo "  rm -rf \"/Applications/Mock Service.app\""
echo "  cp -R \"$APP_PATH\" /Applications/"
