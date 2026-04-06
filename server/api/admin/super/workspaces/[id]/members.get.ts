import { db } from '../../../../../db';
import { workspaces, workspaceMembers } from '../../../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { isSuperAdmin, getOriginalOwnerId } from '../../../../../utils/permissions';

export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id');
  const user = event.context.user;

  if (!workspaceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace ID is required'
    });
  }

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    });
  }

  // Check if user is Super Admin
  if (!isSuperAdmin(user.email)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only Super Admin can view members of any workspace'
    });
  }

  // Check if workspace exists
  const workspace = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace.length) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Workspace not found'
    });
  }

  try {
    const members = await db
      .select({
        id: workspaceMembers.id,
        email: workspaceMembers.email,
        userId: workspaceMembers.userId,
        permission: workspaceMembers.permission,
        status: workspaceMembers.status,
        invitedBy: workspaceMembers.invitedBy,
        invitedAt: workspaceMembers.invitedAt,
        acceptedAt: workspaceMembers.acceptedAt,
        revokedAt: workspaceMembers.revokedAt
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(desc(workspaceMembers.invitedAt));

    // Get original owner ID for UI protection
    const originalOwnerId = await getOriginalOwnerId(workspaceId);

    return {
      members: members.map(member => ({
        ...member,
        isCurrentUser: member.userId === user.id || member.email === user.email,
        isOriginalOwner: originalOwnerId !== null && member.userId === originalOwnerId
      })),
      isOwner: true // Super Admin acts as owner for UI purposes
    };
  } catch (error: any) {
    console.error('Error fetching workspace members:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch members'
    });
  }
});
