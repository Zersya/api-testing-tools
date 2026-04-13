import jwt from 'jsonwebtoken';
import { isSuperAdmin } from '../utils/permissions';

export default defineEventHandler((event) => {
    const path = event.path;

    const isApiRoute = path.startsWith('/api/admin') || 
                       path.startsWith('/api/shared-workspace') || 
                       (path.startsWith('/api/feedback') && !path.includes('/status'));
    const isProtectedPage = path.startsWith('/admin/sso');

    // Protect admin, shared-workspace, and feedback submit API routes
    // Also protect specific admin pages that require server-side guards (e.g. /admin/sso)
    if (isApiRoute || isProtectedPage) {
        const token = getCookie(event, 'auth_token');
        const config = useRuntimeConfig();

        if (!token) {
            if (isProtectedPage) return sendRedirect(event, '/login');
            throw createError({
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, config.jwtSecret) as any;
        } catch (e) {
            if (isProtectedPage) return sendRedirect(event, '/login');
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

        if (path.startsWith('/admin/sso') || path.startsWith('/api/admin/sso')) {
            if (!isSuperAdmin(event.context.user.email)) {
                if (isProtectedPage) return sendRedirect(event, '/');
                throw createError({
                    statusCode: 403,
                    statusMessage: 'Forbidden: Super Admin access required'
                });
            }
        }
    }
});
