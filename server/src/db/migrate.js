import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const { POSTGRES_URL } = process.env;

if (!POSTGRES_URL) {
  console.error('❌ POSTGRES_URL environment variable is not defined');
  process.exit(1);
}

const runMigrations = async () => {
  const pool = new Pool({
    connectionString: POSTGRES_URL,
  });

  const db = drizzle(pool);

  console.log('⏳ Running migrations...');

  try {
    await migrate(db, {
      migrationsFolder: path.join(__dirname, '../../drizzle'),
    });

    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

runMigrations();

