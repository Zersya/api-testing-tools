import { db } from '../../../../../db';
import { workspaces, workspaceMembers } from '../../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { isWorkspaceOwner } from '../../../../../utils/permissions';

export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'id');
  const memberId = getRouterParam(event, 'memberId');
  const user = event.context.user;

  if (!workspaceId || !memberId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Workspace ID and Member ID are required'
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

  // Only workspace owner can remove members
  const isOwner = await isWorkspaceOwner(user.id, workspaceId);
  if (!isOwner) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only workspace owner can remove members'
    });
  }

  // Check if member exists
  const member = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.id, memberId),
        eq(workspaceMembers.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!member.length) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Member not found'
    });
  }

  try {
    // Soft delete by updating status to revoked
    await db
      .update(workspaceMembers)
      .set({
        status: 'revoked',
        revokedAt: new Date()
      })
      .where(eq(workspaceMembers.id, memberId));

    return {
      success: true,
      message: 'Member removed successfully'
    };
  } catch (error: any) {
    console.error('Error removing member:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to remove member'
    });
  }
});
