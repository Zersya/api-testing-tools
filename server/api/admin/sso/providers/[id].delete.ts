import type { SsoConfig, SsoProvider } from '../../../../../../app/types/sso';

export default defineEventHandler(async (event) => {
  const storage = useStorage('settings');
  const id = getRouterParam(event, 'id');
  
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

  config.providers.splice(providerIndex, 1);
  
  await storage.setItem('sso', config);
  
  return { success: true };
});
