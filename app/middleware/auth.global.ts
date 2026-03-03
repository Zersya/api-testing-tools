import { useApiClient } from '~~/composables/useApiFetch';

export default defineNuxtRouteMiddleware(async (to, from) => {
    // Check for admin routes and shared-workspace routes
    if (to.path.startsWith('/admin') || to.path.startsWith('/shared-workspace')) {
        try {
            // Use the API client which throws on error
            const api = useApiClient();
            const response = await api.get('/api/auth/check');
            console.log('[Auth Middleware] Auth check response:', response);
        } catch (e: any) {
            console.error('[Auth Middleware] Auth check failed:', e.message || e);
            console.error('[Auth Middleware] Current path:', to.path);
            // Preserve the current path as redirect URL
            const returnUrl = encodeURIComponent(to.fullPath);
            return navigateTo(`/login?redirect=${returnUrl}`);
        }
    }
});
