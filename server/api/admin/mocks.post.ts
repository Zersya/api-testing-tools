import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    if (!body.path || !body.method || !body.status) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing required fields: path, method, status'
        });
    }

    const id = uuidv4();
    const newMock = {
        id,
        path: body.path,
        method: body.method.toUpperCase(),
        status: body.status,
        response: body.response || {},
        delay: body.delay || 0,
        secure: body.secure || false,
        createdAt: new Date().toISOString()
    };

    await useStorage('mocks').setItem(id, newMock);

    return newMock;
});
