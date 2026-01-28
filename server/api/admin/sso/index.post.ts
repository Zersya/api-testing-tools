import type { SsoConfig, SsoProvider } from '../../../../app/types/sso';

export default defineEventHandler(async (event) => {
  const storage = useStorage('settings');
  const body = await readBody<Partial<SsoConfig>>(event);
  
  const existingConfig = await storage.getItem<SsoConfig>('sso') || { providers: [], allowMultipleProviders: true };
  
  // Merge the new config with existing
  const newConfig: SsoConfig = {
    ...existingConfig,
    ...body,
    providers: body.providers || existingConfig.providers
  };

  await storage.setItem('sso', newConfig);
  
  return { success: true };
});
