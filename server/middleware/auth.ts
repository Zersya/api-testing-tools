import jwt from 'jsonwebtoken';

export default defineEventHandler((event) => {
    const path = event.path;

    // Only protect /api/admin routes, but exclude login endpoint if it were under admin (it's not)
    if (path.startsWith('/api/admin')) {
        const token = getCookie(event, 'auth_token');
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
