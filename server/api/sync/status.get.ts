import jwt from 'jsonwebtoken';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  
  const authHeader = getHeader(event, 'authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized' });
  }
  
  try {
    jwt.verify(token, config.jwtSecret);
  } catch (e) {
    throw createError({ statusCode: 401, message: 'Invalid token' });
  }
  
  try {
    const tables = ['workspaces', 'projects', 'collections', 'folders', 'saved_requests', 'environments', 'api_definitions'];
    let totalItems = 0;
    let lastUpdated: Date | null = null;
    
    for (const table of tables) {
      const storage = useStorage(table);
      const keys = await storage.getKeys();
      totalItems += keys.length;
      
      for (const key of keys) {
        const record = await storage.get(key);
        if (record?.updatedAt) {
          const recordUpdated = new Date(record.updatedAt);
          if (!lastUpdated || recordUpdated > lastUpdated) {
            lastUpdated = recordUpdated;
          }
        }
      }
    }
    
    return {
      isOnline: true,
      lastSyncAt: lastUpdated?.toISOString() || null,
      nextSyncAt: null,
      pendingChanges: 0,
      status: 'idle',
      errorMessage: null,
      conflicts: [],
      totalItems
    };
  } catch (error) {
    console.error('Failed to get sync status:', error);
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to get sync status'
    });
  }
});
