import { db, schema } from '../../../db';
import { eq, and } from 'drizzle-orm';

interface VoteBody {
  action: 'upvote' | 'downvote';
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

    const submissionId = event.context.params?.id;
    if (!submissionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing submission ID'
      });
    }

    // Verify submission exists and is public
    const submission = await db
      .select({
        id: schema.feedbackSubmissions.id,
        visibility: schema.feedbackSubmissions.visibility,
        upvotes: schema.feedbackSubmissions.upvotes
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

    if (submission[0].visibility !== 'public') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Cannot vote on private submissions'
      });
    }

    const body = await readBody<VoteBody>(event);
    const action = body.action;

    // Check if user has already voted
    const existingVote = await db
      .select({ id: schema.feedbackVotes.id })
      .from(schema.feedbackVotes)
      .where(
        eq(schema.feedbackVotes.submissionId, submissionId),
        eq(schema.feedbackVotes.userId, user.id)
      )
      .limit(1);

    let newUpvoteCount = submission[0].upvotes;
    let userVoted = false;

    if (action === 'upvote') {
      if (existingVote.length > 0) {
        // Already voted - remove vote (toggle off)
        await db
          .delete(schema.feedbackVotes)
          .where(eq(schema.feedbackVotes.id, existingVote[0].id));

        newUpvoteCount = Math.max(0, newUpvoteCount - 1);
        userVoted = false;
      } else {
        // Add new vote
        await db
          .insert(schema.feedbackVotes)
          .values({
            submissionId,
            userId: user.id,
            userEmail: user.email,
            createdAt: new Date()
          });

        newUpvoteCount = newUpvoteCount + 1;
        userVoted = true;
      }
    } else if (action === 'downvote') {
      // Remove vote if exists
      if (existingVote.length > 0) {
        await db
          .delete(schema.feedbackVotes)
          .where(eq(schema.feedbackVotes.id, existingVote[0].id));

        newUpvoteCount = Math.max(0, newUpvoteCount - 1);
      }
      userVoted = false;
    }

    // Update submission upvote count
    await db
      .update(schema.feedbackSubmissions)
      .set({ upvotes: newUpvoteCount })
      .where(eq(schema.feedbackSubmissions.id, submissionId));

    return {
      success: true,
      upvotes: newUpvoteCount,
      userVoted,
      action
    };
  } catch (error: any) {
    console.error('[Feedback Vote POST] Error:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process vote'
    });
  }
});
