import { d as defineEventHandler, a as getQuery, c as createError, u as useStorage, m as getCookie, o as deleteCookie, q as setCookie, t as sendRedirect } from '../../../../nitro/nitro.mjs';
import jwt from 'jsonwebtoken';
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

const callback_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = query.code;
  const state = query.state;
  const error = query.error;
  const errorDescription = query.error_description;
  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: errorDescription || error
    });
  }
  if (!code || !state) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing authorization code or state"
    });
  }
  const storage = useStorage("settings");
  const settings = await storage.getItem("global") || {};
  const keycloakConfig = settings.keycloak || {};
  if (!keycloakConfig.enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: "Keycloak SSO is not enabled"
    });
  }
  const stateCookie = getCookie(event, "keycloak_oauth_state");
  if (!stateCookie) {
    throw createError({
      statusCode: 400,
      statusMessage: "OAuth state expired. Please try logging in again."
    });
  }
  let sessionData;
  try {
    sessionData = JSON.parse(stateCookie);
  } catch (e) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid OAuth state"
    });
  }
  if (state !== sessionData.state) {
    throw createError({
      statusCode: 400,
      statusMessage: "State mismatch - potential CSRF attack"
    });
  }
  deleteCookie(event, "keycloak_oauth_state");
  const tokenUrl = keycloakConfig.tokenUrl;
  if (!tokenUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "Keycloak token URL not configured"
    });
  }
  const body = {
    grant_type: "authorization_code",
    code,
    redirect_uri: sessionData.callbackUrl,
    client_id: sessionData.clientId,
    code_verifier: sessionData.codeVerifier
  };
  if (keycloakConfig.clientSecret) {
    body.client_secret = keycloakConfig.clientSecret;
  }
  let tokenResponse;
  try {
    const tokenFetchResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: new URLSearchParams(body).toString()
    });
    tokenResponse = await tokenFetchResponse.json();
    if (tokenResponse.error) {
      throw createError({
        statusCode: 400,
        statusMessage: tokenResponse.error_description || tokenResponse.error
      });
    }
  } catch (fetchError) {
    if (fetchError.statusCode) throw fetchError;
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to exchange authorization code for tokens"
    });
  }
  let userInfo = null;
  if (keycloakConfig.userInfoUrl && tokenResponse.access_token) {
    try {
      const userInfoResponse = await fetch(keycloakConfig.userInfoUrl, {
        headers: {
          "Authorization": `Bearer ${tokenResponse.access_token}`,
          "Accept": "application/json"
        }
      });
      if (userInfoResponse.ok) {
        userInfo = await userInfoResponse.json();
      }
    } catch (e) {
      console.warn("Failed to fetch user info from Keycloak");
    }
  }
  const userPayload = {
    sub: (userInfo == null ? void 0 : userInfo.sub) || "unknown",
    email: (userInfo == null ? void 0 : userInfo.email) || "",
    name: (userInfo == null ? void 0 : userInfo.name) || (userInfo == null ? void 0 : userInfo.preferred_username) || "",
    username: (userInfo == null ? void 0 : userInfo.preferred_username) || "",
    givenName: (userInfo == null ? void 0 : userInfo.given_name) || "",
    familyName: (userInfo == null ? void 0 : userInfo.family_name) || "",
    picture: (userInfo == null ? void 0 : userInfo.picture) || "",
    idToken: tokenResponse.id_token || ""
  };
  const jwtPayload = {
    email: userPayload.email,
    name: userPayload.name,
    sub: userPayload.sub,
    authMethod: "keycloak",
    realm: sessionData.realm
  };
  const jwtSecret = keycloakConfig.clientSecret || process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "JWT_SECRET or clientSecret must be configured for Keycloak authentication"
    });
  }
  const token = jwt.sign(jwtPayload, jwtSecret, {
    expiresIn: tokenResponse.expires_in || 3600
  });
  setCookie(event, "auth_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: tokenResponse.expires_in || 3600
  });
  const userInfoCookie = Buffer.from(JSON.stringify(userPayload)).toString("base64");
  setCookie(event, "user_info", userInfoCookie, {
    httpOnly: false,
    secure: true,
    sameSite: "strict",
    maxAge: tokenResponse.expires_in || 3600
  });
  return sendRedirect(event, "/admin");
});

export { callback_get as default };
//# sourceMappingURL=callback.get.mjs.map
