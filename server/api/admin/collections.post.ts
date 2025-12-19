import { v4 as uuidv4 } from 'uuid';

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

    if (!body.name) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Collection name is required'
        });
    }

    // Prevent creating another "root" collection
    if (body.name.toLowerCase() === 'root') {
        throw createError({
            statusCode: 409,
            statusMessage: 'Cannot create a collection named "root" - it is reserved'
        });
    }

    const storage = useStorage('collections');

    // Check for duplicate names
    const keys = await storage.getKeys();
    for (const key of keys) {
        const existing = await storage.getItem(key) as Collection;
        if (existing && existing.name.toLowerCase() === body.name.toLowerCase()) {
            throw createError({
                statusCode: 409,
                statusMessage: `Collection "${body.name}" already exists`
            });
        }
    }

    // Get the highest order for new collection
    let maxOrder = 0;
    for (const key of keys) {
        const existing = await storage.getItem(key) as Collection;
        if (existing && existing.order > maxOrder) {
            maxOrder = existing.order;
        }
    }

    const id = uuidv4();
    const newCollection: Collection = {
        id,
        name: body.name,
        description: body.description || '',
        color: body.color || '#6366f1',
        order: body.order ?? maxOrder + 1,
        createdAt: new Date().toISOString()
    };

    await storage.setItem(id, newCollection);

    return newCollection;
});
