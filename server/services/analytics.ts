import { db } from '../db';
import { usageEvents, type UsageEventType, type ResourceType, type NewUsageEvent } from '../db/schema/usageAnalytics';

export interface UsageEventInput {
  userId: string;
  userEmail: string;
  workspaceId: string;
  eventType: UsageEventType;
  resourceType: ResourceType;
  resourceId?: string;
  resourceName?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  responseTimeMs?: number;
  success?: boolean;
  metadata?: Record<string, unknown>;
}

export interface RequestExecutionInput {
  userId: string;
  userEmail: string;
  workspaceId: string;
  method: string;
  url: string;
  statusCode?: number;
  responseTimeMs?: number;
  success: boolean;
  requestId?: string;
  requestName?: string;
}

export interface ResourceActionInput {
  userId: string;
  userEmail: string;
  workspaceId: string;
  action: 'create' | 'update' | 'delete';
  resourceType: ResourceType;
  resourceId: string;
  resourceName?: string;
  metadata?: Record<string, unknown>;
}

function getEventType(action: 'create' | 'update' | 'delete', resourceType: ResourceType): UsageEventType {
  return `${resourceType}_${action}` as UsageEventType;
}

export async function trackUsageEvent(event: UsageEventInput): Promise<void> {
  Promise.resolve().then(async () => {
    try {
      const newEvent: NewUsageEvent = {
        userId: event.userId,
        userEmail: event.userEmail,
        workspaceId: event.workspaceId,
        eventType: event.eventType,
        resourceType: event.resourceType,
        resourceId: event.resourceId || null,
        resourceName: event.resourceName || null,
        method: event.method || null,
        url: event.url || null,
        statusCode: event.statusCode || null,
        responseTimeMs: event.responseTimeMs || null,
        success: event.success ?? null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      };

      await db.insert(usageEvents).values(newEvent);
    } catch (error) {
      console.error('[Analytics] Failed to track event:', error);
    }
  });
}

export async function trackUsageEventsBatch(events: UsageEventInput[]): Promise<void> {
  if (events.length === 0) return;

  Promise.resolve().then(async () => {
    try {
      const newEvents: NewUsageEvent[] = events.map(event => ({
        userId: event.userId,
        userEmail: event.userEmail,
        workspaceId: event.workspaceId,
        eventType: event.eventType,
        resourceType: event.resourceType,
        resourceId: event.resourceId || null,
        resourceName: event.resourceName || null,
        method: event.method || null,
        url: event.url || null,
        statusCode: event.statusCode || null,
        responseTimeMs: event.responseTimeMs || null,
        success: event.success ?? null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      }));

      await db.insert(usageEvents).values(newEvents);
    } catch (error) {
      console.error('[Analytics] Failed to track batch events:', error);
    }
  });
}

export async function trackRequestExecution(input: RequestExecutionInput): Promise<void> {
  trackUsageEvent({
    userId: input.userId,
    userEmail: input.userEmail,
    workspaceId: input.workspaceId,
    eventType: 'request_execute',
    resourceType: 'request',
    resourceId: input.requestId,
    resourceName: input.requestName,
    method: input.method,
    url: input.url,
    statusCode: input.statusCode,
    responseTimeMs: input.responseTimeMs,
    success: input.success,
  });
}

export async function trackResourceAction(input: ResourceActionInput): Promise<void> {
  trackUsageEvent({
    userId: input.userId,
    userEmail: input.userEmail,
    workspaceId: input.workspaceId,
    eventType: getEventType(input.action, input.resourceType),
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    resourceName: input.resourceName,
    metadata: input.metadata,
  });
}

export function getActionFromMethod(method: string): 'create' | 'update' | 'delete' {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'create';
  }
}