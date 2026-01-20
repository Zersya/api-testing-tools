/**
 * DELETE /api/history/:id
 * 
 * Delete a single request history entry by ID.
 */

import { db } from '../../db';
import { requestHistories } from '../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'History entry ID is required'
    });
  }

  try {
    // Check if entry exists
    const existing = db
      .select()
      .from(requestHistories)
      .where(eq(requestHistories.id, id))
      .get();

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'History entry not found'
      });
    }

    // Delete the entry
    db.delete(requestHistories)
      .where(eq(requestHistories.id, id))
      .run();

    return {
      success: true,
      message: 'History entry deleted successfully',
      deletedId: id
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error deleting history entry:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete history entry'
    });
  }
});
