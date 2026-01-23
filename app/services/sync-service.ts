/**
 * Sync Service
 * Handles synchronization between local store and remote server
 */

import {
  getLocalData,
  updateLocalData,
  getSyncQueue,
  removeFromSyncQueue,
  getAuthToken,
  getServerUrl,
  isDesktop,
  type LocalWorkspace,
  type SyncQueueItem,
} from './local-store';
import { tauriFetch } from './tauri-api';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

let isSyncing = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;

export async function startAutoSync(intervalMs: number = 30000): Promise<void> {
  if (!isDesktop()) return;
  if (syncInterval) return;

  // Initial sync
  await syncWithServer();

  // Set up interval
  syncInterval = setInterval(async () => {
    await syncWithServer();
  }, intervalMs);
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export async function syncWithServer(): Promise<SyncResult> {
  if (!isDesktop()) {
    return { success: true, synced: 0, failed: 0, errors: [] };
  }

  if (isSyncing) {
    return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
  }

  const token = await getAuthToken();
  if (!token) {
    return { success: false, synced: 0, failed: 0, errors: ['Not authenticated'] };
  }

  isSyncing = true;
  const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

  try {
    // Step 1: Push local changes to server
    await pushLocalChanges(token, result);

    // Step 2: Pull server changes
    await pullServerChanges(token, result);

    // Update last sync timestamp
    await updateLocalData(data => ({
      ...data,
      lastSyncTimestamp: new Date().toISOString(),
    }));

  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message || 'Unknown sync error');
  } finally {
    isSyncing = false;
  }

  return result;
}

async function pushLocalChanges(token: string, result: SyncResult): Promise<void> {
  const queue = await getSyncQueue();

  for (const item of queue) {
    try {
      const endpoint = getEndpointForEntity(item.entityType, item.action, item.entityId);
      const method = getMethodForAction(item.action) as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

      // Use Tauri proxy in desktop mode
      const response = await tauriFetch<any>(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: item.action !== 'delete' ? item.payload : undefined,
      });

      if (response.success) {
        await removeFromSyncQueue(item.id);
        result.synced++;
      } else {
        result.failed++;
        result.errors.push(`Failed to sync ${item.entityType} ${item.entityId}: ${response.error}`);

        // Increment retry count
        await updateSyncQueueItem(item.id, { retryCount: item.retryCount + 1 });
      }
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Network error syncing ${item.entityType}: ${error.message}`);
    }
  }
}

async function pullServerChanges(token: string, result: SyncResult): Promise<void> {
  const localData = await getLocalData();
  const lastSync = localData.lastSyncTimestamp;

  try {
    // Use Tauri proxy in desktop mode
    const response = await tauriFetch<any[]>('/api/admin/tree', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch from server');
    }

    const serverWorkspaces = response.data || [];

    // Merge server data with local (server wins for non-dirty items)
    await mergeServerData(serverWorkspaces);
    result.synced++;

  } catch (error: any) {
    result.errors.push(`Failed to pull server data: ${error.message}`);
  }
}

async function mergeServerData(serverWorkspaces: any[]): Promise<void> {
  await updateLocalData(data => {
    const mergedWorkspaces: LocalWorkspace[] = [];

    // Process each server workspace
    for (const serverWs of serverWorkspaces) {
      const localWs = data.workspaces.find(w => w.id === serverWs.id);

      if (localWs && localWs.isDirty) {
        // Keep local version if dirty (local changes pending)
        mergedWorkspaces.push(localWs);
      } else {
        // Use server version
        mergedWorkspaces.push(convertServerWorkspace(serverWs));
      }
    }

    // Keep local-only workspaces that haven't been synced yet
    for (const localWs of data.workspaces) {
      if (!serverWorkspaces.find((w: any) => w.id === localWs.id)) {
        if (localWs.isDirty) {
          mergedWorkspaces.push(localWs);
        }
      }
    }

    return {
      ...data,
      workspaces: mergedWorkspaces,
    };
  });
}

function convertServerWorkspace(serverWs: any): LocalWorkspace {
  return {
    id: serverWs.id,
    name: serverWs.name,
    description: serverWs.description,
    createdAt: serverWs.createdAt,
    updatedAt: serverWs.updatedAt,
    isDirty: false,
    lastSyncedAt: new Date().toISOString(),
    projects: (serverWs.projects || []).map((p: any) => ({
      id: p.id,
      workspaceId: serverWs.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      isDirty: false,
      lastSyncedAt: new Date().toISOString(),
      collections: (p.collections || []).map((c: any) => ({
        id: c.id,
        projectId: p.id,
        name: c.name,
        description: c.description,
        color: c.color || '#6366f1',
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        isDirty: false,
        lastSyncedAt: new Date().toISOString(),
        folders: (c.folders || []).map((f: any) => convertServerFolder(f, c.id)),
      })),
    })),
  };
}

function convertServerFolder(serverFolder: any, collectionId: string): any {
  return {
    id: serverFolder.id,
    collectionId,
    parentFolderId: serverFolder.parentFolderId,
    name: serverFolder.name,
    order: serverFolder.order || 0,
    createdAt: serverFolder.createdAt,
    updatedAt: serverFolder.updatedAt,
    isDirty: false,
    lastSyncedAt: new Date().toISOString(),
    requests: (serverFolder.requests || []).map((r: any) => ({
      id: r.id,
      folderId: serverFolder.id,
      name: r.name,
      method: r.method,
      url: r.url,
      headers: r.headers,
      body: r.body,
      auth: r.auth,
      order: r.order || 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      isDirty: false,
      lastSyncedAt: new Date().toISOString(),
    })),
    children: (serverFolder.children || []).map((child: any) => convertServerFolder(child, collectionId)),
  };
}

function getEndpointForEntity(entityType: string, action: string, entityId: string): string {
  const endpoints: Record<string, Record<string, string>> = {
    workspace: {
      create: '/api/admin/workspaces',
      update: `/api/admin/workspaces/${entityId}`,
      delete: `/api/admin/workspaces/${entityId}`,
    },
    project: {
      create: '/api/admin/projects',
      update: `/api/admin/projects/${entityId}`,
      delete: `/api/admin/projects/${entityId}`,
    },
    collection: {
      create: '/api/admin/collections',
      update: `/api/admin/collections/${entityId}`,
      delete: `/api/admin/collections/${entityId}`,
    },
    folder: {
      create: '/api/admin/folders',
      update: `/api/admin/folders/${entityId}`,
      delete: `/api/admin/folders/${entityId}`,
    },
    request: {
      create: '/api/admin/requests',
      update: `/api/admin/requests/${entityId}`,
      delete: `/api/admin/requests/${entityId}`,
    },
    environment: {
      create: '/api/admin/environments',
      update: `/api/admin/environments/${entityId}`,
      delete: `/api/admin/environments/${entityId}`,
    },
  };

  return endpoints[entityType]?.[action] || '';
}

function getMethodForAction(action: string): string {
  switch (action) {
    case 'create': return 'POST';
    case 'update': return 'PUT';
    case 'delete': return 'DELETE';
    default: return 'POST';
  }
}

async function updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
  await updateLocalData(data => ({
    ...data,
    syncQueue: data.syncQueue.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ),
  }));
}

export { isSyncing };
