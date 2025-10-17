import lodash from "lodash";
const { get, isNil, isEmpty } = lodash;

import { createMessage, findMessagesByThreadIdWithPagination } from "../services/messages.service.js";
import { isThreadOwnedByUser } from "../services/threads.service.js";
import { getDefaultProvider } from "../services/providers.service.js";
import { createJob, processJob } from "../services/jobs.service.js";
import { HTTP_STATUS, JOB_TYPE } from "../utils/constant.js";
import { sendError, sendWarning } from "../utils/response.js";

/**
 * POST /api/threads/:threadId/messages - Create a new message in a thread
 * Enhanced version: Creates user message, job, assistant message, and triggers async processing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createThreadMessage = async (req, res) => {
  try {
    const userId = get(req, "user.id");
    const threadId = get(req, "params.threadId");
    const content = get(req, "body.content");
    const role = get(req, "body.role");
    
    // 1. Validate authentication
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

    // 2. Validate content
    if (isNil(content)) {
      return sendWarning(res, "Message content is required");
    }
    
    if (isEmpty(content.trim())) {
      return sendWarning(res, "Message content is required");
    }

    const contentLength = content.length;
    if (contentLength < 1 || contentLength > 4000) {
      return sendWarning(res, "Message content must be between 1 and 4000 characters");
    }

    // 3. Validate role - must be 'user'
    if (role !== "user") {
      return sendWarning(res, "Message role must be 'user'");
    }

    // 4. Check thread ownership
    const isOwner = await isThreadOwnedByUser(threadId, userId);
    
    if (!isOwner) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        status: 403,
        message: "You do not have permission to post to this thread",
      });
    }

    // 5. Create the user message
    const userMessage = await createMessage(threadId, role, content);

    if (isNil(userMessage)) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: 500,
        message: "Failed to create message",
      });
    }

    // 6. Fetch the default provider (Gemini)
    const provider = await getDefaultProvider();

    if (isNil(provider)) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: 500,
        message: "Failed to fetch default provider",
      });
    }

    // 7. Create job with status 'queued'
    const job = await createJob({
      messageId: get(userMessage, "id"),
      providerId: get(provider, "id"),
      jobType: JOB_TYPE.TEXT2IMG,
      status: "queued",
      parameters: {
        prompt: content,
        numberOfImages: 1,
        aspectRatio: "1:1",
        addWatermark: true,
      },
    });

    if (isNil(job)) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: 500,
        message: "Failed to create job",
      });
    }

    // 8. Trigger async job processing (fire and forget - don't await)
    // The processJob will create the assistant message when complete
    const jobId = get(job, "id");
    processJob(jobId, threadId).catch((error) => {
      console.error(`❌ Error processing job ${jobId}:`, get(error, "message"));
    });

    // 9. Return 201 response immediately with user message and job info
    // Frontend will poll /api/threads/:threadId/messages to get the assistant response
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      status: 201,
      message: "Message created successfully",
      data: {
        userMessage,
        job: {
          id: get(job, "id"),
          status: get(job, "status"),
        },
        provider: {
          id: get(provider, "id"),
          name: get(provider, "name"),
        },
      },
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

