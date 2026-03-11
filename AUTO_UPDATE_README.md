# Auto-Update Feature

This document describes the auto-update feature for the Mock Service macOS app.

## Overview

The app uses Tauri's built-in updater plugin with a custom update server.

- **Backend:** `tauri-plugin-updater`
- **Update Server:** Custom endpoint at `https://api-mock.transtrack.id/api/app/updates`
- **Frontend:** Vue components with reactive state management

## Architecture

```
┌─────────────┐     Check for updates      ┌──────────────┐
│  Tauri App  │ ─────────────────────────▶ │ Custom Server│
│  (User)     │                            │ /api/app/    │
└─────────────┘                            │ updates      │
       │                                    └──────────────┘
       │                                           │
       │ ◀── Update metadata (version, URL, sig) ──┘
       │
       │ Download update file
       ▼
┌─────────────┐
│   Verify    │ ◀── Ed25519 signature verification
│  Signature  │
└─────────────┘
       │
       │ Install & Restart
       ▼
┌─────────────┐
│ Updated App │
└─────────────┘
```

## Files Added/Modified

### Backend (Rust)

1. **`src-tauri/Cargo.toml`**
   - Added `tauri-plugin-updater = "2"`

2. **`src-tauri/tauri.conf.json`**
   - Added `updater` configuration with public key and endpoints

3. **`src-tauri/src/lib.rs`**
   - Initialized updater plugin
   - Added invoke handlers for `check_update` and `install_update`

4. **`src-tauri/src/commands/updater.rs`** (NEW)
   - `check_update`: Checks for available updates
   - `install_update`: Downloads and installs the update

### Frontend

5. **`app/composables/useUpdater.ts`** (NEW)
   - Reactive state management for updates
   - `checkForUpdates()`: Manual check function
   - `installUpdate()`: Install and restart
   - `initAutoUpdate()`: Auto-check on startup (24h interval)

6. **`app/components/UpdateNotification.vue`** (NEW)
   - Floating notification when update is available
   - Modal dialog with version info and release notes
   - Install button with progress indicator

7. **`app/layouts/default.vue`**
   - Added `UpdateNotification` component
   - Initialize auto-update on mount

8. **`app/pages/admin/app-settings.vue`** (NEW)
   - Settings page with update check button
   - Current version display
   - Auto-update toggle (UI only)

### Server

9. **`server/api/app/updates.get.ts`** (NEW)
   - Returns update metadata in Tauri format
   - Platform detection (macOS/Windows/Linux)
   - Version comparison

### CI/CD

10. **`.github/workflows/release.yml`** (NEW)
    - Builds universal macOS binary
    - Signs update files
    - Creates GitHub release
    - Uploads to custom server (configurable)

11. **`scripts/generate-updater-keys.sh`** (NEW)
    - Generates Ed25519 signing keys
    - Outputs public key for tauri.conf.json

## Setup Instructions

### 1. Generate Signing Keys

```bash
bash scripts/generate-updater-keys.sh
```

This will output a public key. Copy it and update `tauri.conf.json`:

```json
"plugins": {
  "updater": {
    "pubkey": "YOUR_PUBLIC_KEY_HERE",
    "endpoints": [
      "https://api-mock.transtrack.id/api/app/updates"
    ]
  }
}
```

### 2. Configure GitHub Secrets

Add these secrets to your GitHub repository:

- `TAURI_SIGNING_PRIVATE_KEY`: The private key from the generation step
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: (Optional) If you set a password

### 3. Update the Server Endpoint

Edit `server/api/app/updates.get.ts`:

```typescript
const latestVersion = '0.2.2'; // Bump this for new releases
const baseUrl = 'https://your-cdn.com/updates'; // Your update file hosting
```

### 4. Build and Release

#### Option A: GitHub Actions (Recommended)

1. Push a new tag:
   ```bash
   git tag v0.2.2
   git push origin v0.2.2
   ```

2. GitHub Actions will:
   - Build the universal macOS app
   - Sign the update files
   - Create a GitHub release
   - Upload artifacts

#### Option B: Manual Build

```bash
# Build the app
bun tauri:build --target universal-apple-darwin

# Generate update signature
cargo tauri signer sign \
  --private-key "$TAURI_SIGNING_PRIVATE_KEY" \
  src-tauri/target/universal-apple-darwin/release/bundle/macos/*.tar.gz

# Upload to your server
scp src-tauri/target/universal-apple-darwin/release/bundle/macos/*.tar.gz \
   user@server:/var/www/updates/
scp src-tauri/target/universal-apple-darwin/release/bundle/macos/*.sig \
   user@server:/var/www/updates/
```

## Update File Format

The update server returns JSON in this format:

```json
{
  "version": "0.2.2",
  "notes": "## What's New...",
  "pub_date": "2024-01-15T10:30:00Z",
  "url": "https://api-mock.transtrack.id/updates/mock-service_0.2.2_aarch64.app.tar.gz",
  "signature": "base64-encoded-signature"
}
```

## Testing Updates

1. Build the app with version `0.2.1`
2. Install and run it
3. Update server to report `0.2.2` as latest
4. Click "Check for Updates" in App Settings
5. Verify update is detected and can be installed

## Security Considerations

1. **Keep private key secret**: Never commit the private key
2. **Use HTTPS**: Always serve updates over HTTPS
3. **Sign all updates**: Unsigned updates will be rejected
4. **Version checks**: Server validates current version before offering updates

## Troubleshooting

### "No updates available" when there should be

- Check version comparison logic in `updates.get.ts`
- Verify User-Agent parsing detects platform correctly
- Check that `latestVersion` > `currentVersion`

### Signature verification fails

- Verify public key in `tauri.conf.json` matches private key used for signing
- Check that signature file was generated correctly
- Ensure update file wasn't modified after signing

### Update downloads but doesn't install

- Check macOS Gatekeeper settings
- Verify app has proper entitlements
- Check Console.app for error messages

## Custom Server Requirements

If using a custom server instead of GitHub:

1. Host `.tar.gz` and `.sig` files
2. Serve with proper CORS headers:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET
   ```
3. Use HTTPS
4. Keep files organized by version and platform
