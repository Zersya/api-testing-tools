import { db } from '../../../../db';
import { usageEvents, workspaces } from '../../../../db/schema';
import { sql, gte, lte, and, desc, eq, inArray } from 'drizzle-orm';
import { isSuperAdmin } from '../../../../utils/permissions';

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
    const startDate = query.startDate ? new Date(query.startDate as string) : getDateDaysAgo(7);
    const endDate = query.endDate ? new Date(query.endDate as string) : new Date();
    const userId = query.userId as string | undefined;
    const workspaceId = query.workspaceId as string | undefined;
    const eventType = query.eventType as string | undefined;
    const resourceType = query.resourceType as string | undefined;
    const limit = parseInt(query.limit as string) || 100;
    const offset = parseInt(query.offset as string) || 0;

    const conditions: any[] = [
      gte(usageEvents.timestamp, startDate),
      lte(usageEvents.timestamp, endDate)
    ];

    if (userId) {
      conditions.push(eq(usageEvents.userId, userId));
    }

    if (workspaceId) {
      conditions.push(eq(usageEvents.workspaceId, workspaceId));
    }

    if (eventType) {
      conditions.push(eq(usageEvents.eventType, eventType as any));
    }

    if (resourceType) {
      conditions.push(eq(usageEvents.resourceType, resourceType as any));
    }

    const events = await db
      .select()
      .from(usageEvents)
      .where(and(...conditions))
      .orderBy(desc(usageEvents.timestamp))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(usageEvents)
      .where(and(...conditions));

    const total = totalResult[0]?.count || 0;

    return {
      events,
      total,
      limit,
      offset,
      filters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userId,
        workspaceId,
        eventType,
        resourceType,
      }
    };
  } catch (error: any) {
    console.error('[Analytics Events] Error:', error);

    if (error.statusCode) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch analytics events'
    });
  }
});