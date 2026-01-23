import { d as defineEventHandler, b as db, x as apiDefinitions, c as createError } from '../../nitro/nitro.mjs';
import { desc } from 'drizzle-orm';
import { p as parseYAML, a as parseOpenAPISpec } from '../../_/yaml-parser.mjs';
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

const index_get = defineEventHandler(async (event) => {
  try {
    const definitions = await db.select().from(apiDefinitions).orderBy(desc(apiDefinitions.updatedAt)).all();
    const result = definitions.map((def) => {
      let endpointCount = 0;
      try {
        let specContent = def.specContent;
        let specObj = specContent;
        if (typeof specContent === "string") {
          const trimmed = specContent.trim();
          if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            specObj = JSON.parse(specContent);
          } else {
            specObj = parseYAML(specContent);
          }
        }
        const parseResult = parseOpenAPISpec(specObj);
        if (parseResult.success && parseResult.data) {
          endpointCount = parseResult.data.endpoints.length;
        }
      } catch (e) {
        console.error(`Failed to parse spec for definition ${def.id}:`, e);
      }
      return {
        id: def.id,
        name: def.name,
        specFormat: def.specFormat,
        sourceUrl: def.sourceUrl,
        isPublic: def.isPublic,
        publicSlug: def.publicSlug,
        endpointCount,
        createdAt: def.createdAt,
        updatedAt: def.updatedAt
      };
    });
    return result;
  } catch (e) {
    throw createError({ statusCode: 500, statusMessage: "Failed to fetch definitions" });
  }
});

export { index_get as default };
//# sourceMappingURL=index.get.mjs.map
