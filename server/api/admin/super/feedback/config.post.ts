import { db, schema, type FeedbackQuestion } from '../../../../db';
import { eq } from 'drizzle-orm';
import { isSuperAdmin } from '../../../../utils/permissions';

interface UpdateConfigBody {
  isEnabled: boolean;
  shownFrom?: string | null;
  shownUntil?: string | null;
  title?: string;
  description?: string;
  questions?: FeedbackQuestion[];
}

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user;
    
    if (!user?.email || !isSuperAdmin(user.email)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Super admin access required'
      });
    }
    
    const body = await readBody<UpdateConfigBody>(event);
    const now = new Date();
    
    // Validate dates
    let shownFrom = body.shownFrom ? new Date(body.shownFrom) : null;
    let shownUntil = body.shownUntil ? new Date(body.shownUntil) : null;
    
    if (shownFrom && isNaN(shownFrom.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid shownFrom date'
      });
    }
    
    if (shownUntil && isNaN(shownUntil.getTime())) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid shownUntil date'
      });
    }
    
    if (shownFrom && shownUntil && shownFrom > shownUntil) {
      throw createError({
        statusCode: 400,
        statusMessage: 'shownFrom must be before shownUntil'
      });
    }
    
    // Check if config exists
    const existing = await db
      .select()
      .from(schema.feedbackConfig)
      .orderBy(schema.feedbackConfig.createdAt)
      .limit(1);
    
    let config;
    
    if (existing.length) {
      // Update existing
      config = await db
        .update(schema.feedbackConfig)
        .set({
          isEnabled: body.isEnabled,
          shownFrom,
          shownUntil,
          title: body.title || existing[0].title,
          description: body.description ?? existing[0].description,
          questions: body.questions || existing[0].questions,
          updatedAt: now,
          createdBy: user.email
        })
        .where(eq(schema.feedbackConfig.id, existing[0].id))
        .returning();
    } else {
      // Create new
      config = await db
        .insert(schema.feedbackConfig)
        .values({
          isEnabled: body.isEnabled,
          shownFrom,
          shownUntil,
          title: body.title || 'We value your feedback',
          description: body.description,
          questions: body.questions || [],
          createdAt: now,
          updatedAt: now,
          createdBy: user.email
        })
        .returning();
    }
    
    return {
      success: true,
      config: config[0]
    };
  } catch (error: any) {
    console.error('[Feedback Config POST] Error:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update feedback configuration'
    });
  }
});
