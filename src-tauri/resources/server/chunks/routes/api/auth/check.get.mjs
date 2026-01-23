import { d as defineEventHandler, m as getCookie, c as createError, n as useRuntimeConfig } from '../../../nitro/nitro.mjs';
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

const check_get = defineEventHandler((event) => {
  var _a;
  const token = getCookie(event, "auth_token");
  const userInfoCookie = getCookie(event, "user_info");
  const config = useRuntimeConfig();
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized"
    });
  }
  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch (e) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid or expired token"
    });
  }
  let userInfo = null;
  if (userInfoCookie) {
    try {
      userInfo = JSON.parse(Buffer.from(userInfoCookie, "base64").toString("utf8"));
    } catch (e) {
      userInfo = null;
    }
  }
  if (!userInfo && decoded) {
    userInfo = {
      sub: decoded.sub || "",
      email: decoded.email || "",
      name: decoded.name || "",
      username: ((_a = decoded.email) == null ? void 0 : _a.split("@")[0]) || "",
      givenName: "",
      familyName: "",
      picture: "",
      idToken: ""
    };
  }
  const tokenExp = decoded.exp ? decoded.exp * 1e3 : null;
  const isExpiringSoon = tokenExp && tokenExp - Date.now() < 5 * 60 * 1e3;
  return {
    status: "logged_in",
    storageDriver: process.env.REDIS_URL ? "redis" : "fs",
    user: userInfo,
    authMethod: decoded.authMethod || "credentials",
    realm: decoded.realm || null,
    tokenExpiry: decoded.exp || null,
    isTokenExpiringSoon: isExpiringSoon || false
  };
});

export { check_get as default };
//# sourceMappingURL=check.get.mjs.map
