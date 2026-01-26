import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

// Use environment variable for database path, fallback to local sqlite.db for development
const dbPath = process.env.DATABASE_PATH || 'sqlite.db';
const absoluteDbPath = resolve(dbPath);

// Ensure the directory exists
const dbDir = dirname(absoluteDbPath);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(absoluteDbPath);
export const db = drizzle(sqlite, { schema });

// Run migrations in production or when DATABASE_PATH is set
if (process.env.NODE_ENV === 'production' || process.env.DATABASE_PATH) {
  try {
    // Migrations are located in the drizzle folder at root
    const migrationsPath = resolve(process.cwd(), 'drizzle');
    if (existsSync(migrationsPath)) {
      migrate(db, { migrationsFolder: migrationsPath });
    }
  } catch (error) {
    console.error('Failed to run migrations:', error);
  }
}

export { schema };
