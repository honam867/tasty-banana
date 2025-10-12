import { pgTable, pgEnum, uuid, varchar, text, timestamp, integer, jsonb, index, primaryKey } from 'drizzle-orm/pg-core';
import { TOKEN_USAGE } from '../utils/constant.js';

/**
 * PostgreSQL Enum Types
 * Define custom enum types for various table columns
 */

// Message role in chat conversations
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'tool', 'system']);

// Status of image generation jobs and assistant messages
export const runStatusEnum = pgEnum('run_status', ['queued', 'processing', 'succeeded', 'failed', 'canceled']);

// Type of image generation operation
export const jobTypeEnum = pgEnum('job_type', ['text2img', 'img2img', 'inpaint', 'upscale', 'variation']);

// Purpose/type of uploaded file
export const filePurposeEnum = pgEnum('file_purpose', ['init', 'mask', 'reference', 'attachment']);

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
  
  // Token usage tracking
  tokenUsage: integer('token_usage').notNull().default(TOKEN_USAGE.DEFAULT),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Threads Table Schema
 * Stores chat conversation threads for the image generation app
 */
export const threads = pgTable('threads', {
  // Primary key - UUID v4
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Foreign key to users table (thread owner)
  ownerId: uuid('owner_id').references(() => users.id).notNull(),
  
  // Timestamps with timezone
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Index on owner_id for efficient thread lookups by user
  ownerIdx: index('idx_threads_owner').on(table.ownerId),
}));

/**
 * Messages Table Schema
 * Stores individual chat messages within conversation threads
 */
export const messages = pgTable('messages', {
  // Primary key - UUID v4
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Foreign key to threads table (message belongs to thread)
  threadId: uuid('thread_id').references(() => threads.id, { onDelete: 'cascade' }).notNull(),
  
  // Message role (user, assistant, tool, system)
  role: messageRoleEnum('role').notNull(),
  
  // Message content
  content: text('content').notNull(),
  
  // Message processing status (pending, processing, succeeded, failed)
  status: text('status').notNull().default('pending'),
  
  // Timestamps with timezone
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Index on thread_id for efficient message lookups by thread
  threadIdx: index('idx_messages_thread').on(table.threadId),
}));

/**
 * Providers Table Schema
 * Stores image generation service providers (e.g., Stable Diffusion, DALL-E)
 */
export const providers = pgTable('providers', {
  // Primary key - UUID v4
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Provider name (unique identifier)
  name: text('name').notNull().unique(),
  
  // Provider configuration (API keys, endpoint URLs, etc.)
  config: jsonb('config'),
  
  // Timestamps with timezone
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Jobs Table Schema
 * Tracks image generation job processes linked to messages
 */
export const jobs = pgTable('jobs', {
  // Primary key - UUID v4
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Foreign key to messages table (job triggered by message) - 1:1 relationship
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Foreign key to providers table (which service handles the job)
  providerId: uuid('provider_id').references(() => providers.id).notNull(),
  
  // Type of image generation job
  jobType: jobTypeEnum('job_type').notNull(),
  
  // Current status of the job
  status: runStatusEnum('status').notNull(),
  
  // External job ID from the provider's API
  externalId: text('external_id'),
  
  // Job parameters (prompt, style, dimensions, etc.)
  parameters: jsonb('parameters'),
  
  // Timestamps with timezone
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Index on status for efficient job status queries
  statusIdx: index('idx_jobs_status').on(table.status),
}));

/**
 * Uploads Table Schema
 * Stores metadata for user-uploaded files (images, masks, references, attachments)
 */
export const uploads = pgTable('uploads', {
  // Primary key - UUID v4
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Foreign key to users table (uploader)
  userId: uuid('user_id').references(() => users.id).notNull(),
  
  // Foreign key to threads table (optional - for thread attachments)
  threadId: uuid('thread_id').references(() => threads.id),
  
  // Optional title/label for the file
  title: varchar('title', { length: 255 }),
  
  // Purpose/type of the uploaded file
  purpose: filePurposeEnum('purpose').notNull(),
  
  // File metadata
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  
  // Storage details
  storageProvider: varchar('storage_provider', { length: 50 }).notNull().default('r2'),
  storageBucket: varchar('storage_bucket', { length: 255 }).notNull(),
  storageKey: text('storage_key').notNull(),
  publicUrl: text('public_url').notNull(),
  
  // Timestamp with timezone
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Index on user_id for efficient lookups by user
  userIdx: index('idx_uploads_user').on(table.userId),
  // Index on thread_id for efficient lookups by thread
  threadIdx: index('idx_uploads_thread').on(table.threadId),
}));

/**
 * Images Table Schema
 * Stores generated image results linked to generation jobs
 */
export const images = pgTable('images', {
  // Primary key - UUID v4
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Foreign key to jobs table (image result from job)
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  
  // URL to the generated image in external storage (S3, GCS, etc.)
  url: text('url').notNull(),
  
  // Image metadata (width, height, format, seed, etc.)
  metadata: jsonb('metadata'),
  
  // Timestamp with timezone
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Index on job_id for efficient image lookups by job
  jobIdx: index('idx_images_job').on(table.jobId),
}));

/**
 * Job Inputs Uploads Junction Table
 * Many-to-many relationship between jobs and uploads (input files for generation)
 */
export const jobInputsUploads = pgTable('job_inputs_uploads', {
  // Foreign key to jobs table
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  
  // Foreign key to uploads table
  uploadId: uuid('upload_id').references(() => uploads.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  // Composite primary key on both foreign keys
  pk: primaryKey({ columns: [table.jobId, table.uploadId] }),
}));

/**
 * Message Attachments Junction Table
 * Many-to-many relationship between messages and uploads (file attachments)
 */
export const messageAttachments = pgTable('message_attachments', {
  // Foreign key to messages table
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }).notNull(),
  
  // Foreign key to uploads table
  uploadId: uuid('upload_id').references(() => uploads.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  // Composite primary key on both foreign keys
  pk: primaryKey({ columns: [table.messageId, table.uploadId] }),
}));

