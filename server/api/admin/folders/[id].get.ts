import { db } from '../../../db';
import { folders } from '../../../db/schema';
import { eq } from 'drizzle-orm';

interface FolderWithChildren {
  id: string;
  collectionId: string;
  parentFolderId: string | null;
  name: string;
  order: number;
  children: FolderWithChildren[];
}

function buildFolderTree(allFolders: typeof folders.$inferSelect[], parentId: string): FolderWithChildren[] {
  return allFolders
    .filter(folder => folder.parentFolderId === parentId)
    .sort((a, b) => a.order - b.order)
    .map(folder => ({
      ...folder,
      children: buildFolderTree(allFolders, folder.id)
    }));
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
    // Get the folder
    const folder = (await db
      .select()
      .from(folders)
      .where(eq(folders.id, id))
      .limit(1))[0];

    if (!folder) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Folder not found'
      });
    }

    // Get all folders in the same collection to build children tree
    const allCollectionFolders = await db
      .select()
      .from(folders)
      .where(eq(folders.collectionId, folder.collectionId));

    // Build children tree
    const children = buildFolderTree(allCollectionFolders, id);

    return {
      ...folder,
      children
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching folder:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch folder'
    });
  }
});
