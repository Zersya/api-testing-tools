export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    const id = query.id as string;

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing mock ID'
        });
    }

    const storage = useStorage('mocks');

    if (!(await storage.hasItem(id))) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Mock not found'
        });
    }

    await storage.removeItem(id);

    return { success: true };
});
