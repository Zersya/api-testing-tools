import { db } from '../../../db';
import { environments, environmentVariables } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment ID is required'
    });
  }

  try {
    // Get the environment
    const environment = (await db
      .select()
      .from(environments)
      .where(eq(environments.id, id))
      .limit(1))[0];

    if (!environment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Environment not found'
      });
    }

    // Get all variables for this environment
    const variables = await db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.environmentId, id));

    return {
      ...environment,
      variables: variables.map(v => ({
        ...v,
        // Mask secret values
        value: v.isSecret ? '••••••••' : v.value
      }))
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching environment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch environment'
    });
  }
});
