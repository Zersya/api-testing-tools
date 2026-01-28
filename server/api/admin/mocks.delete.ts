import { db, schema } from '../../db';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const id = query.id as string;

    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing mock ID'
      });
    }

    // Check if mock exists
    const existing = await db
      .select()
      .from(schema.mocks)
      .where(eq(schema.mocks.id, id))
      .get();

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mock not found'
      });
    }

    await db
      .delete(schema.mocks)
      .where(eq(schema.mocks.id, id));

    return { success: true };
  } catch (error: any) {
    if (error.statusCode) throw error;
    console.error('Error deleting mock:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete mock'
    });
  }
});
