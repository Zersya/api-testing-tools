import { db } from '../../db';
import { workspaces } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

interface CreateWorkspaceBody {
  name: string;
}

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  const body = await readBody<CreateWorkspaceBody>(event);

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

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
    // Check for duplicate names (case-insensitive) for this user using database query
    // Also check for workspaces with null ownerId (legacy workspaces)
    const allWorkspaces = await db
      .select({ id: workspaces.id, name: workspaces.name, ownerId: workspaces.ownerId })
      .from(workspaces);
    
    const duplicate = allWorkspaces.find(ws => 
      ws.name.toLowerCase() === trimmedName.toLowerCase() && 
      (ws.ownerId === user.id || ws.ownerId === null || ws.ownerId === 'unknown' || ws.ownerId === '')
    );

    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Workspace "${trimmedName}" already exists`
      });
    }

    // Create the workspace with owner
    const newWorkspace = (await db
      .insert(workspaces)
      .values({
        name: trimmedName,
        ownerId: user.id,
        visibility: 'private'
      })
      .returning())[0];

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
