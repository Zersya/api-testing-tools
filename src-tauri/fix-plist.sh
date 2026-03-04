#!/bin/bash

# Fix Info.plist to add URL schemes for OAuth callback

APP_PATH="src-tauri/target/release/bundle/macos/Mock Service.app"
PLIST_PATH="$APP_PATH/Contents/Info.plist"

if [ ! -f "$PLIST_PATH" ]; then
    echo "Error: Info.plist not found at $PLIST_PATH"
    echo "Make sure you ran 'bun tauri:build' first"
    exit 1
fi

# Backup original
cp "$PLIST_PATH" "$PLIST_PATH.backup"

# Add CFBundleURLTypes using Python for reliability
python3 << 'EOF'
import plistlib
import sys

plist_path = "$PLIST_PATH"

with open(plist_path, 'rb') as f:
    plist = plistlib.load(f)

# Add URL schemes (both for backward compatibility)
plist['CFBundleURLTypes'] = [{
    'CFBundleURLName': 'id.mock-service.oauth',
    'CFBundleURLSchemes': ['mockservice', 'id.mock-service']
}]

with open(plist_path, 'wb') as f:
    plistlib.dump(plist, f)

print("✅ URL schemes 'mockservice' and 'id.mock-service' added to Info.plist")
EOF

echo ""
echo "You can verify with:"
echo "  plutil -p \"$PLIST_PATH\" | grep -A10 CFBundleURLTypes"
echo ""
echo "Now install the app:"
echo "  cp -R \"$APP_PATH\" /Applications/"
