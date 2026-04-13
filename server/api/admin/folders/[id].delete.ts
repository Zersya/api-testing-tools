import { db } from '../../../db';
import { folders } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { cache, CacheKeys } from '../../../utils/cache';

// Helper function to count all descendant folders
function countDescendants(allFolders: typeof folders.$inferSelect[], parentId: string): number {
  const children = allFolders.filter(f => f.parentFolderId === parentId);
  let count = children.length;
  for (const child of children) {
    count += countDescendants(allFolders, child.id);
  }
  return count;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Folder ID is required'
    });
  }

  try {
    // Check if folder exists
    const existing = (await db
      .select()
      .from(folders)
      .where(eq(folders.id, id))
      .limit(1))[0];

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Folder not found'
      });
    }

    // Get all folders in the collection to count descendants
    const allCollectionFolders = await db
      .select()
      .from(folders)
      .where(eq(folders.collectionId, existing.collectionId));

    const descendantCount = countDescendants(allCollectionFolders, id);

    // Delete the folder (cascade will handle child folders)
    await db.delete(folders)
      .where(eq(folders.id, id));

    // Invalidate cache for the user
    const user = event.context.user;
    if (user?.id) {
      cache.delete(CacheKeys.workspaceTree(user.id));
    }

    return {
      success: true,
      message: `Folder "${existing.name}" deleted successfully`,
      deletedChildFolders: descendantCount
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error deleting folder:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete folder'
    });
  }
});
