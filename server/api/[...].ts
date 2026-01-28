import { db, schema } from '../db';
import { eq, and, or, isNull } from 'drizzle-orm';

interface Collection {
    id: string;
    name: string;
}

export default defineEventHandler(async (event) => {
    const originalPath = event.path;
    const method = event.method;

    // Avoid intercepting admin API and auth routes
    if (originalPath.startsWith('/api/admin') || originalPath.startsWith('/api/auth')) {
        return;
    }

    // Determine if this is a collection-specific request
    // Pattern: /c/{collection-name}/{actual-path}
    let targetCollectionId: string | null = null;
    let targetPath = originalPath;

    const collectionPathMatch = originalPath.match(/^\/c\/([^/]+)(\/.*)?$/);

    if (collectionPathMatch) {
        const collectionName = collectionPathMatch[1];
        targetPath = collectionPathMatch[2] || '/';

        // Find collection by name from SQLite
        const collection = await db
            .select()
            .from(schema.collections)
            .where(eq(schema.collections.name, collectionName))
            .get();

        if (collection) {
            targetCollectionId = collection.id;
        }

        // If collection name not found, return 404
        if (!targetCollectionId) {
            throw createError({
                statusCode: 404,
                statusMessage: `Collection "${collectionName}" not found`
            });
        }
    } else {
        // No /c/ prefix - use root collection (null in database)
        targetCollectionId = null;
    }

    // Fetch all mocks from SQLite
    const mocks = await db.select().from(schema.mocks);

    // We iterate through all mocks to find a match
    for (const mock of mocks) {
        if (mock.method !== method) continue;

        // Check if mock belongs to the target collection
        // For root collection, collectionId should be null
        // For named collections, collectionId should match
        const mockCollectionId = mock.collectionId;
        if (targetCollectionId === null) {
            if (mockCollectionId !== null) continue;
        } else {
            if (mockCollectionId !== targetCollectionId) continue;
        }

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

                // Verify token from SQLite settings
                const setting = await db
                    .select()
                    .from(schema.settings)
                    .where(
                        and(
                            eq(schema.settings.key, 'bearerToken'),
                            isNull(schema.settings.workspaceId)
                        )
                    )
                    .get();

                if (setting?.value) {
                    const token = authHeader.split(' ')[1];
                    if (token !== setting.value) {
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
