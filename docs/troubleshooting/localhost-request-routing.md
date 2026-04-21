# Localhost Request Routing: Issue & Fix

## Problem

When backend developers tried to test their local APIs (e.g., `http://127.0.0.1:4000/api/health`) from the deployed web app, requests failed with connection errors or CORS blocks.

### Root Cause

The app was routing **all requests** (including localhost URLs) through the **server proxy**:

```
Browser → Nuxt Server (proxy) → Your Local Backend
```

This architecture has a fundamental problem:

**The Nuxt server runs on a different machine than the user's browser.** When a user accesses the deployed app and tries to reach `127.0.0.1:4000`, the request goes to the Nuxt server's own localhost — not the user's local machine.

```
┌─────────────────────────────────────────────────────────────┐
│                    BEFORE (BROKEN)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User's Browser (your computer)                              │
│       ↓                                                      │
│  Request to: http://127.0.0.1:4000/api/health               │
│       ↓                                                      │
│  Nuxt Server (deployed on cloud)                             │
│       ↓  Tries to connect to ITS OWN localhost              │
│       ↓  (NOT your computer's localhost!)                   │
│       ↓                                                      │
│  ❌ Connection refused — no server running on Nuxt's 127.0.0.1 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Why CORS Wasn't the Main Issue

Initially, the error appeared to be a CORS issue. However, the actual problem was:

1. **CORS** = Browser security preventing cross-origin requests
2. **Localhost routing** = Server proxy trying to reach its own localhost instead of the user's

Even if CORS was enabled on the user's backend, the request would still fail because the Nuxt server was connecting to the wrong `127.0.0.1`.

---

## Solution

Route localhost/private network requests **directly from the browser** to the user's local machine, bypassing the server proxy entirely.

### How It Works Now

```
┌─────────────────────────────────────────────────────────────┐
│                    AFTER (FIXED)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User's Browser (your computer)                              │
│       ↓                                                      │
│  Detects: http://127.0.0.1:4000 is a local URL              │
│       ↓                                                      │
│  Direct fetch from browser → Your Local Backend             │
│       ↓                                                      │
│  ✅ Success — reaches your actual localhost                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Request Routing Logic

```
URL → isLocalUrl() → Is it localhost/private IP?
     ↓
   YES → Check "Use Server Proxy" toggle
     ↓
   Toggle OFF (default) → Direct browser fetch → Your local API
                          (requires CORS on your backend)
     ↓
   Toggle ON → Server proxy → Your local API
               (bypasses CORS, works without backend changes)
     ↓
   NO (remote URL) → Server proxy → Remote API (api.example.com)
```

### What isLocalUrl() Detects

| Category | Examples | Detected? |
|----------|----------|-----------|
| **Localhost** | `localhost`, `127.0.0.1`, `127.x.x.x` | ✅ Yes |
| **IPv6 localhost** | `[::1]` | ✅ Yes |
| **Private IPs** | `10.x.x.x`, `192.168.x.x`, `172.16-31.x.x` | ✅ Yes |
| **IPv6 private** | `[fc00::1]`, `[fd00::1]`, `[fe80::1]` | ✅ Yes |
| **Local domains** | `myserver.local`, `api.localhost` | ✅ Yes |
| **Template variables** | `{{URL}}/api`, `{{BASE_URL}}/api` | ✅ Yes (tentative) |
| **Production URLs** | `https://api.example.com` | ❌ No |
| **Generic template vars** | `{{API_URL}}/api`, `{{SERVER_URL}}/api` | ❌ No (uses proxy) |

---

## For Backend Developers

### Option 1: Enable CORS on Your Backend (Recommended)

**Flask (Python):**
```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enables CORS for all routes

# Or with specific options:
# CORS(app, origins=["http://localhost:3000", "https://yourapp.com"])
```

**Express.js (Node):**
```javascript
const cors = require('cors');
app.use(cors());

// Or manual:
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

**FastAPI (Python):**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specific origins
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Django:**
```python
# settings.py
INSTALLED_APPS = [
    'corsheaders',
    # ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ...
]

CORS_ALLOW_ALL_ORIGINS = True
```

### Option 2: Use the Proxy Toggle

If you cannot modify your backend's CORS settings:

1. Click the **"Direct"** button next to Send (it will change to **"Proxy"**)
2. The button turns purple when proxy mode is active
3. All requests now route through the server, bypassing CORS entirely

### Option 3: Browser CORS Extension

Install a CORS browser extension for development:
- Chrome: [Allow CORS: Access-Control-Allow-Origin](https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf)
- Firefox: [CORS Everywhere](https://addons.mozilla.org/en-US/firefox/addon/cors-everywhere/)

---

## Chrome Private Network Access (PNA)

Modern Chrome versions (138+) have an additional security layer called **Private Network Access** that requires explicit permission for websites to access local networks.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│              Chrome's Two-Layer Security                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Private Network Access (PNA) Permission           │
│  └─ Controls IF browser can attempt to reach local IPs      │
│  └─ User grants permission via popup                        │
│  └─ Purpose: Prevent CSRF attacks on routers/printers        │
│                                                              │
│  Layer 2: CORS (Cross-Origin Resource Sharing)              │
│  └─ Controls IF the server accepts the request              │
│  └─ Server must send: Access-Control-Allow-Origin           │
│  └─ Purpose: Prevent unauthorized cross-origin data access  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Important**: Granting PNA permission does NOT bypass CORS. Both layers must allow the request.

### If Chrome Blocks Local Network Access

1. Click the lock/settings icon in the address bar
2. Go to **Site Settings** → **Local Network Access**
3. Set to **Allow**
4. Or visit `chrome://settings/content/localNetwork` for site-specific permissions

---

## Technical Changes

### Files Modified

| File | Change |
|------|--------|
| `app/components/RequestBuilder.vue` | Added proxy toggle UI, improved error messages |
| `app/composables/useClientRequest.ts` | Fixed template variable detection, IPv6 support |
| `server/api/proxy/request.post.ts` | Better connection error handling |
| `server/plugins/cors.ts` | **Deleted** — was broken and unnecessary |
| `tests/isLocalUrl.test.js` | **New** — 17 unit tests for URL detection |

### Key Code Changes

**Request routing decision** (`RequestBuilder.vue`):
```typescript
// Before: Always used server proxy
const isLocalRequest = false;

// After: Routes locally by default, respects proxy toggle
const isLocalRequest = isResolvedLocalhost && !useServerProxy.value;
```

**Template variable detection** (`useClientRequest.ts`):
```typescript
// Before: {{API_URL}} incorrectly matched because it contains "URL"
const hasLocalHint = localHintNames.some(name => varName.includes(name));

// After: Only exact matches trigger local routing
const hasLocalHint = localHintNames.includes(varName);
```

**IPv6 support** (`useClientRequest.ts`):
```typescript
// Strip brackets for IPv6 addresses (e.g., [fc00::1] -> fc00::1)
const ipv6Host = hostname.replace(/^\[|\]$/g, '');

// fc00::/7 (Unique Local Addresses)
if (ipv6Host.startsWith('fc') || ipv6Host.startsWith('fd')) return true;
```

---

## Testing

Run unit tests:
```bash
node tests/isLocalUrl.test.js
```

Expected output:
```
✓ should detect localhost
✓ should detect 127.0.0.1
✓ should detect 127.x.x.x loopback range
✓ should detect IPv6 localhost
✓ should detect .local domains
✓ should detect .localhost domains
✓ should detect 10.x.x.x private range
✓ should detect 172.16-31.x.x private range
✓ should detect 192.168.x.x private range
✓ should detect IPv6 unique local addresses (fc00::/7)
✓ should detect IPv6 link-local addresses (fe80::/10)
✓ should NOT detect public URLs
✓ should handle template variables with local hints
✓ should NOT handle template variables without local hints
✓ should handle URL-encoded template variables
✓ should handle invalid URLs gracefully
✓ should be case-insensitive for hostnames

Tests: 17 total, 17 passed, 0 failed
```

---

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Cannot connect to local server` | Backend not running | Start your backend server |
| `CORS Policy Blocked` | Backend missing CORS headers | Enable CORS (see examples above) |
| `Error: aborted` | Chrome PNA blocking | Grant Local Network permission |
| Request goes to wrong server | Proxy mode enabled | Click "Proxy" button to switch to "Direct" |
| Template variable not resolving | Variable not in environment | Check environment variables panel |

---

## Notes

- **Nuxt cache**: After deploying this change, restart your dev server (`npm run dev`) to clear the `.nuxt/` cache
- **Proxy toggle persists**: The Direct/Proxy setting is saved in localStorage per user
- **Remote URLs always use proxy**: URLs like `https://api.example.com` always route through the server, regardless of toggle state
