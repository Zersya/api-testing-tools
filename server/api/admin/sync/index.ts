export default defineEventHandler(async (event) => {
  const storage = useStorage('settings');
  const key = 'global';

  if (event.method === 'GET') {
    const settings = (await storage.getItem(key)) || {};
    return {
      config: settings.sync || {
        enabled: false,
        serverUrl: '',
        apiKey: '',
        syncInterval: 60,
        autoSync: true,
        conflictResolution: 'manual'
      }
    };
  }

  if (event.method === 'POST') {
    const body = await readBody(event);
    const settings = (await storage.getItem(key)) || {};
    settings.sync = {
      enabled: body.enabled ?? false,
      serverUrl: body.serverUrl || '',
      apiKey: body.apiKey || '',
      syncInterval: body.syncInterval || 60,
      autoSync: body.autoSync ?? true,
      conflictResolution: body.conflictResolution || 'manual'
    };
    await storage.setItem(key, settings);
    return { success: true };
  }
});
