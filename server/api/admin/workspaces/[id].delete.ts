import { db } from '../../../db';
import { workspaces, projects } from '../../../db/schema';
import { eq } from 'drizzle-orm';

const PERSONAL_WORKSPACE_ID = 'personal';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace ID is required'
    });
  }

  // Prevent deleting the default Personal workspace
  if (id === PERSONAL_WORKSPACE_ID) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cannot delete the default Personal workspace'
    });
  }

  try {
    // Check if workspace exists
    const existing = db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .get();

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Workspace not found'
      });
    }

    // Count projects that will be deleted (for informational purposes)
    const projectsToDelete = db
      .select()
      .from(projects)
      .where(eq(projects.workspaceId, id))
      .all();

    const projectCount = projectsToDelete.length;

    // Delete the workspace (cascade will handle projects and their children)
    db.delete(workspaces)
      .where(eq(workspaces.id, id))
      .run();

    return {
      success: true,
      message: `Workspace "${existing.name}" deleted successfully`,
      deletedProjects: projectCount
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error deleting workspace:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete workspace'
    });
  }
});
