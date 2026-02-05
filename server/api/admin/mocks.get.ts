import { db, schema } from '../../db';

export default defineEventHandler(async (event) => {
  try {
    const mocks = await db.select().from(schema.mocks);
    
    // Transform to match old format for backward compatibility
    return mocks.map(mock => {
      // Parse response JSON if it's a string
      let parsedResponse = mock.response;
      if (typeof mock.response === 'string') {
        try {
          parsedResponse = JSON.parse(mock.response);
        } catch {
          // If parsing fails, keep as string
          parsedResponse = mock.response;
        }
      }
      
      return {
        id: mock.id,
        collection: mock.collectionId || 'root',
        path: mock.path,
        method: mock.method,
        status: mock.status,
        response: parsedResponse,
        delay: mock.delay,
        secure: mock.secure,
        createdAt: mock.createdAt ? new Date(mock.createdAt).toISOString() : null
      };
    });
  } catch (error) {
    console.error('Error fetching mocks:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch mocks'
    });
  }
});
