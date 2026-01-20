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
    // Get the variable
    const variable = db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.id, id))
      .get();

    if (!variable) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Environment variable not found'
      });
    }

    return {
      ...variable,
      // Mask secret values
      value: variable.isSecret ? '••••••••' : variable.value
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching environment variable:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch environment variable'
    });
  }
});
