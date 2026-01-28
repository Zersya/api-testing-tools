import { db, schema } from '../../db';
import { eq, and, isNull } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    if (event.method === 'GET') {
      const setting = await db
        .select()
        .from(schema.settings)
        .where(
          and(
            eq(schema.settings.key, 'bearerToken'),
            isNull(schema.settings.workspaceId)
          )
        )
        .get();

      return { 
        bearerToken: (setting?.value as string) || '' 
      };
    }

    if (event.method === 'POST') {
      const body = await readBody(event);
      const now = new Date();

      // Check if setting exists
      const existing = await db
        .select()
        .from(schema.settings)
        .where(
          and(
            eq(schema.settings.key, 'bearerToken'),
            isNull(schema.settings.workspaceId)
          )
        )
        .get();

      if (existing) {
        // Update existing
        await db
          .update(schema.settings)
          .set({
            value: body.bearerToken,
            updatedAt: now,
            lastModifiedAt: now
          })
          .where(eq(schema.settings.id, existing.id));
      } else {
        // Insert new
        await db.insert(schema.settings).values({
          key: 'bearerToken',
          value: body.bearerToken,
          createdAt: now,
          updatedAt: now,
          lastModifiedAt: now
        });
      }

      return { success: true };
    }
  } catch (error) {
    console.error('Error handling settings:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to handle settings'
    });
  }
});
