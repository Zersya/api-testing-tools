import { db } from '../../../../db';
import { usageEvents, dailyUsageStats } from '../../../../db/schema';
import { sql, gte, lte, and, desc } from 'drizzle-orm';
import { isSuperAdmin } from '../../../../utils/permissions';

interface DailyTrend {
  date: string;
  totalEvents: number;
  requestExecutions: number;
  resourceCreates: number;
  resourceUpdates: number;
  resourceDeletes: number;
  avgResponseTimeMs: number | null;
  successRate: number | null;
  activeUsers: number;
}

function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
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
    const startDate = query.startDate ? new Date(query.startDate as string) : getDateDaysAgo(30);
    const endDate = query.endDate ? new Date(query.endDate as string) : new Date();
    const granularity = (query.granularity as string) || 'daily';

    const detailedEvents = await db
      .select()
      .from(usageEvents)
      .where(and(
        gte(usageEvents.timestamp, startDate),
        lte(usageEvents.timestamp, endDate)
      ));

    const aggregatedStats = await db
      .select()
      .from(dailyUsageStats)
      .where(and(
        gte(sql`${dailyUsageStats.date}`, getDateStr(startDate)),
        lte(sql`${dailyUsageStats.date}`, getDateStr(endDate))
      ));

    const dailyMap = new Map<string, DailyTrend>();

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = getDateStr(currentDate);
      dailyMap.set(dateStr, {
        date: dateStr,
        totalEvents: 0,
        requestExecutions: 0,
        resourceCreates: 0,
        resourceUpdates: 0,
        resourceDeletes: 0,
        avgResponseTimeMs: null,
        successRate: null,
        activeUsers: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const e of detailedEvents) {
      const dateStr = getDateStr(e.timestamp);
      const trend = dailyMap.get(dateStr);
      if (trend) {
        trend.totalEvents++;
        if (e.eventType === 'request_execute') {
          trend.requestExecutions++;
        } else if (e.eventType.endsWith('_create')) {
          trend.resourceCreates++;
        } else if (e.eventType.endsWith('_update')) {
          trend.resourceUpdates++;
        } else if (e.eventType.endsWith('_delete')) {
          trend.resourceDeletes++;
        }
      }
    }

    for (const s of aggregatedStats) {
      const trend = dailyMap.get(s.date);
      if (trend) {
        const totalFromAgg = (s.requestExecutions || 0) + (s.requestCreates || 0) + (s.requestUpdates || 0) + (s.requestDeletes || 0) +
          (s.collectionCreates || 0) + (s.collectionUpdates || 0) + (s.collectionDeletes || 0) +
          (s.folderCreates || 0) + (s.mockCreates || 0) + (s.mockUpdates || 0) + (s.mockDeletes || 0) +
          (s.environmentCreates || 0) + (s.environmentUpdates || 0) + (s.environmentDeletes || 0);
        trend.totalEvents += totalFromAgg;
        trend.requestExecutions += s.requestExecutions || 0;
        trend.resourceCreates += (s.requestCreates || 0) + (s.collectionCreates || 0) + (s.folderCreates || 0) +
          (s.mockCreates || 0) + (s.environmentCreates || 0);
        trend.resourceUpdates += (s.requestUpdates || 0) + (s.collectionUpdates || 0) +
          (s.mockUpdates || 0) + (s.environmentUpdates || 0);
        trend.resourceDeletes += (s.requestDeletes || 0) + (s.collectionDeletes || 0) + (s.folderDeletes || 0) +
          (s.mockDeletes || 0) + (s.environmentDeletes || 0);
      }
    }

    const dailyUsersMap = new Map<string, Set<string>>();
    for (const e of detailedEvents) {
      const dateStr = getDateStr(e.timestamp);
      if (!dailyUsersMap.has(dateStr)) {
        dailyUsersMap.set(dateStr, new Set());
      }
      dailyUsersMap.get(dateStr)!.add(e.userId);
    }
    for (const s of aggregatedStats) {
      if (!dailyUsersMap.has(s.date)) {
        dailyUsersMap.set(s.date, new Set());
      }
      dailyUsersMap.get(s.date)!.add(s.userId);
    }

    for (const [dateStr, users] of dailyUsersMap) {
      const trend = dailyMap.get(dateStr);
      if (trend) {
        trend.activeUsers = users.size;
      }
    }

    const responseTimesByDate = new Map<string, number[]>();
    for (const e of detailedEvents) {
      if (e.responseTimeMs !== null) {
        const dateStr = getDateStr(e.timestamp);
        if (!responseTimesByDate.has(dateStr)) {
          responseTimesByDate.set(dateStr, []);
        }
        responseTimesByDate.get(dateStr)!.push(e.responseTimeMs);
      }
    }

    for (const [dateStr, times] of responseTimesByDate) {
      const trend = dailyMap.get(dateStr);
      if (trend && times.length > 0) {
        trend.avgResponseTimeMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      }
    }

    const successByDate = new Map<string, { success: number; total: number }>();
    for (const e of detailedEvents) {
      if (e.eventType === 'request_execute' && e.success !== null) {
        const dateStr = getDateStr(e.timestamp);
        if (!successByDate.has(dateStr)) {
          successByDate.set(dateStr, { success: 0, total: 0 });
        }
        const stats = successByDate.get(dateStr)!;
        stats.total++;
        if (e.success) stats.success++;
      }
    }

    for (const [dateStr, stats] of successByDate) {
      const trend = dailyMap.get(dateStr);
      if (trend && stats.total > 0) {
        trend.successRate = Math.round((stats.success / stats.total) * 100);
      }
    }

    const trends = Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      trends,
      granularity,
      startDate: getDateStr(startDate),
      endDate: getDateStr(endDate),
    };
  } catch (error: any) {
    console.error('[Analytics Trends] Error:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch analytics trends'
    });
  }
});