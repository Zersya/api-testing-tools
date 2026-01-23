import { d as defineEventHandler, h as getRouterParam, c as createError, b as db, x as apiDefinitions } from '../../../nitro/nitro.mjs';
import { eq } from 'drizzle-orm';
import { p as parseYAML, a as parseOpenAPISpec } from '../../../_/yaml-parser.mjs';
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

const _id__get = defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "ID is required" });
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
  }
  let parsedInfo = null;
  const parseResult = parseOpenAPISpec(specObj);
  if (parseResult.success && parseResult.data) {
    parsedInfo = parseResult.data;
  }
  return {
    ...definition,
    parsedInfo
  };
});

export { _id__get as default };
//# sourceMappingURL=_id_.get.mjs.map
