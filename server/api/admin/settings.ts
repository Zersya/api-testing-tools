export default defineEventHandler(async (event) => {
    const storage = useStorage('settings');
    const key = 'global';

    if (event.method === 'GET') {
        return (await storage.getItem(key)) || { bearerToken: '' };
    }

    if (event.method === 'POST') {
        const body = await readBody(event);
        await storage.setItem(key, body);
        return { success: true };
    }
});
