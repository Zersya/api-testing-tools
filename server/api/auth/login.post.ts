import jwt from 'jsonwebtoken';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { email, password } = body;
    const config = useRuntimeConfig();

    if (email === config.adminEmail && password === config.adminPassword) {
        // Generate JWT
        const token = jwt.sign({ email }, config.jwtSecret, { expiresIn: '24h' });

        // Set secure cookie
        setCookie(event, 'auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return { success: true };
    }

    throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
    });
});
