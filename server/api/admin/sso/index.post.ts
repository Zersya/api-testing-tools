import type { SsoConfig, SsoProvider } from '../../../../app/types/sso';
import { db, schema } from '../../../db';
import { eq, and, isNull } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const body = await readBody<Partial<SsoConfig>>(event);
  
  // Get existing config from database
  const existingSetting = (await db
    .select()
    .from(schema.settings)
    .where(
      and(
        eq(schema.settings.key, 'sso_config'),
        isNull(schema.settings.workspaceId)
      )
    )
    .limit(1))[0];
  
  const existingConfig: SsoConfig = existingSetting?.value as SsoConfig || { 
    providers: [], 
    allowMultipleProviders: true 
  };
  
  // Merge the new config with existing
  const newConfig: SsoConfig = {
    ...existingConfig,
    ...body,
    providers: body.providers || existingConfig.providers
  };

  const now = new Date();
  
  if (existingSetting) {
    // Update existing
    await db
      .update(schema.settings)
      .set({
        value: newConfig,
        updatedAt: now,
        lastModifiedAt: now
      })
      .where(eq(schema.settings.id, existingSetting.id));
  } else {
    // Insert new
    await db.insert(schema.settings).values({
      key: 'sso_config',
      value: newConfig,
      createdAt: now,
      updatedAt: now,
      lastModifiedAt: now
    });
  }
  
  return { success: true };
});
