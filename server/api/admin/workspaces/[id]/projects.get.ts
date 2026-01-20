import { db } from '../../../../db';
import { workspaces, projects } from '../../../../db/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id');

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace ID is required'
    });
  }

  try {
    // Verify workspace exists
    const workspace = db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .get();

    if (!workspace) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Workspace not found'
      });
    }

    // Get all projects in the workspace
    const workspaceProjects = db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, workspaceId))
      .orderBy(desc(projects.createdAt))
      .all();

    return workspaceProjects;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching projects:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch projects'
    });
  }
});
