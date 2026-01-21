import type { schema } from './desktop-schema'

let sqlite: any = null
let db: any = null

export async function initDatabase() {
  if (typeof window === 'undefined') return null
  
  const isTauri = !!(window as any).__TAURI__
  if (!isTauri) return null

  if (db) return db

  try {
    const Database = (await import('better-sqlite3')).default
    const { join } = await import('@tauri-apps/api/path')
    const { appDataDir } = await import('@tauri-apps/api/path')
    
    const basePath = await appDataDir()
    const dbPath = await join(basePath, 'database', 'mockservice.db')
    
    sqlite = new Database(dbPath)
    db = { $client: sqlite }
    
    await createTables()

    return db
  } catch (error) {
    console.error('Failed to initialize database:', error)
    return null
  }
}

export async function createTables() {
  if (!sqlite) return

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      is_dirty INTEGER DEFAULT 0,
      last_synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT REFERENCES workspaces(id),
      name TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER,
      is_dirty INTEGER DEFAULT 0,
      last_synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      is_dirty INTEGER DEFAULT 0,
      last_synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      collection_id TEXT REFERENCES collections(id),
      parent_folder_id TEXT,
      name TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER,
      is_dirty INTEGER DEFAULT 0,
      last_synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS saved_requests (
      id TEXT PRIMARY KEY,
      collection_id TEXT REFERENCES collections(id),
      name TEXT NOT NULL,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      headers TEXT,
      body TEXT,
      response TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      is_dirty INTEGER DEFAULT 0,
      last_synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS request_history (
      id TEXT PRIMARY KEY,
      request_id TEXT,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      headers TEXT,
      body TEXT,
      status_code INTEGER,
      response TEXT,
      duration INTEGER,
      created_at INTEGER,
      is_dirty INTEGER DEFAULT 0,
      last_synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY,
      workspace_id TEXT REFERENCES workspaces(id),
      name TEXT NOT NULL,
      variables TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      is_dirty INTEGER DEFAULT 0,
      last_synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS api_definitions (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      format TEXT NOT NULL,
      created_at INTEGER,
      updated_at INTEGER,
      is_dirty INTEGER DEFAULT 0,
      last_synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp INTEGER,
      status TEXT DEFAULT 'pending',
      payload TEXT,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_workspaces_id ON workspaces(id);
    CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_collections_project_id ON collections(project_id);
    CREATE INDEX IF NOT EXISTS idx_folders_collection_id ON folders(collection_id);
    CREATE INDEX IF NOT EXISTS idx_saved_requests_collection_id ON saved_requests(collection_id);
    CREATE INDEX IF NOT EXISTS idx_request_history_request_id ON request_history(request_id);
    CREATE INDEX IF NOT EXISTS idx_environments_workspace_id ON environments(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_api_definitions_project_id ON api_definitions(project_id);
    CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);
  `)
}

export function getDb() {
  return db
}

export function isDatabaseAvailable(): boolean {
  return db !== null
}

export { schema }
