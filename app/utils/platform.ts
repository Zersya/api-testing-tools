import { appDataDir, join } from '@tauri-apps/api/path'

export async function getAppDataPath(...segments: string[]): Promise<string> {
  const basePath = await appDataDir()
  return join(basePath, ...segments)
}

export async function getDatabasePath(): Promise<string> {
  return getAppDataPath('database', 'mockservice.db')
}

export async function getStoragePath(type: 'collections' | 'environments' | 'settings' | 'logs' | 'cache'): Promise<string> {
  return getAppDataPath('storage', type)
}

export async function getLogsPath(): Promise<string> {
  return getStoragePath('logs')
}

export async function getCachePath(): Promise<string> {
  return getStoragePath('cache')
}
