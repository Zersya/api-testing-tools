import { db } from '../../db';
import { workspaces } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface CreateWorkspaceBody {
  name: string;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<CreateWorkspaceBody>(event);

  // Validate required fields
  if (!body.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace name is required'
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

  try {
    // Check for duplicate names (case-insensitive)
    const existingWorkspaces = db
      .select()
      .from(workspaces)
      .all();

    const duplicate = existingWorkspaces.find(
      w => w.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Workspace "${trimmedName}" already exists`
      });
    }

    // Create the workspace
    const newWorkspace = db
      .insert(workspaces)
      .values({
        name: trimmedName
      })
      .returning()
      .get();

    return newWorkspace;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error creating workspace:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create workspace'
    });
  }
});
