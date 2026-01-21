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
    // Check if environment exists
    const existing = db
      .select()
      .from(environments)
      .where(eq(environments.id, id))
      .get();

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Environment not found'
      });
    }

    // Count variables that will be deleted (for informational purposes)
    const variablesToDelete = db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.environmentId, id))
      .all();

    const variableCount = variablesToDelete.length;

    // Delete the environment (cascade will handle variables)
    db.delete(environments)
      .where(eq(environments.id, id))
      .run();

    // If the deleted environment was active, make another environment active
    if (existing.isActive) {
      const remainingEnvironments = db
        .select()
        .from(environments)
        .where(eq(environments.projectId, existing.projectId))
        .all();

      if (remainingEnvironments.length > 0) {
        db.update(environments)
          .set({ isActive: true })
          .where(eq(environments.id, remainingEnvironments[0].id))
          .run();
      }
    }

    return {
      success: true,
      message: `Environment "${existing.name}" deleted successfully`,
      deletedVariables: variableCount
    };
  } catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) {
      throw error;
    }

    console.error('Error deleting environment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete environment'
    });
  }
});
