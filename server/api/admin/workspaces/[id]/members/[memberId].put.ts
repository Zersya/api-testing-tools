import { db } from '../../../../../db';
import { workspaces, workspaceMembers } from '../../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { canInviteMembers } from '../../../../../utils/permissions';
import type { MemberPermission } from '../../../../../db/schema/workspaceMember';

interface UpdateMemberBody {
  permission: MemberPermission;
}

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

  // Only workspace owners can update member permissions
  const canUpdate = await canInviteMembers(user.id, workspaceId);
  if (!canUpdate) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only workspace owners can update member permissions'
    });
  }

  const body = await readBody<UpdateMemberBody>(event);

  // Validate permission
  if (!body.permission || !['view', 'edit', 'owner'].includes(body.permission)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Permission must be "view", "edit", or "owner"'
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

  // Cannot update revoked members
  if (member[0].status === 'revoked') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot update revoked member'
    });
  }

  try {
    const updated = await db
      .update(workspaceMembers)
      .set({
        permission: body.permission
      })
      .where(eq(workspaceMembers.id, memberId))
      .returning();

    return {
      id: updated[0].id,
      email: updated[0].email,
      permission: updated[0].permission,
      status: updated[0].status,
      message: 'Member permission updated successfully'
    };
  } catch (error: any) {
    console.error('Error updating member:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update member'
    });
  }
});
