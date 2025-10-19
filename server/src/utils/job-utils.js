import lodash from "lodash";
const { get, isEmpty, isNil } = lodash;

import {
  JOB_STATUS,
  VALID_JOB_STATUSES,
  VALID_JOB_TYPES,
  TERMINAL_JOB_STATUSES,
  JOB_ERROR_CODE,
  MESSAGE_ROLE,
  MESSAGE_STATUS,
} from "./constant.js";
import JobError from "./JobError.js";
import { getR2Bucket } from "../config/r2.js";
import { updateMessage, createMessage } from "../services/messages.service.js";
import { ulid } from "ulid";

/**
 * Delete orphaned images from R2 storage
 * Used for cleanup when image DB record creation fails
 * @param {Array<string>} storageKeys - Array of storage keys to delete
 * @returns {Promise<void>}
 */
export const cleanupOrphanedImages = async (storageKeys) => {
  if (isEmpty(storageKeys)) {
    return;
  }

  console.log(
    `🧹 Cleaning up ${storageKeys.length} orphaned images from R2...`
  );

  for (const key of storageKeys) {
    try {
      const bucket = getR2Bucket();
      await bucket.delete(key);
      console.log(`   ✅ Deleted orphaned image: ${key}`);
    } catch (error) {
      console.error(
        `   ⚠️ Failed to delete orphaned image ${key}:`,
        get(error, "message")
      );
      // Don't throw - best effort cleanup
    }
  }
};

/**
 * Generate storage key for generated images
 * Pattern: gen/{job_id}/{ulid}.png
 * @param {string} jobId - Job UUID
 * @param {number} index - Image index (for multiple images)
 * @returns {string} Storage key
 */
export const generateImageStorageKey = (jobId, index) => {
  const uniqueId = ulid();
  const imageIndex = String(index).padStart(3, "0");
  return `gen/${jobId}/${uniqueId}_${imageIndex}.png`;
};

/**
 * Validate job creation parameters
 * @param {Object} jobData - Job creation parameters
 * @throws {JobError} If validation fails
 */
export const validateJobCreation = (jobData) => {
  const messageId = get(jobData, "messageId");
  const providerId = get(jobData, "providerId");
  const jobType = get(jobData, "jobType");
  const status = get(jobData, "status", JOB_STATUS.QUEUED);

  // Validate required fields
  if (isNil(messageId) || isEmpty(messageId)) {
    throw new JobError(
      "messageId is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "messageId" }
    );
  }

  if (isNil(providerId) || isEmpty(providerId)) {
    throw new JobError(
      "providerId is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "providerId" }
    );
  }

  if (isNil(jobType) || isEmpty(jobType)) {
    throw new JobError(
      "jobType is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "jobType" }
    );
  }

  // Validate job type
  if (!VALID_JOB_TYPES.includes(jobType)) {
    throw new JobError(
      `Invalid job type: ${jobType}. Must be one of: ${VALID_JOB_TYPES.join(
        ", "
      )}`,
      JOB_ERROR_CODE.INVALID_JOB_TYPE,
      400,
      { jobType, validTypes: VALID_JOB_TYPES }
    );
  }

  // Validate status
  if (!VALID_JOB_STATUSES.includes(status)) {
    throw new JobError(
      `Invalid status: ${status}. Must be one of: ${VALID_JOB_STATUSES.join(
        ", "
      )}`,
      JOB_ERROR_CODE.INVALID_STATUS,
      400,
      { status, validStatuses: VALID_JOB_STATUSES }
    );
  }
};

/**
 * Validate job status update parameters
 * @param {string} jobId - Job ID
 * @param {string} newStatus - New status
 * @throws {JobError} If validation fails
 */
export const validateJobStatusUpdate = (jobId, newStatus) => {
  if (isNil(jobId) || isEmpty(jobId)) {
    throw new JobError(
      "jobId is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "jobId" }
    );
  }

  if (isNil(newStatus) || isEmpty(newStatus)) {
    throw new JobError(
      "newStatus is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "newStatus" }
    );
  }

  // Validate status
  if (!VALID_JOB_STATUSES.includes(newStatus)) {
    throw new JobError(
      `Invalid status: ${newStatus}. Must be one of: ${VALID_JOB_STATUSES.join(
        ", "
      )}`,
      JOB_ERROR_CODE.INVALID_STATUS,
      400,
      { newStatus, validStatuses: VALID_JOB_STATUSES }
    );
  }
};

/**
 * Validate status transitions
 * @param {string} currentStatus - Current job status
 * @param {string} newStatus - New job status
 * @throws {JobError} If transition is invalid
 */
export const validateStatusTransition = (currentStatus, newStatus) => {
  // Once succeeded, failed, or canceled, job status cannot change
  if (TERMINAL_JOB_STATUSES.includes(currentStatus)) {
    throw new JobError(
      `Cannot update job status from terminal state "${currentStatus}" to "${newStatus}"`,
      JOB_ERROR_CODE.INVALID_STATUS_TRANSITION,
      400,
      {
        currentStatus,
        newStatus,
        terminalStatuses: TERMINAL_JOB_STATUSES,
      }
    );
  }
};

/**
 * Handle database errors for job operations
 * @param {Error} error - Original error
 * @param {string} operation - Operation being performed
 * @param {Object} context - Additional context
 * @throws {JobError} Wrapped error
 */
export const handleJobDatabaseError = (error, operation, context = {}) => {
  // If it's already a JobError, re-throw it
  if (error instanceof JobError) {
    throw error;
  }

  const errorMessage = get(error, "message", "");
  const errorCode = get(error, "code", "");

  // Handle unique constraint violation (messageId already has a job)
  // Postgres error code 23505 = unique_violation
  if (
    errorCode === "23505" ||
    errorMessage.includes("unique") ||
    errorMessage.includes("duplicate") ||
    errorMessage.includes("message_id")
  ) {
    const messageId = get(context, "messageId");
    console.error(`❌ Job already exists for messageId: ${messageId}`);
    throw new JobError(
      `Job already exists for messageId: ${messageId}`,
      JOB_ERROR_CODE.JOB_ALREADY_EXISTS,
      409,
      { messageId }
    );
  }

  // Handle other database errors
  console.error(`❌ Error ${operation}:`, errorMessage);
  throw new JobError(
    `Failed to ${operation}: ${errorMessage}`,
    JOB_ERROR_CODE.DATABASE_ERROR,
    500,
    { ...context, originalError: errorMessage }
  );
};

/**
 * Create assistant message with job results after processing
 * @param {string} jobId - UUID of the job
 * @param {string} threadId - UUID of the thread
 * @param {Object} jobResult - Result from processJob
 * @returns {Promise<Object>} Created assistant message object
 * @throws {JobError} If validation fails or creation fails
 */
export const createAssistantMessageWithJobResult = async (
  jobId,
  threadId,
  jobResult
) => {
  if (isNil(jobId) || isEmpty(jobId)) {
    throw new JobError(
      "jobId is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "jobId" }
    );
  }

  if (isNil(threadId) || isEmpty(threadId)) {
    throw new JobError(
      "threadId is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "threadId" }
    );
  }

  if (isNil(jobResult)) {
    throw new JobError(
      "jobResult is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "jobResult" }
    );
  }

  try {
    const success = get(jobResult, "success", false);
    const job = get(jobResult, "job");
    const jobStatus = get(job, "status");

    console.log(
      `📝 Creating assistant message for job ${jobId} in thread ${threadId} (status: ${jobStatus})`
    );

    if (success) {
      // Success case: Create message with image URLs
      const storedImages = get(jobResult, "storedImages", []);

      if (isEmpty(storedImages)) {
        console.warn(`⚠️ No stored images found for successful job ${jobId}`);
      }

      // Build content with image URLs
      const imageUrls = storedImages.map((img) => get(img, "url"));
      const imageCount = imageUrls.length;

      const messageContent = `Generated ${imageCount} image${
        imageCount !== 1 ? "s" : ""
      } successfully.\n`;

      const assistantMessage = await createMessage(
        threadId,
        MESSAGE_ROLE.ASSISTANT,
        messageContent,
        MESSAGE_STATUS.SUCCEEDED
      );

      console.log(
        `✅ Assistant message created with ${imageCount} image URL(s)`
      );

      return assistantMessage;
    } else {
      // Failure case: Create message with error details
      const error = get(jobResult, "error", {});
      const errorCode = get(error, "code", "UNKNOWN_ERROR");
      const errorMessage = get(error, "message", "Job processing failed");

      const messageContent = `Image generation failed.\n\nError: ${errorCode}\nMessage: ${errorMessage}`;

      const assistantMessage = await createMessage(
        threadId,
        MESSAGE_ROLE.ASSISTANT,
        messageContent,
        MESSAGE_STATUS.FAILED
      );

      console.log(`✅ Assistant message created with error details`);

      return assistantMessage;
    }
  } catch (error) {
    console.error(
      `❌ Failed to create assistant message for job ${jobId}:`,
      get(error, "message")
    );

    // If it's already a JobError, re-throw it
    if (error instanceof JobError) {
      throw error;
    }

    // Wrap other errors
    throw new JobError(
      `Failed to create assistant message with job result: ${get(
        error,
        "message"
      )}`,
      JOB_ERROR_CODE.MESSAGE_UPDATE_FAILED,
      500,
      { jobId, threadId, originalError: get(error, "message") }
    );
  }
};

/**
 * Update user message status with error handling
 * @param {string} messageId - Message ID
 * @param {string} status - New status
 * @param {string} context - Context for logging
 */
export const updateUserMessageStatus = async (
  messageId,
  status,
  context = ""
) => {
  try {
    await updateMessage(messageId, { status });
    console.log(
      `✅ User message ${messageId} status updated to '${status}'${
        context ? ` (${context})` : ""
      }`
    );
  } catch (messageUpdateError) {
    console.error(
      `⚠️ Failed to update user message status to ${status}:`,
      get(messageUpdateError, "message")
    );
  }
};

/**
 * Create failure result object
 * @param {Object} job - Job object
 * @param {Object} error - Error object
 * @returns {Object} Failure result
 */
export const createFailureResult = (job, error) => {
  const errorCode = get(error, "code", JOB_ERROR_CODE.UNKNOWN_ERROR);
  const errorMessage = get(error, "message", "Job processing failed");

  return {
    job,
    error: {
      code: errorCode,
      message: errorMessage,
      status: get(error, "statusCode", get(error, "status", 500)),
      originalError: get(error, "context", get(error, "originalError")),
    },
    success: false,
  };
};

/**
 * Create success result object
 * @param {Object} job - Job object
 * @param {Object} generationResult - Generation result
 * @param {Array} storedImages - Stored images
 * @returns {Object} Success result
 */
export const createSuccessResult = (job, generationResult, storedImages) => {
  return {
    job,
    result: generationResult,
    storedImages,
    success: true,
  };
};
