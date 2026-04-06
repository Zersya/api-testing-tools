import { db } from '../../../db';
import { workspaces } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { isWorkspaceOwnerViaMember } from '../../../utils/permissions';

interface UpdateWorkspaceBody {
  name?: string;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const user = event.context.user;

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace ID is required'
    });
  }

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  const body = await readBody<UpdateWorkspaceBody>(event);

  // Validate that at least one field is provided
  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one field must be provided for update'
    });
  }

  try {
    // Check if workspace exists
    const existing = (await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, id))
      .limit(1))[0];

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Workspace not found'
      });
    }

    // Check if user is an owner (original owner or owner member)
    const isOwner = await isWorkspaceOwnerViaMember(user.id, id);
    if (!isOwner) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Only workspace owners can update workspace settings'
      });
    }

    // Prepare update data
    const updateData: Partial<{ name: string; updatedAt: Date }> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Workspace name must be a string'
        });
      }

      const trimmedName = body.name.trim();

      if (trimmedName.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Workspace name cannot be empty'
        });
      }

      if (trimmedName.length > 100) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Workspace name cannot exceed 100 characters'
        });
      }

      // Check for duplicate names (case-insensitive), excluding current workspace
      const allWorkspaces = await db
        .select()
        .from(workspaces);

      const duplicate = allWorkspaces.find(
        w => w.id !== id && w.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: `Workspace "${trimmedName}" already exists`
        });
      }

      updateData.name = trimmedName;
    }

    // Update the workspace
    const updatedWorkspace = (await db
      .update(workspaces)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(workspaces.id, id))
      .returning())[0];

    return updatedWorkspace;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error updating workspace:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update workspace'
    });
  }
});
