# Testing Private Network Access (PNA) Implementation

This guide provides multiple ways to test that the PNA implementation is working correctly.

## Test 1: Verify Server Headers (Quick Check)

### Using curl (Command Line)

Test if the server responds with PNA headers:

```bash
# Test 1: Regular CORS preflight
curl -I -X OPTIONS \
  -H "Origin: https://api-mock.transtrack.id" \
  -H "Access-Control-Request-Method: POST" \
  https://api-mock.transtrack.id/api/proxy/request

# Expected response headers:
# access-control-allow-origin: https://api-mock.transtrack.id
# access-control-allow-methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
# access-control-allow-headers: Content-Type, Authorization...
```

```bash
# Test 2: PNA-specific preflight
curl -I -X OPTIONS \
  -H "Origin: https://api-mock.transtrack.id" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Private-Network: true" \
  https://api-mock.transtrack.id/api/proxy/request

# Expected response headers:
# access-control-allow-private-network: true  <-- THIS IS THE KEY HEADER
# access-control-allow-origin: https://api-mock.transtrack.id
```

```bash
# Test 3: Actual proxy request to localhost
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Origin: https://api-mock.transtrack.id" \
  -d '{
    "url": "http://localhost:8080/api/test",
    "method": "GET",
    "headers": {},
    "workspaceId": "test-workspace"
  }' \
  https://api-mock.transtrack.id/api/proxy/request

# You should get a response (even if it's an error about connecting to localhost)
```

## Test 2: Browser DevTools (Most Accurate)

### Step-by-Step:

1. **Open your app** in Chrome: `https://api-mock.transtrack.id`

2. **Open DevTools** (F12 or Cmd+Option+I on Mac)

3. **Go to Network tab**

4. **Create a test request:**
   - Go to any workspace
   - Create a new request
   - Set URL to: `http://localhost:8080/api/test` (or any local endpoint)
   - Click "Send"

5. **Check the Network tab for two requests:**

#### Request 1: Preflight (OPTIONS)
Look for an OPTIONS request to `/api/proxy/request`

**Request Headers should include:**
```
Access-Control-Request-Method: POST
Access-Control-Request-Private-Network: true
Origin: https://api-mock.transtrack.id
```

**Response Headers should include:**
```
Access-Control-Allow-Private-Network: true
Access-Control-Allow-Origin: https://api-mock.transtrack.id
```

#### Request 2: Actual Request (POST)
Look for the POST request to `/api/proxy/request`

**Response Headers should include:**
```
Access-Control-Allow-Origin: https://api-mock.transtrack.id
Access-Control-Allow-Credentials: true
```

### Screenshot Checklist:
- [ ] OPTIONS request returns 200 status
- [ ] OPTIONS response has `access-control-allow-private-network: true`
- [ ] POST request follows after OPTIONS
- [ ] POST request completes without CORS errors

## Test 3: Local Backend Test (End-to-End)

### Setup a Local Test Server:

Create a simple test file `test-server.js`:

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  // Enable CORS for your domain
  res.setHeader('Access-Control-Allow-Origin', 'https://api-mock.transtrack.id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Hello from local server!',
    timestamp: new Date().toISOString(),
    headers: req.headers
  }));
});

server.listen(8080, () => {
  console.log('Test server running on http://localhost:8080');
});
```

Run it:
```bash
node test-server.js
```

### Test from the App:

1. In your Mock API Service app, create a request:
   - **Method:** GET
   - **URL:** `http://localhost:8080`
   - Or create an environment variable: `LOCAL_API = http://localhost:8080`
   - Then use: `{{LOCAL_API}}`

2. Click **Send**

3. **Expected Result:**
   - Response should show: `{ "message": "Hello from local server!", ... }`
   - No CORS errors in console
   - Status: 200 OK

## Test 4: Test with Different Local Addresses

Test various local network scenarios:

```bash
# Test localhost
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:3000", "method": "GET"}' \
  https://api-mock.transtrack.id/api/proxy/request

# Test 127.0.0.1
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "http://127.0.0.1:3000", "method": "GET"}' \
  https://api-mock.transtrack.id/api/proxy/request

# Test local network IP (replace with your actual IP)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "http://192.168.1.100:8080", "method": "GET"}' \
  https://api-mock.transtrack.id/api/proxy/request

# Test with auth header
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://localhost:8080/api/protected",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer test-token"
    }
  }' \
  https://api-mock.transtrack.id/api/proxy/request
```

## Test 5: Verify Server Logs

Check your server logs (if accessible) for these messages:

```
[CORS Middleware] Granting Private Network Access permission for: https://api-mock.transtrack.id
[Proxy] Granting Private Network Access permission
[Proxy] URL substitution: { original: 'http://localhost:8080', resolved: 'http://localhost:8080' }
```

## Test 6: Browser Console Check

### Negative Test (Before PNA Fix):
```
Access to fetch at 'https://api-mock.transtrack.id/api/proxy/request' from origin 
'https://api-mock.transtrack.id' has been blocked by CORS policy: 
Request had no target IP address space, yet the resource is in the private address space.
```

### Positive Test (After PNA Fix):
- No CORS errors in console
- Request completes successfully
- Response data is displayed

## Test 7: Mobile/Other Device Testing

Test accessing your local API from a mobile device on the same network:

1. Find your computer's local IP:
   ```bash
   # macOS
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   
   # Linux
   ip addr show
   ```

2. Create a request in the app:
   - URL: `http://192.168.1.100:8080/api/test` (use your actual IP)

3. This tests cross-device local network access

## Debugging Checklist

If tests fail, check:

### Server-Side:
- [ ] Server has been rebuilt and restarted after code changes
- [ ] Files `server/middleware/cors.ts` and `server/api/proxy/request.post.ts` exist
- [ ] Server logs show `[CORS Middleware]` messages
- [ ] Nginx/Traefik (if used) isn't stripping headers

### Client-Side:
- [ ] Browser is up-to-date (Chrome 98+ has strict PNA)
- [ ] No browser extensions blocking requests
- [ ] DevTools shows OPTIONS request with PNA headers

### Network:
- [ ] Local server is actually running on the specified port
- [ ] Firewall isn't blocking the connection
- [ ] URL in request matches exactly (including http vs https)

## Quick Verification Script

Create `test-pna.sh`:

```bash
#!/bin/bash

echo "Testing PNA Implementation..."
echo ""

API_URL="https://api-mock.transtrack.id"

echo "1. Testing CORS preflight..."
curl -s -I -X OPTIONS \
  -H "Origin: $API_URL" \
  -H "Access-Control-Request-Method: POST" \
  "$API_URL/api/proxy/request" | grep -i "access-control"

echo ""
echo "2. Testing PNA preflight..."
curl -s -I -X OPTIONS \
  -H "Origin: $API_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Private-Network: true" \
  "$API_URL/api/proxy/request" | grep -i "access-control-allow-private-network"

echo ""
echo "3. Testing proxy request..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:9999", "method": "GET"}' \
  "$API_URL/api/proxy/request" | head -c 200

echo ""
echo ""
echo "Test complete!"
```

Run:
```bash
chmod +x test-pna.sh
./test-pna.sh
```

## Success Criteria

✅ **PASS** if:
- OPTIONS request returns `access-control-allow-private-network: true`
- POST request completes without CORS errors
- Can successfully proxy requests to localhost/127.0.0.1/192.168.x.x

❌ **FAIL** if:
- Browser shows CORS policy errors
- "Request had no target IP address space" error
- OPTIONS request missing PNA header
