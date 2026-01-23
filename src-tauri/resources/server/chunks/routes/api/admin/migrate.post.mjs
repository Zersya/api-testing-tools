import { d as defineEventHandler, r as readBody, c as createError } from '../../../nitro/nitro.mjs';
import { g as getMigrationStatus, m as migrateMocksToNewSchema } from '../../../_/migration.mjs';
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

const migrate_post = defineEventHandler(async (event) => {
  const body = await readBody(event);
  if (body.action === "status") {
    const status = await getMigrationStatus();
    return status;
  }
  if (body.action === "migrate") {
    const status = await getMigrationStatus();
    if (status.isMigrated) {
      return {
        success: false,
        message: "Migration already completed. Use rollback first to re-migrate.",
        migrationData: status.migrationData
      };
    }
    const result = await migrateMocksToNewSchema();
    return result;
  }
  throw createError({
    statusCode: 400,
    statusMessage: 'Invalid action. Use "status", or "migrate".'
  });
});

export { migrate_post as default };
//# sourceMappingURL=migrate.post.mjs.map
