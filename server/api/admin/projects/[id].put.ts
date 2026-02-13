import { db } from '../../../db';
import { projects } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';
import { getAccessibleWorkspaceIds } from '../../../utils/permissions';

interface UpdateProjectBody {
  name?: string;
  baseUrl?: string | null;
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
      statusMessage: 'Project ID is required'
    });
  }

  const body = await readBody<UpdateProjectBody>(event);

  // Validate that at least one field is provided
  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one field must be provided for update'
    });
  }

  try {
    // Check if project exists
    const existing = (await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1))[0];

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      });
    }

    // Check if user has access to this workspace
    const accessibleIds = await getAccessibleWorkspaceIds(user.id);
    if (!accessibleIds.includes(existing.workspaceId)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this workspace'
      });
    }

    // Prepare update data
    const updateData: Partial<{ name: string; baseUrl: string | null }> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Project name must be a string'
        });
      }

      const trimmedName = body.name.trim();

      if (trimmedName.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Project name cannot be empty'
        });
      }

      if (trimmedName.length > 100) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Project name cannot exceed 100 characters'
        });
      }

      // Check for duplicate names within the same workspace (case-insensitive), excluding current project
      const projectsInWorkspace = await db
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, existing.workspaceId));

      const duplicate = projectsInWorkspace.find(
        p => p.id !== id && p.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: `Project "${trimmedName}" already exists in this workspace`
        });
      }

      updateData.name = trimmedName;
    }

    if (body.baseUrl !== undefined) {
      if (body.baseUrl === null) {
        updateData.baseUrl = null;
      } else if (typeof body.baseUrl === 'string') {
        updateData.baseUrl = body.baseUrl.trim() || null;
      } else {
        throw createError({
          statusCode: 400,
          statusMessage: 'Base URL must be a string or null'
        });
      }
    }

    // Update the project
    const updatedProject = (await db
      .update(projects)
      .set({
        ...updateData,
        updatedAt: sql`(unixepoch())`
      })
      .where(eq(projects.id, id))
      .returning())[0];

    return updatedProject;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error updating project:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update project'
    });
  }
});
