import type { SsoConfig, SsoProvider } from '../../../../../../app/types/sso';

export default defineEventHandler(async (event) => {
  const storage = useStorage('settings');
  const id = getRouterParam(event, 'id');
  const body = await readBody<Partial<SsoProvider>>(event);
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Provider ID is required'
    });
  }

  const config = await storage.getItem<SsoConfig>('sso') || { providers: [], allowMultipleProviders: true };
  
  const providerIndex = config.providers.findIndex((p: SsoProvider) => p.id === id);
  
  if (providerIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Provider not found'
    });
  }

  const existingProvider = config.providers[providerIndex];
  
  // If clientSecret is the masked value, keep the existing secret
  const clientSecret = body.clientSecret === '••••••••' 
    ? existingProvider.clientSecret 
    : body.clientSecret;

  config.providers[providerIndex] = {
    ...existingProvider,
    ...body,
    id, // Ensure ID doesn't change
    clientSecret,
    updatedAt: new Date().toISOString()
  } as SsoProvider;

  await storage.setItem('sso', config);
  
  return { 
    success: true, 
    provider: {
      ...config.providers[providerIndex],
      clientSecret: config.providers[providerIndex].clientSecret ? '••••••••' : ''
    }
  };
});
