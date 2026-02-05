import type { SsoConfig, SsoProvider } from '../../../../../app/types/sso';
import { db, schema } from '../../../db';
import { eq, and, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<SsoProvider>>(event);
  
  if (!body.type || !body.name || !body.clientId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: type, name, clientId'
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
  let config: SsoConfig = (rawConfig as SsoConfig) || {
    providers: [],
    allowMultipleProviders: true
  };

  if (!Array.isArray(config.providers)) {
    config.providers = [];
  }
  
  const newProvider: SsoProvider = {
    ...body,
    id: uuidv4(),
    enabled: body.enabled ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as SsoProvider;

  config.providers.push(newProvider);
  
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
      ...newProvider,
      clientSecret: newProvider.clientSecret ? '••••••••' : ''
    }
  };
});
