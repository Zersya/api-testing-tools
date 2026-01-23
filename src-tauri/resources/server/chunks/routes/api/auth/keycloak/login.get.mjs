import { d as defineEventHandler, u as useStorage, c as createError, n as useRuntimeConfig, q as setCookie, t as sendRedirect } from '../../../../nitro/nitro.mjs';
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
import 'drizzle-orm';
import 'node:url';
import 'jsonwebtoken';

const login_get = defineEventHandler(async (event) => {
  var _a;
  const storage = useStorage("settings");
  const settings = await storage.getItem("global") || {};
  const keycloakConfig = settings.keycloak || {};
  if (!keycloakConfig.enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: "Keycloak SSO is not enabled"
    });
  }
  if (!keycloakConfig.realm || !keycloakConfig.clientId || !keycloakConfig.authUrl) {
    throw createError({
      statusCode: 400,
      statusMessage: "Keycloak is not properly configured"
    });
  }
  const config = useRuntimeConfig();
  const callbackUrl = keycloakConfig.callbackUrl || `${((_a = config.public) == null ? void 0 : _a.appUrl) || "http://localhost:3000"}/api/auth/keycloak/callback`;
  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").substring(0, 32);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const authUrl = new URL(keycloakConfig.authUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", keycloakConfig.clientId);
  authUrl.searchParams.set("redirect_uri", callbackUrl);
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  const sessionData = {
    state,
    codeVerifier,
    callbackUrl,
    realm: keycloakConfig.realm,
    clientId: keycloakConfig.clientId
  };
  setCookie(event, "keycloak_oauth_state", JSON.stringify(sessionData), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10
  });
  return sendRedirect(event, authUrl.toString());
});
async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("base64url");
}

export { login_get as default };
//# sourceMappingURL=login.get.mjs.map
