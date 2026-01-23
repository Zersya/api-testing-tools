/**
 * API fetch wrapper that uses the correct base URL
 * - In dev mode: uses localhost:3000
 * - In Tauri production: uses 127.0.0.1:3001 (where bundled server runs)
 */

import { tauriFetch } from '~/services/tauri-api';

let isTauri: boolean | null = null;

export function checkIsTauri(): boolean {
  if (typeof window === 'undefined') return false;
  if (isTauri !== null) return isTauri;
  isTauri = !!(window as any).__TAURI__;
  return isTauri;
}

export function getServerUrl(): string {
  if (checkIsTauri()) {
    return 'http://127.0.0.1:3001';
  }
  return 'http://localhost:3000';
}

export async function useApiFetch<T>(url: string, options: Record<string, any> = {}) {
  // Route requests through Rust backend when in Tauri mode to bypass CORS
  if (checkIsTauri()) {
    const method = (options.method || 'GET').toUpperCase();
    
    const response = await tauriFetch<any>(url, {
      method: method as any,
      body: options.body,
      headers: options.headers
    });

    if (response.success) {
      // If the response data is a string that looks like JSON, try to parse it
      // The Rust backend returns 'data' which might be the parsed JSON or raw text depending on implementation
      // Looking at main.rs, it returns serde_json::Value, so it should be an object already.
      return response.data as T;
    } else {
      // Mimic $fetch error behavior
      const error = new Error(response.error || 'Request failed');
      (error as any).response = response;
      throw error;
    }
  }

  const baseUrl = getServerUrl();
  const fullUrl = `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
  
  return $fetch<T>(fullUrl, options);
}

export function useIsTauri() {
  return checkIsTauri();
}
