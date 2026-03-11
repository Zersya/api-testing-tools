# Mock Service

A desktop application built with Nuxt 3 and Tauri.

## Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js
- [Rust](https://www.rust-lang.org/tools/install)

## Setup

1. **Install JavaScript dependencies:**
```bash
bun install
```

2. **Install Rust targets (for macOS universal build):**
```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

3. **Generate app icons** (if `src-tauri/icons/` is empty):
```bash
# Generate a placeholder icon (or replace app-icon.png with your own 1024x1024 PNG)
python3 -c "
import struct, zlib
def make_png(w, h, r, g, b):
    def chunk(name, data):
        c = struct.pack('>I', len(data)) + name + data
        return c + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    raw = b''.join(b'\x00' + bytes([r,g,b]*w) for _ in range(h))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend
open('app-icon.png', 'wb').write(make_png(1024, 1024, 59, 130, 246))
print('app-icon.png written (1024x1024 PNG)')
"

# Generate all icon sizes
bun tauri icon ./app-icon.png
```

## Development

### Web Only (Browser)
```bash
bun run dev
```
Opens at `http://localhost:3000`

### Desktop App (Tauri)
```bash
bun tauri:dev
```

## Building

### Web Build
```bash
bun run generate
```

### Desktop App

**macOS Universal (Intel + Apple Silicon):**
```bash
bun tauri build --target universal-apple-darwin
```

Output: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/Mock Service_0.2.1_universal.dmg`

**Platform-specific builds:**
```bash
# Apple Silicon only
bun tauri build --target aarch64-apple-darwin

# Intel only
bun tauri build --target x86_64-apple-darwin
```

## Project Structure

```
├── src-tauri/          # Rust backend (Tauri)
│   ├── src/           # Rust source code
│   ├── icons/         # App icons (auto-generated)
│   └── Cargo.toml     # Rust dependencies
├── components/        # Vue components
├── composables/       # Vue composables
├── pages/            # Nuxt pages
└── app-icon.png      # Source icon for generation
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start web dev server |
| `bun tauri:dev` | Start desktop app in dev mode |
| `bun run generate` | Build for static hosting |
| `bun tauri build` | Build desktop app installer |
| `bun tauri icon ./app-icon.png` | Regenerate app icons |

## Tech Stack

- **Frontend:** Nuxt 3, Vue 3, TypeScript
- **Backend:** Tauri v2, Rust
- **Build Tool:** Bun

## Auto-Update (macOS Desktop App)

The desktop app includes a built-in auto-update feature using Tauri's updater plugin.

### How it Works

1. The app automatically checks for updates on startup (every 24 hours)
2. When an update is available, a notification appears
3. Users can view release notes and install with one click
4. The app downloads, verifies, installs the update, and restarts

### Setup for Developers

#### 1. Generate Signing Keys

Updates must be cryptographically signed. Generate keys with:

```bash
bash scripts/generate-updater-keys.sh
```

This outputs:
- **Public Key**: Add to `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
- **Private Key**: Keep secret! Add to GitHub Secrets as `TAURI_SIGNING_PRIVATE_KEY`

#### 2. Configure Update Server

Edit `src-tauri/tauri.conf.json`:

```json
"plugins": {
  "updater": {
    "pubkey": "YOUR_PUBLIC_KEY_HERE",
    "endpoints": [
      "https://your-server.com/api/app/updates"
    ]
  }
}
```

Edit `server/api/app/updates.get.ts` to set the latest version:

```typescript
const latestVersion = '0.2.2'; // Bump for new releases
const baseUrl = 'https://your-cdn.com/updates';
```

#### 3. Configure GitHub Secrets (for CI/CD)

Add to your GitHub repository:
- `TAURI_SIGNING_PRIVATE_KEY` - The private key from step 1
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - (Optional) If you set a password

#### 4. Release an Update

**Option A: GitHub Actions (Recommended)**

```bash
# Tag and push a new version
git tag v0.2.2
git push origin v0.2.2
```

GitHub Actions will:
- Build the universal macOS app
- Sign update files
- Create a GitHub release
- Upload artifacts

**Option B: Manual Build**

```bash
# Build the app
bun tauri:build --target universal-apple-darwin

# Sign the update file
cargo tauri signer sign \
  --private-key "$TAURI_SIGNING_PRIVATE_KEY" \
  src-tauri/target/universal-apple-darwin/release/bundle/macos/*.tar.gz

# Upload to your server
scp src-tauri/target/universal-apple-darwin/release/bundle/macos/*.tar.gz \
   user@server:/var/www/updates/
scp src-tauri/target/universal-apple-darwin/release/bundle/macos/*.sig \
   user@server:/var/www/updates/
```

### Manual Update Check

Users can manually check for updates in:
- **App Settings** → "Check for Updates" button
- Or wait for automatic check on startup

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "No updates available" | Verify `latestVersion` > `currentVersion` in server endpoint |
| Signature verification fails | Ensure public/private key pair matches |
| Update downloads but doesn't install | Check macOS Gatekeeper; app needs proper entitlements |
| Auto-check not working | Verify `initAutoUpdate()` is called in layout |

### Documentation

See [AUTO_UPDATE_README.md](AUTO_UPDATE_README.md) for detailed documentation.

## License

MIT
