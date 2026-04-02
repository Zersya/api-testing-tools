# Local Development Proxy

If you're a **backend engineer** trying to test your **local API** (running on `localhost:8080` or similar) through the Mock API Service, this guide is for you.

## The Problem

The Mock API Service runs on a production server (https://api-mock.transtrack.id). When you try to send requests to your local machine (`localhost:8080`), the server can't reach it because:

- The server runs inside a Docker container
- `localhost` inside the container refers to the container itself, not your laptop
- Your laptop and the server are on different networks

## The Solution: Local Proxy Script

We provide a simple proxy script that runs on **your machine** and creates a bridge between the Mock API Service and your local API.

## Quick Start

### Step 1: Run the Proxy Script

You can run the proxy without installing anything:

```bash
# Using npx (no installation needed)
npx mock-api-local-proxy

# Or install globally
npm install -g mock-api-local-proxy
mock-api-local-proxy
```

You'll see output like:
```
╔════════════════════════════════════════════════════════════╗
║  🚀 Mock API Local Proxy Running                            ║
╠════════════════════════════════════════════════════════════╣
║  Proxy Port:    8765                                        ║
║  Target:         http://localhost:8080                     ║
╠════════════════════════════════════════════════════════════╣
║  Use this URL in Mock API Service:                          ║
║  http://192.168.1.100:8765                                  ║
║  http://10.0.0.50:8765                                      ║
╚════════════════════════════════════════════════════════════╝
```

### Step 2: Use the Proxy URL in Mock API Service

1. Open https://api-mock.transtrack.id
2. Create or edit a request
3. Instead of using `http://localhost:8080`, use **your machine's IP with the proxy port**:
   - Example: `http://192.168.1.100:8765`
   - (Use one of the IPs shown when you started the proxy)

4. Send the request - it will now reach your local API!

## How It Works

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Mock API       │ ──────▶ │  Your Laptop     │ ──────▶ │  Your Local     │
│  Service        │  HTTPS  │  (Proxy Script)  │  HTTP   │  API Server     │
│  (Production)   │         │  Port 8765       │         │  localhost:8080 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

1. Mock API Service sends request to `http://192.168.1.100:8765`
2. The proxy script (running on your laptop) receives it
3. Proxy forwards the request to your local API at `localhost:8080`
4. Your local API responds back through the proxy
5. Response returns to Mock API Service

## Advanced Usage

### Custom Target Port

If your local API runs on a different port:

```bash
# Target port 3000 instead of 8080
npx mock-api-local-proxy --target http://localhost:3000

# Or save it as default
npx mock-api-local-proxy --target http://localhost:3000 --save
```

### Custom Proxy Port

If port 8765 is already in use:

```bash
npx mock-api-local-proxy --port 9999
```

### Verbose Logging

See detailed request/response logs:

```bash
npx mock-api-local-proxy --verbose
```

## Troubleshooting

### "No local network IPs found"

Make sure your laptop is connected to a network (WiFi or Ethernet). The proxy needs to know your IP address so the production server can reach it.

### "Port 8765 is already in use"

Choose a different port:
```bash
npx mock-api-local-proxy --port 9999
```

### "Cannot connect to localhost:8080"

Make sure your local API server is actually running on port 8080:
```bash
# Check if something is listening on port 8080
lsof -i :8080
# or
netstat -an | grep 8080
```

### Requests timeout or fail

1. Check your firewall settings - port 8765 might be blocked
2. Make sure your laptop and the server can communicate (same network or routable)
3. Try using your laptop's IP directly: `http://YOUR_IP:8765`

## Alternative: Browser Extension

If you prefer not to run a script, you can use a browser extension like:
- **CORS Unblock** (Chrome)
- **Allow CORS** (Chrome/Firefox)

These extensions allow the browser to make direct requests to localhost from the production app, bypassing the server proxy entirely.

## Alternative: ngrok Tunnel

For a public URL that works from anywhere:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local API
ngrok http 8080

# Use the HTTPS URL provided (e.g., https://abc123.ngrok.io)
# This bypasses all networking issues entirely
```

## Security Note

⚠️ **The proxy exposes your local API to your local network.** 

- Only use this on trusted networks
- The proxy accepts requests from any origin (CORS is wide open)
- Don't leave the proxy running when not needed
- Press `Ctrl+C` to stop the proxy

## FAQ

**Q: Do I need to change my local API code?**  
A: No, the proxy is transparent. Your local API receives requests exactly as if they came directly from the browser.

**Q: Can I use HTTPS with the proxy?**  
A: The proxy uses HTTP. For HTTPS, use ngrok or configure your local API with SSL.

**Q: Does this work with WebSockets?**  
A: This simple proxy only handles HTTP/HTTPS. For WebSockets, use ngrok or a more advanced proxy.

**Q: Can multiple engineers use this simultaneously?**  
A: Each engineer runs their own proxy on their own machine with their own IP address.

## Support

If you have issues:
1. Check the troubleshooting section above
2. Run with `--verbose` flag for detailed logs
3. Contact the platform team with the error messages
