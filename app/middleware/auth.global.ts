export default defineNuxtRouteMiddleware(async (to, from) => {
    // Only check for admin routes and avoid checking on login page itself
    if (to.path.startsWith('/admin')) {
        // Check if running in desktop mode
        const isDesktopMode = typeof window !== 'undefined' && !!(window as any).__TAURI__;

        if (isDesktopMode) {
            // Desktop mode: check local auth token AND validate with server
            try {
                const { initLocalStore, getAuthToken, clearAuth } = await import('~/services/local-store');
                const { tauriFetch } = await import('~/services/tauri-api');

                // IMPORTANT: Initialize the store first
                await initLocalStore();

                const token = await getAuthToken();
                console.log('[AUTH] Desktop mode - token exists:', !!token);

                if (!token) {
                    console.log('[AUTH] No token, redirecting to login');
                    return navigateTo('/login');
                }

                // Validate token with server
                try {
                    const response = await tauriFetch<any>('/api/auth/check', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.success) {
                        console.log('[AUTH] Token validation failed, clearing auth and redirecting to login');
                        await clearAuth();
                        return navigateTo('/login');
                    }
                    console.log('[AUTH] Token validated successfully');
                } catch (e) {
                    console.error('[AUTH] Token validation error:', e);
                    await clearAuth();
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
