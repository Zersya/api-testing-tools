import { db, schema } from '../../db';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  try {
    const now = new Date();
    
    // Get the active feedback configuration
    const config = await db
      .select()
      .from(schema.feedbackConfig)
      .where(eq(schema.feedbackConfig.isEnabled, true))
      .orderBy(schema.feedbackConfig.createdAt)
      .limit(1);
    
    if (!config.length) {
      return {
        isVisible: false,
        config: null
      };
    }
    
    const feedbackConfig = config[0];
    
    // Check if current time is within the visibility window
    const isInTimeWindow = (
      // No start time restriction OR now is after start
      (!feedbackConfig.shownFrom || feedbackConfig.shownFrom <= now) &&
      // No end time restriction OR now is before end
      (!feedbackConfig.shownUntil || feedbackConfig.shownUntil >= now)
    );
    
    if (!isInTimeWindow) {
      return {
        isVisible: false,
        config: null
      };
    }
    
    // Return sanitized config (without internal fields)
    return {
      isVisible: true,
      config: {
        id: feedbackConfig.id,
        title: feedbackConfig.title,
        description: feedbackConfig.description,
        questions: feedbackConfig.questions,
        shownUntil: feedbackConfig.shownUntil
      }
    };
  } catch (error) {
    console.error('[Feedback Status] Error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to check feedback status'
    });
  }
});
