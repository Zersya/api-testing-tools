import jwt from 'jsonwebtoken';

interface SyncPushRequest {
  type: string;
  id: string;
  data: any;
  updatedAt: string | number;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  
  const authHeader = getHeader(event, 'authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }
  
  try {
    jwt.verify(token, config.jwtSecret);
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid token' });
  }
  
  const body = await readBody<SyncPushRequest>(event);
  const { type, id, data, updatedAt } = body;
  
  if (!type || !id || !data) {
    throw createError({ statusCode: 400, message: 'Missing required fields' });
  }
  
  const tableMap: Record<string, string> = {
    workspaces: 'workspaces',
    projects: 'projects',
    collections: 'collections',
    folders: 'folders',
    saved_requests: 'saved_requests',
    environments: 'environments',
    api_definitions: 'api_definitions'
  };
  
  const tableName = tableMap[type];
  if (!tableName) {
    throw createError({ statusCode: 400, message: 'Invalid entity type' });
  }
  
  try {
    await pushToStorage(tableName, id, data, updatedAt);
    
    return {
      success: true,
      syncedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Sync push failed:', error);
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Sync failed'
    });
  }
});

async function pushToStorage(tableName: string, id: string, data: any, updatedAt: string | number) {
  const storage = useStorage(tableName);
  const key = id;
  
  const existingData = await storage.get(key);
  
  if (existingData) {
    const existingUpdatedAt = existingData.updatedAt ? new Date(existingData.updatedAt).getTime() : 0;
    const incomingUpdatedAt = new Date(updatedAt).getTime();
    
    if (existingUpdatedAt > incomingUpdatedAt) {
      return { skipped: true, reason: 'Server version is newer' };
    }
  }
  
  const record = {
    ...data,
    updatedAt: new Date(updatedAt).toISOString(),
    lastSyncedAt: new Date().toISOString()
  };
  
  await storage.set(key, record);
  
  return { success: true };
}
