import type { SsoConfig, SsoProvider } from '../../../../app/types/sso';
import { db, schema } from '../../../db';
import { eq, and, isNull } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const setting = (await db
    .select()
    .from(schema.settings)
    .where(
      and(
        eq(schema.settings.key, 'sso_config'),
        isNull(schema.settings.workspaceId)
      )
    )
    .limit(1))[0];
  
  const config: SsoConfig = (setting?.value as SsoConfig) || { 
    providers: [], 
    allowMultipleProviders: true 
  };
  
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
