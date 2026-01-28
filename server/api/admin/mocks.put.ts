import { db, schema } from '../../db';
import { eq, and, ne } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    if (!body.id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing mock ID'
      });
    }

    // Check if mock exists
    const existing = await db
      .select()
      .from(schema.mocks)
      .where(eq(schema.mocks.id, body.id))
      .get();

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Mock not found'
      });
    }

    const normalizedMethod = (body.method || existing.method).toUpperCase();
    const newPath = body.path || existing.path;
    const targetCollection = body.collection ?? existing.collectionId ?? 'root';

    // Check for duplicates within the SAME collection only (excluding current ID)
    const duplicate = await db
      .select()
      .from(schema.mocks)
      .where(
        and(
          eq(schema.mocks.path, newPath),
          eq(schema.mocks.method, normalizedMethod),
          targetCollection === 'root'
            ? eq(schema.mocks.collectionId, '')
            : eq(schema.mocks.collectionId, targetCollection),
          ne(schema.mocks.id, body.id)
        )
      )
      .get();

    if (duplicate) {
      throw createError({
        statusCode: 409,
        statusMessage: `Mock with method ${normalizedMethod} and path ${newPath} already exists in collection "${targetCollection}"`
      });
    }

    const now = new Date();
    
    await db
      .update(schema.mocks)
      .set({
        collectionId: targetCollection === 'root' ? null : targetCollection,
        path: newPath,
        method: normalizedMethod,
        status: body.status ?? existing.status,
        response: body.response ?? existing.response,
        delay: body.delay ?? existing.delay,
        secure: body.secure ?? existing.secure,
        updatedAt: now
      })
      .where(eq(schema.mocks.id, body.id));

    return {
      id: body.id,
      collection: targetCollection,
      path: newPath,
      method: normalizedMethod,
      status: body.status ?? existing.status,
      response: body.response ?? existing.response,
      delay: body.delay ?? existing.delay,
      secure: body.secure ?? existing.secure,
      createdAt: existing.createdAt ? new Date(existing.createdAt).toISOString() : null,
      updatedAt: now.toISOString()
    };
  } catch (error: any) {
    if (error.statusCode) throw error;
    console.error('Error updating mock:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update mock'
    });
  }
});
