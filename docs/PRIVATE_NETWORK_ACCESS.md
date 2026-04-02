# Private Network Access (PNA) for Backend Engineers

## The Issue

When using the Mock API Service (`https://api-mock.transtrack.id`) to test requests against your **local development servers** (localhost, 192.168.x.x, 10.x.x.x), modern browsers block these requests due to a security feature called **Private Network Access (PNA)**.

This security feature prevents public websites from accessing local network resources to protect against malicious attacks.

## What's Been Fixed

The server has been updated to respond with proper PNA headers:

1. **`Access-Control-Allow-Private-Network: true`** - Grants permission for the browser to allow requests to local addresses
2. **Enhanced CORS headers** - Proper cross-origin resource sharing configuration

These changes are in:
- `server/middleware/cors.ts` - Handles all CORS/PNA preflight requests
- `server/api/proxy/request.post.ts` - Proxy endpoint with PNA support

## For Backend Engineers: Temporary Workarounds

While waiting for the server changes to deploy, or if you still encounter issues:

### Option 1: Disable PNA in Chrome (Quickest)

**Method A: Chrome Flags (Recommended for Development)**
1. Open Chrome and navigate to: `chrome://flags/#block-insecure-private-network-requests`
2. Set it to **"Disabled"**
3. Restart Chrome

**Method B: Command Line Launch**
```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --disable-features=PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults

# Windows
chrome.exe --disable-features=PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults

# Linux
google-chrome --disable-features=PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults
```

### Option 2: Use a Secure Tunnel (Recommended for Teams)

Instead of exposing localhost directly, use a tunnel service that provides HTTPS endpoints:

**Using ngrok:**
```bash
# Install ngrok if you haven't
# https://ngrok.com/download

# Expose your local API
ngrok http 8080  # or whatever port your API runs on

# Use the HTTPS URL provided (e.g., https://abc123.ngrok.io)
# This avoids PNA entirely since it's a public HTTPS URL
```

**Alternatives:**
- [localtunnel](https://localtunnel.github.io/www/): `npx localtunnel --port 8080`
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Tailscale](https://tailscale.com/) for team VPN

### Option 3: Use Firefox (Less Restrictive)

Firefox has less strict PNA enforcement. You can test your local APIs in Firefox as a temporary workaround.

### Option 4: Local Development Mode

Run the Mock API Service locally:

```bash
# Clone and run locally
git clone <repository>
cd mock-api-service
npm install
npm run dev

# Access via http://localhost:3000
# Local-to-local requests don't trigger PNA
```

## Testing Your Local API

Once you've applied one of the workarounds above:

1. **Set up your environment variable:**
   - Go to Environments in the Mock API Service
   - Create a variable like: `LOCAL_API_URL = http://localhost:8080`

2. **Make requests using the variable:**
   ```
   GET {{LOCAL_API_URL}}/api/users
   ```

3. **Or use your local IP for mobile testing:**
   ```
   # Find your local IP
   # macOS/Linux: ifconfig or ip addr
   # Windows: ipconfig
   
   # Set variable
   LOCAL_API_URL = http://192.168.1.100:8080
   ```

## Troubleshooting

### "Request blocked by client" or "CORS error"
- Check if PNA headers are being sent (check browser DevTools Network tab)
- Try the Chrome flags workaround above
- Ensure your local server has CORS enabled

### "Unable to connect to target server"
- Verify your local server is running
- Check the port is correct
- Ensure your firewall allows connections on that port

### "DNS resolution failed"
- Check your local server URL format
- Try using IP address instead of `localhost`
- Verify network connectivity

## Server-Side CORS Configuration

If you control the backend being tested, ensure it has proper CORS headers:

**Express.js example:**
```javascript
const cors = require('cors');
app.use(cors({
  origin: true, // or 'https://api-mock.transtrack.id'
  credentials: true
}));
```

**Spring Boot example:**
```java
@CrossOrigin(origins = "https://api-mock.transtrack.id", allowCredentials = "true")
@RestController
public class MyController { }
```

## Security Note

Private Network Access is an important security feature. The workarounds above should **only be used in development environments**. Never disable PNA in production browsers or on systems handling sensitive data.

## Support

If you continue to experience issues after trying these solutions:

1. Check browser DevTools Console for specific error messages
2. Verify the server changes have been deployed
3. Contact the platform team with:
   - Browser version
   - OS version
   - Specific error messages
   - Steps to reproduce
