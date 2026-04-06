import { db } from '../../../../db';
import { workspaces, workspaceMembers } from '../../../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { isWorkspaceOwnerViaMember, canAccessWorkspace, getOriginalOwnerId } from '../../../../utils/permissions';

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

  // Check if user can access this workspace
  const canAccess = await canAccessWorkspace(user.id, workspaceId, user.email);
  if (!canAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied'
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

    // Check if current user is owner (for UI permissions)
    const isOwner = await isWorkspaceOwnerViaMember(user.id, workspaceId);
    
    // Get original owner ID for UI protection
    const originalOwnerId = await getOriginalOwnerId(workspaceId);

    return {
      members: members.map(member => ({
        ...member,
        isCurrentUser: member.userId === user.id || member.email === user.email,
        isOriginalOwner: member.userId === originalOwnerId
      })),
      isOwner
    };
  } catch (error: any) {
    console.error('Error fetching workspace members:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch members'
    });
  }
});
