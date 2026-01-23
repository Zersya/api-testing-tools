import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, x as apiDefinitions } from '../../../../nitro/nitro.mjs';
import { eq } from 'drizzle-orm';
import { p as parseYAML, a as parseOpenAPISpec } from '../../../../_/yaml-parser.mjs';
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

const _slug__get = defineEventHandler(async (event) => {
  try {
    const slug = getRouterParam(event, "slug");
    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: "Slug is required"
      });
    }
    const definition = db.select().from(apiDefinitions).where(eq(apiDefinitions.publicSlug, slug)).get();
    if (!definition) {
      throw createError({
        statusCode: 404,
        statusMessage: "Public documentation not found"
      });
    }
    if (!definition.isPublic) {
      throw createError({
        statusCode: 404,
        statusMessage: "Public documentation not found"
      });
    }
    let specObj;
    try {
      if (typeof definition.specContent === "string") {
        const trimmed = definition.specContent.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          specObj = JSON.parse(definition.specContent);
        } else {
          specObj = parseYAML(definition.specContent);
        }
      } else {
        specObj = definition.specContent;
      }
      const parseResult = parseOpenAPISpec(specObj);
      if (!parseResult.success || !parseResult.data) {
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to parse API specification"
        });
      }
      return {
        definition: {
          id: definition.id,
          name: definition.name,
          specFormat: definition.specFormat
        },
        spec: parseResult.data
      };
    } catch (e) {
      console.error("Error parsing spec:", e);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to parse API specification"
      });
    }
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error fetching public doc:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch public documentation"
    });
  }
});

export { _slug__get as default };
//# sourceMappingURL=_slug_.get.mjs.map
