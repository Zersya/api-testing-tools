/**
 * DELETE /api/history
 * 
 * Clear all request history entries.
 * Optionally filter by workspaceId to clear only that workspace's history.
 * 
 * Query Parameters:
 * - workspaceId: Optional workspace ID to clear only that workspace's history
 */

import { db } from '../../db';
import { requestHistories } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';

interface DeleteQueryParams {
  workspaceId?: string;
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery<DeleteQueryParams>(event);

    // Get count before deletion for response
    let countResult;
    
    if (query.workspaceId) {
      // Count entries for specific workspace
      countResult = db
        .select({ count: sql<number>`count(*)` })
        .from(requestHistories)
        .where(eq(requestHistories.workspaceId, query.workspaceId))
        .get();

      // Delete only entries for the specified workspace
      db.delete(requestHistories)
        .where(eq(requestHistories.workspaceId, query.workspaceId))
        .run();
    } else {
      // Count all entries
      countResult = db
        .select({ count: sql<number>`count(*)` })
        .from(requestHistories)
        .get();

      // Delete all entries
      db.delete(requestHistories).run();
    }

    const deletedCount = countResult?.count || 0;

    return {
      success: true,
      message: `Successfully cleared ${deletedCount} history entries`,
      deletedCount
    };
  } catch (error: any) {
    console.error('Error clearing request history:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to clear request history'
    });
  }
});
