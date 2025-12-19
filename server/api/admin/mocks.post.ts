import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    if (!body.path || !body.method || !body.status) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing required fields: path, method, status'
        });
    }

    const normalizedMethod = body.method.toUpperCase();
    const targetCollection = body.collection || 'root';
    const storage = useStorage('mocks');

    // Check for duplicates within the SAME collection only
    const keys = await storage.getKeys();
    for (const key of keys) {
        const mock: any = await storage.getItem(key);
        const mockCollection = mock?.collection || 'root';
        if (mock && mock.path === body.path && mock.method === normalizedMethod && mockCollection === targetCollection) {
            throw createError({
                statusCode: 409,
                statusMessage: `Mock with method ${normalizedMethod} and path ${body.path} already exists in collection "${targetCollection}"`
            });
        }
    }

    const id = uuidv4();
    const newMock = {
        id,
        collection: body.collection || 'root',
        path: body.path,
        method: normalizedMethod,
        status: body.status,
        response: body.response || {},
        delay: body.delay || 0,
        secure: body.secure || false,
        createdAt: new Date().toISOString()
    };

    await storage.setItem(id, newMock);

    return newMock;
});
