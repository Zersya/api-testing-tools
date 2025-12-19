export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    if (!body.id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing mock ID'
        });
    }

    const storage = useStorage('mocks');
    const existing = await storage.getItem(body.id) as any;

    if (!existing) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Mock not found'
        });
    }

    const normalizedMethod = (body.method || existing.method).toUpperCase();
    const newPath = body.path || existing.path;
    const targetCollection = body.collection ?? existing.collection ?? 'root';

    // Check for duplicates within the SAME collection only (excluding current ID)
    const keys = await storage.getKeys();
    for (const key of keys) {
        if (key === body.id) continue; // Skip self
        const mock: any = await storage.getItem(key);
        const mockCollection = mock?.collection || 'root';
        if (mock && mock.path === newPath && mock.method === normalizedMethod && mockCollection === targetCollection) {
            throw createError({
                statusCode: 409,
                statusMessage: `Mock with method ${normalizedMethod} and path ${newPath} already exists in collection "${targetCollection}"`
            });
        }
    }

    const updatedMock = {
        ...existing,
        ...body,
        collection: body.collection ?? existing.collection ?? 'root',
        method: normalizedMethod, /* Ensure method is normalized if updated */
        updatedAt: new Date().toISOString()
    };

    await storage.setItem(body.id, updatedMock);

    return updatedMock;
});
