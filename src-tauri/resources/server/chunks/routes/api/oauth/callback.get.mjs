import { d as defineEventHandler, a as getQuery, t as sendRedirect } from '../../../nitro/nitro.mjs';
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

const callback_get = defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = query.code;
  const state = query.state;
  const error = query.error;
  const errorDescription = query.error_description;
  if (error) {
    return sendRedirect(event, `/?oauth_error=${encodeURIComponent(errorDescription || error)}`);
  }
  if (!code) {
    return sendRedirect(event, `/?oauth_error=${encodeURIComponent("No authorization code received")}`);
  }
  return sendRedirect(event, `/?oauth_code=${encodeURIComponent(code)}&oauth_state=${encodeURIComponent(state || "")}`);
});

export { callback_get as default };
//# sourceMappingURL=callback.get.mjs.map
