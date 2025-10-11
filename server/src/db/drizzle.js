import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const { POSTGRES_URL } = process.env;

if (!POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not defined');
}

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: POSTGRES_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize Drizzle ORM with the pool
export const db = drizzle(pool);

// Export pool for direct access if needed
export { pool };

// Test connection function
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('💲💲💲 Connected to PostgreSQL successfully');
    client.release();
    return true;
  } catch (error) {
    console.error('💲💲💲 PostgreSQL connection error:', error);
    throw error;
  }
};

