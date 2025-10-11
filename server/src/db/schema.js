import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

/**
 * Users Table Schema
 * Stores user authentication and profile information
 */
export const users = pgTable('users', {
  // Primary key - UUID v4
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Authentication fields
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 500 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  
  // Role and status
  role: varchar('role', { length: 50 }).notNull().default('user'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

