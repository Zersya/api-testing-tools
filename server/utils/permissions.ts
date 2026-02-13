import { db } from '../db';
import { workspaces, workspaceShares, workspaceAccess } from '../db/schema';
import { eq, and, or, gt, isNull, inArray } from 'drizzle-orm';
import type { SharePermission } from '../db/schema/workspaceShare';

/**
 * Permission levels hierarchy
 * owner > edit > view
 */
export type PermissionLevel = 'owner' | 'edit' | 'view' | null;

/**
 * Result of share token validation
 */
export interface ShareTokenValidation {
  valid: boolean;
  permission?: SharePermission;
  workspaceId?: string;
  shareId?: string;
  error?: string;
}

/**
 * Check if user is the owner of a workspace
 */
export async function isWorkspaceOwner(userId: string, workspaceId: string): Promise<boolean> {
  const workspace = await db
    .select({ ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (!workspace.length) return false;
  
  // ownerId must match - no legacy null check (app not released yet)
  return workspace[0].ownerId === userId;
}

/**
 * Check if user has access to a workspace via share link
 */
export async function hasSharedAccess(userId: string, workspaceId: string): Promise<SharePermission | null> {
  const now = new Date();
  
  // Find active share for this workspace that the user has accessed
  const accessRecord = await db
    .select({
      permission: workspaceAccess.permission,
      shareIsActive: workspaceShares.isActive,
      shareExpiresAt: workspaceShares.expiresAt
    })
    .from(workspaceAccess)
    .innerJoin(workspaceShares, eq(workspaceAccess.shareId, workspaceShares.id))
    .where(
      and(
        eq(workspaceAccess.userId, userId),
        eq(workspaceShares.workspaceId, workspaceId),
        eq(workspaceShares.isActive, true)
      )
    )
    .limit(1);

  if (!accessRecord.length) return null;

  const record = accessRecord[0];
  
  // Check if share is still active and not expired
  if (!record.shareIsActive) return null;
  if (record.shareExpiresAt && record.shareExpiresAt < now) return null;

  return record.permission as SharePermission;
}

/**
 * Get user's permission level for a workspace
 * Returns: 'owner' | 'edit' | 'view' | null
 */
export async function getWorkspacePermission(userId: string, workspaceId: string): Promise<PermissionLevel> {
  // First check if user is owner
  const isOwner = await isWorkspaceOwner(userId, workspaceId);
  if (isOwner) return 'owner';

  // Then check for shared access
  const sharedPermission = await hasSharedAccess(userId, workspaceId);
  if (sharedPermission) return sharedPermission;

  return null;
}

/**
 * Get permissions for multiple workspaces in a single batch query
 * This avoids N+1 queries when fetching workspace tree
 */
export async function getWorkspacePermissionsBatch(
  userId: string, 
  workspaceIds: string[]
): Promise<Map<string, PermissionLevel>> {
  const now = new Date();
  const permissionMap = new Map<string, PermissionLevel>();

  if (workspaceIds.length === 0) return permissionMap;

  // Get all workspaces to check ownership
  const workspaceOwners = await db
    .select({ id: workspaces.id, ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(inArray(workspaces.id, workspaceIds));

  // Mark owned workspaces
  for (const ws of workspaceOwners) {
    if (ws.ownerId === userId) {
      permissionMap.set(ws.id, 'owner');
    }
  }

  // Get shared access for remaining workspaces
  const remainingIds = workspaceIds.filter(id => !permissionMap.has(id));
  
  if (remainingIds.length > 0) {
    const sharedAccess = await db
      .select({
        workspaceId: workspaceShares.workspaceId,
        permission: workspaceAccess.permission,
        shareIsActive: workspaceShares.isActive,
        shareExpiresAt: workspaceShares.expiresAt
      })
      .from(workspaceAccess)
      .innerJoin(workspaceShares, eq(workspaceAccess.shareId, workspaceShares.id))
      .where(
        and(
          eq(workspaceAccess.userId, userId),
          inArray(workspaceShares.workspaceId, remainingIds),
          eq(workspaceShares.isActive, true)
        )
      );

    for (const access of sharedAccess) {
      // Check if share is valid
      if (!access.shareIsActive) continue;
      if (access.shareExpiresAt && access.shareExpiresAt < now) continue;
      
      // Only set if not already set (first valid share wins)
      if (!permissionMap.has(access.workspaceId)) {
        permissionMap.set(access.workspaceId, access.permission as PermissionLevel);
      }
    }
  }

  return permissionMap;
}

/**
 * Check if user can access (view) a workspace
 */
export async function canAccessWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  const permission = await getWorkspacePermission(userId, workspaceId);
  return permission !== null;
}

/**
 * Check if user can edit a workspace (owner or edit permission)
 */
export async function canEditWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  const permission = await getWorkspacePermission(userId, workspaceId);
  return permission === 'owner' || permission === 'edit';
}

/**
 * Check if user can manage shares (only owner)
 */
export async function canManageShares(userId: string, workspaceId: string): Promise<boolean> {
  return await isWorkspaceOwner(userId, workspaceId);
}

/**
 * Validate a share token and return workspace info if valid
 */
export async function validateShareToken(token: string, userId?: string): Promise<ShareTokenValidation> {
  const now = new Date();

  // Find the share by token
  const share = await db
    .select()
    .from(workspaceShares)
    .where(eq(workspaceShares.shareToken, token))
    .limit(1);

  if (!share.length) {
    return { valid: false, error: 'Share link not found' };
  }

  const shareRecord = share[0];

  // Check if share is active
  if (!shareRecord.isActive) {
    return { valid: false, error: 'Share link has been revoked' };
  }

  // Check if share has expired
  if (shareRecord.expiresAt && shareRecord.expiresAt < now) {
    return { valid: false, error: 'Share link has expired' };
  }

  return {
    valid: true,
    permission: shareRecord.permission as SharePermission,
    workspaceId: shareRecord.workspaceId,
    shareId: shareRecord.id
  };
}

/**
 * Record or update user's access to a shared workspace
 */
export async function recordSharedAccess(shareId: string, userId: string, permission: SharePermission): Promise<void> {
  const now = new Date();

  // Check if access record already exists
  const existing = await db
    .select()
    .from(workspaceAccess)
    .where(
      and(
        eq(workspaceAccess.shareId, shareId),
        eq(workspaceAccess.userId, userId)
      )
    )
    .limit(1);

  if (existing.length) {
    // Update last accessed time
    await db
      .update(workspaceAccess)
      .set({ lastAccessedAt: now })
      .where(eq(workspaceAccess.id, existing[0].id));
  } else {
    // Create new access record
    await db
      .insert(workspaceAccess)
      .values({
        shareId,
        userId,
        permission,
        accessedAt: now,
        lastAccessedAt: now
      });
  }
}

/**
 * Get all workspaces accessible by a user (owned + shared)
 * For legacy workspaces (ownerId = null), they are treated as accessible by all users
 * until they are claimed by setting an owner
 */
export async function getAccessibleWorkspaceIds(userId: string): Promise<string[]> {
  const now = new Date();

  console.log('[Permissions] getAccessibleWorkspaceIds called for user:', userId);

  // Get owned workspaces (including legacy workspaces with null ownerId for backward compatibility)
  const ownedWorkspaces = await db
    .select({ id: workspaces.id, ownerId: workspaces.ownerId })
    .from(workspaces);

  console.log('[Permissions] All workspaces from DB:', ownedWorkspaces);

  // Filter workspaces that user owns or has null/unknown ownerId (legacy/unclaimed)
  const accessibleOwnedWorkspaces = ownedWorkspaces.filter(ws => {
    const isOwned = ws.ownerId === userId;
    const isLegacy = ws.ownerId === null || ws.ownerId === 'unknown' || ws.ownerId === '';
    console.log(`[Permissions] Workspace ${ws.id}: ownerId=${ws.ownerId}, isOwned=${isOwned}, isLegacy=${isLegacy}`);
    return isOwned || isLegacy;
  });

  const ownedIds = accessibleOwnedWorkspaces.map(w => w.id);
  console.log('[Permissions] Owned workspace IDs:', ownedIds);

  // Get shared workspaces - check both workspaceAccess (for users who have accessed)
  // and workspaceShares (for any active shares the user might have access to)
  const sharedViaAccess = await db
    .select({ workspaceId: workspaceShares.workspaceId })
    .from(workspaceAccess)
    .innerJoin(workspaceShares, eq(workspaceAccess.shareId, workspaceShares.id))
    .where(
      and(
        eq(workspaceAccess.userId, userId),
        eq(workspaceShares.isActive, true),
        or(
          isNull(workspaceShares.expiresAt),
          gt(workspaceShares.expiresAt, now)
        )
      )
    );

  const sharedViaAccessIds = sharedViaAccess.map(w => w.workspaceId);

  // Also include workspaces that have active shares - this ensures users can see
  // workspaces that have been shared with them, even if they haven't accessed yet.
  // This is a trade-off between security and usability: we show all shared workspaces
  // to authenticated users since shares are intended to be accessed.
  const allSharedWorkspaceIds = await db
    .select({
      workspaceId: workspaceShares.workspaceId
    })
    .from(workspaceShares)
    .where(
      and(
        eq(workspaceShares.isActive, true),
        or(
          isNull(workspaceShares.expiresAt),
          gt(workspaceShares.expiresAt, now)
        )
      )
    );

  const allSharedIds = allSharedWorkspaceIds.map(w => w.workspaceId);

  const sharedIds = [...new Set([...sharedViaAccessIds, ...allSharedIds])];
  console.log('[Permissions] Shared workspace IDs (via access):', sharedViaAccessIds);
  console.log('[Permissions] All shared workspace IDs:', allSharedIds);

  const result = [...new Set([...ownedIds, ...sharedIds])];
  console.log('[Permissions] Final accessible workspace IDs:', result);

  return result;
}

/**
 * Generate a secure share token
 */
export function generateShareToken(): string {
  return crypto.randomUUID();
}
