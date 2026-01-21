import { db } from '../../db';
import { environmentVariables, environments } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface StoreTokenBody {
  environmentId: string;
  accessTokenKey: string;
  refreshTokenKey: string;
  expiresAtKey: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export default defineEventHandler(async (event) => {
  const body = await readBody<StoreTokenBody>(event);

  if (!body.environmentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Environment ID is required'
    });
  }

  if (!body.accessTokenKey || typeof body.accessTokenKey !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Access token key is required'
    });
  }

  if (!body.accessToken || typeof body.accessToken !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Access token value is required'
    });
  }

  try {
    const environment = db
      .select()
      .from(environments)
      .where(eq(environments.id, body.environmentId))
      .get();

    if (!environment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Environment not found'
      });
    }

    const existingVars = db
      .select()
      .from(environmentVariables)
      .where(eq(environmentVariables.environmentId, body.environmentId))
      .all();

    const createOrUpdateVariable = async (key: string, value: string, isSecret: boolean) => {
      const existing = existingVars.find(v => v.key === key);

      if (existing) {
        db
          .update(environmentVariables)
          .set({ value, isSecret })
          .where(eq(environmentVariables.id, existing.id))
          .run();
        return { ...existing, value, isSecret };
      } else {
        const newVar = db
          .insert(environmentVariables)
          .values({
            environmentId: body.environmentId,
            key,
            value,
            isSecret
          })
          .returning()
          .get();
        return newVar;
      }
    };

    await createOrUpdateVariable(body.accessTokenKey, body.accessToken, true);

    if (body.refreshToken) {
      await createOrUpdateVariable(
        body.refreshTokenKey || `${body.accessTokenKey}_refresh`,
        body.refreshToken,
        true
      );
    }

    if (body.expiresAt !== undefined) {
      await createOrUpdateVariable(
        body.expiresAtKey || `${body.accessTokenKey}_expires_at`,
        String(body.expiresAt),
        true
      );
    }

    return { success: true, message: 'Tokens stored successfully' };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    console.error('Error storing OAuth tokens:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to store OAuth tokens'
    });
  }
});
