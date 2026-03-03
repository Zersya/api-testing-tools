import jwt from 'jsonwebtoken';
import { storeUserMapping } from '../../utils/userMapping';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { email, password } = body;
    const config = useRuntimeConfig();

    if (email === config.adminEmail && password === config.adminPassword) {
        // Generate JWT - use email as sub for consistency
        const token = jwt.sign({ sub: email, email }, config.jwtSecret, { expiresIn: '24h' });

        // Store user mapping for Super Admin lookups
        storeUserMapping(email, email);

        // Set secure cookie - sameSite: 'none' for Tauri app cross-origin support
        setCookie(event, 'auth_token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 60 * 60 * 24 // 1 day
        });

        return { success: true };
    }

    throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials'
    });
});
