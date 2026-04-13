/**
 * History Logging Endpoint
 * POST /api/history/log
 *
 * Logs a request to the history table.
 * Used for client-side requests (localhost) to track request history.
 */

import { db } from '../../db';
import { requestHistories } from '../../db/schema';
import type { HttpMethod, RequestData, ResponseData } from '../../db/schema/requestHistory';

interface HistoryLogBody {
  workspaceId: string;
  method: string;
  url: string;
  requestData: RequestData;
  responseData: ResponseData;
  statusCode: number;
  responseTimeMs: number;
  timestamp?: string;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody<HistoryLogBody>(event);

    // Validate required fields
    if (!body.workspaceId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: workspaceId'
      });
    }

    if (!body.method) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: method'
      });
    }

    if (!body.url) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required field: url'
      });
    }

    // Validate method is valid HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
    const method = body.method.toUpperCase() as HttpMethod;
    if (!validMethods.includes(method)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid HTTP method. Supported: ${validMethods.join(', ')}`
      });
    }

    // Parse timestamp or use current time
    const timestamp = body.timestamp ? new Date(body.timestamp) : new Date();

    // Insert into history
    const result = await db.insert(requestHistories).values({
      workspaceId: body.workspaceId,
      method: method,
      url: body.url,
      requestData: body.requestData,
      responseData: body.responseData,
      statusCode: body.statusCode,
      responseTimeMs: body.responseTimeMs,
      timestamp: timestamp
    }).returning();

    return {
      success: true,
      id: result[0].id
    };

  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('[HistoryLog] Error logging to history:', error);

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to log request to history',
      cause: error.message
    });
  }
});
