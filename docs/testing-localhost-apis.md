# Testing Localhost APIs

## Overview

When testing your local backend API (e.g., `http://127.0.0.1:4000`), the app provides two request routing modes:

| Mode | How it works | When to use |
|------|--------------|-------------|
| **Direct** (default) | Browser fetches directly from your machine | Your backend has CORS enabled |
| **Proxy** | Routes through server to your machine | Your backend lacks CORS headers |

## Using the Proxy Toggle

Next to the **Send** button, you'll see a toggle:

- **Direct** (gray) → Browser makes direct requests
- **Proxy** (purple) → Routes through server proxy

Click the button to switch modes. Your preference is saved.

### Quick Decision Tree

```
Is your URL localhost/private IP?
    ↓
    YES → Does your backend have CORS enabled?
              ↓
              YES → Use Direct mode (default)
              ↓
              NO  → Click Proxy button (bypasses CORS)
    ↓
    NO (remote URL) → Always uses Proxy (automatic)
```

## Enabling CORS on Your Backend

If you want to use **Direct mode** (faster, no server hop), enable CORS:

**Flask:**
```python
from flask_cors import CORS
CORS(app)
```

**Express:**
```javascript
const cors = require('cors');
app.use(cors());
```

**FastAPI:**
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"])
```

## Common Issues

| Error | Solution |
|-------|----------|
| `CORS Policy Blocked` | Enable CORS on backend **or** click Proxy button |
| `Cannot connect` | Ensure backend is running on the correct port |
| Chrome blocks request | Grant "Local Network Access" permission in Chrome settings |

## Technical Details

### What URLs are treated as "local"?

The app detects these as local URLs (uses Direct mode by default):
- `localhost`, `127.0.0.1`, `127.x.x.x`
- `10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`
- `[::1]`, `[fc00::1]`, `[fe80::1]` (IPv6)
- `.local`, `.localhost` domains
- Template variables: `{{URL}}/api`, `{{BASE_URL}}/api`

All other URLs (e.g., `https://api.example.com`) automatically use Proxy mode.

### Chrome Private Network Access

Chrome 138+ may show a permission prompt for local network access. Granting this permission allows the browser to attempt the connection, but your backend still needs CORS headers (or use Proxy mode).

## Need Help?

If you're still having issues:
1. Check that your backend is actually running: `curl http://localhost:4000/health`
2. Try Proxy mode first (no backend changes needed)
3. If Proxy works but Direct doesn't, your backend needs CORS enabled
