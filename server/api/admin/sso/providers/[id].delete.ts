import type { SsoConfig, SsoProvider } from '../../../../../../app/types/sso';
import { db, schema } from '../../../../db';
import { eq, and, isNull } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  
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
  
  let rawConfig = setting?.value;
  if (typeof rawConfig === 'string') {
    rawConfig = JSON.parse(rawConfig);
  }
  const config: SsoConfig = (rawConfig as SsoConfig) || {
    providers: [],
    allowMultipleProviders: true
  };

  if (!Array.isArray(config.providers)) {
    config.providers = [];
  }
  
  const providerIndex = config.providers.findIndex((p: SsoProvider) => p.id === id);
  
  if (providerIndex === -1) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Provider not found'
    });
  }

  config.providers.splice(providerIndex, 1);
  
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
  
  return { success: true };
});
