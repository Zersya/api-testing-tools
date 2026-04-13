import { db } from '../../../../db';
import { environments, projects } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { canEditWorkspace } from '../../../../utils/permissions';

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

    // If already active, just return it
    if (existing.isActive) {
      return existing;
    }

    // Deactivate all environments in the same project
    await db.update(environments)
      .set({ isActive: false })
      .where(eq(environments.projectId, existing.projectId));

    // Activate this environment
    const activatedEnvironment = (await db
      .update(environments)
      .set({ isActive: true })
      .where(eq(environments.id, id))
      .returning())[0];

    return activatedEnvironment;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error activating environment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to activate environment'
    });
  }
});
