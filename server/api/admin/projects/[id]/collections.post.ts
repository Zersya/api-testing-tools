import { db } from '../../../../db';
import { projects, collections } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { getAccessibleWorkspaceIds } from '../../../../utils/permissions';
import { trackResourceAction } from '../../../../services/usageTracking';
import { cache, CacheKeys } from '../../../../utils/cache';

interface CreateCollectionBody {
  name: string;
  description?: string;
  authConfig?: Record<string, unknown>;
}

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id');
  const user = event.context.user;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  if (!projectId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    });
  }

  const body = await readBody<CreateCollectionBody>(event);

  // Validate required fields
  if (!body.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Collection name is required'
    });
  }

  const trimmedName = body.name.trim();

  if (trimmedName.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Collection name cannot be empty'
    });
  }

  if (trimmedName.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Collection name cannot exceed 100 characters'
    });
  }

  // Validate description if provided
  let description: string | null = null;
  if (body.description !== undefined && body.description !== null) {
    if (typeof body.description !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Description must be a string'
      });
    }
    description = body.description.trim() || null;
  }

  // Validate authConfig if provided
  let authConfig: Record<string, unknown> | null = null;
  if (body.authConfig !== undefined && body.authConfig !== null) {
    if (typeof body.authConfig !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Auth config must be an object'
      });
    }
    authConfig = body.authConfig;
  }

  try {
    // Verify project exists
    const project = (await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1))[0];

    if (!project) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Project not found'
      });
    }

    // Check if user has access to this workspace
    const accessibleIds = await getAccessibleWorkspaceIds(user.id);
    if (!accessibleIds.includes(project.workspaceId)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You do not have access to this workspace'
      });
    }

    // Check for duplicate collection names within the project (case-insensitive)
    const existingCollections = await db
      .select()
      .from(collections)
      .where(eq(collections.projectId, projectId));

    const duplicate = existingCollections.find(
      c => c.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Collection "${trimmedName}" already exists in this project`
      });
    }

    // Create the collection
    const newCollection = (await db
      .insert(collections)
      .values({
        projectId,
        name: trimmedName,
        description,
        authConfig
      })
      .returning())[0];

    // Track analytics
    trackResourceAction({
      userId: user.id,
      userEmail: user.email,
      workspaceId: user.workspaceId || 'personal',
      action: 'create',
      resourceType: 'collection',
      resourceId: newCollection.id,
      resourceName: trimmedName,
    });

    // Invalidate cache for the user
    cache.delete(CacheKeys.workspaceTree(user.id));

    return newCollection;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error creating collection:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create collection'
    });
  }
});
