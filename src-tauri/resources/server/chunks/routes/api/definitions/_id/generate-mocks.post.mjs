import { d as defineEventHandler, h as getRouterParam, r as readBody, c as createError, b as db, x as apiDefinitions, u as useStorage } from '../../../../nitro/nitro.mjs';
import { eq } from 'drizzle-orm';
import { p as parseYAML, a as parseOpenAPISpec } from '../../../../_/yaml-parser.mjs';
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
import 'node:url';
import 'jsonwebtoken';

function generateMockData(schema, definitions = {}, depth = 0) {
  if (depth > 5) return null;
  if (!schema) return null;
  if (schema.example !== void 0) return schema.example;
  if (schema.default !== void 0) return schema.default;
  if (schema.$ref) {
    const refName = schema.$ref.split("/").pop();
    if (refName && definitions[refName]) {
      return generateMockData(definitions[refName], definitions, depth + 1);
    }
    return {};
  }
  if (schema.allOf) {
    let result = {};
    for (const subSchema of schema.allOf) {
      result = { ...result, ...generateMockData(subSchema, definitions, depth) };
    }
    return result;
  }
  if (schema.oneOf && schema.oneOf.length > 0) {
    return generateMockData(schema.oneOf[0], definitions, depth);
  }
  if (schema.anyOf && schema.anyOf.length > 0) {
    return generateMockData(schema.anyOf[0], definitions, depth);
  }
  switch (schema.type) {
    case "object":
      if (schema.properties) {
        const result = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
          result[key] = generateMockData(prop, definitions, depth + 1);
        }
        return result;
      }
      return {};
    case "array":
      if (schema.items) {
        return [generateMockData(schema.items, definitions, depth + 1)];
      }
      return [];
    case "string":
      if (schema.enum && schema.enum.length > 0) return schema.enum[0];
      if (schema.format === "date-time") return (/* @__PURE__ */ new Date()).toISOString();
      if (schema.format === "date") return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      if (schema.format === "email") return "user@example.com";
      if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000";
      if (schema.format === "uri") return "https://example.com";
      return "string";
    case "integer":
    case "number":
      if (schema.enum && schema.enum.length > 0) return schema.enum[0];
      return 0;
    case "boolean":
      return true;
    case "null":
      return null;
    default:
      return {};
  }
}

function findResponse(endpoint, responseType, schemas) {
  const responses = endpoint.responses || {};
  if (responseType === "success") {
    const successKey = Object.keys(responses).find((k) => k.startsWith("2"));
    if (successKey) {
      const responseObj = responses[successKey];
      let responseData = {};
      if (responseObj.content && responseObj.content["application/json"]) {
        const mediaType = responseObj.content["application/json"];
        if (mediaType.example) {
          responseData = mediaType.example;
        } else if (mediaType.examples) {
          const firstExample = Object.values(mediaType.examples)[0];
          responseData = firstExample.value || {};
        } else if (mediaType.schema) {
          responseData = generateMockData(mediaType.schema, schemas);
        }
      }
      return { status: parseInt(successKey), response: responseData };
    }
  } else {
    const errorKey = Object.keys(responses).find((k) => k.startsWith("4") || k.startsWith("5"));
    if (errorKey) {
      const responseObj = responses[errorKey];
      let responseData = {};
      if (responseObj.content && responseObj.content["application/json"]) {
        const mediaType = responseObj.content["application/json"];
        if (mediaType.example) {
          responseData = mediaType.example;
        } else if (mediaType.examples) {
          const firstExample = Object.values(mediaType.examples)[0];
          responseData = firstExample.value || {};
        } else if (mediaType.schema) {
          responseData = generateMockData(mediaType.schema, schemas);
        }
      }
      return { status: parseInt(errorKey), response: responseData };
    }
  }
  if (responseType === "success") {
    return { status: 200, response: { message: "Success" } };
  } else {
    return { status: 500, response: { error: "Internal Server Error" } };
  }
}
const generateMocks_post = defineEventHandler(async (event) => {
  var _a;
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  const selectedEndpoints = body.endpoints || [];
  const targetCollection = body.collection || "root";
  const delay = body.delay || 0;
  const responseType = body.responseType || "success";
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Definition ID is required" });
  }
  const definition = db.select().from(apiDefinitions).where(eq(apiDefinitions.id, id)).get();
  if (!definition) {
    throw createError({ statusCode: 404, statusMessage: "Definition not found" });
  }
  let specContent = definition.specContent;
  let specObj = specContent;
  try {
    if (typeof specContent === "string") {
      const trimmed = specContent.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        specObj = JSON.parse(specContent);
      } else {
        specObj = parseYAML(specContent);
      }
    }
  } catch (e) {
    console.error("Failed to parse spec content:", e);
    throw createError({ statusCode: 500, statusMessage: "Failed to parse API Definition content" });
  }
  const parseResult = parseOpenAPISpec(specObj);
  if (!parseResult.success || !parseResult.data) {
    throw createError({ statusCode: 400, statusMessage: "Invalid API Definition: " + (((_a = parseResult.errors[0]) == null ? void 0 : _a.message) || "Unknown error") });
  }
  const storage = useStorage("mocks");
  const generatedMocks = [];
  for (const endpoint of parseResult.data.endpoints) {
    const endpointKey = `${endpoint.method}:${endpoint.path}`;
    if (selectedEndpoints.length > 0 && !selectedEndpoints.includes(endpointKey)) {
      continue;
    }
    const { status, response: responseData } = findResponse(endpoint, responseType, parseResult.data.schemas);
    const keys = await storage.getKeys();
    let existingMockId = null;
    for (const key of keys) {
      const mock = await storage.getItem(key);
      if (mock && mock.path === endpoint.path && mock.method === endpoint.method && (mock.collection || "root") === targetCollection) {
        existingMockId = key;
        break;
      }
    }
    const mockId = existingMockId || v4();
    const newMock = {
      id: mockId,
      collection: targetCollection,
      path: endpoint.path,
      method: endpoint.method,
      status,
      response: responseData,
      delay,
      secure: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      sourceDefinitionId: id
    };
    await storage.setItem(mockId, newMock);
    generatedMocks.push(newMock);
  }
  return {
    success: true,
    count: generatedMocks.length,
    mocks: generatedMocks
  };
});

export { generateMocks_post as default };
//# sourceMappingURL=generate-mocks.post.mjs.map
