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
  
  const query = getQuery(event);
  const since = query.since as string | undefined;
  
  try {
    const result = await pullFromStorage(since);
    
    return {
      ...result,
      lastSyncTimestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Sync pull failed:', error);
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Sync failed'
    });
  }
});

async function pullFromStorage(since?: string) {
  const tables = ['workspaces', 'projects', 'collections', 'folders', 'saved_requests', 'environments', 'api_definitions'];
  const result: Record<string, any[]> = {};
  
  for (const table of tables) {
    const storage = useStorage(table);
    const keys = await storage.getKeys();
    
    const records: any[] = [];
    
    for (const key of keys) {
      const record = await storage.get(key);
      
      if (since) {
        const recordUpdatedAt = record.updatedAt ? new Date(record.updatedAt).getTime() : 0;
        const sinceTimestamp = new Date(since).getTime();
        
        if (recordUpdatedAt > sinceTimestamp) {
          records.push(transformRecord(table, key, record));
        }
      } else {
        records.push(transformRecord(table, key, record));
      }
    }
    
    const tableKey = table === 'saved_requests' ? 'saved_requests' : 
                     table === 'api_definitions' ? 'api_definitions' : table;
    result[tableKey] = records;
  }
  
  return result;
}

function transformRecord(table: string, id: string, record: any) {
  const transformed: any = {
    id,
    ...record
  };
  
  delete transformed.updatedAt;
  delete transformed.lastSyncedAt;
  
  return transformed;
}
