import { Store } from '@tauri-apps/plugin-store'

const store = new Store('settings.json')
const settingsKey = 'app_settings'

export interface AppSettings {
  serverUrl: string
  autoSync: boolean
  syncInterval: number
  lastSyncAt: string | null
  theme: 'dark' | 'light'
}

const defaults: AppSettings = {
  serverUrl: 'http://localhost:3000',
  autoSync: true,
  syncInterval: 5,
  lastSyncAt: null,
  theme: 'dark'
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const stored = await store.get<AppSettings>(settingsKey)
    return { ...defaults, ...stored }
  } catch {
    return defaults
  }
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings()
  const updated = { ...current, ...settings }
  await store.set(settingsKey, updated)
  await store.save()
  return updated
}

export async function getServerUrl(): Promise<string> {
  const settings = await getSettings()
  return settings.serverUrl
}

export async function setServerUrl(url: string): Promise<void> {
  await updateSettings({ serverUrl: url })
}
