import jwt from 'jsonwebtoken';

export default defineEventHandler((event) => {
    const path = event.path;

    // Only protect /api/admin routes, but exclude login endpoint if it were under admin (it's not)
    if (path.startsWith('/api/admin')) {
        // Try to get token from cookie first (web mode), then from Authorization header (Tauri mode)
        let token = getCookie(event, 'auth_token');

        // If no cookie, check Authorization header (for Tauri desktop app)
        if (!token) {
            const authHeader = getHeader(event, 'authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        const config = useRuntimeConfig();

        if (!token) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }

        try {
            jwt.verify(token, config.jwtSecret);
        } catch (e) {
            throw createError({
                statusCode: 401,
                statusMessage: 'Invalid or expired token'
            });
        }
    }
});
