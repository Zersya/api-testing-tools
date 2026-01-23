export default defineNuxtRouteMiddleware(async (to, from) => {
    // Only check for admin routes and avoid checking on login page itself
    if (to.path.startsWith('/admin')) {
        // Check if running in desktop mode
        const isDesktopMode = typeof window !== 'undefined' && !!(window as any).__TAURI__;
        
        if (isDesktopMode) {
            // Desktop mode: check local auth token
            try {
                const { getAuthToken } = await import('~/services/local-store');
                const token = await getAuthToken();
                if (!token) {
                    return navigateTo('/login');
                }
            } catch (e) {
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
