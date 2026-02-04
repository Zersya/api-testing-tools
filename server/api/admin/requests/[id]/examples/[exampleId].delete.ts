import { db } from '../../../../../db';
import { requestExamples, savedRequests } from '../../../../../db/schema';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const requestId = getRouterParam(event, 'id');
  const exampleId = getRouterParam(event, 'exampleId');

  if (!requestId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request ID is required'
    });
  }

  if (!exampleId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Example ID is required'
    });
  }

  try {
    // Verify request exists
    const request = await db
      .select()
      .from(savedRequests)
      .where(eq(savedRequests.id, requestId))
      .limit(1);

    if (!request || request.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Request not found'
      });
    }

    // Verify example exists and belongs to this request
    const existingExample = await db
      .select()
      .from(requestExamples)
      .where(and(
        eq(requestExamples.id, exampleId),
        eq(requestExamples.requestId, requestId)
      ))
      .limit(1);

    if (!existingExample || existingExample.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Example not found'
      });
    }

    // Check if this is the last example for the request
    const exampleCount = await db
      .select()
      .from(requestExamples)
      .where(eq(requestExamples.requestId, requestId));

    if (exampleCount.length <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete the last example. At least one example is required per request.'
      });
    }

    // Delete the example
    await db
      .delete(requestExamples)
      .where(eq(requestExamples.id, exampleId));

    return {
      success: true,
      message: 'Example deleted successfully'
    };

  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    console.error('Error deleting request example:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete request example'
    });
  }
});
