import { db } from '../../../db';
import { workspaces } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace ID is required'
    });
  }

  try {
    const workspace = db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .get();

    if (!workspace) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Workspace not found'
      });
    }

    return workspace;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching workspace:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch workspace'
    });
  }
});
