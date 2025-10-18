import lodash from "lodash";
const { get, isNil } = lodash;

import { getJobWithImages } from "../services/jobs.service.js";
import { isThreadOwnedByUser } from "../services/threads.service.js";
import { findMessageById } from "../services/messages.service.js";
import { HTTP_STATUS } from "../utils/constant.js";
import { sendError, sendWarning } from "../utils/response.js";

/**
 * GET /api/jobs/:jobId - Get a specific job with images
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getJob = async (req, res) => {
  try {
    const userId = get(req, "user.id");
    const jobId = get(req, "params.jobId");

    // 1. Validate authentication
    if (isNil(userId)) {
      return res.status(HTTP_STATUS.UNAUTHENTICATED).json({
        success: false,
        status: 401,
        message: "User not authenticated",
      });
    }

    if (isNil(jobId)) {
      return sendWarning(res, "Job ID is required");
    }

    // 2. Get job with images
    const job = await getJobWithImages(jobId);

    if (isNil(job)) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        status: 404,
        message: "Job not found",
      });
    }

    // 3. Verify ownership: Get the message linked to this job
    const messageId = get(job, "messageId");
    const message = await findMessageById(messageId);

    if (isNil(message)) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        status: 404,
        message: "Message associated with job not found",
      });
    }

    // 4. Check thread ownership
    const threadId = get(message, "threadId");
    const isOwner = await isThreadOwnedByUser(threadId, userId);

    if (!isOwner) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        status: 403,
        message: "You do not have permission to access this job",
      });
    }

    // 5. Return job with images
    return res.status(HTTP_STATUS.SUCCESS).json({
      success: true,
      status: 200,
      message: "Job retrieved successfully",
      data: job,
    });
  } catch (error) {
    sendError(res, error);
  }
};

