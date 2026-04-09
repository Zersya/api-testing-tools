export default defineNuxtRouteMiddleware(async (to, from) => {
    try {
        const response = await useRequestFetch()<{ isSuperAdmin: boolean }>('/api/admin/super/check');
        if (!response.isSuperAdmin) {
            return navigateTo('/');
        }
    } catch (e: any) {
        console.error('[Super Admin Middleware] Check failed:', e.message || e);
        return navigateTo('/');
    }
});