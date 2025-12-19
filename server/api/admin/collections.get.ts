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
    const storage = useStorage('collections');
    const keys = await storage.getKeys();

    let collections: Collection[] = await Promise.all(keys.map(async (key) => {
        return await storage.getItem(key) as Collection;
    }));

    // Ensure "root" collection always exists
    const hasRoot = collections.some(c => c.name === 'root');
    if (!hasRoot) {
        const rootCollection: Collection = {
            id: 'root',
            name: 'root',
            description: 'Default collection for all APIs',
            color: '#6366f1',
            order: 0,
            createdAt: new Date().toISOString()
        };
        await storage.setItem('root', rootCollection);
        collections.unshift(rootCollection);
    }

    // Sort by order, then by name
    collections.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name);
    });

    return collections;
});
