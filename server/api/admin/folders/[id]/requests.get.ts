import { db } from '../../../../db';
import { savedRequests } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

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

    return requests;
  } catch (error) {
    console.error('Error fetching requests:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch requests'
    });
  }
});