import { db } from '../../../../db';
import { savedRequests, usageEvents } from '../../../../db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

const ACTIVITY_EVENT_TYPES = ['request_create', 'request_update'] as const;

export interface RequestActivityEvent {
  id: string;
  eventType: typeof ACTIVITY_EVENT_TYPES[number];
  userId: string;
  userEmail: string;
  resourceName: string | null;
  timestamp: string;
}

export default defineEventHandler(async (event) => {
  const requestId = getRouterParam(event, 'id');

  if (!requestId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Request ID is required'
    });
  }

  try {
    const request = await db
      .select({ id: savedRequests.id })
      .from(savedRequests)
      .where(eq(savedRequests.id, requestId))
      .limit(1);

    if (!request.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Request not found'
      });
    }

    const events = await db
      .select({
        id: usageEvents.id,
        eventType: usageEvents.eventType,
        userId: usageEvents.userId,
        userEmail: usageEvents.userEmail,
        resourceName: usageEvents.resourceName,
        timestamp: usageEvents.timestamp,
      })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.resourceId, requestId),
          eq(usageEvents.resourceType, 'request'),
          inArray(usageEvents.eventType, [...ACTIVITY_EVENT_TYPES])
        )
      )
      .orderBy(desc(usageEvents.timestamp));

    return {
      events: events.map((entry) => ({
        id: entry.id,
        eventType: entry.eventType,
        userId: entry.userId,
        userEmail: entry.userEmail,
        resourceName: entry.resourceName,
        timestamp: entry.timestamp.toISOString(),
      })) satisfies RequestActivityEvent[],
      total: events.length,
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    console.error('Error fetching request activity:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch request activity'
    });
  }
});
