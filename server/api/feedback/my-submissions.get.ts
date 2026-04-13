import { db, schema } from '../../db';
import { desc, eq, inArray } from 'drizzle-orm';
import type { FeedbackStatus, FeedbackVisibility } from '../../db/schema/feedback';

interface StatusHistoryRecord {
  id: string;
  fromStatus: FeedbackStatus;
  toStatus: FeedbackStatus;
  changedBy: string;
  changedAt: string;
}

interface MySubmission {
  id: string;
  responses: Record<string, unknown>;
  rating: number | null;
  comment: string | null;
  status: FeedbackStatus;
  visibility: FeedbackVisibility;
  upvotes: number;
  createdAt: string;
  userVoted: boolean;
  recentHistory: StatusHistoryRecord[];
}

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user;

    if (!user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
    }

    // Fetch user's submissions
    const submissions = await db
      .select()
      .from(schema.feedbackSubmissions)
      .where(eq(schema.feedbackSubmissions.userId, user.id))
      .orderBy(desc(schema.feedbackSubmissions.createdAt));

    // Get submission IDs
    const submissionIds = submissions.map(s => s.id);

    // Fetch user's votes to know which submissions they've voted on
    let userVotes = new Set<string>();
    if (submissionIds.length > 0) {
      const votes = await db
        .select({ submissionId: schema.feedbackVotes.submissionId })
        .from(schema.feedbackVotes)
        .where(
          inArray(schema.feedbackVotes.submissionId, submissionIds),
          eq(schema.feedbackVotes.userId, user.id)
        );
      userVotes = new Set(votes.map(v => v.submissionId));
    }

    // Fetch recent status history for all submissions
    let historyMap = new Map<string, StatusHistoryRecord[]>();
    if (submissionIds.length > 0) {
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
        .where(inArray(schema.feedbackStatusHistory.submissionId, submissionIds))
        .orderBy(desc(schema.feedbackStatusHistory.changedAt));

      // Group by submissionId, keeping only recent 3 per submission
      for (const record of historyRecords) {
        if (!historyMap.has(record.submissionId)) {
          historyMap.set(record.submissionId, []);
        }
        const list = historyMap.get(record.submissionId)!;
        if (list.length < 3) {
          list.push({
            id: record.id,
            fromStatus: record.fromStatus as FeedbackStatus,
            toStatus: record.toStatus as FeedbackStatus,
            changedBy: record.changedBy,
            changedAt: record.changedAt.toISOString()
          });
        }
      }
    }

    // Combine submissions with history
    const submissionsWithDetails: MySubmission[] = submissions.map(sub => ({
      id: sub.id,
      responses: sub.responses,
      rating: sub.rating,
      comment: sub.comment,
      status: sub.status as FeedbackStatus,
      visibility: sub.visibility as FeedbackVisibility,
      upvotes: sub.upvotes,
      createdAt: sub.createdAt.toISOString(),
      userVoted: userVotes.has(sub.id),
      recentHistory: historyMap.get(sub.id) || []
    }));

    return {
      submissions: submissionsWithDetails,
      total: submissions.length,
      publicCount: submissions.filter(s => s.visibility === 'public').length,
      totalUpvotes: submissions.reduce((sum, s) => sum + s.upvotes, 0)
    };
  } catch (error: any) {
    console.error('[My Submissions GET] Error:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch your submissions'
    });
  }
});
