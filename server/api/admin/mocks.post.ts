import { v4 as uuidv4 } from 'uuid';
import { db, schema } from '../../db';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    if (!body.path || !body.method || !body.status) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: path, method, status'
      });
    }

    const normalizedMethod = body.method.toUpperCase();
    const targetCollection = body.collection || 'root';

    // Check for duplicates within the SAME collection only
    const existing = (await db
      .select()
      .from(schema.mocks)
      .where(
        and(
          eq(schema.mocks.path, body.path),
          eq(schema.mocks.method, normalizedMethod),
          targetCollection === 'root' 
            ? eq(schema.mocks.collectionId, '')
            : eq(schema.mocks.collectionId, targetCollection)
        )
      )
      .limit(1))[0];

    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: `Mock with method ${normalizedMethod} and path ${body.path} already exists in collection "${targetCollection}"`
      });
    }

    const id = uuidv4();
    const now = new Date();
    
    await db.insert(schema.mocks).values({
      id,
      collectionId: targetCollection === 'root' ? null : targetCollection,
      path: body.path,
      method: normalizedMethod,
      status: body.status,
      response: body.response || {},
      delay: body.delay || 0,
      secure: body.secure || false,
      createdAt: now,
      updatedAt: now
    });

    return {
      id,
      collection: targetCollection,
      path: body.path,
      method: normalizedMethod,
      status: body.status,
      response: body.response || {},
      delay: body.delay || 0,
      secure: body.secure || false,
      createdAt: now.toISOString()
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    console.error('Error creating mock:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create mock'
    });
  }
});
