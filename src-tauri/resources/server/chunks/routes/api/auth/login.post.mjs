import { d as defineEventHandler, r as readBody, n as useRuntimeConfig, q as setCookie, c as createError } from '../../../nitro/nitro.mjs';
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

const login_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password } = body;
  const config = useRuntimeConfig();
  if (email === config.adminEmail && password === config.adminPassword) {
    const token = jwt.sign({ email }, config.jwtSecret, { expiresIn: "24h" });
    setCookie(event, "auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24
    });
    return {
      success: true,
      token,
      user: {
        id: "admin",
        email,
        name: "Administrator",
        workspaceId: "default"
      }
    };
  }
  throw createError({
    statusCode: 401,
    statusMessage: "Invalid credentials"
  });
});

export { login_post as default };
//# sourceMappingURL=login.post.mjs.map
