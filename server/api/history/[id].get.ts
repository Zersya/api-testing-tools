/**
 * GET /api/history/:id
 * 
 * Get a single request history entry by ID.
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
    const entry = (await db
      .select()
      .from(requestHistories)
      .where(eq(requestHistories.id, id))
      .limit(1))[0];

    if (!entry) {
      throw createError({
        statusCode: 404,
        statusMessage: 'History entry not found'
      });
    }

    return {
      success: true,
      data: entry
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching history entry:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch history entry'
    });
  }
});
