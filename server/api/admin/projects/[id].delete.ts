import { db } from '../../../db';
import { projects, collections } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    });
  }

  try {
    // Check if project exists
    const existing = db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .get();

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      });
    }

    // Count collections that will be deleted (for informational purposes)
    const collectionsToDelete = db
      .select()
      .from(collections)
      .where(eq(collections.projectId, id))
      .all();

    const collectionCount = collectionsToDelete.length;

    // Delete the project (cascade will handle collections and their children)
    db.delete(projects)
      .where(eq(projects.id, id))
      .run();

    return {
      success: true,
      message: `Project "${existing.name}" deleted successfully`,
      deletedCollections: collectionCount
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error deleting project:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete project'
    });
  }
});
