# Troubleshooting: PNA Headers Not Showing in Production

## If PNA headers still don't appear after deployment:

### Check 1: Verify Headers in Server Response

SSH into your server and test locally:
```bash
curl -I -X POST \
  -H "Origin: https://api-mock.transtrack.id" \
  http://localhost:3000/api/proxy/request
```

If you see `access-control-allow-private-network: true` here but NOT from the public URL, **Traefik is stripping headers**.

### Check 2: Fix Traefik Configuration

Add custom headers middleware to your `docker-compose.yml`:

```yaml
labels:
  # ... existing labels ...
  
  # Add custom headers middleware for PNA
  - "traefik.http.middlewares.pna-headers.headers.customresponseheaders.Access-Control-Allow-Private-Network=true"
  - "traefik.http.middlewares.pna-headers.headers.customresponseheaders.Access-Control-Allow-Origin=https://api-mock.transtrack.id"
  - "traefik.http.middlewares.pna-headers.headers.customresponseheaders.Access-Control-Allow-Credentials=true"
  
  # Apply middleware to router
  - "traefik.http.routers.${IMAGE_NAME}-${APP_ENV}-secure.middlewares=pna-headers"
```

### Check 3: Alternative - Add Headers in Nginx (if using nginx)

If using `docker-compose.deployment.nginx.yml`, add to your nginx config:

```nginx
location /api/proxy {
    proxy_pass http://app:3000;
    
    # Add PNA headers
    add_header Access-Control-Allow-Private-Network true always;
    add_header Access-Control-Allow-Origin $http_origin always;
    
    # Handle preflight
    if ($request_method = OPTIONS) {
        add_header Access-Control-Allow-Private-Network true;
        add_header Access-Control-Allow-Origin $http_origin;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        return 200;
    }
}
```

### Check 4: Debug with Server Logs

Check if the middleware is running:
```bash
docker logs <container-name> | grep "PNA"
```

You should see:
```
[CORS Middleware] Granting PNA permission for proxy endpoint: https://api-mock.transtrack.id
[Proxy] PNA header set for proxy request to local network
```

### Check 5: Browser-Side Verification

If headers are present but requests still fail:

1. **Chrome must be up-to-date** (PNA fully enforced in Chrome 98+)
2. **Clear cache** and try again
3. **Check for mixed content** (https → http might be blocked)

Test in browser console:
```javascript
fetch('/api/proxy/request', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    url: 'http://localhost:8080',
    method: 'GET',
    workspaceId: 'your-workspace-id'
  })
}).then(r => console.log('Status:', r.status))
```

## Quick Fix: Force Headers at Reverse Proxy

If Nitro/Nuxt isn't adding headers properly, force them in Traefik:

**Update `docker-compose.yml`:**
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.api-mock.rule=Host(`api-mock.transtrack.id`)"
  - "traefik.http.routers.api-mock.entrypoints=https"
  - "traefik.http.routers.api-mock.tls=true"
  
  # Add middleware for PNA headers
  - "traefik.http.middlewares.pna.headers.accesscontrolallowprivatenetwork=true"
  - "traefik.http.middlewares.pna.headers.accesscontrolalloworiginlist=https://api-mock.transtrack.id"
  - "traefik.http.middlewares.pna.headers.accesscontrolallowcredentials=true"
  - "traefik.http.middlewares.pna.headers.accesscontrolallowmethods=GET,POST,PUT,DELETE,OPTIONS"
  - "traefik.http.middlewares.pna.headers.accesscontrolallowheaders=Content-Type,Authorization"
  
  # Apply middleware
  - "traefik.http.routers.api-mock.middlewares=pna"
```

Then restart:
```bash
docker-compose up -d
```

## Last Resort: Chrome Flags

If nothing works, backend engineers can temporarily disable PNA in Chrome:

1. Open `chrome://flags/#block-insecure-private-network-requests`
2. Set to **"Disabled"**
3. Restart Chrome

This bypasses PNA entirely while you debug the server headers.

## Need Help?

Share these details:
1. `curl -I` output from the server
2. Browser DevTools screenshot of response headers
3. Docker logs showing `[CORS Middleware]` messages
