import { trackUsageEventsBatch, type UsageEventInput } from '../../../services/usageTracking';

export default defineEventHandler(async (event) => {
  const user = event.context.user;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  const body = await readBody(event);
  const { events } = body;

  if (!Array.isArray(events) || events.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing or invalid events array'
    });
  }

  const validEvents: UsageEventInput[] = events.map(e => ({
    userId: user.id,
    userEmail: user.email,
    workspaceId: e.workspaceId || user.workspaceId,
    eventType: e.eventType,
    resourceType: e.resourceType,
    resourceId: e.resourceId,
    resourceName: e.resourceName,
    method: e.method,
    url: e.url,
    statusCode: e.statusCode,
    responseTimeMs: e.responseTimeMs,
    success: e.success,
    metadata: e.metadata,
  }));

  await trackUsageEventsBatch(validEvents);

  return { success: true, count: validEvents.length };
});