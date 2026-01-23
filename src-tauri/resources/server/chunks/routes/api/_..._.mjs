import { d as defineEventHandler, u as useStorage, c as createError, g as getHeader, s as setResponseStatus } from '../../nitro/nitro.mjs';
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

const _____ = defineEventHandler(async (event) => {
  const originalPath = event.path;
  const method = event.method;
  if (originalPath.startsWith("/api/admin") || originalPath.startsWith("/api/auth")) {
    return;
  }
  const mocksStorage = useStorage("mocks");
  const collectionsStorage = useStorage("collections");
  let targetCollectionId = null;
  let targetPath = originalPath;
  const collectionPathMatch = originalPath.match(/^\/c\/([^/]+)(\/.*)?$/);
  if (collectionPathMatch) {
    const collectionName = collectionPathMatch[1];
    targetPath = collectionPathMatch[2] || "/";
    const collectionKeys = await collectionsStorage.getKeys();
    for (const key of collectionKeys) {
      const collection = await collectionsStorage.getItem(key);
      if (collection && collection.name === collectionName) {
        targetCollectionId = collection.id;
        break;
      }
    }
    if (!targetCollectionId) {
      throw createError({
        statusCode: 404,
        statusMessage: `Collection "${collectionName}" not found`
      });
    }
  } else {
    targetCollectionId = "root";
  }
  const mockKeys = await mocksStorage.getKeys();
  for (const key of mockKeys) {
    const mock = await mocksStorage.getItem(key);
    if (!mock || mock.method !== method) continue;
    const mockCollection = mock.collection || "root";
    if (mockCollection !== targetCollectionId) continue;
    const regexPath = mock.path.replace(/:[^\s/]+/g, "([^/]+)").replace(/\//g, "\\/");
    const regex = new RegExp(`^${regexPath}$`);
    if (regex.test(targetPath)) {
      if (mock.secure) {
        const authHeader = getHeader(event, "authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          setResponseStatus(event, 401);
          return { error: "Unauthorized: Bearer token missing" };
        }
        const settings = await useStorage("settings").getItem("global");
        if (settings && settings.bearerToken) {
          const token = authHeader.split(" ")[1];
          if (token !== settings.bearerToken) {
            setResponseStatus(event, 403);
            return { error: "Forbidden: Invalid token" };
          }
        }
      }
      if (mock.delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, mock.delay));
      }
      setResponseStatus(event, mock.status);
      return mock.response;
    }
  }
  throw createError({
    statusCode: 404,
    statusMessage: "Mock not found"
  });
});

export { _____ as default };
//# sourceMappingURL=_..._.mjs.map
