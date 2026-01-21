import { db } from '../../db';
import { collections, folders, savedRequests } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';

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
    const query = getQuery(event);
    const id = query.id as string;

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Collection ID is required'
        });
    }

    const storage = useStorage('collections');
    const existing = await storage.getItem(id) as Collection | null;

    if (!existing) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Collection not found'
        });
    }

    // Prevent deleting root collection
    if (existing.name === 'root' || id === 'root') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Cannot delete the root collection'
        });
    }

    // Move all mocks in this collection to root
    const mocksStorage = useStorage('mocks');
    const mockKeys = await mocksStorage.getKeys();

    for (const key of mockKeys) {
        const mock = await mocksStorage.getItem(key) as any;
        if (mock && mock.collection === id) {
            mock.collection = 'root';
            mock.updatedAt = new Date().toISOString();
            await mocksStorage.setItem(key, mock);
        }
    }

    // Delete all folders in this collection from database (cascade will delete requests)
    const collectionFolders = db
        .select()
        .from(folders)
        .where(eq(folders.collectionId, id))
        .all();

    if (collectionFolders.length > 0) {
        // Delete all saved requests in these folders (cascade should handle this, but let's be explicit)
        const folderIds = collectionFolders.map(f => f.id);
        await db.delete(savedRequests)
            .where(inArray(savedRequests.folderId, folderIds))
            .run();

        // Delete all folders (child folders will be deleted by cascade)
        await db.delete(folders)
            .where(eq(folders.collectionId, id))
            .run();
    }

    // Delete the collection from storage
    await storage.removeItem(id);

    return { success: true, message: `Collection deleted. ${mockKeys.length > 0 ? 'Associated mocks moved to root collection.' : ''}${collectionFolders.length > 0 ? ` ${collectionFolders.length} folder(s) and their requests deleted.` : ''}` };
});
