import { db, schema } from '../../../db';
import { eq } from 'drizzle-orm';
import type { FeedbackVisibility } from '../../../db/schema/feedback';

interface UpdateVisibilityBody {
  visibility: FeedbackVisibility;
}

const validVisibilities: FeedbackVisibility[] = ['public', 'private'];

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.user;

    if (!user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
    }

    const submissionId = event.context.params?.id;
    if (!submissionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing submission ID'
      });
    }

    const body = await readBody<UpdateVisibilityBody>(event);

    if (!body.visibility || !validVisibilities.includes(body.visibility)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid visibility. Must be one of: ${validVisibilities.join(', ')}`
      });
    }

    // Verify submission exists and belongs to user
    const submission = await db
      .select({
        id: schema.feedbackSubmissions.id,
        userId: schema.feedbackSubmissions.userId,
        visibility: schema.feedbackSubmissions.visibility
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

    if (submission[0].userId !== user.id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'You can only modify your own submissions'
      });
    }

    const oldVisibility = submission[0].visibility;
    const newVisibility = body.visibility;

    // If changing from public to private, clear all votes
    if (oldVisibility === 'public' && newVisibility === 'private') {
      // Delete all votes for this submission
      await db
        .delete(schema.feedbackVotes)
        .where(eq(schema.feedbackVotes.submissionId, submissionId));

      // Reset upvote count
      await db
        .update(schema.feedbackSubmissions)
        .set({
          visibility: newVisibility,
          upvotes: 0
        })
        .where(eq(schema.feedbackSubmissions.id, submissionId));
    } else {
      // Just update visibility
      await db
        .update(schema.feedbackSubmissions)
        .set({ visibility: newVisibility })
        .where(eq(schema.feedbackSubmissions.id, submissionId));
    }

    return {
      success: true,
      submissionId,
      visibility: newVisibility,
      change: {
        from: oldVisibility,
        to: newVisibility
      }
    };
  } catch (error: any) {
    console.error('[Feedback Visibility PUT] Error:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update visibility'
    });
  }
});
