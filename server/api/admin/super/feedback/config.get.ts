import { db, schema } from '../../../../db';
import { eq } from 'drizzle-orm';
import { isSuperAdmin } from '../../../../utils/permissions';

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user;
    
    if (!user?.email || !isSuperAdmin(user.email)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Super admin access required'
      });
    }
    
    // Get the latest config (or null if none exists)
    const config = await db
      .select()
      .from(schema.feedbackConfig)
      .orderBy(schema.feedbackConfig.createdAt)
      .limit(1);
    
    return {
      config: config[0] || null
    };
  } catch (error: any) {
    console.error('[Feedback Config GET] Error:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch feedback configuration'
    });
  }
});
