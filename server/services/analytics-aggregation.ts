import { db } from '../db';
import { usageEvents, dailyUsageStats, type UsageEventType } from '../db/schema/usageAnalytics';
import { sql, and, gte, lte, lt, isNotNull } from 'drizzle-orm';

const DETAILED_RETENTION_DAYS = 90;

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function getEventCountField(eventType: UsageEventType): string {
  const mapping: Record<UsageEventType, string> = {
    request_execute: 'requestExecutions',
    request_create: 'requestCreates',
    request_update: 'requestUpdates',
    request_delete: 'requestDeletes',
    collection_create: 'collectionCreates',
    collection_update: 'collectionUpdates',
    collection_delete: 'collectionDeletes',
    folder_create: 'folderCreates',
    folder_update: 'folderUpdates',
    folder_delete: 'folderDeletes',
    mock_create: 'mockCreates',
    mock_update: 'mockUpdates',
    mock_delete: 'mockDeletes',
    environment_create: 'environmentCreates',
    environment_update: 'environmentUpdates',
    environment_delete: 'environmentDeletes',
    project_create: 'projectCreates',
    project_update: 'projectUpdates',
    project_delete: 'projectDeletes',
    workspace_create: 'workspaceCreates',
    workspace_update: 'workspaceUpdates',
    workspace_delete: 'workspaceDeletes',
  };
  return mapping[eventType] || 'requestExecutions';
}

export async function aggregateOldEvents(): Promise<void> {
  try {
    const cutoffDate = getDateDaysAgo(DETAILED_RETENTION_DAYS);
    const cutoffTimestamp = new Date(cutoffDate);

    console.log(`[Analytics Aggregation] Aggregating events older than ${cutoffDate}`);

    const oldEvents = await db
      .select()
      .from(usageEvents)
      .where(lt(usageEvents.timestamp, cutoffTimestamp));

    if (oldEvents.length === 0) {
      console.log('[Analytics Aggregation] No old events to aggregate');
      return;
    }

    console.log(`[Analytics Aggregation] Found ${oldEvents.length} events to aggregate`);

    const aggregationMap = new Map<string, {
      date: string;
      userId: string;
      userEmail: string;
      workspaceId: string;
      counts: Record<string, number>;
      responseTimes: number[];
      successCount: number;
      failureCount: number;
    }>();

    for (const event of oldEvents) {
      const date = event.timestamp.toISOString().split('T')[0];
      const key = `${date}-${event.userId}-${event.workspaceId}`;

      if (!aggregationMap.has(key)) {
        aggregationMap.set(key, {
          date,
          userId: event.userId,
          userEmail: event.userEmail,
          workspaceId: event.workspaceId,
          counts: {},
          responseTimes: [],
          successCount: 0,
          failureCount: 0,
        });
      }

      const agg = aggregationMap.get(key)!;
      const countField = getEventCountField(event.eventType);
      agg.counts[countField] = (agg.counts[countField] || 0) + 1;

      if (event.responseTimeMs !== null) {
        agg.responseTimes.push(event.responseTimeMs);
      }

      if (event.success === true) {
        agg.successCount++;
      } else if (event.success === false) {
        agg.failureCount++;
      }
    }

    for (const [_, agg] of aggregationMap) {
      const avgResponseTime = agg.responseTimes.length > 0
        ? Math.round(agg.responseTimes.reduce((a, b) => a + b, 0) / agg.responseTimes.length)
        : null;

      const totalRequests = agg.successCount + agg.failureCount;
      const successRate = totalRequests > 0
        ? Math.round((agg.successCount / totalRequests) * 100)
        : null;

      const existingStat = await db
        .select()
        .from(dailyUsageStats)
        .where(and(
          sql`${dailyUsageStats.date} = ${agg.date}`,
          sql`${dailyUsageStats.userId} = ${agg.userId}`,
          sql`${dailyUsageStats.workspaceId} = ${agg.workspaceId}`
        ))
        .limit(1);

      if (existingStat.length > 0) {
        const existing = existingStat[0];
        await db
          .update(dailyUsageStats)
          .set({
            requestExecutions: (existing.requestExecutions || 0) + (agg.counts.requestExecutions || 0),
            requestCreates: (existing.requestCreates || 0) + (agg.counts.requestCreates || 0),
            requestUpdates: (existing.requestUpdates || 0) + (agg.counts.requestUpdates || 0),
            requestDeletes: (existing.requestDeletes || 0) + (agg.counts.requestDeletes || 0),
            collectionCreates: (existing.collectionCreates || 0) + (agg.counts.collectionCreates || 0),
            collectionUpdates: (existing.collectionUpdates || 0) + (agg.counts.collectionUpdates || 0),
            collectionDeletes: (existing.collectionDeletes || 0) + (agg.counts.collectionDeletes || 0),
            folderCreates: (existing.folderCreates || 0) + (agg.counts.folderCreates || 0),
            folderUpdates: (existing.folderUpdates || 0) + (agg.counts.folderUpdates || 0),
            folderDeletes: (existing.folderDeletes || 0) + (agg.counts.folderDeletes || 0),
            mockCreates: (existing.mockCreates || 0) + (agg.counts.mockCreates || 0),
            mockUpdates: (existing.mockUpdates || 0) + (agg.counts.mockUpdates || 0),
            mockDeletes: (existing.mockDeletes || 0) + (agg.counts.mockDeletes || 0),
            environmentCreates: (existing.environmentCreates || 0) + (agg.counts.environmentCreates || 0),
            environmentUpdates: (existing.environmentUpdates || 0) + (agg.counts.environmentUpdates || 0),
            environmentDeletes: (existing.environmentDeletes || 0) + (agg.counts.environmentDeletes || 0),
            projectCreates: (existing.projectCreates || 0) + (agg.counts.projectCreates || 0),
            projectUpdates: (existing.projectUpdates || 0) + (agg.counts.projectUpdates || 0),
            projectDeletes: (existing.projectDeletes || 0) + (agg.counts.projectDeletes || 0),
            workspaceCreates: (existing.workspaceCreates || 0) + (agg.counts.workspaceCreates || 0),
            workspaceUpdates: (existing.workspaceUpdates || 0) + (agg.counts.workspaceUpdates || 0),
            workspaceDeletes: (existing.workspaceDeletes || 0) + (agg.counts.workspaceDeletes || 0),
            avgResponseTimeMs: avgResponseTime,
            successRate: successRate,
            totalSuccessCount: (existing.totalSuccessCount || 0) + agg.successCount,
            totalFailureCount: (existing.totalFailureCount || 0) + agg.failureCount,
          })
          .where(sql`${dailyUsageStats.id} = ${existing.id}`);
      } else {
        await db.insert(dailyUsageStats).values({
          date: agg.date,
          userId: agg.userId,
          userEmail: agg.userEmail,
          workspaceId: agg.workspaceId,
          requestExecutions: agg.counts.requestExecutions || 0,
          requestCreates: agg.counts.requestCreates || 0,
          requestUpdates: agg.counts.requestUpdates || 0,
          requestDeletes: agg.counts.requestDeletes || 0,
          collectionCreates: agg.counts.collectionCreates || 0,
          collectionUpdates: agg.counts.collectionUpdates || 0,
          collectionDeletes: agg.counts.collectionDeletes || 0,
          folderCreates: agg.counts.folderCreates || 0,
          folderUpdates: agg.counts.folderUpdates || 0,
          folderDeletes: agg.counts.folderDeletes || 0,
          mockCreates: agg.counts.mockCreates || 0,
          mockUpdates: agg.counts.mockUpdates || 0,
          mockDeletes: agg.counts.mockDeletes || 0,
          environmentCreates: agg.counts.environmentCreates || 0,
          environmentUpdates: agg.counts.environmentUpdates || 0,
          environmentDeletes: agg.counts.environmentDeletes || 0,
          projectCreates: agg.counts.projectCreates || 0,
          projectUpdates: agg.counts.projectUpdates || 0,
          projectDeletes: agg.counts.projectDeletes || 0,
          workspaceCreates: agg.counts.workspaceCreates || 0,
          workspaceUpdates: agg.counts.workspaceUpdates || 0,
          workspaceDeletes: agg.counts.workspaceDeletes || 0,
          avgResponseTimeMs: avgResponseTime,
          successRate: successRate,
          totalSuccessCount: agg.successCount,
          totalFailureCount: agg.failureCount,
        });
      }
    }

    console.log(`[Analytics Aggregation] Aggregated ${aggregationMap.size} daily stat records`);
  } catch (error) {
    console.error('[Analytics Aggregation] Error aggregating events:', error);
    throw error;
  }
}

export async function cleanupAggregatedEvents(): Promise<void> {
  try {
    const cutoffDate = getDateDaysAgo(DETAILED_RETENTION_DAYS);
    const cutoffTimestamp = new Date(cutoffDate);

    console.log(`[Analytics Cleanup] Deleting events older than ${cutoffDate}`);

    const result = await db
      .delete(usageEvents)
      .where(lt(usageEvents.timestamp, cutoffTimestamp));

    console.log(`[Analytics Cleanup] Deleted old events`);
  } catch (error) {
    console.error('[Analytics Cleanup] Error cleaning up events:', error);
    throw error;
  }
}

export async function runAggregationAndCleanup(): Promise<void> {
  console.log('[Analytics] Starting aggregation and cleanup process...');
  await aggregateOldEvents();
  await cleanupAggregatedEvents();
  console.log('[Analytics] Aggregation and cleanup completed');
}