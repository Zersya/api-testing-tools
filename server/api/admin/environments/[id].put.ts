import { db } from '../../../db';
import { environments, projects } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { canEditWorkspace } from '../../../utils/permissions';

interface UpdateEnvironmentBody {
  name?: string;
}

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

  const body = await readBody<UpdateEnvironmentBody>(event);

  // Validate that at least one field is provided
  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one field must be provided for update'
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
    const canEdit = await canEditWorkspace(user.id, project.workspaceId);
    if (!canEdit) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have edit access to this workspace'
      });
    }

    // Prepare update data
    const updateData: Partial<{ name: string }> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Environment name must be a string'
        });
      }

      const trimmedName = body.name.trim();

      if (trimmedName.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Environment name cannot be empty'
        });
      }

      if (trimmedName.length > 100) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Environment name cannot exceed 100 characters'
        });
      }

      // Check for duplicate names within the same project (case-insensitive), excluding current environment
      const environmentsInProject = await db
        .select()
        .from(environments)
        .where(eq(environments.projectId, existing.projectId));

      const duplicate = environmentsInProject.find(
        e => e.id !== id && e.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: `Environment "${trimmedName}" already exists in this project`
        });
      }

      updateData.name = trimmedName;
    }

    // Update the environment
    const updatedEnvironment = (await db
      .update(environments)
      .set(updateData)
      .where(eq(environments.id, id))
      .returning())[0];

    return updatedEnvironment;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error updating environment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update environment'
    });
  }
});
