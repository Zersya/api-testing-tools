import { db } from '../../../db';
import { environments, environmentVariables, projects } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { canEditWorkspace } from '../../../utils/permissions';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const user = event.context.user;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment ID is required'
    });
  }

  try {
    // Check if environment exists
    const existing = (await db
      .select()
      .from(environments)
      .where(eq(environments.id, id))
      .limit(1))[0];

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Environment not found'
      });
    }

    // Get project to check workspace access
    const project = (await db
      .select()
      .from(projects)
      .where(eq(projects.id, existing.projectId))
      .limit(1))[0];

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      });
    }

    // Check if user can edit this workspace (owner or edit permission)
    const canEdit = await canEditWorkspace(user.id, project.workspaceId, user.email);
    if (!canEdit) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have edit access to this workspace'
      });
    }

    // Count variables that will be deleted (for informational purposes)
    const variablesToDelete = await db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.environmentId, id));

    const variableCount = variablesToDelete.length;

    // Delete the environment (cascade will handle variables)
    await db.delete(environments)
      .where(eq(environments.id, id));

    // If the deleted environment was active, make another environment active
    if (existing.isActive) {
      const remainingEnvironments = await db
        .select()
        .from(environments)
        .where(eq(environments.projectId, existing.projectId));

      if (remainingEnvironments.length > 0) {
        await db.update(environments)
          .set({ isActive: true })
          .where(eq(environments.id, remainingEnvironments[0].id));
      }
    }

    return {
      success: true,
      message: `Environment "${existing.name}" deleted successfully`,
      deletedVariables: variableCount
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error deleting environment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete environment'
    });
  }
});
