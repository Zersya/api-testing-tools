import { d as defineEventHandler, a as getQuery, z as requestHistories, b as db, c as createError } from '../../nitro/nitro.mjs';
import { eq, and, sql, desc } from 'drizzle-orm';
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
    const query = getQuery(event);
    const page = Math.max(1, parseInt(query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10)));
    const offset = (page - 1) * limit;
    const conditions = [];
    if (query.method) {
      const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
      const method = query.method.toUpperCase();
      if (validMethods.includes(method)) {
        conditions.push(eq(requestHistories.method, method));
      }
    }
    if (query.status) {
      const statusCode = parseInt(query.status, 10);
      if (!isNaN(statusCode) && statusCode >= 100 && statusCode < 600) {
        conditions.push(eq(requestHistories.statusCode, statusCode));
      }
    }
    if (query.workspaceId) {
      conditions.push(eq(requestHistories.workspaceId, query.workspaceId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
    const countResult = db.select({ count: sql`count(*)` }).from(requestHistories).where(whereClause).get();
    const total = (countResult == null ? void 0 : countResult.count) || 0;
    const items = db.select().from(requestHistories).where(whereClause).orderBy(desc(requestHistories.timestamp)).limit(limit).offset(offset).all();
    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error("Error fetching request history:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch request history"
    });
  }
});

export { index_get as default };
//# sourceMappingURL=index.get2.mjs.map
