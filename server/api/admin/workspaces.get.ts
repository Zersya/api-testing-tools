import { db } from '../../db';
import { workspaces, workspaceShares, workspaceAccess } from '../../db/schema';
import { desc, eq, or, isNull, and, gt, inArray } from 'drizzle-orm';
import { getAccessibleWorkspaceIds } from '../../utils/permissions';

export default defineEventHandler(async (event) => {
  const user = event.context.user;

  try {
    // If no user, return empty (shouldn't happen due to middleware, but safety first)
    if (!user?.id) {
      return [];
    }

    // Get all workspace IDs this user can access (owned + shared)
    const accessibleIds = await getAccessibleWorkspaceIds(user.id);

    if (accessibleIds.length === 0) {
      return [];
    }

    // Fetch the accessible workspaces
    const accessibleWorkspaces = await db
      .select()
      .from(workspaces)
      .where(inArray(workspaces.id, accessibleIds))
      .orderBy(desc(workspaces.createdAt));

    // Add ownership info to each workspace
    const workspacesWithInfo = accessibleWorkspaces.map(ws => ({
      ...ws,
      isOwner: ws.ownerId === user.id || ws.ownerId === null || ws.ownerId === 'unknown' || ws.ownerId === '',
      isShared: ws.ownerId !== null && ws.ownerId !== user.id
    }));

    return workspacesWithInfo;
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch workspaces'
    });
  }
});
