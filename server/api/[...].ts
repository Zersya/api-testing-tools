interface Mock {
    id: string;
    path: string;
    method: string;
    status: number;
    response: any;
    delay: number;
    secure?: boolean;
    createdAt: string;
}

export default defineEventHandler(async (event) => {
    const path = event.path;
    const method = event.method;

    // Avoid intercepting admin API
    if (path.startsWith('/api/admin')) {
        return;
    }

    const storage = useStorage('mocks');
    const keys = await storage.getKeys();

    // We iterate through all mocks to find a match
    for (const key of keys) {
        const mock = await storage.getItem(key) as Mock;

        if (!mock || mock.method !== method) continue;

        // Convert mock path (e.g. /api/users/:id) to regex
        // Escape special regex chars except :
        const regexPath = mock.path
            .replace(/:[^\s/]+/g, '([^/]+)') // Replace :param with capture group
            .replace(/\//g, '\\/'); // Escape slashes

        const regex = new RegExp(`^${regexPath}$`);

        if (regex.test(path)) {
            if (mock.secure) {
                const authHeader = getHeader(event, 'authorization');
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    setResponseStatus(event, 401);
                    return { error: 'Unauthorized: Bearer token missing' };
                }

                // Verify token if configured
                const settings = await useStorage('settings').getItem('global') as any;
                if (settings && settings.bearerToken) {
                    const token = authHeader.split(' ')[1];
                    if (token !== settings.bearerToken) {
                        setResponseStatus(event, 403);
                        return { error: 'Forbidden: Invalid token' };
                    }
                }
            }

            if (mock.delay > 0) {
                await new Promise(resolve => setTimeout(resolve, mock.delay));
            }

            setResponseStatus(event, mock.status);
            return mock.response;
        }
    }

    // If no mock matched, returns void so Nitro can handle 404 or other routes
    // But since this is a catch-all in `api/[...]`, it might be the final handler for `/api/*`
    // If we return nothing, Nitro might return 404 naturally.
    // Ideally, if we are simulating a specific API, we should 404 here if not found.

    // However, we want to allow other defined API routes to work if they exist.
    // Since `[...]` has lower priority than specific routes, if execution reaches here,
    // it means no specific route matched.

    throw createError({
        statusCode: 404,
        statusMessage: 'Mock not found'
    });
});
