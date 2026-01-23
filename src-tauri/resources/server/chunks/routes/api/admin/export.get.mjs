import { d as defineEventHandler, u as useStorage } from '../../../nitro/nitro.mjs';
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

const export_get = defineEventHandler(async (event) => {
  var _a;
  const mocksStorage = useStorage("mocks");
  const collectionsStorage = useStorage("collections");
  const mockKeys = await mocksStorage.getKeys();
  const collectionKeys = await collectionsStorage.getKeys();
  const collectionsMap = {};
  for (const key of collectionKeys) {
    const collection = await collectionsStorage.getItem(key);
    if (collection) {
      collectionsMap[collection.id] = collection;
    }
  }
  if (!collectionsMap["root"]) {
    collectionsMap["root"] = { id: "root", name: "root", description: "Default collection" };
  }
  const paths = {};
  const usedTags = /* @__PURE__ */ new Set();
  for (const key of mockKeys) {
    const mock = await mocksStorage.getItem(key);
    if (!mock) continue;
    const collectionId = mock.collection || "root";
    const collectionName = ((_a = collectionsMap[collectionId]) == null ? void 0 : _a.name) || "root";
    usedTags.add(collectionName);
    let basePath = mock.path;
    if (collectionName !== "root") {
      basePath = `/c/${collectionName}${mock.path}`;
    }
    const openApiPath = basePath.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }
    const method = mock.method.toLowerCase();
    const parameters = [];
    const paramMatches = mock.path.match(/:([a-zA-Z0-9_]+)/g);
    if (paramMatches) {
      paramMatches.forEach((param) => {
        parameters.push({
          name: param.replace(":", ""),
          in: "path",
          required: true,
          schema: { type: "string" }
        });
      });
    }
    const contentSchema = {
      "application/json": {
        "schema": {
          "type": "object",
          "example": mock.response
        }
      }
    };
    paths[openApiPath][method] = {
      summary: `${mock.method} ${basePath}`,
      tags: [collectionName],
      parameters,
      responses: {
        [mock.status]: {
          description: "Mock response",
          content: contentSchema
        }
      },
      security: mock.secure ? [{ bearerAuth: [] }] : []
    };
  }
  const tags = Array.from(usedTags).map((tagName) => {
    const collection = Object.values(collectionsMap).find((c) => c.name === tagName);
    return {
      name: tagName,
      description: (collection == null ? void 0 : collection.description) || `Endpoints in ${tagName} collection`
    };
  });
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "Mock Service API",
      version: "1.0.0"
    },
    tags,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer"
        }
      }
    },
    paths
  };
  return spec;
});

export { export_get as default };
//# sourceMappingURL=export.get.mjs.map
