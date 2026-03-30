import { db } from '../../../../../../db';
import { environments } from '../../../../../../db/schema';
import { eq } from 'drizzle-orm';
import { isSuperAdmin } from '../../../../../../utils/permissions';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const user = event.context.user;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment ID is required'
    });
  }

  if (!isSuperAdmin(user.email)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only Super Admin can activate environments'
    });
  }

  try {
    const existing = (await db
      .select()
      .from(environments)
      .where(eq(environments.id, id))
      .limit(1))[0];

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Environment not found'
      });
    }

    if (existing.isActive) {
      return existing;
    }

    await db.update(environments)
      .set({ isActive: false })
      .where(eq(environments.projectId, existing.projectId));

    const activated = (await db
      .update(environments)
      .set({ isActive: true })
      .where(eq(environments.id, id))
      .returning())[0];

    return activated;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    console.error('Error activating environment:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to activate environment'
    });
  }
});