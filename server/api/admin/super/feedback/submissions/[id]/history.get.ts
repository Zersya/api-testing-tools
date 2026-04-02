import { db, schema } from '../../../../../../db';
import { eq, desc } from 'drizzle-orm';
import { isSuperAdmin } from '../../../../../../utils/permissions';
import type { FeedbackStatus } from '../../../../../../db/schema/feedback';

interface StatusHistoryRecord {
  id: string;
  submissionId: string;
  fromStatus: FeedbackStatus;
  toStatus: FeedbackStatus;
  changedBy: string;
  changedAt: string;
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
    
    const submissionId = event.context.params?.id;
    if (!submissionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing submission ID'
      });
    }
    
    // Verify submission exists
    const submission = await db
      .select({ id: schema.feedbackSubmissions.id })
      .from(schema.feedbackSubmissions)
      .where(eq(schema.feedbackSubmissions.id, submissionId))
      .limit(1);
    
    if (!submission.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Submission not found'
      });
    }
    
    // Get full status history
    const historyRecords = await db
      .select({
        id: schema.feedbackStatusHistory.id,
        submissionId: schema.feedbackStatusHistory.submissionId,
        fromStatus: schema.feedbackStatusHistory.fromStatus,
        toStatus: schema.feedbackStatusHistory.toStatus,
        changedBy: schema.feedbackStatusHistory.changedBy,
        changedAt: schema.feedbackStatusHistory.changedAt
      })
      .from(schema.feedbackStatusHistory)
      .where(eq(schema.feedbackStatusHistory.submissionId, submissionId))
      .orderBy(desc(schema.feedbackStatusHistory.changedAt));
    
    const formattedHistory: StatusHistoryRecord[] = historyRecords.map(h => ({
      id: h.id,
      submissionId: h.submissionId,
      fromStatus: h.fromStatus as FeedbackStatus,
      toStatus: h.toStatus as FeedbackStatus,
      changedBy: h.changedBy,
      changedAt: h.changedAt.toISOString()
    }));
    
    return {
      submissionId,
      history: formattedHistory,
      count: formattedHistory.length
    };
  } catch (error: any) {
    console.error('[Feedback Status History GET] Error:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch status history'
    });
  }
});
