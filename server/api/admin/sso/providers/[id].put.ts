import type { SsoConfig, SsoProvider } from '../../../../../../app/types/sso';
import { db, schema } from '../../../../db';
import { eq, and, isNull } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody<Partial<SsoProvider>>(event);
  
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Provider ID is required'
    });
  }

  // Get SSO config from database
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

  const now = new Date();
  
  if (setting) {
    // Update existing
    await db
      .update(schema.settings)
      .set({
        value: config,
        updatedAt: now,
        lastModifiedAt: now
      })
      .where(eq(schema.settings.id, setting.id));
  } else {
    // Insert new
    await db.insert(schema.settings).values({
      key: 'sso_config',
      value: config,
      createdAt: now,
      updatedAt: now,
      lastModifiedAt: now
    });
  }
  
  return { 
    success: true, 
    provider: {
      ...config.providers[providerIndex],
      clientSecret: config.providers[providerIndex].clientSecret ? '••••••••' : ''
    }
  };
});
