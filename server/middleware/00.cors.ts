/**
 * CORS Middleware with Private Network Access (PNA) Support
 * 
 * This middleware handles:
 * 1. CORS preflight requests (OPTIONS)
 * 2. Private Network Access preflight requests
 * 3. Adds appropriate headers for cross-origin requests
 * 
 * PNA is a browser security feature that blocks public websites from accessing
 * local network addresses (localhost, 192.168.x.x, 10.x.x.x, etc.) unless
 * explicitly allowed via the Access-Control-Allow-Private-Network header.
 * 
 * IMPORTANT: This file is named '00.cors.ts' to ensure it runs FIRST
 * before any other middleware (alphabetical order in Nitro)
 */

export default defineEventHandler((event) => {
    const method = event.method;
    const path = event.path;
    const headers = getRequestHeaders(event);

    // Define allowed origins - adjust based on your deployment
    const allowedOrigins = [
        'https://api-mock.transtrack.id',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        // Allow any origin in development
        ...(process.env.NODE_ENV === 'development' ? ['*'] : [])
    ];

    const origin = headers.origin || headers.Origin;
    
    // Check if origin is allowed
    const isAllowedOrigin = allowedOrigins.includes('*') || 
                           allowedOrigins.includes(origin) || 
                           !origin; // Allow requests without origin (same-origin)

    // Set CORS headers for all responses
    if (isAllowedOrigin && origin) {
        setResponseHeader(event, 'Access-Control-Allow-Origin', origin);
    } else if (allowedOrigins.includes('*')) {
        setResponseHeader(event, 'Access-Control-Allow-Origin', '*');
    }

    // Always set these CORS headers
    setResponseHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    setResponseHeader(event, 'Access-Control-Allow-Credentials', 'true');
    setResponseHeader(event, 'Access-Control-Max-Age', '86400'); // 24 hours

    // IMPORTANT: Always grant Private Network Access permission for proxy endpoint
    // This allows the browser to send requests to localhost/127.0.0.1/192.168.x.x
    if (path.includes('/api/proxy')) {
        setResponseHeader(event, 'Access-Control-Allow-Private-Network', 'true');
        console.log('[CORS Middleware] Granting PNA permission for proxy endpoint:', origin);
    }

    // Handle Private Network Access (PNA) preflight
    // Chrome sends a preflight request with Access-Control-Request-Private-Network: true
    // when a public website tries to access a local network resource
    const isPrivateNetworkRequest = headers['access-control-request-private-network'] === 'true';
    
    if (isPrivateNetworkRequest) {
        // Grant permission for private network access
        setResponseHeader(event, 'Access-Control-Allow-Private-Network', 'true');
        console.log('[CORS Middleware] Granting Private Network Access permission for:', origin);
    }

    // Handle preflight OPTIONS requests - MUST return early before auth checks!
    if (method === 'OPTIONS') {
        // If this is a PNA preflight or API request, we need to return 200 with the headers
        // The browser will then proceed with the actual request
        if (isPrivateNetworkRequest || path.startsWith('/api/')) {
            console.log('[CORS Middleware] Handling OPTIONS preflight for:', path);
            setResponseStatus(event, 200);
            return '';
        }
    }

    // Log PNA requests for debugging
    if (path.includes('/api/proxy') && origin) {
        console.log('[CORS Middleware] Proxy request from origin:', origin);
    }
});
