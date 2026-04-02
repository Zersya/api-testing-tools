import { db, schema } from '../../../../../db';
import { eq, desc } from 'drizzle-orm';
import { isSuperAdmin } from '../../../../../utils/permissions';
import type { FeedbackStatus } from '../../../../../db/schema/feedback';

interface UpdateSubmissionBody {
  status: FeedbackStatus;
}

const validStatuses: FeedbackStatus[] = ['open', 'pending', 'process', 'resolved', 'closed'];

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
    
    const body = await readBody<UpdateSubmissionBody>(event);
    
    if (!body.status || !validStatuses.includes(body.status)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Get current submission
    const submission = await db
      .select({
        id: schema.feedbackSubmissions.id,
        status: schema.feedbackSubmissions.status
      })
      .from(schema.feedbackSubmissions)
      .where(eq(schema.feedbackSubmissions.id, submissionId))
      .limit(1);
    
    if (!submission.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Submission not found'
      });
    }
    
    const currentStatus = submission[0].status as FeedbackStatus;
    const newStatus = body.status;
    
    // Don't update if status is the same
    if (currentStatus === newStatus) {
      return {
        success: true,
        submission: submission[0],
        message: 'Status unchanged'
      };
    }
    
    // Update submission status
    await db
      .update(schema.feedbackSubmissions)
      .set({ status: newStatus })
      .where(eq(schema.feedbackSubmissions.id, submissionId));
    
    // Record status change in history
    await db
      .insert(schema.feedbackStatusHistory)
      .values({
        submissionId,
        fromStatus: currentStatus,
        toStatus: newStatus,
        changedBy: user.email,
        changedAt: new Date()
      });
    
    // Get updated submission with full details
    const updatedSubmission = await db
      .select()
      .from(schema.feedbackSubmissions)
      .where(eq(schema.feedbackSubmissions.id, submissionId))
      .limit(1);
    
    // Get recent history for the submission
    const historyRecords = await db
      .select({
        id: schema.feedbackStatusHistory.id,
        fromStatus: schema.feedbackStatusHistory.fromStatus,
        toStatus: schema.feedbackStatusHistory.toStatus,
        changedBy: schema.feedbackStatusHistory.changedBy,
        changedAt: schema.feedbackStatusHistory.changedAt
      })
      .from(schema.feedbackStatusHistory)
      .where(eq(schema.feedbackStatusHistory.submissionId, submissionId))
      .orderBy(desc(schema.feedbackStatusHistory.changedAt))
      .limit(5);
    
    return {
      success: true,
      submission: {
        ...updatedSubmission[0],
        createdAt: updatedSubmission[0].createdAt.toISOString()
      },
      statusHistory: historyRecords.map(h => ({
        ...h,
        changedAt: h.changedAt.toISOString()
      })),
      change: {
        from: currentStatus,
        to: newStatus,
        changedBy: user.email,
        changedAt: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error('[Feedback Submission PUT] Error:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update submission status'
    });
  }
});
