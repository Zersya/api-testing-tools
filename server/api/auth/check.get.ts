import jwt from 'jsonwebtoken';

export default defineEventHandler((event) => {
    // This endpoint is just for checking auth status.
    // The server middleware 'auth.ts' already protects /api/admin/*
    // But we might want a dedicated check that explicitly returns 200 or 401
    // independent of the general admin middleware if we place it outside /api/admin

    // Actually, let's put it in /api/auth/check to avoid the admin middleware 
    // blocking it if we want to handle it manually (though admin middleware only blocks /api/admin)

    // But wait, we WANT to check if the cookie is valid.

    const token = getCookie(event, 'auth_token');
    const config = useRuntimeConfig();

    if (!token) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized'
        });
    }

    // Verify token
    try {
        jwt.verify(token, config.jwtSecret);
    } catch (e) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Invalid token'
        });
    }

    return { status: 'logged_in', storageDriver: process.env.REDIS_URL ? 'redis' : 'fs' };
});
