import type { SsoConfig, SsoProvider } from '../../../../app/types/sso';

export default defineEventHandler(async (event) => {
  try {
    const storage = useStorage('settings');
    const config = await storage.getItem<SsoConfig>('sso');
    
    // Default empty config if none exists
    const ssoConfig: SsoConfig = config || { providers: [], allowMultipleProviders: true };
    
    // Ensure providers array exists
    if (!ssoConfig.providers) {
      ssoConfig.providers = [];
    }
    
    // Only return enabled providers with minimal info needed for login UI
    const enabledProviders = ssoConfig.providers
      .filter((p: SsoProvider) => p && p.enabled === true)
      .map((p: SsoProvider) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        // Include callback URL hint for configuration
        callbackUrlHint: `/api/auth/sso/${p.type}/callback`
      }));

    return {
      providers: enabledProviders,
      allowMultipleProviders: ssoConfig.allowMultipleProviders ?? true,
      defaultProvider: ssoConfig.defaultProvider
    };
  } catch (error) {
    console.error('Error fetching SSO providers:', error);
    // Return empty config on error
    return {
      providers: [],
      allowMultipleProviders: true,
      defaultProvider: undefined
    };
  }
});
