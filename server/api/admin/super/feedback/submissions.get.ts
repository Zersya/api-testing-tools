import { db, schema } from '../../../../db';
import { desc, sql } from 'drizzle-orm';
import { isSuperAdmin } from '../../../../utils/permissions';

interface SubmissionFilters {
  startDate?: string;
  endDate?: string;
  workspaceId?: string;
}

interface Analytics {
  totalSubmissions: number;
  averageRating: number | null;
  ratingDistribution: Record<number, number>;
  submissionsByDay: Array<{ date: string; count: number }>;
  submissionsByWorkspace: Array<{ workspaceId: string | null; count: number }>;
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
    
    const query = getQuery(event);
    const filters: SubmissionFilters = {
      startDate: query.startDate as string,
      endDate: query.endDate as string,
      workspaceId: query.workspaceId as string
    };
    
    // Build base query
    let submissionsQuery = db
      .select()
      .from(schema.feedbackSubmissions)
      .orderBy(desc(schema.feedbackSubmissions.createdAt));
    
    // Apply filters
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      submissionsQuery = submissionsQuery.where(
        sql`${schema.feedbackSubmissions.createdAt} >= ${startDate}`
      );
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      submissionsQuery = submissionsQuery.where(
        sql`${schema.feedbackSubmissions.createdAt} <= ${endDate}`
      );
    }
    
    if (filters.workspaceId) {
      submissionsQuery = submissionsQuery.where(
        sql`${schema.feedbackSubmissions.workspaceId} = ${filters.workspaceId}`
      );
    }
    
    const submissions = await submissionsQuery;
    
    // Calculate analytics
    const analytics: Analytics = {
      totalSubmissions: submissions.length,
      averageRating: null,
      ratingDistribution: {},
      submissionsByDay: [],
      submissionsByWorkspace: []
    };
    
    // Rating analytics
    const ratings = submissions
      .map(s => s.rating)
      .filter((r): r is number => r !== null && r !== undefined);
    
    if (ratings.length > 0) {
      analytics.averageRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      
      // Distribution
      ratings.forEach(rating => {
        analytics.ratingDistribution[rating] = (analytics.ratingDistribution[rating] || 0) + 1;
      });
    }
    
    // Submissions by day
    const dayMap = new Map<string, number>();
    submissions.forEach(sub => {
      const date = sub.createdAt.toISOString().split('T')[0];
      dayMap.set(date, (dayMap.get(date) || 0) + 1);
    });
    analytics.submissionsByDay = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Submissions by workspace
    const workspaceMap = new Map<string | null, number>();
    submissions.forEach(sub => {
      const wsId = sub.workspaceId || null;
      workspaceMap.set(wsId, (workspaceMap.get(wsId) || 0) + 1);
    });
    analytics.submissionsByWorkspace = Array.from(workspaceMap.entries())
      .map(([workspaceId, count]) => ({ workspaceId, count }))
      .sort((a, b) => b.count - a.count);
    
    return {
      submissions,
      analytics,
      filters
    };
  } catch (error: any) {
    console.error('[Feedback Submissions GET] Error:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch feedback submissions'
    });
  }
});
