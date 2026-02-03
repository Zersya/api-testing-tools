import { db } from '../../../db';
import { savedRequests } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request ID is required'
    });
  }

  try {
    // Check if request exists
    const existing = (await db
      .select()
      .from(savedRequests)
      .where(eq(savedRequests.id, id))
      .limit(1))[0];

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Request not found'
      });
    }

    // Delete the request
    await db.delete(savedRequests)
      .where(eq(savedRequests.id, id));

    return {
      success: true,
      message: `Request "${existing.name}" deleted successfully`
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error deleting request:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete request'
    });
  }
});
