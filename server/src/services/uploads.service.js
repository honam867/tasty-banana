import { eq } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { uploads } from "../db/schema.js";
import lodash from "lodash";
const { get } = lodash;

/**
 * Create a new upload record
 * @param {Object} uploadData - Upload data
 * @param {string} uploadData.userId - User ID (UUID)
 * @param {string} [uploadData.threadId] - Optional thread ID (UUID)
 * @param {string} [uploadData.title] - Optional file title
 * @param {string} uploadData.purpose - File purpose (init, mask, reference, attachment)
 * @param {string} uploadData.mimeType - MIME type of the file
 * @param {number} uploadData.sizeBytes - File size in bytes
 * @param {string} uploadData.storageProvider - Storage provider (e.g., 'r2')
 * @param {string} uploadData.storageBucket - Storage bucket name
 * @param {string} uploadData.storageKey - Storage key/path
 * @param {string} uploadData.publicUrl - Public URL of the uploaded file
 * @returns {Promise<Object>} Created upload record
 */
export const createUpload = async (uploadData) => {
  const result = await db.insert(uploads).values(uploadData).returning();
  return get(result, "[0]");
};

/**
 * Find an upload by ID
 * @param {string} id - Upload ID (UUID)
 * @returns {Promise<Object|null>} Upload object or null
 */
export const findUploadById = async (id) => {
  const result = await db.select().from(uploads).where(eq(uploads.id, id)).limit(1);
  return get(result, "[0]", null);
};

/**
 * Find uploads by user ID
 * @param {string} userId - User ID (UUID)
 * @param {number} limit - Maximum number of results (default: 50)
 * @returns {Promise<Array>} Array of upload records
 */
export const findUploadsByUserId = async (userId, limit = 50) => {
  const result = await db
    .select()
    .from(uploads)
    .where(eq(uploads.userId, userId))
    .orderBy(uploads.createdAt)
    .limit(limit);
  return result || [];
};

/**
 * Find reference images by user ID
 * @param {string} userId - User ID (UUID)
 * @param {number} limit - Maximum number of results (default: 50)
 * @returns {Promise<Array>} Array of reference image upload records
 */
export const findReferenceImagesByUserId = async (userId, limit = 50) => {
  const { and } = await import("drizzle-orm");
  const result = await db
    .select()
    .from(uploads)
    .where(
      and(
        eq(uploads.userId, userId),
        eq(uploads.purpose, "reference")
      )
    )
    .orderBy(uploads.createdAt)
    .limit(limit);
  return result || [];
};

/**
 * Find reference images by thread ID
 * @param {string} threadId - Thread ID (UUID)
 * @param {number} limit - Maximum number of results (default: 50)
 * @returns {Promise<Array>} Array of reference image upload records
 */
export const findReferenceImagesByThreadId = async (threadId, limit = 50) => {
  const { and } = await import("drizzle-orm");
  const result = await db
    .select()
    .from(uploads)
    .where(
      and(
        eq(uploads.threadId, threadId),
        eq(uploads.purpose, "reference")
      )
    )
    .orderBy(uploads.createdAt)
    .limit(limit);
  return result || [];
};

/**
 * Validate upload ownership
 * @param {string} uploadId - Upload ID (UUID)
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<boolean>} True if user owns the upload
 */
export const isUploadOwnedByUser = async (uploadId, userId) => {
  const upload = await findUploadById(uploadId);
  if (!upload) return false;
  return upload.userId === userId;
};

/**
 * Delete an upload record from database
 * @param {string} uploadId - Upload ID (UUID)
 * @returns {Promise<Object|null>} Deleted upload record or null
 */
export const deleteUpload = async (uploadId) => {
  const result = await db
    .delete(uploads)
    .where(eq(uploads.id, uploadId))
    .returning();
  return get(result, "[0]", null);
};


