import lodash from "lodash";
const { get, isNil } = lodash;

import { eq, and, desc, lt, inArray } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { messages, jobs, images } from "../db/schema.js";

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
 * Includes related job and images data for each message
 * Optimized with array aggregation to avoid duplicate rows
 * @param {string} threadId - Thread ID
 * @param {number} limit - Number of messages to return (default 50, max 50)
 * @param {string|null} cursor - Cursor for pagination (ISO timestamp)
 * @returns {Promise<Object>} Object with items and nextCursor
 */
export const findMessagesByThreadIdWithPagination = async (threadId, limit = 50, cursor = null) => {
  const effectiveLimit = Math.min(Math.max(1, limit), 50);
  
  let conditions = eq(messages.threadId, threadId);
  
  if (cursor) {
    conditions = and(conditions, lt(messages.createdAt, new Date(cursor)));
  }
  
  // First, get paginated messages with job info
  // Jobs are linked to USER messages, not assistant messages
  const paginatedMessages = await db
    .select({
      id: messages.id,
      threadId: messages.threadId,
      role: messages.role,
      content: messages.content,
      status: messages.status,
      createdAt: messages.createdAt,
      updatedAt: messages.updatedAt,
      jobId: jobs.id,
      jobStatus: jobs.status,
      jobParameters: jobs.parameters,
    })
    .from(messages)
    .leftJoin(jobs, eq(messages.id, jobs.messageId))
    .where(conditions)
    .orderBy(desc(messages.createdAt))
    .limit(effectiveLimit + 1);
  
  // Determine if there's a next page
  const hasMore = paginatedMessages.length > effectiveLimit;
  
  // Get only the items for current page
  const currentPageMessages = paginatedMessages.slice(0, effectiveLimit);
  
  // If there are no messages, return early
  if (currentPageMessages.length === 0) {
    return {
      items: [],
      nextCursor: null,
    };
  }
  
  // Extract job IDs from user messages
  // Jobs are linked to user messages, assistant messages reference them implicitly
  const jobIds = currentPageMessages
    .filter(msg => msg.role === "user" && msg.jobId)
    .map(msg => msg.jobId);
  
  // Fetch all images for these jobs in one query
  let imagesByJobId = new Map();
  if (jobIds.length > 0) {
    const imageResults = await db
      .select({
        id: images.id,
        jobId: images.jobId,
        url: images.url,
        metadata: images.metadata,
        createdAt: images.createdAt,
      })
      .from(images)
      .where(inArray(images.jobId, jobIds));
    
    // Group images by job ID for efficient lookup
    imageResults.forEach(img => {
      if (!imagesByJobId.has(img.jobId)) {
        imagesByJobId.set(img.jobId, []);
      }
      imagesByJobId.get(img.jobId).push({
        id: img.id,
        url: img.url,
        metadata: img.metadata,
        createdAt: img.createdAt,
      });
    });
  }
  
  // Format results and attach images to assistant messages only
  // Messages are ordered DESC by createdAt (newest first)
  const items = currentPageMessages.map((row, index) => {
    const message = {
      id: row.id,
      threadId: row.threadId,
      role: row.role,
      content: row.content,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      job: row.jobStatus ? {
        status: row.jobStatus,
        parameters: row.jobParameters,
      } : null,
    };
    
    // Only attach images to assistant messages
    // Find the corresponding user message's job (the one that triggered this assistant response)
    if (row.role === "assistant") {
      // Look for the immediately preceding user message with a job
      // Since messages are DESC by createdAt, we look forward in the array (older messages)
      for (let i = index + 1; i < currentPageMessages.length; i++) {
        const olderMsg = currentPageMessages[i];
        if (olderMsg.role === "user" && olderMsg.jobId) {
          // Found the user message that triggered this assistant response
          const jobId = olderMsg.jobId;
          if (imagesByJobId.has(jobId)) {
            message.images = imagesByJobId.get(jobId);
          }
          break; // Stop at the first matching user message
        }
      }
    }
    
    return message;
  });
  
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
