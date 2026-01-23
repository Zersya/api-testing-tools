import { d as defineEventHandler, r as readBody, c as createError, u as useStorage } from '../../../nitro/nitro.mjs';
import { v4 } from 'uuid';
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

const resource_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { resourceName, basePath, collection } = body;
  if (!resourceName || !basePath) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing resourceName or basePath"
    });
  }
  const storage = useStorage("mocks");
  const createdMocks = [];
  const createMock = async (method, path, status, response) => {
    const id = v4();
    const mock = {
      id,
      collection: collection || "root",
      path,
      method,
      status,
      response,
      delay: 0,
      secure: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await storage.setItem(id, mock);
    createdMocks.push(mock);
  };
  await createMock("GET", basePath, 200, [
    { id: 1, name: `${resourceName} 1` },
    { id: 2, name: `${resourceName} 2` }
  ]);
  await createMock("GET", `${basePath}/:id`, 200, {
    id: 1,
    name: `${resourceName} 1`,
    details: "Detailed info"
  });
  await createMock("POST", basePath, 201, {
    id: 3,
    name: `New ${resourceName}`,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await createMock("PUT", `${basePath}/:id`, 200, {
    id: 1,
    name: `Updated ${resourceName}`,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  await createMock("DELETE", `${basePath}/:id`, 200, {});
  return {
    success: true,
    created: createdMocks.length,
    mocks: createdMocks
  };
});

export { resource_post as default };
//# sourceMappingURL=resource.post.mjs.map
