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
  
  let rawConfig = setting?.value;
  if (typeof rawConfig === 'string') {
    rawConfig = JSON.parse(rawConfig);
  }
  const config: SsoConfig = (rawConfig as SsoConfig) || {
    providers: [],
    allowMultipleProviders: true
  };

  // Ensure providers is always an array
  const providers: SsoProvider[] = Array.isArray(config?.providers) ? config.providers : [];

  // Don't return client secrets in the response
  const sanitizedProviders = providers.map((provider: SsoProvider) => ({
    ...provider,
    clientSecret: provider.clientSecret ? '••••••••' : ''
  }));

  return {
    ...config,
    providers: sanitizedProviders
  };
});
