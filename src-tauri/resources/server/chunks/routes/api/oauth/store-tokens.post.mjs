import { d as defineEventHandler, r as readBody, c as createError, b as db, j as environments, k as environmentVariables } from '../../../nitro/nitro.mjs';
import { eq } from 'drizzle-orm';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'drizzle-orm/better-sqlite3';
import 'better-sqlite3';
import 'drizzle-orm/sqlite-core';
import 'node:url';
import 'jsonwebtoken';

const storeTokens_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (!body.environmentId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Environment ID is required"
    });
  }
  if (!body.accessTokenKey || typeof body.accessTokenKey !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Access token key is required"
    });
  }
  if (!body.accessToken || typeof body.accessToken !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Access token value is required"
    });
  }
  try {
    const environment = db.select().from(environments).where(eq(environments.id, body.environmentId)).get();
    if (!environment) {
      throw createError({
        statusCode: 404,
        statusMessage: "Environment not found"
      });
    }
    const existingVars = db.select().from(environmentVariables).where(eq(environmentVariables.environmentId, body.environmentId)).all();
    const createOrUpdateVariable = async (key, value, isSecret) => {
      const existing = existingVars.find((v) => v.key === key);
      if (existing) {
        db.update(environmentVariables).set({ value, isSecret }).where(eq(environmentVariables.id, existing.id)).run();
        return { ...existing, value, isSecret };
      } else {
        const newVar = db.insert(environmentVariables).values({
          environmentId: body.environmentId,
          key,
          value,
          isSecret
        }).returning().get();
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
    if (body.expiresAt !== void 0) {
      await createOrUpdateVariable(
        body.expiresAtKey || `${body.accessTokenKey}_expires_at`,
        String(body.expiresAt),
        true
      );
    }
    return { success: true, message: "Tokens stored successfully" };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error storing OAuth tokens:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to store OAuth tokens"
    });
  }
});

export { storeTokens_post as default };
//# sourceMappingURL=store-tokens.post.mjs.map
