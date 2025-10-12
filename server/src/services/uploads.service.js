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


