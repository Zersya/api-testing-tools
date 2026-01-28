import { db, schema } from '../../db';

export default defineEventHandler(async (event) => {
  try {
    const mocks = await db.select().from(schema.mocks);
    
    // Transform to match old format for backward compatibility
    return mocks.map(mock => ({
      id: mock.id,
      collection: mock.collectionId || 'root',
      path: mock.path,
      method: mock.method,
      status: mock.status,
      response: mock.response,
      delay: mock.delay,
      secure: mock.secure,
      createdAt: mock.createdAt ? new Date(mock.createdAt).toISOString() : null
    }));
  } catch (error) {
    console.error('Error fetching mocks:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch mocks'
    });
  }
});
