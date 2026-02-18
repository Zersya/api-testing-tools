import { db } from '../../../db';
import { collections, folders } from '../../../db/schema';
import { eq } from 'drizzle-orm';

interface FolderWithChildren {
  id: string;
  collectionId: string;
  parentFolderId: string | null;
  name: string;
  order: number;
  children: FolderWithChildren[];
}

function buildFolderTree(allFolders: typeof folders.$inferSelect[], parentId: string | null = null): FolderWithChildren[] {
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
      statusMessage: 'Collection ID is required'
    });
  }

  try {
    // Get the collection
    const collection = db
      .select()
      .from(collections)
      .where(eq(collections.id, id))
      .get();

    if (!collection) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Collection not found'
      });
    }

    // Get all folders for this collection
    const collectionFolders = db
      .select()
      .from(folders)
      .where(eq(folders.collectionId, id))
      .all();

    // Build folder tree
    const folderTree = buildFolderTree(collectionFolders);

    return {
      ...collection,
      folders: folderTree
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching collection:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch collection'
    });
  }
});
