import lodash from "lodash";
const { get, isNil } = lodash;

import { eq, and, desc, lt } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { threads } from "../db/schema.js";

/**
 * Create a new thread
 * @param {string} ownerId - User ID who owns the thread
 * @returns {Promise<Object>} Created thread object
 */
export const createThread = async (ownerId) => {
  const result = await db
    .insert(threads)
    .values({
      ownerId,
    })
    .returning();
  
  return get(result, "[0]", null);
};

/**
 * Find a thread by ID
 * @param {string} threadId - Thread ID (UUID)
 * @returns {Promise<Object|null>} Thread object or null
 */
export const findThreadById = async (threadId) => {
  const result = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);
  
  return get(result, "[0]", null);
};

/**
 * Find all threads owned by a user
 * @param {string} ownerId - User ID
 * @returns {Promise<Array>} Array of thread objects
 */
export const findThreadsByOwnerId = async (ownerId) => {
  const result = await db
    .select()
    .from(threads)
    .where(eq(threads.ownerId, ownerId))
    .orderBy(desc(threads.updatedAt));
  
  return result;
};

/**
 * Find threads owned by a user with cursor-based pagination
 * @param {string} ownerId - User ID
 * @param {number} limit - Number of threads to return (default 20, max 50)
 * @param {string|null} cursor - Cursor for pagination (ISO timestamp)
 * @returns {Promise<Object>} Object with items and nextCursor
 */
export const findThreadsByOwnerIdWithPagination = async (ownerId, limit = 20, cursor = null) => {
  // Ensure limit is within bounds
  const effectiveLimit = Math.min(Math.max(1, limit), 50);
  
  // Build query conditions
  let conditions = eq(threads.ownerId, ownerId);
  
  if (cursor) {
    // If cursor is provided, get threads created before this cursor
    conditions = and(conditions, lt(threads.createdAt, new Date(cursor)));
  }
  
  // Fetch one extra item to determine if there's a next page
  const result = await db
    .select()
    .from(threads)
    .where(conditions)
    .orderBy(desc(threads.createdAt))
    .limit(effectiveLimit + 1);
  
  // Determine if there's a next page
  const hasMore = result.length > effectiveLimit;
  const items = hasMore ? result.slice(0, effectiveLimit) : result;
  
  // Get the next cursor from the last item if there are more items
  const nextCursor = hasMore && items.length > 0 
    ? get(items[items.length - 1], "createdAt").toISOString()
    : null;
  
  return {
    items,
    nextCursor,
  };
};

/**
 * Check if a thread belongs to a user
 * @param {string} threadId - Thread ID
 * @param {string} ownerId - User ID
 * @returns {Promise<boolean>} True if thread belongs to user
 */
export const isThreadOwnedByUser = async (threadId, ownerId) => {
  const result = await db
    .select()
    .from(threads)
    .where(and(eq(threads.id, threadId), eq(threads.ownerId, ownerId)))
    .limit(1);
  
  return !isNil(get(result, "[0]"));
};

/**
 * Delete a thread
 * @param {string} threadId - Thread ID
 * @returns {Promise<Object|null>} Deleted thread object or null
 */
export const deleteThread = async (threadId) => {
  const result = await db
    .delete(threads)
    .where(eq(threads.id, threadId))
    .returning();
  
  return get(result, "[0]", null);
};

