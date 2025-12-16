export default defineNuxtRouteMiddleware(async (to, from) => {
    // Only check for admin routes and avoid checking on login page itself
    if (to.path.startsWith('/admin')) {
        try {
            // We use useRequestFetch to pass cookies correctly in SSR/Client
            await useRequestFetch()('/api/auth/check');
        } catch (e) {
            return navigateTo('/login');
        }
    }
});
