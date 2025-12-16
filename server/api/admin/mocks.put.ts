export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    if (!body.id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing mock ID'
        });
    }

    const storage = useStorage('mocks');
    const existing = await storage.getItem(body.id);

    if (!existing) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Mock not found'
        });
    }

    const updatedMock = {
        ...existing,
        ...body,
        updatedAt: new Date().toISOString()
    };

    await storage.setItem(body.id, updatedMock);

    return updatedMock;
});
