import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

// Use environment variable for database path, fallback to local sqlite.db for development
const dbPath = process.env.DATABASE_PATH || './data/sqlite.db';
const absoluteDbPath = resolve(dbPath);

console.log(`[Database] Using database path: ${absoluteDbPath}`);

// Ensure the directory exists
const dbDir = dirname(absoluteDbPath);
if (!existsSync(dbDir)) {
  console.log(`[Database] Creating directory: ${dbDir}`);
  mkdirSync(dbDir, { recursive: true });
}

// Check if database file exists
const dbExists = existsSync(absoluteDbPath);
console.log(`[Database] Database file exists: ${dbExists}`);

const sqlite = new Database(absoluteDbPath);
export const db = drizzle(sqlite, { schema });

// Function to find drizzle migrations directory
function findMigrationsPath(): string | null {
  // Get current file directory in ESM
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFilePath);
  
  // Try multiple possible locations
  const possiblePaths = [
    resolve(process.cwd(), 'drizzle'),
    resolve(process.cwd(), '.output', 'server', 'drizzle'),
    resolve(process.cwd(), '.output', 'drizzle'),
    resolve(currentDir, '..', '..', 'drizzle'),
    resolve(currentDir, '..', '..', '..', 'drizzle'),
    '/app/drizzle',
    '/app/.output/server/drizzle',
  ];
  
  console.log('[Database] Searching for migrations in:');
  for (const path of possiblePaths) {
    const exists = existsSync(path);
    console.log(`  - ${path}: ${exists ? 'FOUND' : 'not found'}`);
    if (exists) {
      return path;
    }
  }
  
  return null;
}

// Always run migrations to ensure database is up to date
console.log('[Database] Checking if migrations need to run...');
console.log(`[Database] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[Database] DATABASE_PATH: ${process.env.DATABASE_PATH}`);

try {
  const migrationsPath = findMigrationsPath();
  
  if (migrationsPath) {
    console.log(`[Database] Running migrations from: ${migrationsPath}`);
    try {
      migrate(db, { migrationsFolder: migrationsPath });
      console.log('✅ Database migrations completed successfully');
    } catch (migrateError: any) {
      console.error('❌ Migration failed:', migrateError.message);
      console.log('[Database] Attempting fallback: creating tables from SQL files...');
      createTablesFromSQL(migrationsPath);
    }
  } else {
    console.error('❌ Migrations folder not found in any location');
    console.log('[Database] Current working directory:', process.cwd());
    
    // List files in current directory for debugging
    try {
      const files = readdirSync(process.cwd());
      console.log('[Database] Files in CWD:', files.join(', '));
    } catch (e) {
      console.log('[Database] Could not list CWD files');
    }
  }
} catch (error: any) {
  console.error('❌ Failed to setup database:', error.message);
}

function createTablesFromSQL(migrationsPath: string) {
  try {
    console.log(`[Database] Creating tables from SQL files in: ${migrationsPath}`);
    const files = readdirSync(migrationsPath)
      .filter((f: string) => f.endsWith('.sql'))
      .sort();
    
    console.log(`[Database] Found SQL files: ${files.join(', ')}`);
    
    for (const file of files) {
      const sqlPath = join(migrationsPath, file);
      console.log(`[Database] Executing ${file}...`);
      const sql = readFileSync(sqlPath, 'utf-8');
      const statements = sql.split('--> statement-breakpoint');
      
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed && !trimmed.startsWith('--')) {
          try {
            sqlite.exec(trimmed);
          } catch (e: any) {
            if (!e.message?.includes('already exists')) {
              console.warn(`[Database] Warning executing SQL from ${file}:`, e.message);
            }
          }
        }
      }
    }
    console.log('✅ Database tables created from SQL files');
  } catch (error: any) {
    console.error('❌ Failed to create tables from SQL:', error.message);
  }
}

// Verify tables exist
setTimeout(() => {
  try {
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('[Database] Tables in database:', tables.map((t: any) => t.name).join(', '));
  } catch (e: any) {
    console.error('[Database] Could not list tables:', e.message);
  }
}, 100);

export { schema };
