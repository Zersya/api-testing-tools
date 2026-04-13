import { useApiClient } from '~~/composables/useApiFetch';

export default defineNuxtRouteMiddleware(async (to, from) => {
    try {
        const api = useApiClient();
        const response = await api.get<{ isSuperAdmin: boolean }>('/api/admin/super/check');
        if (!response.isSuperAdmin) {
            return navigateTo('/');
        }
    } catch (e: any) {
        console.error('[Super Admin Middleware] Check failed:', e.message || e);
        return navigateTo('/');
    }
});