export default defineNuxtRouteMiddleware(async (to, from) => {
    // Check for admin routes and shared-workspace routes
    if (to.path.startsWith('/admin') || to.path.startsWith('/shared-workspace')) {
        try {
            // We use useRequestFetch to pass cookies correctly in SSR/Client
            const response = await useRequestFetch()('/api/auth/check');
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
