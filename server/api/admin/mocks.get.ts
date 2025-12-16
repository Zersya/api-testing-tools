export default defineEventHandler(async (event) => {
    const storage = useStorage('mocks');
    const keys = await storage.getKeys();
    const mocks = await Promise.all(keys.map(async (key) => {
        return await storage.getItem(key);
    }));
    return mocks;
});
