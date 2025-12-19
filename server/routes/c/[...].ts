
interface Mock {
    id: string;
    collection: string;
    path: string;
    method: string;
    status: number;
    response: any;
    delay: number;
    secure?: boolean;
    createdAt: string;
}

interface Collection {
    id: string;
    name: string;
}

export default defineEventHandler(async (event) => {
    const originalPath = event.path;
    const method = event.method;

    const mocksStorage = useStorage('mocks');
    const collectionsStorage = useStorage('collections');

    // Determine if this is a collection-specific request
    // Pattern: /c/{collection-name}/{actual-path}
    let targetCollectionId: string | null = null;
    let targetPath = originalPath;

    const collectionPathMatch = originalPath.match(/^\/c\/([^/]+)(\/.*)?$/);

    if (collectionPathMatch) {
        const collectionName = collectionPathMatch[1];
        targetPath = collectionPathMatch[2] || '/';

        // Find collection by name
        const collectionKeys = await collectionsStorage.getKeys();
        for (const key of collectionKeys) {
            const collection = await collectionsStorage.getItem(key) as Collection;
            if (collection && collection.name === collectionName) {
                targetCollectionId = collection.id;
                break;
            }
        }

        // If collection name not found, return 404
        if (!targetCollectionId) {
            throw createError({
                statusCode: 404,
                statusMessage: `Collection "${collectionName}" not found`
            });
        }
    } else {
        // This shouldn't happen given the route location, but fallback safely
        throw createError({
            statusCode: 404,
            statusMessage: 'Invalid collection route'
        });
    }

    const mockKeys = await mocksStorage.getKeys();

    // We iterate through all mocks to find a match
    for (const key of mockKeys) {
        const mock = await mocksStorage.getItem(key) as Mock;

        if (!mock || mock.method !== method) continue;

        const mockCollection = mock.collection || 'root';

        // Check if mock belongs to the target collection
        if (mockCollection !== targetCollectionId) continue;

        // Convert mock path (e.g. /api/users/:id) to regex
        // Escape special regex chars except :
        const regexPath = mock.path
            .replace(/:[^\s/]+/g, '([^/]+)') // Replace :param with capture group
            .replace(/\//g, '\\/'); // Escape slashes

        const regex = new RegExp(`^${regexPath}$`);

        if (regex.test(targetPath)) {
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

    throw createError({
        statusCode: 404,
        statusMessage: 'Mock not found'
    });
});
