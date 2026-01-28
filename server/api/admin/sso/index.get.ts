import type { SsoConfig, SsoProvider } from '../../../../app/types/sso';

export default defineEventHandler(async (event) => {
  const storage = useStorage('settings');
  const config = await storage.getItem<SsoConfig>('sso') || { providers: [], allowMultipleProviders: true };
  
  // Don't return client secrets in the response
  const sanitizedProviders = config.providers.map((provider: SsoProvider) => ({
    ...provider,
    clientSecret: provider.clientSecret ? '••••••••' : ''
  }));

  return {
    ...config,
    providers: sanitizedProviders
  };
});
