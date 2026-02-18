import { db } from '../../../db';
import { collections, folders } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Collection ID is required'
    });
  }

  try {
    // Check if collection exists
    const existing = (await db
      .select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1))[0];

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Collection not found'
      });
    }

    // Count folders that will be deleted (for informational purposes)
    const foldersToDelete = await db
      .select()
      .from(folders)
      .where(eq(folders.collectionId, id));

    const folderCount = foldersToDelete.length;

    // Delete the collection (cascade will handle folders and their children)
    await db.delete(collections)
      .where(eq(collections.id, id));

    return {
      success: true,
      message: `Collection "${existing.name}" deleted successfully`,
      deletedFolders: folderCount
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error deleting collection:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete collection'
    });
  }
});
