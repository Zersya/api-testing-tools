import { d as defineEventHandler, a as getQuery, b as db, z as requestHistories, c as createError } from '../../nitro/nitro.mjs';
import { sql, eq } from 'drizzle-orm';
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

const index_delete = defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    let countResult;
    if (query.workspaceId) {
      countResult = db.select({ count: sql`count(*)` }).from(requestHistories).where(eq(requestHistories.workspaceId, query.workspaceId)).get();
      db.delete(requestHistories).where(eq(requestHistories.workspaceId, query.workspaceId)).run();
    } else {
      countResult = db.select({ count: sql`count(*)` }).from(requestHistories).get();
      db.delete(requestHistories).run();
    }
    const deletedCount = (countResult == null ? void 0 : countResult.count) || 0;
    return {
      success: true,
      message: `Successfully cleared ${deletedCount} history entries`,
      deletedCount
    };
  } catch (error) {
    console.error("Error clearing request history:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to clear request history"
    });
  }
});

export { index_delete as default };
//# sourceMappingURL=index.delete.mjs.map
