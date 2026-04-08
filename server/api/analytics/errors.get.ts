import { db } from '../../db';
import { errorReports } from '../../db/schema/errorReport';
import { desc, count, sql, and, gte, lte } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  
  // Admin-only access
  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    });
  }

  const query = getQuery(event);
  const startDate = query.startDate ? new Date(query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const endDate = query.endDate ? new Date(query.endDate as string) : new Date();

  // Get error summary
  const errorSummary = await db
    .select({
      errorType: errorReports.errorType,
      severity: errorReports.errorSeverity,
      status: errorReports.status,
      count: count(),
    })
    .from(errorReports)
    .where(and(
      gte(errorReports.createdAt, startDate),
      lte(errorReports.createdAt, endDate)
    ))
    .groupBy(errorReports.errorType, errorReports.errorSeverity, errorReports.status);

  // Get recent errors
  const recentErrors = await db
    .select()
    .from(errorReports)
    .where(and(
      gte(errorReports.createdAt, startDate),
      lte(errorReports.createdAt, endDate)
    ))
    .orderBy(desc(errorReports.createdAt))
    .limit(100);

  // Get error trends (by day)
  const errorTrends = await db
    .select({
      date: sql<string>`DATE(${errorReports.createdAt})`.as('date'),
      count: count(),
    })
    .from(errorReports)
    .where(and(
      gte(errorReports.createdAt, startDate),
      lte(errorReports.createdAt, endDate)
    ))
    .groupBy(sql`DATE(${errorReports.createdAt})`)
    .orderBy(sql`DATE(${errorReports.createdAt})`);

  // Get top affected users
  const topAffectedUsers = await db
    .select({
      userId: errorReports.userId,
      userEmail: errorReports.userEmail,
      errorCount: count(),
    })
    .from(errorReports)
    .where(and(
      gte(errorReports.createdAt, startDate),
      lte(errorReports.createdAt, endDate)
    ))
    .groupBy(errorReports.userId, errorReports.userEmail)
    .orderBy(desc(count()))
    .limit(10);

  // Get top affected workspaces
  const topAffectedWorkspaces = await db
    .select({
      workspaceId: errorReports.workspaceId,
      errorCount: count(),
    })
    .from(errorReports)
    .where(and(
      gte(errorReports.createdAt, startDate),
      lte(errorReports.createdAt, endDate)
    ))
    .groupBy(errorReports.workspaceId)
    .orderBy(desc(count()))
    .limit(10);

  return {
    summary: errorSummary,
    recentErrors,
    trends: errorTrends,
    topAffectedUsers,
    topAffectedWorkspaces,
    dateRange: {
      start: startDate,
      end: endDate,
    },
  };
});
