import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { resourceName, basePath } = body;

    if (!resourceName || !basePath) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing resourceName or basePath'
        });
    }

    const storage = useStorage('mocks');
    const createdMocks = [];

    // Helper to create mock
    const createMock = async (method: string, path: string, status: number, response: any) => {
        const id = uuidv4();
        const mock = {
            id,
            path,
            method,
            status,
            response,
            delay: 0,
            createdAt: new Date().toISOString()
        };
        await storage.setItem(id, mock);
        createdMocks.push(mock);
    };

    // 1. GET /api/resource (List)
    await createMock('GET', basePath, 200, [
        { id: 1, name: `${resourceName} 1` },
        { id: 2, name: `${resourceName} 2` }
    ]);

    // 2. GET /api/resource/:id (Get One)
    await createMock('GET', `${basePath}/:id`, 200, {
        id: 1,
        name: `${resourceName} 1`,
        details: 'Detailed info'
    });

    // 3. POST /api/resource (Create)
    await createMock('POST', basePath, 201, {
        id: 3,
        name: `New ${resourceName}`,
        createdAt: new Date().toISOString()
    });

    // 4. PUT /api/resource/:id (Update)
    await createMock('PUT', `${basePath}/:id`, 200, {
        id: 1,
        name: `Updated ${resourceName}`,
        updatedAt: new Date().toISOString()
    });

    // 5. DELETE /api/resource/:id (Delete)
    await createMock('DELETE', `${basePath}/:id`, 204, {});

    return {
        success: true,
        created: createdMocks.length,
        mocks: createdMocks
    };
});
