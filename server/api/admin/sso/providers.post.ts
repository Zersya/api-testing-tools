import type { SsoConfig, SsoProvider } from '../../../../../app/types/sso';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  const storage = useStorage('settings');
  const body = await readBody<Partial<SsoProvider>>(event);
  
  if (!body.type || !body.name || !body.clientId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: type, name, clientId'
    });
  }

  const config = await storage.getItem<SsoConfig>('sso') || { providers: [], allowMultipleProviders: true };
  
  const newProvider: SsoProvider = {
    ...body,
    id: uuidv4(),
    enabled: body.enabled ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as SsoProvider;

  config.providers.push(newProvider);
  
  await storage.setItem('sso', config);
  
  return { 
    success: true, 
    provider: {
      ...newProvider,
      clientSecret: newProvider.clientSecret ? '••••••••' : ''
    }
  };
});
