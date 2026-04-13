import { db } from '../../../../db';
import { usageEvents, dailyUsageStats } from '../../../../db/schema';
import { sql, gte, lte, and, desc } from 'drizzle-orm';
import { isSuperAdmin } from '../../../../utils/permissions';

interface UserStats {
  userId: string;
  userEmail: string;
  totalEvents: number;
  requestExecutions: number;
  requestCreates: number;
  requestUpdates: number;
  requestDeletes: number;
  collectionCreates: number;
  collectionUpdates: number;
  collectionDeletes: number;
  folderCreates: number;
  folderDeletes: number;
  mockCreates: number;
  mockUpdates: number;
  mockDeletes: number;
  environmentCreates: number;
  environmentUpdates: number;
  environmentDeletes: number;
  lastActive: Date | null;
  avgResponseTimeMs: number | null;
  successRate: number | null;
}

function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
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
    const startDate = query.startDate ? new Date(query.startDate as string) : getDateDaysAgo(90);
    const endDate = query.endDate ? new Date(query.endDate as string) : new Date();
    const limit = parseInt(query.limit as string) || 50;
    const offset = parseInt(query.offset as string) || 0;

    const detailedEvents = await db
      .select()
      .from(usageEvents)
      .where(gte(usageEvents.timestamp, startDate));

    const aggregatedStats = await db
      .select()
      .from(dailyUsageStats)
      .where(and(
        gte(sql`${dailyUsageStats.date}`, startDate.toISOString().split('T')[0]),
        lte(sql`${dailyUsageStats.date}`, endDate.toISOString().split('T')[0])
      ));

    const userStatsMap = new Map<string, UserStats>();

    for (const e of detailedEvents) {
      if (!userStatsMap.has(e.userId)) {
        userStatsMap.set(e.userId, {
          userId: e.userId,
          userEmail: e.userEmail,
          totalEvents: 0,
          requestExecutions: 0,
          requestCreates: 0,
          requestUpdates: 0,
          requestDeletes: 0,
          collectionCreates: 0,
          collectionUpdates: 0,
          collectionDeletes: 0,
          folderCreates: 0,
          folderDeletes: 0,
          mockCreates: 0,
          mockUpdates: 0,
          mockDeletes: 0,
          environmentCreates: 0,
          environmentUpdates: 0,
          environmentDeletes: 0,
          lastActive: null,
          avgResponseTimeMs: null,
          successRate: null,
        });
      }

      const stats = userStatsMap.get(e.userId)!;
      stats.totalEvents++;

      switch (e.eventType) {
        case 'request_execute':
          stats.requestExecutions++;
          break;
        case 'request_create':
          stats.requestCreates++;
          break;
        case 'request_update':
          stats.requestUpdates++;
          break;
        case 'request_delete':
          stats.requestDeletes++;
          break;
        case 'collection_create':
          stats.collectionCreates++;
          break;
        case 'collection_update':
          stats.collectionUpdates++;
          break;
        case 'collection_delete':
          stats.collectionDeletes++;
          break;
        case 'folder_create':
          stats.folderCreates++;
          break;
        case 'folder_delete':
          stats.folderDeletes++;
          break;
        case 'mock_create':
          stats.mockCreates++;
          break;
        case 'mock_update':
          stats.mockUpdates++;
          break;
        case 'mock_delete':
          stats.mockDeletes++;
          break;
        case 'environment_create':
          stats.environmentCreates++;
          break;
        case 'environment_update':
          stats.environmentUpdates++;
          break;
        case 'environment_delete':
          stats.environmentDeletes++;
          break;
      }

      if (!stats.lastActive || e.timestamp > stats.lastActive) {
        stats.lastActive = e.timestamp;
      }
    }

    for (const s of aggregatedStats) {
      if (!userStatsMap.has(s.userId)) {
        userStatsMap.set(s.userId, {
          userId: s.userId,
          userEmail: s.userEmail,
          totalEvents: 0,
          requestExecutions: 0,
          requestCreates: 0,
          requestUpdates: 0,
          requestDeletes: 0,
          collectionCreates: 0,
          collectionUpdates: 0,
          collectionDeletes: 0,
          folderCreates: 0,
          folderDeletes: 0,
          mockCreates: 0,
          mockUpdates: 0,
          mockDeletes: 0,
          environmentCreates: 0,
          environmentUpdates: 0,
          environmentDeletes: 0,
          lastActive: null,
          avgResponseTimeMs: null,
          successRate: null,
        });
      }

      const stats = userStatsMap.get(s.userId)!;
      stats.totalEvents += (s.requestExecutions || 0) + (s.requestCreates || 0) + (s.requestUpdates || 0) + (s.requestDeletes || 0) +
        (s.collectionCreates || 0) + (s.collectionUpdates || 0) + (s.collectionDeletes || 0) +
        (s.folderCreates || 0) + (s.mockCreates || 0) + (s.mockUpdates || 0) + (s.mockDeletes || 0) +
        (s.environmentCreates || 0) + (s.environmentUpdates || 0) + (s.environmentDeletes || 0);
      stats.requestExecutions += s.requestExecutions || 0;
      stats.requestCreates += s.requestCreates || 0;
      stats.requestUpdates += s.requestUpdates || 0;
      stats.requestDeletes += s.requestDeletes || 0;
      stats.collectionCreates += s.collectionCreates || 0;
      stats.collectionUpdates += s.collectionUpdates || 0;
      stats.collectionDeletes += s.collectionDeletes || 0;
      stats.folderCreates += s.folderCreates || 0;
      stats.mockCreates += s.mockCreates || 0;
      stats.mockUpdates += s.mockUpdates || 0;
      stats.mockDeletes += s.mockDeletes || 0;
      stats.environmentCreates += s.environmentCreates || 0;
      stats.environmentUpdates += s.environmentUpdates || 0;
      stats.environmentDeletes += s.environmentDeletes || 0;
    }

    const users = Array.from(userStatsMap.values())
      .sort((a, b) => b.totalEvents - a.totalEvents)
      .slice(offset, offset + limit);

    const total = userStatsMap.size;

    return {
      users,
      total,
      limit,
      offset,
    };
  } catch (error: any) {
    console.error('[Usage Users] Error:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch user usage'
    });
  }
});