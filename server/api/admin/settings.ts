import { db, schema } from '../../db';
import { eq, and, isNull, desc } from 'drizzle-orm';

interface PersistedRequestTab {
  key: string;
  request: Record<string, unknown>;
  hasUnsavedChanges: boolean;
  response?: unknown;
  activeBuilderTab?: string;
  scriptLogs?: unknown[];
  draftSnapshot?: Record<string, unknown>;
  expandedNodes?: string[];
}

interface PersistedRequestTabsSession {
  tabs: PersistedRequestTab[];
  activeTabKey: string | null;
}

const REQUEST_TABS_QUERY_KEY = 'requestTabsSession';

const getRequestTabsSettingKey = (userId: string) => `requestTabsSession:${userId}`;

const parseStoredValue = <T>(value: unknown): T | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  return value as T;
};

const isValidRequestTabsSession = (value: unknown): value is PersistedRequestTabsSession => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as PersistedRequestTabsSession;
  return Array.isArray(session.tabs)
    && (typeof session.activeTabKey === 'string' || session.activeTabKey === null)
    && session.tabs.every(tab => (
      tab
      && typeof tab === 'object'
      && typeof tab.key === 'string'
      && tab.request
      && typeof tab.request === 'object'
      && typeof tab.hasUnsavedChanges === 'boolean'
    ));
};

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const requestedKey = typeof query.key === 'string' ? query.key : null;
    const user = event.context.user;

    if (requestedKey === REQUEST_TABS_QUERY_KEY) {
      if (!user?.id) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Unauthorized'
        });
      }

      const settingsKey = getRequestTabsSettingKey(user.id);

      if (event.method === 'GET') {
        const setting = (await db
          .select()
          .from(schema.settings)
          .where(
            and(
              eq(schema.settings.key, settingsKey),
              isNull(schema.settings.workspaceId)
            )
          )
          .orderBy(desc(schema.settings.updatedAt))
          .limit(1))[0];

        const session = parseStoredValue<PersistedRequestTabsSession>(setting?.value);

        return {
          session: isValidRequestTabsSession(session)
            ? session
            : {
                tabs: [],
                activeTabKey: null
              }
        };
      }

      if (event.method === 'POST') {
        const body = await readBody<{ session?: PersistedRequestTabsSession }>(event);
        const session = body?.session;

        if (!isValidRequestTabsSession(session)) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Invalid request tab session payload'
          });
        }

        const now = new Date();
        const existing = (await db
          .select()
          .from(schema.settings)
          .where(
            and(
              eq(schema.settings.key, settingsKey),
              isNull(schema.settings.workspaceId)
            )
          )
          .orderBy(desc(schema.settings.updatedAt))
          .limit(1))[0];

        if (session.tabs.length === 0) {
          if (existing) {
            await db
              .delete(schema.settings)
              .where(eq(schema.settings.id, existing.id));
          }

          return { success: true };
        }

        const serializedSession = JSON.stringify(session);

        if (existing) {
          await db
            .update(schema.settings)
            .set({
              value: serializedSession,
              category: 'ui-session',
              updatedAt: now,
              lastModifiedAt: now
            })
            .where(eq(schema.settings.id, existing.id));
        } else {
          await db.insert(schema.settings).values({
            key: settingsKey,
            value: serializedSession,
            category: 'ui-session',
            createdAt: now,
            updatedAt: now,
            lastModifiedAt: now
          });
        }

        return { success: true };
      }
    }

    if (event.method === 'GET') {
      const setting = (await db
        .select()
        .from(schema.settings)
        .where(
          and(
            eq(schema.settings.key, 'bearerToken'),
            isNull(schema.settings.workspaceId)
          )
        )
        .limit(1))[0];

      return { 
        bearerToken: (setting?.value as string) || '' 
      };
    }

    if (event.method === 'POST') {
      const body = await readBody(event);
      const now = new Date();

      // Check if setting exists
      const existing = (await db
        .select()
        .from(schema.settings)
        .where(
          and(
            eq(schema.settings.key, 'bearerToken'),
            isNull(schema.settings.workspaceId)
          )
        )
        .limit(1))[0];

      if (existing) {
        // Update existing
        await db
          .update(schema.settings)
          .set({
            value: body.bearerToken,
            updatedAt: now,
            lastModifiedAt: now
          })
          .where(eq(schema.settings.id, existing.id));
      } else {
        // Insert new
        await db.insert(schema.settings).values({
          key: 'bearerToken',
          value: body.bearerToken,
          createdAt: now,
          updatedAt: now,
          lastModifiedAt: now
        });
      }

      return { success: true };
    }
  } catch (error) {
    console.error('Error handling settings:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to handle settings'
    });
  }
});
