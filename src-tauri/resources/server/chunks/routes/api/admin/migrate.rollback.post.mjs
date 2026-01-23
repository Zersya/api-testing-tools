import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
import { g as getMigrationStatus, r as rollbackMigration } from '../../../_/migration.mjs';
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

const migrate_rollback_post = defineEventHandler(async (event) => {
  const status = await getMigrationStatus();
  if (!status.isMigrated) {
    return {
      success: false,
      message: "No migration to rollback"
    };
  }
  const result = await rollbackMigration();
  return result;
});

export { migrate_rollback_post as default };
//# sourceMappingURL=migrate.rollback.post.mjs.map
