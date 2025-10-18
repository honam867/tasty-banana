import lodash from "lodash";
const { get, isNil } = lodash;

import { 
  createThread, 
  findThreadsByOwnerIdWithPagination,
  findThreadById,
  isThreadOwnedByUser,
  deleteThread
} from "../services/threads.service.js";
import { HTTP_STATUS } from "../utils/constant.js";
import { sendError, sendNotFound } from "../utils/response.js";

/**
 * POST /api/threads - Create a new thread
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createNewThread = async (req, res) => {
  try {
    const userId = get(req, "user.id");
    
    if (isNil(userId)) {
      return res.status(HTTP_STATUS.UNAUTHENTICATED).json({
        success: false,
        status: 401,
        message: "User not authenticated",
      });
    }

    const thread = await createThread(userId);

    if (isNil(thread)) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: 500,
        message: "Failed to create thread",
      });
    }

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      status: 201,
      message: "Thread created successfully",
      data: thread,
    });
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /api/threads - List all threads for authenticated user with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const listThreads = async (req, res) => {
  try {
    const userId = get(req, "user.id");
    
    if (isNil(userId)) {
      return res.status(HTTP_STATUS.UNAUTHENTICATED).json({
        success: false,
        status: 401,
        message: "User not authenticated",
      });
    }

    // Parse query parameters
    const limit = parseInt(get(req, "query.limit", "20"), 10);
    const cursor = get(req, "query.cursor", null);

    // Get threads with pagination
    const result = await findThreadsByOwnerIdWithPagination(userId, limit, cursor);

    return res.status(HTTP_STATUS.SUCCESS).json({
      success: true,
      status: 200,
      message: "Threads retrieved successfully",
      data: {
        items: get(result, "items", []),
        nextCursor: get(result, "nextCursor", null),
      },
    });
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /api/threads/:threadId - Get a specific thread (ownership enforced)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getThread = async (req, res) => {
  try {
    const userId = get(req, "user.id");
    const threadId = get(req, "params.threadId");
    
    if (isNil(userId)) {
      return res.status(HTTP_STATUS.UNAUTHENTICATED).json({
        success: false,
        status: 401,
        message: "User not authenticated",
      });
    }

    if (isNil(threadId)) {
      return sendNotFound(res, "Thread ID is required");
    }

    // Check if thread exists and belongs to user
    const thread = await findThreadById(threadId);
    
    if (isNil(thread)) {
      return sendNotFound(res, "Thread not found");
    }

    // Check ownership
    const isOwner = await isThreadOwnedByUser(threadId, userId);
    
    if (!isOwner) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        status: 403,
        message: "You do not have permission to access this thread",
      });
    }

    return res.status(HTTP_STATUS.SUCCESS).json({
      success: true,
      status: 200,
      message: "Thread retrieved successfully",
      data: thread,
    });
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * DELETE /api/threads/:threadId - Delete a thread (ownership enforced)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteThreadById = async (req, res) => {
  try {
    const userId = get(req, "user.id");
    const threadId = get(req, "params.threadId");
    
    if (isNil(userId)) {
      return res.status(HTTP_STATUS.UNAUTHENTICATED).json({
        success: false,
        status: 401,
        message: "User not authenticated",
      });
    }

    if (isNil(threadId)) {
      return sendNotFound(res, "Thread ID is required");
    }

    // Check if thread exists and belongs to user
    const thread = await findThreadById(threadId);
    
    if (isNil(thread)) {
      return sendNotFound(res, "Thread not found");
    }

    // Check ownership
    const isOwner = await isThreadOwnedByUser(threadId, userId);
    
    if (!isOwner) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        status: 403,
        message: "You do not have permission to delete this thread",
      });
    }

    // Delete the thread
    await deleteThread(threadId);

    return res.status(HTTP_STATUS.SUCCESS).json({
      success: true,
      status: 200,
      message: "Thread deleted successfully",
    });
  } catch (error) {
    sendError(res, error);
  }
};

