import { db } from '../../../../db';
import { savedRequests, folders, collections, projects } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { validateShareToken } from '../../../../utils/permissions';

interface UpdateRequestBody {
  name?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string> | null;
  body?: Record<string, unknown> | string | null;
  auth?: {
    type: string;
    credentials?: Record<string, string>;
  } | null;
}

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token');
  const requestId = getRouterParam(event, 'requestId');
  const user = event.context.user;
  const body = await readBody<UpdateRequestBody>(event);

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Share token is required'
    });
  }

  if (!requestId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request ID is required'
    });
  }

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'You must be logged in to edit shared workspaces'
    });
  }

  // Validate share token
  const validation = await validateShareToken(token, user.id);

  if (!validation.valid) {
    throw createError({
      statusCode: 404,
      statusMessage: validation.error || 'Invalid share link'
    });
  }

  const { workspaceId, permission } = validation;

  if (!workspaceId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Invalid share configuration'
    });
  }

  // Check if user has edit permission
  if (permission !== 'edit') {
    throw createError({
      statusCode: 403,
      statusMessage: 'You do not have permission to edit this workspace'
    });
  }

  try {
    // Fetch the request
    const existingRequest = await db
      .select()
      .from(savedRequests)
      .where(eq(savedRequests.id, requestId))
      .limit(1);

    if (!existingRequest.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Request not found'
      });
    }

    // Verify the request belongs to a folder in the shared workspace
    const folder = await db
      .select()
      .from(folders)
      .where(eq(folders.id, existingRequest[0].folderId))
      .limit(1);

    if (!folder.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Request folder not found'
      });
    }

    const collection = await db
      .select()
      .from(collections)
      .where(eq(collections.id, folder[0].collectionId))
      .limit(1);

    if (!collection.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Collection not found'
      });
    }

    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, collection[0].projectId))
      .limit(1);

    if (!project.length || project[0].workspaceId !== workspaceId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this request'
      });
    }

    // Update the request
    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.method !== undefined) updateData.method = body.method;
    if (body.url !== undefined) updateData.url = body.url;
    if (body.headers !== undefined) updateData.headers = JSON.stringify(body.headers);
    if (body.body !== undefined) updateData.body = typeof body.body === 'string' ? body.body : JSON.stringify(body.body);
    if (body.auth !== undefined) updateData.auth = JSON.stringify(body.auth);

    const updatedRequest = await db
      .update(savedRequests)
      .set(updateData)
      .where(eq(savedRequests.id, requestId))
      .returning();

    return {
      success: true,
      request: updatedRequest[0]
    };

  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    console.error('Error updating shared request:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update request'
    });
  }
});
