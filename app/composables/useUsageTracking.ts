import type { UsageEventType, ResourceType } from '#build/server/db/schema/usageAnalytics';
import { useApiClient } from '~~/composables/useApiFetch';

export interface UsageEventInput {
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
  workspaceId?: string;
}

export interface RequestExecutionInput {
  method: string;
  url: string;
  statusCode?: number;
  responseTimeMs?: number;
  success: boolean;
  requestId?: string;
  requestName?: string;
  workspaceId?: string;
}

export interface ResourceActionInput {
  action: 'create' | 'update' | 'delete';
  resourceType: ResourceType;
  resourceId: string;
  resourceName?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}

function getEventType(action: 'create' | 'update' | 'delete', resourceType: ResourceType): UsageEventType {
  return `${resourceType}_${action}` as UsageEventType;
}

export function useUsageTracking() {
  const pendingEvents = ref<UsageEventInput[]>([]);
  const isTracking = ref(false);
  const api = useApiClient();

  const trackEvent = async (event: UsageEventInput) => {
    try {
      await api.post('/api/admin/usage/track', {
        body: event
      });
    } catch (error) {
      console.warn('[Usage] Failed to track event:', error);
    }
  };

  const trackEventAsync = (event: UsageEventInput) => {
    Promise.resolve().then(() => trackEvent(event));
  };

  const trackBatch = async (events: UsageEventInput[]) => {
    if (events.length === 0) return;

    try {
      await api.post('/api/admin/usage/track-batch', {
        body: { events }
      });
    } catch (error) {
      console.warn('[Usage] Failed to track batch:', error);
    }
  };

  const trackRequestExecution = (input: RequestExecutionInput) => {
    trackEventAsync({
      eventType: 'request_execute',
      resourceType: 'request',
      resourceId: input.requestId,
      resourceName: input.requestName,
      method: input.method,
      url: input.url,
      statusCode: input.statusCode,
      responseTimeMs: input.responseTimeMs,
      success: input.success,
      workspaceId: input.workspaceId,
    });
  };

  const trackResourceAction = (input: ResourceActionInput) => {
    trackEventAsync({
      eventType: getEventType(input.action, input.resourceType),
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceName: input.resourceName,
      workspaceId: input.workspaceId,
      metadata: input.metadata,
    });
  };

  const trackRequestCreate = (requestId: string, requestName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'create',
      resourceType: 'request',
      resourceId: requestId,
      resourceName: requestName,
      workspaceId,
    });
  };

  const trackRequestUpdate = (requestId: string, requestName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'update',
      resourceType: 'request',
      resourceId: requestId,
      resourceName: requestName,
      workspaceId,
    });
  };

  const trackRequestDelete = (requestId: string, requestName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'delete',
      resourceType: 'request',
      resourceId: requestId,
      resourceName: requestName,
      workspaceId,
    });
  };

  const trackCollectionCreate = (collectionId: string, collectionName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'create',
      resourceType: 'collection',
      resourceId: collectionId,
      resourceName: collectionName,
      workspaceId,
    });
  };

  const trackCollectionUpdate = (collectionId: string, collectionName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'update',
      resourceType: 'collection',
      resourceId: collectionId,
      resourceName: collectionName,
      workspaceId,
    });
  };

  const trackCollectionDelete = (collectionId: string, collectionName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'delete',
      resourceType: 'collection',
      resourceId: collectionId,
      resourceName: collectionName,
      workspaceId,
    });
  };

  const trackFolderCreate = (folderId: string, folderName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'create',
      resourceType: 'folder',
      resourceId: folderId,
      resourceName: folderName,
      workspaceId,
    });
  };

  const trackFolderDelete = (folderId: string, folderName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'delete',
      resourceType: 'folder',
      resourceId: folderId,
      resourceName: folderName,
      workspaceId,
    });
  };

  const trackMockCreate = (mockId: string, mockName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'create',
      resourceType: 'mock',
      resourceId: mockId,
      resourceName: mockName,
      workspaceId,
    });
  };

  const trackMockUpdate = (mockId: string, mockName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'update',
      resourceType: 'mock',
      resourceId: mockId,
      resourceName: mockName,
      workspaceId,
    });
  };

  const trackMockDelete = (mockId: string, mockName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'delete',
      resourceType: 'mock',
      resourceId: mockId,
      resourceName: mockName,
      workspaceId,
    });
  };

  const trackEnvironmentCreate = (environmentId: string, environmentName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'create',
      resourceType: 'environment',
      resourceId: environmentId,
      resourceName: environmentName,
      workspaceId,
    });
  };

  const trackEnvironmentUpdate = (environmentId: string, environmentName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'update',
      resourceType: 'environment',
      resourceId: environmentId,
      resourceName: environmentName,
      workspaceId,
    });
  };

  const trackEnvironmentDelete = (environmentId: string, environmentName: string, workspaceId?: string) => {
    trackResourceAction({
      action: 'delete',
      resourceType: 'environment',
      resourceId: environmentId,
      resourceName: environmentName,
      workspaceId,
    });
  };

  return {
    trackEvent,
    trackEventAsync,
    trackBatch,
    trackRequestExecution,
    trackResourceAction,
    trackRequestCreate,
    trackRequestUpdate,
    trackRequestDelete,
    trackCollectionCreate,
    trackCollectionUpdate,
    trackCollectionDelete,
    trackFolderCreate,
    trackFolderDelete,
    trackMockCreate,
    trackMockUpdate,
    trackMockDelete,
    trackEnvironmentCreate,
    trackEnvironmentUpdate,
    trackEnvironmentDelete,
    isTracking,
    pendingEvents,
  };
}