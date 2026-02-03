/**
 * GET /api/history
 * 
 * List request history with pagination and optional filters.
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - method: Filter by HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
 * - status: Filter by status code (e.g., 200, 404, 500)
 * - workspaceId: Filter by workspace ID
 */

import { db } from '../../db';
import { requestHistories } from '../../db/schema';
import { desc, eq, and, sql, SQL } from 'drizzle-orm';
import type { HttpMethod } from '../../db/schema/requestHistory';

interface HistoryQueryParams {
  page?: string;
  limit?: string;
  method?: HttpMethod;
  status?: string;
  workspaceId?: string;
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery<HistoryQueryParams>(event);

    // Parse pagination parameters
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    // Build filter conditions
    const conditions: SQL[] = [];

    // Filter by HTTP method
    if (query.method) {
      const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      const method = query.method.toUpperCase() as HttpMethod;
      if (validMethods.includes(method)) {
        conditions.push(eq(requestHistories.method, method));
      }
    }

    // Filter by status code
    if (query.status) {
      const statusCode = parseInt(query.status, 10);
      if (!isNaN(statusCode) && statusCode >= 100 && statusCode < 600) {
        conditions.push(eq(requestHistories.statusCode, statusCode));
      }
    }

    // Filter by workspace ID
    if (query.workspaceId) {
      conditions.push(eq(requestHistories.workspaceId, query.workspaceId));
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const countResult = (await db
      .select({ count: sql<number>`count(*)` })
      .from(requestHistories)
      .where(whereClause)
      .limit(1))[0];

    const total = countResult?.count || 0;

    // Fetch history entries with pagination
    const items = await db
      .select()
      .from(requestHistories)
      .where(whereClause)
      .orderBy(desc(requestHistories.timestamp))
      .limit(limit)
      .offset(offset);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error: any) {
    console.error('Error fetching request history:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch request history'
    });
  }
});
