import { d as defineEventHandler, u as useStorage, o as deleteCookie, a as getQuery, v as getRequestURL, t as sendRedirect } from '../../../nitro/nitro.mjs';
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

const logout_post = defineEventHandler(async (event) => {
  const storage = useStorage("settings");
  const settings = await storage.getItem("global") || {};
  const keycloakConfig = settings.keycloak || {};
  deleteCookie(event, "auth_token");
  deleteCookie(event, "user_info");
  if (keycloakConfig.enabled && keycloakConfig.logoutUrl) {
    const query = getQuery(event);
    const redirectTo = query.redirect || "/login";
    const logoutUrl = new URL(keycloakConfig.logoutUrl);
    logoutUrl.searchParams.set("post_logout_redirect_uri", getRequestURL(event).origin + redirectTo);
    return sendRedirect(event, logoutUrl.toString());
  }
  return sendRedirect(event, "/login");
});

export { logout_post as default };
//# sourceMappingURL=logout.post.mjs.map
