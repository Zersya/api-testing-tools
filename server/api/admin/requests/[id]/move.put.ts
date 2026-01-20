import { db } from '../../../../db';
import { savedRequests, folders } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

interface MoveRequestBody {
  folderId: string;
  order?: number;
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request ID is required'
    });
  }

  const body = await readBody<MoveRequestBody>(event);

  // Validate required fields
  if (!body.folderId || typeof body.folderId !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Target folder ID is required'
    });
  }

  try {
    // Check if request exists
    const existing = db
      .select()
      .from(savedRequests)
      .where(eq(savedRequests.id, id))
      .get();

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Request not found'
      });
    }

    // Check if target folder exists
    const targetFolder = db
      .select()
      .from(folders)
      .where(eq(folders.id, body.folderId))
      .get();

    if (!targetFolder) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Target folder not found'
      });
    }

    // Calculate order for the request in the new folder
    let order = 0;
    if (body.order !== undefined) {
      if (typeof body.order !== 'number' || !Number.isInteger(body.order)) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Order must be an integer'
        });
      }
      order = body.order;
    } else {
      // Place at the end of the target folder
      const existingRequests = db
        .select()
        .from(savedRequests)
        .where(eq(savedRequests.folderId, body.folderId))
        .all();

      const maxOrder = existingRequests.reduce((max, r) => Math.max(max, r.order), -1);
      order = maxOrder + 1;
    }

    // Move the request to the new folder
    const movedRequest = db
      .update(savedRequests)
      .set({
        folderId: body.folderId,
        order,
        updatedAt: new Date()
      })
      .where(eq(savedRequests.id, id))
      .returning()
      .get();

    return {
      success: true,
      message: `Request "${existing.name}" moved successfully`,
      request: movedRequest
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error moving request:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to move request'
    });
  }
});
