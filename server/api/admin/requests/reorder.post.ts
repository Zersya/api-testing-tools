import { db } from '../../../db';
import { savedRequests } from '../../../db/schema';
import { eq } from 'drizzle-orm';

interface RequestUpdate {
  id: string;
  folderId: string;
  order: number;
}

interface ReorderBody {
  folderId: string;
  updates: RequestUpdate[];
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ReorderBody>(event);

  if (!body.folderId || !body.updates || !Array.isArray(body.updates)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'folderId and updates array are required'
    });
  }

  if (body.updates.length === 0) {
    return { success: true, message: 'No updates to process' };
  }

  try {
    for (const update of body.updates) {
      if (!update.id || typeof update.folderId !== 'string' || typeof update.order !== 'number') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Each update must have id, folderId, and order'
        });
      }

      const existing = db
        .select()
        .from(savedRequests)
        .where(eq(savedRequests.id, update.id))
        .get();

      if (!existing) {
        throw createError({
          statusCode: 404,
          statusMessage: `Request ${update.id} not found`
        });
      }
    }

    const updatedRequests: typeof savedRequests.$inferSelect[] = [];

    for (const update of body.updates) {
      const updateData = {
        folderId: update.folderId,
        order: update.order,
        updatedAt: new Date()
      };

      const updated = db
        .update(savedRequests)
        .set(updateData)
        .where(eq(savedRequests.id, update.id))
        .returning()
        .get();

      updatedRequests.push(updated);
    }

    return {
      success: true,
      message: `Updated ${updatedRequests.length} requests`,
      requests: updatedRequests
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    console.error('Error reordering requests:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to reorder requests'
    });
  }
});
