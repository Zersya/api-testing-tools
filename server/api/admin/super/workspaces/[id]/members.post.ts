import { db } from '../../../../../db';
import { workspaces, workspaceMembers } from '../../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { isSuperAdmin } from '../../../../../utils/permissions';
import type { MemberPermission } from '../../../../../db/schema/workspaceMember';

interface InviteMemberBody {
  email: string;
  permission: MemberPermission;
}

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
      statusMessage: 'Only Super Admin can invite members to any workspace'
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

  const body = await readBody<InviteMemberBody>(event);

  // Validate input
  if (!body.email || !body.permission) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and permission are required'
    });
  }

  // Normalize email
  const normalizedEmail = body.email.toLowerCase().trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid email format'
    });
  }

  // Validate permission
  if (!['view', 'edit'].includes(body.permission)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Permission must be "view" or "edit"'
    });
  }

  // Check if member already exists (accepted)
  const existingMember = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.email, normalizedEmail),
        eq(workspaceMembers.status, 'accepted')
      )
    )
    .limit(1);

  if (existingMember.length) {
    throw createError({
      statusCode: 409,
      statusMessage: 'User is already a member of this workspace'
    });
  }

  // Check if invitation already pending
  const pendingInvitation = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.email, normalizedEmail),
        eq(workspaceMembers.status, 'pending')
      )
    )
    .limit(1);

  if (pendingInvitation.length) {
    // Update the existing pending invitation
    const updated = await db
      .update(workspaceMembers)
      .set({
        permission: body.permission,
        invitedAt: new Date()
      })
      .where(eq(workspaceMembers.id, pendingInvitation[0].id))
      .returning();

    return {
      id: updated[0].id,
      email: updated[0].email,
      permission: updated[0].permission,
      status: updated[0].status,
      invitedAt: updated[0].invitedAt,
      message: 'Invitation updated'
    };
  }

  // Create new member invitation
  try {
    const newMember = await db
      .insert(workspaceMembers)
      .values({
        workspaceId,
        email: normalizedEmail,
        permission: body.permission,
        invitedBy: user.id,
        status: 'pending'
      })
      .returning();

    return {
      id: newMember[0].id,
      email: newMember[0].email,
      permission: newMember[0].permission,
      status: newMember[0].status,
      invitedAt: newMember[0].invitedAt,
      message: 'Invitation sent successfully'
    };
  } catch (error: any) {
    console.error('Error creating member invitation:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to send invitation'
    });
  }
});
