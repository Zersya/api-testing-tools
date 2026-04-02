import { db, schema } from '../../db';
import { eq } from 'drizzle-orm';

interface SubmitFeedbackBody {
  responses: Record<string, unknown>;
  rating?: number;
  comment?: string;
}

export default defineEventHandler(async (event) => {
  try {
    // Get authenticated user
    const user = event.context.user;
    if (!user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
    }
    
    const now = new Date();
    
    // Verify feedback is currently active
    const config = await db
      .select()
      .from(schema.feedbackConfig)
      .where(eq(schema.feedbackConfig.isEnabled, true))
      .orderBy(schema.feedbackConfig.createdAt)
      .limit(1);
    
    if (!config.length) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Feedback is not currently active'
      });
    }
    
    const feedbackConfig = config[0];
    
    // Check time window
    const isInTimeWindow = (
      (!feedbackConfig.shownFrom || feedbackConfig.shownFrom <= now) &&
      (!feedbackConfig.shownUntil || feedbackConfig.shownUntil >= now)
    );
    
    if (!isInTimeWindow) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Feedback submission window has closed'
      });
    }
    
    // Parse body
    const body = await readBody<SubmitFeedbackBody>(event);
    
    if (!body.responses || typeof body.responses !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid feedback data'
      });
    }
    
    // Get request info
    const headers = getRequestHeaders(event);
    const userAgent = headers['user-agent'] || null;
    
    // Create submission
    const submission = await db
      .insert(schema.feedbackSubmissions)
      .values({
        userId: user.id,
        userEmail: user.email,
        workspaceId: user.workspaceId,
        responses: body.responses,
        rating: body.rating,
        comment: body.comment,
        status: 'open', // Default status for new submissions
        userAgent,
        createdAt: now
      })
      .returning();
    
    return {
      success: true,
      submissionId: submission[0].id
    };
  } catch (error: any) {
    console.error('[Feedback Submit] Error:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to submit feedback'
    });
  }
});
