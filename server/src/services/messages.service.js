import lodash from "lodash";
const { get, isNil } = lodash;

import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { messages } from "../db/schema.js";

/**
 * Create a new message in a thread
 * @param {string} threadId - Thread ID
 * @param {string} role - Message role (user, assistant, tool, system)
 * @param {string} content - Message content
 * @param {string} status - Message status (default: pending)
 * @returns {Promise<Object>} Created message object
 */
export const createMessage = async (threadId, role, content, status = "pending") => {
  const result = await db
    .insert(messages)
    .values({
      threadId,
      role,
      content,
      status,
    })
    .returning();
  
  return get(result, "[0]", null);
};

/**
 * Find a message by ID
 * @param {string} messageId - Message ID (UUID)
 * @returns {Promise<Object|null>} Message object or null
 */
export const findMessageById = async (messageId) => {
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  
  return get(result, "[0]", null);
};

/**
 * Find all messages in a thread
 * @param {string} threadId - Thread ID
 * @returns {Promise<Array>} Array of message objects
 */
export const findMessagesByThreadId = async (threadId) => {
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(messages.createdAt); // Oldest first
  
  return result;
};

/**
 * Update a message's status and/or content
 * @param {string} messageId - Message ID (UUID)
 * @param {Object} updates - Updates to apply
 * @param {string} [updates.status] - New status
 * @param {string} [updates.content] - New content
 * @returns {Promise<Object|null>} Updated message object or null
 */
export const updateMessage = async (messageId, updates) => {
  if (isNil(messageId)) {
    throw new Error("messageId is required");
  }

  if (isNil(updates) || Object.keys(updates).length === 0) {
    throw new Error("At least one update field is required");
  }

  const updateData = {
    ...updates,
    updatedAt: new Date(),
  };

  const result = await db
    .update(messages)
    .set(updateData)
    .where(eq(messages.id, messageId))
    .returning();

  return get(result, "[0]", null);
};

/**
 * Find messages in a thread with cursor-based pagination
 * @param {string} threadId - Thread ID
 * @param {number} limit - Number of messages to return (default 50, max 50)
 * @param {string|null} cursor - Cursor for pagination (ISO timestamp)
 * @returns {Promise<Object>} Object with items and nextCursor
 */
export const findMessagesByThreadIdWithPagination = async (threadId, limit = 50, cursor = null) => {
  const { lt } = await import("drizzle-orm");
  
  // Ensure limit is within bounds (default 50, max 50)
  const effectiveLimit = Math.min(Math.max(1, limit), 50);
  
  // Build query conditions
  let conditions = eq(messages.threadId, threadId);
  
  if (cursor) {
    // If cursor is provided, get messages created before this cursor
    conditions = and(conditions, lt(messages.createdAt, new Date(cursor)));
  }
  
  // Fetch one extra item to determine if there's a next page
  const result = await db
    .select()
    .from(messages)
    .where(conditions)
    .orderBy(desc(messages.createdAt))
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

export default {
  createMessage,
  findMessageById,
  findMessagesByThreadId,
  findMessagesByThreadIdWithPagination,
  updateMessage,
};
