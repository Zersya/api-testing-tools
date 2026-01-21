import jwt from 'jsonwebtoken';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { email, password } = body;
    const config = useRuntimeConfig();

    if (email === config.adminEmail && password === config.adminPassword) {
        const token = jwt.sign({ email }, config.jwtSecret, { expiresIn: '24h' });

        setCookie(event, 'auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24
        });

        return {
            success: true,
            token,
            user: {
                id: 'admin',
                email,
                name: 'Administrator',
                workspaceId: 'default'
            }
        };
    }

    throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
    });
});
