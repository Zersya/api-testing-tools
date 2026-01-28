import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { dirname, resolve, join } from 'path';

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

// Function to find drizzle migrations directory
function findMigrationsPath(): string | null {
  // Try multiple possible locations
  const possiblePaths = [
    resolve(process.cwd(), 'drizzle'),
    resolve(process.cwd(), '.output', 'server', 'drizzle'),
    resolve(process.cwd(), 'server', 'drizzle'),
    resolve(__dirname, '..', '..', 'drizzle'),
    resolve(__dirname, '..', '..', '..', 'drizzle'),
    '/app/drizzle', // Docker/common deployment path
  ];
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      console.log(`📁 Found migrations at: ${path}`);
      return path;
    }
  }
  
  return null;
}

// Run migrations in production or when DATABASE_PATH is set
if (process.env.NODE_ENV === 'production' || process.env.DATABASE_PATH) {
  try {
    const migrationsPath = findMigrationsPath();
    
    if (migrationsPath) {
      migrate(db, { migrationsFolder: migrationsPath });
      console.log('✅ Database migrations completed');
    } else {
      console.warn('⚠️ Migrations folder not found, attempting to create tables from SQL files...');
      createTablesFromSQL();
    }
  } catch (error) {
    console.error('Failed to run migrations:', error);
    createTablesFromSQL();
  }
}

function createTablesFromSQL() {
  try {
    const migrationsPath = findMigrationsPath();
    
    if (migrationsPath) {
      const files = readdirSync(migrationsPath)
        .filter((f: string) => f.endsWith('.sql'))
        .sort();
      
      for (const file of files) {
        const sqlPath = join(migrationsPath, file);
        const sql = readFileSync(sqlPath, 'utf-8');
        const statements = sql.split('--> statement-breakpoint');
        
        for (const statement of statements) {
          const trimmed = statement.trim();
          if (trimmed && !trimmed.startsWith('--')) {
            try {
              sqlite.exec(trimmed);
            } catch (e: any) {
              if (!e.message?.includes('already exists')) {
                console.warn(`Warning executing SQL from ${file}:`, e.message);
              }
            }
          }
        }
      }
      console.log('✅ Database tables created from SQL files');
    } else {
      console.error('❌ Could not find drizzle folder to create tables');
    }
  } catch (error) {
    console.error('Failed to create tables from SQL:', error);
  }
}

export { schema };
