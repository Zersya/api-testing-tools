import { db } from '../../../../db';
import { projects, collections, folders } from '../../../../db/schema';
import { eq, desc, asc, isNull } from 'drizzle-orm';
import { getAccessibleWorkspaceIds } from '../../../../utils/permissions';

interface FolderWithChildren {
  id: string;
  collectionId: string;
  parentFolderId: string | null;
  name: string;
  order: number;
  children: FolderWithChildren[];
}

interface CollectionWithFolders {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  authConfig: Record<string, unknown> | null;
  createdAt: Date;
  folders: FolderWithChildren[];
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
  const projectId = getRouterParam(event, 'id');
  const user = event.context.user;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    });
  }

  try {
    // Verify project exists
    const project = (await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1))[0];

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      });
    }

    // Check if user has access to this workspace
    const accessibleIds = await getAccessibleWorkspaceIds(user.id);
    if (!accessibleIds.includes(project.workspaceId)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this workspace'
      });
    }

    // Get all collections for this project
    const projectCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.projectId, projectId))
      .orderBy(desc(collections.createdAt));

    // Build collections with nested folders
    const collectionsWithFolders: CollectionWithFolders[] = projectCollections.map(collection => {
      // Get all folders for this collection
      const collectionFolders = db
        .select()
        .from(folders)
        .where(eq(folders.collectionId, collection.id));

      // Build folder tree
      const folderTree = buildFolderTree(collectionFolders);

      return {
        ...collection,
        folders: folderTree
      };
    });

    return collectionsWithFolders;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching collections:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch collections'
    });
  }
});
