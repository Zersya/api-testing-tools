#!/usr/bin/env node
/**
 * Database initialization for Tauri
 * Creates all required tables if they don't exist
 */

import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const dbPath = process.env.SQLITE_DB_PATH || resolve(__dirname, 'sqlite.db');

console.log('📂 Database path:', dbPath);

const sqlite = new Database(dbPath);

function runQuery(sql) {
  try {
    sqlite.prepare(sql).run();
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

console.log('🔧 Initializing database tables...');

const tables = [
  {
    name: 'workspaces',
    sql: `
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `
  },
  {
    name: 'projects',
    sql: `
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        base_url TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `
  },
  {
    name: 'collections',
    sql: `
      CREATE TABLE IF NOT EXISTS collections (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `
  },
  {
    name: 'folders',
    sql: `
      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY,
        collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
        parent_folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `
  },
  {
    name: 'saved_requests',
    sql: `
      CREATE TABLE IF NOT EXISTS saved_requests (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
        folder_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'GET',
        url TEXT,
        headers TEXT,
        body TEXT,
        params TEXT,
        description TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `
  },
  {
    name: 'environments',
    sql: `
      CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `
  },
  {
    name: 'environment_variables',
    sql: `
      CREATE TABLE IF NOT EXISTS environment_variables (
        id TEXT PRIMARY KEY,
        environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT,
        is_secret INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `
  },
  {
    name: 'api_definitions',
    sql: `
      CREATE TABLE IF NOT EXISTS api_definitions (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        content TEXT,
        format TEXT DEFAULT 'openapi',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `
  },
  {
    name: 'request_histories',
    sql: `
      CREATE TABLE IF NOT EXISTS request_histories (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        request_id TEXT REFERENCES saved_requests(id) ON DELETE CASCADE,
        method TEXT NOT NULL,
        url TEXT,
        status_code INTEGER,
        response_time INTEGER,
        request_headers TEXT,
        request_body TEXT,
        response_headers TEXT,
        response_body TEXT,
        error TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `
  }
];

let successCount = 0;
for (const table of tables) {
  if (runQuery(table.sql)) {
    console.log(`  ✅ Created/verified table: ${table.name}`);
    successCount++;
  }
}

console.log(`\n✅ Database initialization complete (${successCount}/${tables.length} tables)`);

sqlite.close();
