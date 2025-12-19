interface Collection {
    id: string;
    name: string;
    description?: string;
    color: string;
    order: number;
    createdAt: string;
    updatedAt?: string;
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    if (!body.id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Collection ID is required'
        });
    }

    const storage = useStorage('collections');
    const existing = await storage.getItem(body.id) as Collection | null;

    if (!existing) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Collection not found'
        });
    }

    // Prevent renaming root collection
    if (existing.name === 'root' && body.name && body.name.toLowerCase() !== 'root') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Cannot rename the root collection'
        });
    }

    // If changing name, check for duplicates
    if (body.name && body.name.toLowerCase() !== existing.name.toLowerCase()) {
        const keys = await storage.getKeys();
        for (const key of keys) {
            if (key === body.id) continue;
            const other = await storage.getItem(key) as Collection;
            if (other && other.name.toLowerCase() === body.name.toLowerCase()) {
                throw createError({
                    statusCode: 409,
                    statusMessage: `Collection "${body.name}" already exists`
                });
            }
        }
    }

    const updatedCollection: Collection = {
        ...existing,
        name: body.name ?? existing.name,
        description: body.description ?? existing.description,
        color: body.color ?? existing.color,
        order: body.order ?? existing.order,
        updatedAt: new Date().toISOString()
    };

    await storage.setItem(body.id, updatedCollection);

    return updatedCollection;
});
