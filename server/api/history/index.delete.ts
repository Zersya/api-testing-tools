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
      countResult = (await db
        .select({ count: sql<number>`count(*)` })
        .from(requestHistories)
        .where(eq(requestHistories.workspaceId, query.workspaceId))
        .limit(1))[0];

      // Delete only entries for the specified workspace
      await db.delete(requestHistories)
        .where(eq(requestHistories.workspaceId, query.workspaceId));
    } else {
      // Count all entries
      countResult = (await db
        .select({ count: sql<number>`count(*)` })
        .from(requestHistories)
        .limit(1))[0];

      // Delete all entries
      await db.delete(requestHistories);
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
