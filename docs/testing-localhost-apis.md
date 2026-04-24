# Testing Localhost APIs

## Overview

All requests are made directly from your browser to your API. This means your backend must have CORS enabled to allow requests from the app's origin (e.g., `https://postrack.transtrack.co`).

## Enabling CORS on Your Backend

Add CORS headers that allow the app's origin:

**Express.js:**
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://postrack.transtrack.co');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

**Flask:**
```python
from flask_cors import CORS
CORS(app, origins=["https://postrack.transtrack.co"])
```

**FastAPI:**
```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["https://postrack.transtrack.co"])
```

**Django:**
```python
# Add 'corsheaders' to INSTALLED_APPS
# Add 'corsheaders.middleware.CorsMiddleware' to MIDDLEWARE
CORS_ALLOWED_ORIGINS = ["https://postrack.transtrack.co"]
```

## Common Issues

| Error | Solution |
|-------|----------|
| `CORS Policy Blocked` | Enable CORS on your backend (see above) or use the "Allow CORS" browser extension |
| `Cannot connect` | Ensure your backend is running on the correct port |
| Chrome blocks request | Grant "Local Network Access" permission in Chrome settings |

## Chrome Private Network Access

Chrome may show a permission prompt for local network access when the app is hosted remotely and you target a localhost API. Granting this permission allows the browser to attempt the connection, but your backend still needs CORS headers set to the app's origin.

## Need Help?

If you're still having issues:
1. Check that your backend is actually running: `curl http://localhost:4000/health`
2. Confirm CORS is configured to allow `https://postrack.transtrack.co`
3. As a temporary workaround, install the "Allow CORS: Access-Control-Allow-Origin" browser extension
