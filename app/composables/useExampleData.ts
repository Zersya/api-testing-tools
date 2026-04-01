/**
 * Composable for normalizing API example data
 * Handles placeholder text like "JSON:" and ensures proper object format
 */
export function useExampleData() {
  /**
   * Normalizes example data from API definitions
   * - Converts placeholder strings like "JSON:" or "JSON" to empty objects
   * - Attempts to parse JSON strings into objects
   * - Preserves non-JSON strings as-is for backward compatibility
   * - Returns objects as-is
   * 
   * @param data - The raw example data from API definitions
   * @returns Normalized data (object or preserved string)
   */
  const normalizeExampleData = (data: any): any => {
    // If data is a placeholder string like "JSON:", return empty object
    if (typeof data === 'string') {
      if (data.trim() === 'JSON:' || data.trim() === 'JSON' || data.trim() === '') {
        return {};
      }
      // Try to parse as JSON
      try {
        return JSON.parse(data);
      } catch {
        // If not valid JSON, preserve the string as-is for backward compatibility
        return data;
      }
    }
    return data;
  };

  return {
    normalizeExampleData
  };
}
