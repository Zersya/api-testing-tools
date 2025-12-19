export default defineEventHandler(async (event) => {
    const storage = useStorage('mocks');
    const keys = await storage.getKeys();
    const mocks = await Promise.all(keys.map(async (key) => {
        const mock = await storage.getItem(key) as any;
        // Ensure collection field exists (backward compatibility)
        if (mock && !mock.collection) {
            mock.collection = 'root';
        }
        return mock;
    }));
    return mocks;
});
