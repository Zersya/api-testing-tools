# Mock API Local Proxy - Complete Guide

**Test your local APIs through the Mock API Service with one simple command.**

## Table of Contents
1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Basic Usage](#basic-usage)
4. [Advanced Features](#advanced-features)
5. [Troubleshooting](#troubleshooting)
6. [Architecture](#architecture)

---

## Quick Start (30 seconds)

### Step 1: Install

**macOS / Linux:**
```bash
curl -fsSL https://api-mock.transtrack.id/install-proxy.sh | bash
```

**Windows (Git Bash):**
```bash
curl -fsSL https://api-mock.transtrack.id/install-proxy.sh | bash
```

**Windows (PowerShell):**
```powershell
iwr -useb https://api-mock.transtrack.id/install-proxy.ps1 | iex
```

### Step 2: Run

```bash
mock-api-proxy
```

You'll see:
```
╔══════════════════════════════════════════════════════════════╗
║  🚀 Mock API Local Proxy Running                            ║
╚══════════════════════════════════════════════════════════════╝

Configuration:
  Name:    default
  Proxy:   http://localhost:8765
  Target:  http://localhost:8080

Use this URL in Mock API Service:
  → http://192.168.1.100:8765 (Wi-Fi)
  → http://10.0.0.50:8765 (Ethernet)

Press Ctrl+C to stop
```

### Step 3: Use in Mock API Service

1. Open https://api-mock.transtrack.id
2. Create a request
3. Use your IP from Step 2 (e.g., `http://192.168.1.100:8765`)
4. ✅ Done! Your local API is now accessible.

---

## Installation

### Prerequisites

- **Node.js 14+** (The installer will check and help install if missing)
- **Network connection** (to download the proxy)

### Installation Methods

#### Method 1: One-Line Install (Recommended)

**macOS / Linux / Git Bash:**
```bash
curl -fsSL https://api-mock.transtrack.id/install-proxy.sh | bash
```

**Windows PowerShell:**
```powershell
iwr -useb https://api-mock.transtrack.id/install-proxy.ps1 | iex
```

What this does:
- Downloads the proxy to `~/.mock-api-proxy/`
- Creates the `mock-api-proxy` command
- Adds it to your PATH
- Creates uninstaller

#### Method 2: npm (Alternative)

```bash
npm install -g mock-api-local-proxy
mock-api-proxy
```

#### Method 3: Manual Download

```bash
# Download the proxy
mkdir -p ~/.mock-api-proxy
curl -o ~/.mock-api-proxy/proxy.js https://api-mock.transtrack.id/proxy-scripts/mock-api-proxy.js

# Run it
node ~/.mock-api-proxy/proxy.js
```

### Verify Installation

```bash
mock-api-proxy --version
# Should output: 1.0.0
```

### Uninstall

```bash
mock-api-proxy-uninstall
```

Or manually:
```bash
rm -rf ~/.mock-api-proxy
rm ~/.local/bin/mock-api-proxy
rm ~/.local/bin/mock-api-proxy-uninstall
```

---

## Basic Usage

### Start the Proxy

**Default (localhost:8080 → :8765):**
```bash
mock-api-proxy
```

**Custom target port:**
```bash
mock-api-proxy --target 3000
```

**Custom proxy port:**
```bash
mock-api-proxy --port 9999
```

**Custom host:**
```bash
mock-api-proxy --host 192.168.1.50
```

### Multiple APIs

Run multiple proxies for different APIs:

```bash
# Terminal 1 - API on port 8080
mock-api-proxy --name api-main --port 8765

# Terminal 2 - API on port 3000  
mock-api-proxy --name api-auth --port 8766 --target 3000

# Terminal 3 - API on port 5000
mock-api-proxy --name api-legacy --port 8767 --target 5000
```

Use different IPs in Mock API Service:
- API Main: `http://YOUR_IP:8765`
- API Auth: `http://YOUR_IP:8766`
- API Legacy: `http://YOUR_IP:8767`

### View Running Instances

```bash
mock-api-proxy --list
```

Output:
```
Running Proxy Instances

┌──────────────┬────────┬─────────────────────┬──────────┐
│ Name         │ Port   │ Target              │ Status   │
├──────────────┼────────┼─────────────────────┼──────────┤
│ api-main     │ 8765   │ localhost:8080      │ Running  │
│ api-auth     │ 8766   │ localhost:3000    │ Running  │
│ api-legacy   │ 8767   │ localhost:5000      │ Stopped  │
└──────────────┴────────┴─────────────────────┴──────────┘
```

### Stop an Instance

Press `Ctrl+C` in the terminal running the proxy.

Or by name:
```bash
mock-api-proxy --stop api-main
```

---

## Advanced Features

### Auto-Update

The proxy checks for updates every time you run it. If a new version is available:

```
┌─────────────────────────────────────────────────────────────┐
│  Update Available!                                          │
├─────────────────────────────────────────────────────────────┤
│  Current: 1.0.0                                             │
│  Latest:  1.1.0                                             │
└─────────────────────────────────────────────────────────────┘

Would you like to update now? (Y/n): 
```

Type `Y` to auto-update, or `n` to skip.

### Skip Update Check

```bash
mock-api-proxy --no-update-check
```

### Manual Update Check

```bash
mock-api-proxy --update
```

### Verbose Logging

See detailed request/response logs:

```bash
mock-api-proxy --verbose
```

Output:
```
[08:45:30] GET http://localhost:8080/api/users
[08:45:30] ← 200
[08:45:32] POST http://localhost:8080/api/users
[08:45:32] ← 201
```

### Save Default Configuration

```bash
# Set default target to port 3000
mock-api-proxy --target 3000 --save

# Now just running `mock-api-proxy` will target port 3000
```

Configuration is saved to `~/.mock-api-proxy/config.json`.

---

## Troubleshooting

### "Command not found"

**Problem:** `mock-api-proxy: command not found`

**Solution 1:** Restart your terminal
```bash
# Or manually reload shell config
source ~/.bashrc    # Linux/Git Bash
source ~/.zshrc     # macOS with zsh
```

**Solution 2:** Check PATH
```bash
echo $PATH | grep ".local/bin"
# Should see: /Users/you/.local/bin

# If missing, add manually:
export PATH="$HOME/.local/bin:$PATH"
```

### "Port already in use"

**Problem:** `Port 8765 is already in use`

**Solution:** Use a different port
```bash
mock-api-proxy --port 8766
```

### "No local network IPs found"

**Problem:** Proxy starts but shows no IP addresses

**Solution 1:** Connect to a network (WiFi or Ethernet)

**Solution 2:** Use localhost (testing only)
```bash
# Use localhost instead of network IP
# Note: This only works from the same machine
mock-api-proxy
# Then use: http://localhost:8765
```

### "Cannot connect to localhost:8080"

**Problem:** Requests fail with "Cannot connect"

**Solutions:**

1. **Verify your API is running:**
```bash
# Check if port 8080 is listening
lsof -i :8080          # macOS/Linux
netstat -an | findstr 8080   # Windows
```

2. **Check target port:**
```bash
# If your API runs on different port
mock-api-proxy --target 3000
```

3. **Check firewall:**
- macOS: System Preferences → Security & Privacy → Firewall
- Windows: Windows Defender Firewall
- Linux: `sudo ufw allow 8765`

### Requests timeout

**Problem:** Requests hang and eventually fail

**Solutions:**

1. **Check if API responds locally:**
```bash
curl http://localhost:8080/health
# or your endpoint
```

2. **Check network connectivity:**
```bash
# From another device on same network, try:
ping YOUR_COMPUTER_IP
```

3. **Check VPN:**
- VPNs often block local network access
- Disconnect VPN or use split tunneling

### "EACCES permission denied"

**Problem:** Permission errors on install

**Solution:** Install without sudo, or use npm method:
```bash
# Instead of sudo curl... use:
npm install -g mock-api-local-proxy
```

### Windows-specific issues

**Git Bash not found:**
1. Install Git for Windows: https://git-scm.com/download/win
2. Use Git Bash terminal

**PowerShell execution policy:**
```powershell
# If you get "execution of scripts is disabled"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Then run the installer again
```

---

## Architecture

### How It Works

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  Mock API        │  HTTPS  │  Your Laptop     │  HTTP   │  Your Local      │
│  Service         │ ──────▶ │  (Proxy)         │ ──────▶ │  API Server      │
│  (Cloud)         │         │  Port 8765       │         │  localhost:8080  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

1. You run `mock-api-proxy` on your laptop
2. It creates a proxy server on port 8765 (configurable)
3. You use your laptop's IP (e.g., 192.168.1.100:8765) in Mock API Service
4. Mock API Service connects to your laptop's IP
5. Proxy forwards request to your local API (localhost:8080)
6. Response flows back through the same path

### Why This Works

**The Problem:**
- Production server (Docker container) can't reach your laptop's `localhost`
- Browser PNA (Private Network Access) blocks direct access from cloud to local

**The Solution:**
- Proxy runs on YOUR machine, not the server
- Your machine's IP is accessible on the local network
- Proxy bridges the gap between cloud and local

### Security

- Proxy only accepts connections from your local network
- No authentication (designed for development only)
- Use VPN for remote access
- Don't expose proxy to public internet

---

## FAQ

**Q: Do I need to run the proxy every time?**  
A: Yes, run it when you need to test local APIs. Stop it with Ctrl+C when done.

**Q: Can I run multiple proxies?**  
A: Yes! Use different ports and names for each API.

**Q: Does it work with HTTPS local APIs?**  
A: The proxy uses HTTP. For HTTPS local APIs, use ngrok or similar tunnel.

**Q: Can I use this with a remote team?**  
A: Each engineer runs their own proxy on their machine. No shared proxy.

**Q: Does it work with WebSockets?**  
A: This simple proxy handles HTTP/HTTPS only. For WebSockets, use ngrok.

**Q: Can the server access my other local files?**  
A: No, only the ports you expose through the proxy are accessible.

**Q: Is my data secure?**  
A: The connection from cloud to proxy is over your local network. Keep sensitive data off dev APIs.

**Q: Can I use this in production?**  
A: No! This is for development only. Never expose production APIs this way.

**Q: Does it work on CI/CD?**  
A: No, this requires a local machine with network access.

---

## Support

Having issues?

1. Check [Troubleshooting](#troubleshooting) section
2. Run with `--verbose` for detailed logs
3. Contact the platform team with:
   - Your OS (macOS/Linux/Windows)
   - Node.js version (`node --version`)
   - Error messages
   - Steps to reproduce

---

## Changelog

### v1.0.0 (2026-04-02)
- Initial release
- Multi-instance support
- Terminal UI with beautiful tables
- Auto-update checking
- Cross-platform support (macOS, Linux, Windows)
- Git Bash and PowerShell support
