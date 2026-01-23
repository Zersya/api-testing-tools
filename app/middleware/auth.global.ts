export default defineNuxtRouteMiddleware(async (to, from) => {
    // Only check for admin routes and avoid checking on login page itself
    if (to.path.startsWith('/admin')) {
        // Check if running in desktop mode
        const isDesktopMode = typeof window !== 'undefined' && !!(window as any).__TAURI__;

        if (isDesktopMode) {
            // Desktop mode: check local auth token
            try {
                const { initLocalStore, getAuthToken } = await import('~/services/local-store');

                // IMPORTANT: Initialize the store first
                await initLocalStore();

                const token = await getAuthToken();
                console.log('[AUTH] Desktop mode - token exists:', !!token);

                if (!token) {
                    console.log('[AUTH] No token, redirecting to login');
                    return navigateTo('/login');
                }
            } catch (e) {
                console.error('[AUTH] Error checking auth:', e);
                return navigateTo('/login');
            }
        } else {
            // Web mode: check server auth
            try {
                await useRequestFetch()('/api/auth/check');
            } catch (e) {
                return navigateTo('/login');
            }
        }
    }
});
