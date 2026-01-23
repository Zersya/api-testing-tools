import { d as defineEventHandler } from '../../../nitro/nitro.mjs';
import { g as getMigrationStatus } from '../../../_/migration.mjs';
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

const migrate_get = defineEventHandler(async (event) => {
  return getMigrationStatus();
});

export { migrate_get as default };
//# sourceMappingURL=migrate.get.mjs.map
