/**
 * Local Data Store using Tauri Store Plugin
 * Provides offline-first data persistence for desktop app
 */

let Store: any = null;
let dataStore: any = null;
let isInitialized = false;
let useLocalStorage = false;

export interface LocalWorkspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isDirty: boolean;
  lastSyncedAt?: string;
  projects: LocalProject[];
}

export interface LocalProject {
  id: string;
  workspaceId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isDirty: boolean;
  lastSyncedAt?: string;
  collections: LocalCollection[];
}

export interface LocalCollection {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  isDirty: boolean;
  lastSyncedAt?: string;
  folders: LocalFolder[];
}

export interface LocalFolder {
  id: string;
  collectionId: string;
  parentFolderId?: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  isDirty: boolean;
  lastSyncedAt?: string;
  requests: LocalRequest[];
  children: LocalFolder[];
}

export interface LocalRequest {
  id: string;
  folderId: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string> | null;
  body: any;
  auth: any;
  order: number;
  createdAt: string;
  updatedAt: string;
  isDirty: boolean;
  lastSyncedAt?: string;
}

export interface LocalEnvironment {
  id: string;
  projectId: string;
  name: string;
  variables: Array<{ key: string; value: string; enabled: boolean }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isDirty: boolean;
  lastSyncedAt?: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'workspace' | 'project' | 'collection' | 'folder' | 'request' | 'environment';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: string;
  retryCount: number;
}

export interface LocalStoreData {
  workspaces: LocalWorkspace[];
  environments: LocalEnvironment[];
  syncQueue: SyncQueueItem[];
  lastSyncTimestamp?: string;
  serverUrl?: string;
  authToken?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

const DEFAULT_DATA: LocalStoreData = {
  workspaces: [],
  environments: [],
  syncQueue: [],
};

export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).__TAURI__;
}

function useLocalStorageFallback(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const existing = localStorage.getItem('mockservice-data');
    if (!existing) {
      localStorage.setItem('mockservice-data', JSON.stringify(DEFAULT_DATA));
    }
    isInitialized = true;
    useLocalStorage = true;
    return true;
  } catch (e) {
    console.error('localStorage fallback failed:', e);
    return false;
  }
}

export async function initLocalStore(): Promise<boolean> {
  if (!isDesktop()) return false;
  if (isInitialized) return true;

  try {
    const { load } = await import('@tauri-apps/plugin-store');
    
    // In Tauri v2, we use load() which returns a store instance
    dataStore = await load('mockservice-data.json', { autoSave: true, defaults: DEFAULT_DATA });
    isInitialized = true;
    useLocalStorage = false;
    
    const existing = await dataStore.get('data');
    if (!existing) {
      await dataStore.set('data', DEFAULT_DATA);
      await dataStore.save();
    }
    
    return true;
  } catch (e) {
    console.warn('Store plugin not available, using localStorage fallback:', e);
    return useLocalStorageFallback();
  }
}

export async function getLocalData(): Promise<LocalStoreData> {
  if (!isInitialized) {
    await initLocalStore();
  }
  
  if (useLocalStorage) {
    try {
      const data = localStorage.getItem('mockservice-data');
      return data ? JSON.parse(data) : DEFAULT_DATA;
    } catch (error) {
      console.error('Failed to get local data from localStorage:', error);
      return DEFAULT_DATA;
    }
  }
  
  if (!dataStore) return DEFAULT_DATA;
  
  try {
    const data = await dataStore.get('data');
    return data || DEFAULT_DATA;
  } catch (error) {
    console.error('Failed to get local data:', error);
    return DEFAULT_DATA;
  }
}

export async function setLocalData(data: LocalStoreData): Promise<void> {
  if (useLocalStorage) {
    try {
      localStorage.setItem('mockservice-data', JSON.stringify(data));
      return;
    } catch (error) {
      console.error('Failed to set local data to localStorage:', error);
      return;
    }
  }
  
  if (!dataStore) return;
  
  try {
    await dataStore.set('data', data);
    await dataStore.save();
  } catch (error) {
    console.error('Failed to set local data:', error);
  }
}

export async function updateLocalData(updater: (data: LocalStoreData) => LocalStoreData): Promise<LocalStoreData> {
  const current = await getLocalData();
  const updated = updater(current);
  await setLocalData(updated);
  return updated;
}

// Auth helpers
export async function getAuthToken(): Promise<string | null> {
  const data = await getLocalData();
  return data.authToken || null;
}

export async function setAuthToken(token: string, user?: { id: string; email: string; name?: string }): Promise<void> {
  await updateLocalData(data => ({
    ...data,
    authToken: token,
    user: user || data.user,
  }));
}

export async function clearAuth(): Promise<void> {
  await updateLocalData(data => ({
    ...data,
    authToken: undefined,
    user: undefined,
  }));
}

export async function getUser(): Promise<{ id: string; email: string; name?: string } | null> {
  const data = await getLocalData();
  return data.user || null;
}

// Server URL helpers
export async function getServerUrl(): Promise<string> {
  if (isDesktop()) {
    return 'http://127.0.0.1:3001';
  }
  const data = await getLocalData();
  return data.serverUrl || 'http://localhost:3000';
}

export async function setServerUrl(url: string): Promise<void> {
  await updateLocalData(data => ({
    ...data,
    serverUrl: url,
  }));
}

// Sync queue helpers
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
  await updateLocalData(data => ({
    ...data,
    syncQueue: [
      ...data.syncQueue,
      {
        ...item,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        retryCount: 0,
      },
    ],
  }));
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  await updateLocalData(data => ({
    ...data,
    syncQueue: data.syncQueue.filter(item => item.id !== id),
  }));
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const data = await getLocalData();
  return data.syncQueue || [];
}

export async function clearSyncQueue(): Promise<void> {
  await updateLocalData(data => ({
    ...data,
    syncQueue: [],
  }));
}

export { dataStore, isInitialized };
