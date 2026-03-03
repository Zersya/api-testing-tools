import { db } from '../../../db';
import { collections } from '../../../db/schema';
import { eq } from 'drizzle-orm';

interface UpdateCollectionBody {
  name?: string;
  description?: string | null;
  authConfig?: Record<string, unknown> | null;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Collection ID is required'
    });
  }

  const body = await readBody<UpdateCollectionBody>(event);

  // Validate that at least one field is provided
  if (!body || Object.keys(body).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one field must be provided for update'
    });
  }

  try {
    // Check if collection exists
    const existing = (await db
      .select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1))[0];

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Collection not found'
      });
    }

    // Prepare update data
    const updateData: Partial<{
      name: string;
      description: string | null;
      authConfig: Record<string, unknown> | null;
    }> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Collection name must be a string'
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

      // Check for duplicate names within the same project (case-insensitive), excluding current collection
      const collectionsInProject = await db
        .select()
        .from(collections)
        .where(eq(collections.projectId, existing.projectId));

      const duplicate = collectionsInProject.find(
        c => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase()
      );

      if (duplicate) {
        throw createError({
          statusCode: 409,
          statusMessage: `Collection "${trimmedName}" already exists in this project`
        });
      }

      updateData.name = trimmedName;
    }

    if (body.description !== undefined) {
      if (body.description === null) {
        updateData.description = null;
      } else if (typeof body.description === 'string') {
        updateData.description = body.description.trim() || null;
      } else {
        throw createError({
          statusCode: 400,
          statusMessage: 'Description must be a string or null'
        });
      }
    }

    if (body.authConfig !== undefined) {
      if (body.authConfig === null) {
        updateData.authConfig = null;
      } else if (typeof body.authConfig === 'object') {
        updateData.authConfig = body.authConfig;
      } else {
        throw createError({
          statusCode: 400,
          statusMessage: 'Auth config must be an object or null'
        });
      }
    }

    // Update the collection
    const updatedCollection = (await db
      .update(collections)
      .set(updateData)
      .where(eq(collections.id, id))
      .returning())[0];

    return updatedCollection;
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error updating collection:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update collection'
    });
  }
});
