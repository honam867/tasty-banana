import lodash from "lodash";
const { get, isNil, isEmpty } = lodash;

import { createMessage, findMessagesByThreadIdWithPagination } from "../services/messages.service.js";
import { isThreadOwnedByUser } from "../services/threads.service.js";
import { HTTP_STATUS } from "../utils/constant.js";
import { sendError, sendWarning } from "../utils/response.js";

/**
 * POST /api/threads/:threadId/messages - Create a new message in a thread
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createThreadMessage = async (req, res) => {
  try {
    const userId = get(req, "user.id");
    const threadId = get(req, "params.threadId");
    const content = get(req, "body.content");
    const role = get(req, "body.role");
    
    if (isNil(userId)) {
      return res.status(HTTP_STATUS.UNAUTHENTICATED).json({
        success: false,
        status: 401,
        message: "User not authenticated",
      });
    }

    if (isNil(threadId)) {
      return sendWarning(res, "Thread ID is required");
    }

    // Validate content
    if (isNil(content) || isEmpty(content.trim())) {
      return sendWarning(res, "Message content is required");
    }

    const contentLength = content.length;
    if (contentLength < 1 || contentLength > 4000) {
      return sendWarning(res, "Message content must be between 1 and 4000 characters");
    }

    // Validate role - must be 'user'
    if (role !== "user") {
      return sendWarning(res, "Message role must be 'user'");
    }

    // Check thread ownership
    const isOwner = await isThreadOwnedByUser(threadId, userId);
    
    if (!isOwner) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        status: 403,
        message: "You do not have permission to post to this thread",
      });
    }

    // Create the message
    const message = await createMessage(threadId, role, content);

    if (isNil(message)) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: 500,
        message: "Failed to create message",
      });
    }

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      status: 201,
      message: "Message created successfully",
      data: message,
    });
  } catch (error) {
    sendError(res, error);
  }
};

/**
 * GET /api/threads/:threadId/messages - List messages in a thread with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const listThreadMessages = async (req, res) => {
  try {
    const userId = get(req, "user.id");
    const threadId = get(req, "params.threadId");
    const limit = parseInt(get(req, "query.limit", "50"), 10);
    const cursor = get(req, "query.cursor", null);

    if (isNil(userId)) {
      return res.status(HTTP_STATUS.UNAUTHENTICATED).json({
        success: false,
        status: 401,
        message: "User not authenticated",
      });
    }

    if (isNil(threadId)) {
      return sendWarning(res, "Thread ID is required");
    }

    // Check thread ownership
    const isOwner = await isThreadOwnedByUser(threadId, userId);
    
    if (!isOwner) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        status: 403,
        message: "You do not have permission to access this thread",
      });
    }

    // Get messages with pagination
    const result = await findMessagesByThreadIdWithPagination(threadId, limit, cursor);

    return res.status(HTTP_STATUS.SUCCESS).json({
      success: true,
      status: 200,
      message: "Messages retrieved successfully",
      data: result,
    });
  } catch (error) {
    sendError(res, error);
  }
};

