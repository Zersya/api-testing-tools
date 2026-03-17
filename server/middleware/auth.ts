import jwt from 'jsonwebtoken';

export default defineEventHandler((event) => {
    const path = event.path;

    // Protect admin, shared-workspace, and feedback submit API routes
    // Note: /api/feedback/status is public and excluded
    if (path.startsWith('/api/admin') || 
        path.startsWith('/api/shared-workspace') || 
        (path.startsWith('/api/feedback') && !path.includes('/status'))) {
        const token = getCookie(event, 'auth_token');
        const config = useRuntimeConfig();

        if (!token) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, config.jwtSecret) as any;
        } catch (e) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid or expired token'
            });
        }

        event.context.user = {
            id: decoded.email || decoded.sub || decoded.id || 'unknown',
            email: decoded.email || 'unknown',
            workspaceId: decoded.workspaceId || 'personal',
            authMethod: decoded.authMethod || 'credentials',
            providerId: decoded.providerId || null
        };
    }
});
