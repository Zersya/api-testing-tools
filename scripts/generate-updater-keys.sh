#!/bin/bash

# Generate signing keys for Tauri auto-updater
# These keys are used to sign update files so the app can verify their authenticity

set -e

echo "🔐 Generating Tauri Updater Signing Keys..."
echo ""

# Check if tauri-cli is installed
if ! command -v tauri &> /dev/null; then
    echo "Installing Tauri CLI..."
    cargo install tauri-cli
fi

# Generate the keys
echo "Generating Ed25519 keypair..."
KEY_OUTPUT=$(cargo tauri signer generate --force)

# Extract the public key
echo ""
echo "==============================================="
echo "🔑 PUBLIC KEY (add to tauri.conf.json):"
echo ""
echo "$KEY_OUTPUT" | grep "Public Key" | sed 's/Public Key: //'
echo ""
echo "==============================================="
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Copy the PUBLIC KEY above into your tauri.conf.json"
echo "2. The private key is saved in your OS keychain or displayed above"
echo "3. Set the private key as TAURI_SIGNING_PRIVATE_KEY in GitHub Secrets"
echo "4. If a password was set, add it as TAURI_SIGNING_PRIVATE_KEY_PASSWORD"
echo ""
echo "To manually set the private key environment variable:"
echo "export TAURI_SIGNING_PRIVATE_KEY='your-private-key-content'"
echo ""
echo "For GitHub Actions, add the private key as a repository secret."
