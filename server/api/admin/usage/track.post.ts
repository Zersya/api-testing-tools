import { trackUsageEvent, type UsageEventInput } from '../../../services/usageTracking';

export default defineEventHandler(async (event) => {
  const user = event.context.user;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  const body = await readBody(event);

  const { eventType, resourceType, resourceId, resourceName, method, url, statusCode, responseTimeMs, success, metadata, workspaceId } = body;

  if (!eventType || !resourceType || !workspaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: eventType, resourceType, workspaceId'
    });
  }

  const eventInput: UsageEventInput = {
    userId: user.id,
    userEmail: user.email,
    workspaceId: workspaceId || user.workspaceId,
    eventType,
    resourceType,
    resourceId,
    resourceName,
    method,
    url,
    statusCode,
    responseTimeMs,
    success,
    metadata,
  };

  await trackUsageEvent(eventInput);

  return { success: true };
});