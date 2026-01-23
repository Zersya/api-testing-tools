/**
 * Tauri API Module
 * Provides a Tauri-based API client that uses invoke instead of HTTP
 * This works in Tauri production builds where the bundled server runs
 */

import { invoke } from '@tauri-apps/api/core';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown> | unknown[] | null;
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function tauriFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
  const { method = 'GET', body = null, headers = {} } = options;

  try {
    // The Rust command expects a single argument 'options' containing the FetchOptions struct
    // IMPORTANT: Rust returns the raw JSON response directly on success, or throws error string on failure
    const result = await invoke<T>('tauri_api_fetch', {
      options: {
        endpoint,
        method,
        body,
        headers,
      }
    });

    // Wrap the raw response in ApiResponse format
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Tauri API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function get<T>(endpoint: string): Promise<ApiResponse<T>> {
  return tauriFetch<T>(endpoint, { method: 'GET' });
}

export async function post<T>(endpoint: string, body?: Record<string, unknown> | unknown[]): Promise<ApiResponse<T>> {
  return tauriFetch<T>(endpoint, { method: 'POST', body });
}

export async function put<T>(endpoint: string, body?: Record<string, unknown> | unknown[]): Promise<ApiResponse<T>> {
  return tauriFetch<T>(endpoint, { method: 'PUT', body });
}

export async function del<T>(endpoint: string): Promise<ApiResponse<T>> {
  return tauriFetch<T>(endpoint, { method: 'DELETE' });
}

export async function patch<T>(endpoint: string, body?: Record<string, unknown> | unknown[]): Promise<ApiResponse<T>> {
  return tauriFetch<T>(endpoint, { method: 'PATCH', body });
}

export const tauriApi = {
  get,
  post,
  put,
  delete: del,
  patch,
};
