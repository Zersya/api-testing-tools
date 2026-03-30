import { db } from '../../../../db';
import { usageEvents, dailyUsageStats, workspaces } from '../../../../db/schema';
import { sql, gte, lte, and, desc } from 'drizzle-orm';
import { isSuperAdmin } from '../../../../utils/permissions';

interface WorkspaceStats {
  workspaceId: string;
  workspaceName: string;
  totalEvents: number;
  activeUsers: number;
  requestExecutions: number;
  resourceCreates: number;
  resourceUpdates: number;
  resourceDeletes: number;
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

    const allWorkspaces = await db.select().from(workspaces);
    const workspaceMap = new Map(allWorkspaces.map(w => [w.id, w.name]));

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

    const workspaceStatsMap = new Map<string, WorkspaceStats>();
    const workspaceUsersMap = new Map<string, Set<string>>();

    for (const e of detailedEvents) {
      if (!workspaceStatsMap.has(e.workspaceId)) {
        workspaceStatsMap.set(e.workspaceId, {
          workspaceId: e.workspaceId,
          workspaceName: workspaceMap.get(e.workspaceId) || 'Unknown',
          totalEvents: 0,
          activeUsers: 0,
          requestExecutions: 0,
          resourceCreates: 0,
          resourceUpdates: 0,
          resourceDeletes: 0,
          lastActive: null,
          avgResponseTimeMs: null,
          successRate: null,
        });
        workspaceUsersMap.set(e.workspaceId, new Set());
      }

      const stats = workspaceStatsMap.get(e.workspaceId)!;
      const users = workspaceUsersMap.get(e.workspaceId)!;
      users.add(e.userId);

      stats.totalEvents++;

      if (e.eventType === 'request_execute') {
        stats.requestExecutions++;
      } else if (e.eventType.endsWith('_create')) {
        stats.resourceCreates++;
      } else if (e.eventType.endsWith('_update')) {
        stats.resourceUpdates++;
      } else if (e.eventType.endsWith('_delete')) {
        stats.resourceDeletes++;
      }

      if (!stats.lastActive || e.timestamp > stats.lastActive) {
        stats.lastActive = e.timestamp;
      }
    }

    for (const s of aggregatedStats) {
      if (!workspaceStatsMap.has(s.workspaceId)) {
        workspaceStatsMap.set(s.workspaceId, {
          workspaceId: s.workspaceId,
          workspaceName: workspaceMap.get(s.workspaceId) || 'Unknown',
          totalEvents: 0,
          activeUsers: 0,
          requestExecutions: 0,
          resourceCreates: 0,
          resourceUpdates: 0,
          resourceDeletes: 0,
          lastActive: null,
          avgResponseTimeMs: null,
          successRate: null,
        });
        workspaceUsersMap.set(s.workspaceId, new Set());
      }

      const stats = workspaceStatsMap.get(s.workspaceId)!;
      const users = workspaceUsersMap.get(s.workspaceId)!;
      users.add(s.userId);

      const totalFromAgg = (s.requestExecutions || 0) + (s.requestCreates || 0) + (s.requestUpdates || 0) + (s.requestDeletes || 0) +
        (s.collectionCreates || 0) + (s.collectionUpdates || 0) + (s.collectionDeletes || 0) +
        (s.folderCreates || 0) + (s.mockCreates || 0) + (s.mockUpdates || 0) + (s.mockDeletes || 0) +
        (s.environmentCreates || 0) + (s.environmentUpdates || 0) + (s.environmentDeletes || 0);

      stats.totalEvents += totalFromAgg;
      stats.requestExecutions += s.requestExecutions || 0;
      stats.resourceCreates += (s.requestCreates || 0) + (s.collectionCreates || 0) + (s.folderCreates || 0) +
        (s.mockCreates || 0) + (s.environmentCreates || 0);
      stats.resourceUpdates += (s.requestUpdates || 0) + (s.collectionUpdates || 0) +
        (s.mockUpdates || 0) + (s.environmentUpdates || 0);
      stats.resourceDeletes += (s.requestDeletes || 0) + (s.collectionDeletes || 0) + (s.folderDeletes || 0) +
        (s.mockDeletes || 0) + (s.environmentDeletes || 0);
    }

    for (const [workspaceId, stats] of workspaceStatsMap) {
      stats.activeUsers = workspaceUsersMap.get(workspaceId)?.size || 0;
    }

    const workspacesList = Array.from(workspaceStatsMap.values())
      .sort((a, b) => b.totalEvents - a.totalEvents);

    return {
      workspaces: workspacesList,
      total: workspacesList.length,
    };
  } catch (error: any) {
    console.error('[Analytics Workspaces] Error:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch workspace analytics'
    });
  }
});