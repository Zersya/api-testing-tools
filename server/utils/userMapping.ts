/**
 * User Mapping Utility
 * Maps user IDs to email addresses for Super Admin lookups
 * 
 * NOTE: This uses in-memory storage which works for single-instance deployments.
 * For serverless or multi-instance deployments, consider using:
 * - Redis or similar cache
 * - Database table for persistent storage
 * 
 * The fallback logic (getUserEmailOrFallback) handles cases where userId is already an email,
 * which is the common case in this JWT-based auth system.
 */

interface UserMapping {
  email: string;
  lastSeen: Date;
}

// In-memory storage for user mappings (userId -> email)
// For production multi-instance deployments, replace with Redis or DB storage
const userMappingStore = new Map<string, UserMapping>();

/**
 * Store or update a user mapping
 * @param userId - The user's unique ID (typically email for JWT-based auth)
 * @param email - The user's email address
 */
export function storeUserMapping(userId: string, email: string): void {
  userMappingStore.set(userId, {
    email: email.toLowerCase().trim(),
    lastSeen: new Date()
  });
}

/**
 * Get a user's email by their ID
 * @param userId - The user's unique ID
 * @returns The email address, or null if not found
 */
export function getUserEmail(userId: string): string | null {
  const mapping = userMappingStore.get(userId);
  return mapping?.email || null;
}

/**
 * Get email for a user, with fallback to userId if mapping doesn't exist
 * This handles cases where userId is already the email
 * @param userId - The user's unique ID
 * @returns The email address (or userId if it looks like an email)
 */
export function getUserEmailOrFallback(userId: string): string {
  // First check the mapping store
  const mappedEmail = getUserEmail(userId);
  if (mappedEmail) return mappedEmail;
  
  // If userId looks like an email, use it directly
  if (userId.includes('@')) {
    return userId.toLowerCase().trim();
  }
  
  return userId;
}

/**
 * Check if user mapping exists
 * @param userId - The user's unique ID
 */
export function hasUserMapping(userId: string): boolean {
  return userMappingStore.has(userId);
}

/**
 * Get all stored user mappings (for debugging)
 */
export function getAllUserMappings(): Map<string, UserMapping> {
  return new Map(userMappingStore);
}

/**
 * Clear all user mappings (useful for testing)
 */
export function clearUserMappings(): void {
  userMappingStore.clear();
}

/**
 * Get the size of the user mapping store
 */
export function getUserMappingCount(): number {
  return userMappingStore.size;
}
