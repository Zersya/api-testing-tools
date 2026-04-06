import type { MemberPermission } from '../../server/db/schema/workspaceMember';

export interface PermissionBadge {
  text: string;
  className: string;
}

/**
 * Get permission badge display info (text and styling class)
 * Centralized logic to ensure consistency across components
 */
export function usePermissionBadge() {
  const getPermissionBadge = (permission: MemberPermission | string): PermissionBadge => {
    switch (permission) {
      case 'owner':
        return {
          text: 'Owner',
          className: 'bg-accent-purple/15 text-accent-purple'
        };
      case 'edit':
        return {
          text: 'Editor',
          className: 'bg-accent-orange/15 text-accent-orange'
        };
      case 'view':
      default:
        return {
          text: 'Viewer',
          className: 'bg-accent-blue/15 text-accent-blue'
        };
    }
  };

  return {
    getPermissionBadge
  };
}
