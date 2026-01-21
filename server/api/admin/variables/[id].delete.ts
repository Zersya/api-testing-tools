import { db } from '../../../db';
import { environmentVariables } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Variable ID is required'
    });
  }

  try {
    // Check if variable exists
    const existing = db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.id, id))
      .get();

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Environment variable not found'
      });
    }

    // Delete the variable
    db.delete(environmentVariables)
      .where(eq(environmentVariables.id, id))
      .run();

    return {
      success: true,
      message: `Variable "${existing.key}" deleted successfully`
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error deleting environment variable:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete environment variable'
    });
  }
});
