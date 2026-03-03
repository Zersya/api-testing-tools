import { db } from '../../../../db';
import { savedRequests } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

function parseJsonField<T>(value: unknown): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

export default defineEventHandler(async (event) => {
  const folderId = getRouterParam(event, 'id');

  if (!folderId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Folder ID is required'
    });
  }

  try {
    const requests = await db
      .select()
      .from(savedRequests)
      .where(eq(savedRequests.folderId, folderId))
      .orderBy(savedRequests.order);

    // Parse JSON fields for each request
    return requests.map(req => ({
      ...req,
      headers: parseJsonField<Record<string, string>>(req.headers),
      body: parseJsonField<Record<string, unknown> | string>(req.body),
      auth: parseJsonField<{ type: string; credentials?: Record<string, string> } | null>(req.auth),
      mockConfig: parseJsonField<{ isEnabled: boolean; statusCode: number; delay: number; responseBody: Record<string, unknown> | string | null; responseHeaders: Record<string, string> } | null>(req.mockConfig),
      pathVariables: parseJsonField<Record<string, { value: string; description?: string }>>(req.pathVariables)
    }));
  } catch (error) {
    console.error('Error fetching requests:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch requests'
    });
  }
});