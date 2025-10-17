import lodash from "lodash";
const { get, isEmpty, isNil } = lodash;

import { db } from "../db/drizzle.js";
import { jobs, images, messages } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  JOB_STATUS,
  VALID_JOB_STATUSES,
  VALID_JOB_TYPES,
  TERMINAL_JOB_STATUSES,
  JOB_ERROR_CODE,
  JOB_TIMEOUT,
  JOB_RETRY_CONFIG,
} from "../utils/constant.js";
import JobError from "../utils/JobError.js";
import { generateImage } from "./gemini.service.js";
import { uploadToR2, getR2Bucket } from "../config/r2.js";
import {
  updateMessage,
  createMessage,
} from "./messages.service.js";
import { ulid } from "ulid";

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute operation with exponential backoff retry logic
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Retry configuration
 * @returns {Promise<any>} Operation result
 * @throws {Error} If all retries fail
 */
const withRetry = async (operation, options = {}) => {
  const {
    maxRetries = JOB_RETRY_CONFIG.MAX_RETRIES,
    initialDelay = JOB_RETRY_CONFIG.INITIAL_DELAY,
    maxDelay = JOB_RETRY_CONFIG.MAX_DELAY,
    backoffMultiplier = JOB_RETRY_CONFIG.BACKOFF_MULTIPLIER,
    retryableErrors = ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorCode = get(error, "code", "");
      const isRetryable = retryableErrors.some((code) =>
        errorCode.includes(code)
      );

      if (attempt === maxRetries || !isRetryable) {
        throw error;
      }

      console.warn(
        `⚠️ Attempt ${attempt}/${maxRetries} failed: ${get(
          error,
          "message"
        )}. Retrying in ${delay}ms...`
      );

      await sleep(delay);
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
};

/**
 * Execute operation with timeout
 * @param {Function} operation - Async function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name for error messages
 * @returns {Promise<any>} Operation result
 * @throws {JobError} If timeout occurs
 */
const withTimeout = async (
  operation,
  timeoutMs,
  operationName = "Operation"
) => {
  return Promise.race([
    operation(),
    new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new JobError(
              `${operationName} timed out after ${timeoutMs}ms`,
              JOB_ERROR_CODE.TIMEOUT,
              504
            )
          ),
        timeoutMs
      )
    ),
  ]);
};

/**
 * Delete orphaned images from R2 storage
 * Used for cleanup when image DB record creation fails
 * @param {Array<string>} storageKeys - Array of storage keys to delete
 * @returns {Promise<void>}
 */
const cleanupOrphanedImages = async (storageKeys) => {
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
 * Create a new job record in the database
 * @param {Object} jobData - Job creation parameters
 * @param {string} jobData.messageId - UUID of the message that triggered this job
 * @param {string} jobData.providerId - UUID of the provider to handle this job
 * @param {string} jobData.jobType - Type of image generation job
 * @param {string} [jobData.status='queued'] - Initial job status (defaults to 'queued')
 * @param {Object} [jobData.parameters={}] - Job parameters (prompt, style, dimensions, etc.)
 * @param {string} [jobData.externalId] - External job ID from provider's API (optional)
 * @returns {Promise<Object>} Created job object
 * @throws {Error} If validation fails or database operation fails
 */
export const createJob = async (jobData) => {
  const messageId = get(jobData, "messageId");
  const providerId = get(jobData, "providerId");
  const jobType = get(jobData, "jobType");
  const status = get(jobData, "status", JOB_STATUS.QUEUED);
  const parameters = get(jobData, "parameters", {});
  const externalId = get(jobData, "externalId");

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

  try {
    // Use retry logic for database operations
    const result = await withRetry(
      async () => {
        return await db
          .insert(jobs)
          .values({
            messageId,
            providerId,
            jobType,
            status,
            parameters,
            externalId: externalId || null,
          })
          .returning();
      },
      {
        maxRetries: 3,
        retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"],
      }
    );

    const createdJob = get(result, "[0]");

    if (isNil(createdJob)) {
      throw new JobError(
        "Failed to create job record - no data returned",
        JOB_ERROR_CODE.DATABASE_ERROR,
        500,
        { messageId, providerId, jobType }
      );
    }

    console.log(
      `✅ Created job with ID: ${get(createdJob, "id")}, status: ${status}`
    );

    return createdJob;
  } catch (error) {
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
      console.error(`❌ Job already exists for messageId: ${messageId}`);
      throw new JobError(
        `Job already exists for messageId: ${messageId}`,
        JOB_ERROR_CODE.JOB_ALREADY_EXISTS,
        409,
        { messageId }
      );
    }

    // Handle other database errors
    console.error("❌ Error creating job:", errorMessage);
    throw new JobError(
      `Failed to create job: ${errorMessage}`,
      JOB_ERROR_CODE.DATABASE_ERROR,
      500,
      { messageId, providerId, jobType, originalError: errorMessage }
    );
  }
};

/**
 * Update the status of a job
 * @param {string} jobId - UUID of the job to update
 * @param {string} newStatus - New status value
 * @returns {Promise<Object>} Updated job object
 * @throws {Error} If job not found, invalid status, or database operation fails
 */
export const updateJobStatus = async (jobId, newStatus) => {
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

  try {
    // Use timeout for status update operations
    const result = await withTimeout(
      async () => {
        // First, check if job exists
        const existingJob = await db
          .select()
          .from(jobs)
          .where(eq(jobs.id, jobId))
          .limit(1);

        if (isEmpty(existingJob)) {
          throw new JobError(
            `Job not found with ID: ${jobId}`,
            JOB_ERROR_CODE.JOB_NOT_FOUND,
            404,
            { jobId }
          );
        }

        const currentStatus = get(existingJob, "[0].status");

        // Validate status transitions
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

        // Update the job status with retry logic
        const updateResult = await withRetry(
          async () => {
            return await db
              .update(jobs)
              .set({
                status: newStatus,
                updatedAt: new Date(),
              })
              .where(eq(jobs.id, jobId))
              .returning();
          },
          {
            maxRetries: 3,
            retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"],
          }
        );

        const updatedJob = get(updateResult, "[0]");

        if (isNil(updatedJob)) {
          throw new JobError(
            "Failed to update job status - no data returned",
            JOB_ERROR_CODE.DATABASE_ERROR,
            500,
            { jobId, newStatus }
          );
        }

        console.log(
          `✅ Updated job ${jobId} status: ${currentStatus} → ${newStatus}`
        );

        return updatedJob;
      },
      JOB_TIMEOUT.STATUS_UPDATE,
      "Job status update"
    );

    return result;
  } catch (error) {
    // If it's already a JobError, re-throw it
    if (error instanceof JobError) {
      console.error(
        `❌ Error updating job status for ${jobId}:`,
        get(error, "message")
      );
      throw error;
    }

    // Wrap other errors
    console.error(
      `❌ Error updating job status for ${jobId}:`,
      get(error, "message")
    );
    throw new JobError(
      `Failed to update job status: ${get(error, "message")}`,
      JOB_ERROR_CODE.DATABASE_ERROR,
      500,
      { jobId, newStatus, originalError: get(error, "message") }
    );
  }
};

/**
 * Get a job by ID
 * @param {string} jobId - UUID of the job
 * @returns {Promise<Object|null>} Job object or null if not found
 * @throws {JobError} If validation fails or database operation fails
 */
export const getJobById = async (jobId) => {
  if (isNil(jobId) || isEmpty(jobId)) {
    throw new JobError(
      "jobId is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "jobId" }
    );
  }

  try {
    const result = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (isEmpty(result)) {
      return null;
    }

    return get(result, "[0]");
  } catch (error) {
    console.error(
      `❌ Error fetching job by ID ${jobId}:`,
      get(error, "message")
    );

    // If it's already a JobError, re-throw it
    if (error instanceof JobError) {
      throw error;
    }

    // Wrap database errors
    throw new JobError(
      `Failed to fetch job: ${get(error, "message")}`,
      JOB_ERROR_CODE.DATABASE_ERROR,
      500,
      { jobId, originalError: get(error, "message") }
    );
  }
};

/**
 * Generate storage key for generated images
 * Pattern: gen/{job_id}/{ulid}.png
 * @param {string} jobId - Job UUID
 * @param {number} index - Image index (for multiple images)
 * @returns {string} Storage key
 */
const generateImageStorageKey = (jobId, index) => {
  const uniqueId = ulid();
  const imageIndex = String(index).padStart(3, "0");
  return `gen/${jobId}/${uniqueId}_${imageIndex}.png`;
};

/**
 * Store a single generated image to R2 and create image record
 * @param {Object} params - Storage parameters
 * @param {string} params.jobId - Job UUID
 * @param {string} params.imageData - Base64 encoded image data
 * @param {string} params.mimeType - Image MIME type
 * @param {number} params.index - Image index in the batch
 * @param {Object} params.metadata - Additional metadata
 * @returns {Promise<Object>} Created image record
 * @throws {Error} If upload or database operation fails
 */
export const storeGeneratedImage = async ({
  jobId,
  imageData,
  mimeType,
  index,
  metadata = {},
}) => {
  if (isNil(jobId) || isEmpty(jobId)) {
    throw new JobError(
      "jobId is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "jobId" }
    );
  }

  if (isNil(imageData) || isEmpty(imageData)) {
    throw new JobError(
      "imageData is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "imageData" }
    );
  }

  let storageKey;
  let uploadSucceeded = false;

  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, "base64");

    // Generate storage key
    storageKey = generateImageStorageKey(jobId, index);

    console.log(`   Uploading image ${index} to storage...`);
    console.log(`   Storage key: ${storageKey}`);

    // Upload to R2 with timeout and retry
    const uploadResult = await withTimeout(
      async () => {
        return await withRetry(
          async () => {
            return await uploadToR2({
              buffer: imageBuffer,
              key: storageKey,
              contentType: mimeType || "image/png",
              metadata: {
                jobId,
                index: String(index),
                ...metadata,
              },
            });
          },
          {
            maxRetries: 3,
            retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
          }
        );
      },
      JOB_TIMEOUT.STORAGE,
      "Image upload"
    );

    uploadSucceeded = true;
    console.log(`   ✅ Image uploaded: ${get(uploadResult, "publicUrl")}`);

    // Create image record in database with retry
    const imageRecord = await withRetry(
      async () => {
        return await db
          .insert(images)
          .values({
            jobId,
            url: get(uploadResult, "publicUrl"),
            metadata: {
              mimeType,
              index,
              storageKey,
              sizeBytes: imageBuffer.length,
              etag: get(uploadResult, "etag"),
              ...metadata,
            },
          })
          .returning();
      },
      {
        maxRetries: 3,
        retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"],
      }
    );

    const createdImage = get(imageRecord, "[0]");

    if (isNil(createdImage)) {
      throw new JobError(
        "Failed to create image record in database - no data returned",
        JOB_ERROR_CODE.DATABASE_ERROR,
        500,
        { jobId, index, storageKey }
      );
    }

    console.log(`   ✅ Image record created: ${get(createdImage, "id")}`);

    return createdImage;
  } catch (error) {
    // If upload succeeded but DB insert failed, cleanup the orphaned image
    if (uploadSucceeded && storageKey) {
      console.error(
        `   ⚠️ Image uploaded but DB record failed. Cleaning up orphaned image...`
      );
      await cleanupOrphanedImages([storageKey]);
    }

    console.error(
      `❌ Failed to store image ${index} for job ${jobId}:`,
      get(error, "message")
    );

    // If it's already a JobError, re-throw it
    if (error instanceof JobError) {
      throw error;
    }

    // Wrap other errors
    throw new JobError(
      `Failed to store image: ${get(error, "message")}`,
      JOB_ERROR_CODE.STORAGE_FAILED,
      500,
      { jobId, index, storageKey, originalError: get(error, "message") }
    );
  }
};

/**
 * Store all generated images from a job result
 * @param {string} jobId - Job UUID
 * @param {Object} generationResult - Result from generateImage
 * @returns {Promise<Array>} Array of created image records
 * @throws {Error} If any image storage fails
 */
export const storeJobImages = async (jobId, generationResult) => {
  if (isNil(jobId) || isEmpty(jobId)) {
    throw new Error("jobId is required");
  }

  if (isNil(generationResult)) {
    throw new Error("generationResult is required");
  }

  const imagesList = get(generationResult, "images", []);

  if (isEmpty(imagesList)) {
    throw new Error("No images found in generation result");
  }

  console.log(`📦 Storing ${imagesList.length} generated images...`);

  const storedImages = [];
  const errors = [];

  // Store each image sequentially
  for (const image of imagesList) {
    try {
      const imageData = get(image, "imageData");
      const mimeType = get(image, "mimeType", "image/png");
      const index = get(image, "index", 0);

      const storedImage = await storeGeneratedImage({
        jobId,
        imageData,
        mimeType,
        index,
        metadata: {},
      });

      storedImages.push(storedImage);
    } catch (error) {
      const index = get(image, "index", 0);
      console.error(`Failed to store image ${index}:`, get(error, "message"));
      errors.push({
        index,
        error: get(error, "message"),
      });
    }
  }

  // If any errors occurred, throw with details
  if (!isEmpty(errors)) {
    const errorMessage = `Failed to store ${errors.length} of ${imagesList.length} images`;
    console.error(`❌ ${errorMessage}`);

    // If ALL images failed, throw error
    if (isEmpty(storedImages)) {
      throw new Error(`${errorMessage}: All image uploads failed`);
    }

    // If SOME images failed, log warning but continue
    console.warn(`⚠️ ${errorMessage}, but ${storedImages.length} succeeded`);
  }

  console.log(
    `✅ Successfully stored ${storedImages.length} images for job ${jobId}`
  );

  return storedImages;
};

/**
 * Get all images for a specific job
 * @param {string} jobId - UUID of the job
 * @returns {Promise<Array>} Array of image objects (empty array if none found)
 * @throws {JobError} If validation fails or database operation fails
 */
export const getImagesByJobId = async (jobId) => {
  if (isNil(jobId) || isEmpty(jobId)) {
    throw new JobError(
      "jobId is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "jobId" }
    );
  }

  try {
    const result = await db
      .select()
      .from(images)
      .where(eq(images.jobId, jobId))
      .orderBy(images.createdAt);

    return result;
  } catch (error) {
    console.error(
      `❌ Error fetching images for job ${jobId}:`,
      get(error, "message")
    );

    // If it's already a JobError, re-throw it
    if (error instanceof JobError) {
      throw error;
    }

    // Wrap database errors
    throw new JobError(
      `Failed to fetch images: ${get(error, "message")}`,
      JOB_ERROR_CODE.DATABASE_ERROR,
      500,
      { jobId, originalError: get(error, "message") }
    );
  }
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
      } successfully.\n\nImage URLs:\n${imageUrls
        .map((url, idx) => `${idx + 1}. ${url}`)
        .join("\n")}`;

      const assistantMessage = await createMessage(
        threadId,
        "assistant",
        messageContent,
        "succeeded"
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
        "assistant",
        messageContent,
        "failed"
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
 * Get all jobs for a specific thread
 * @param {string} threadId - UUID of the thread
 * @returns {Promise<Array>} Array of job objects (empty array if none found)
 * @throws {JobError} If validation fails or database operation fails
 */
export const getJobsByThread = async (threadId) => {
  if (isNil(threadId) || isEmpty(threadId)) {
    throw new JobError(
      "threadId is required",
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: "threadId" }
    );
  }

  try {
    // Join jobs with messages to filter by threadId
    const result = await db
      .select({
        id: jobs.id,
        messageId: jobs.messageId,
        providerId: jobs.providerId,
        jobType: jobs.jobType,
        status: jobs.status,
        externalId: jobs.externalId,
        parameters: jobs.parameters,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .innerJoin(messages, eq(jobs.messageId, messages.id))
      .where(eq(messages.threadId, threadId));

    return result;
  } catch (error) {
    console.error(
      `❌ Error fetching jobs for thread ${threadId}:`,
      get(error, "message")
    );

    // If it's already a JobError, re-throw it
    if (error instanceof JobError) {
      throw error;
    }

    // Wrap database errors
    throw new JobError(
      `Failed to fetch jobs for thread: ${get(error, "message")}`,
      JOB_ERROR_CODE.DATABASE_ERROR,
      500,
      { threadId, originalError: get(error, "message") }
    );
  }
};

/**
 * Process a job - orchestrates the full job lifecycle
 * This function handles:
 * 1. Updating job status to 'processing'
 * 2. Calling Gemini service to generate images
 * 3. Updating job status to 'succeeded' or 'failed' based on outcome
 * 4. Creating assistant message with results
 *
 * @param {string} jobId - UUID of the job to process
 * @param {string} threadId - UUID of the thread (for creating assistant message)
 * @returns {Promise<Object>} Object containing job and generation result
 * @throws {Error} If job not found or processing fails
 */
export const processJob = async (jobId, threadId) => {
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

  console.log(`🔄 Starting job processing: ${jobId} for thread: ${threadId}`);

  let job;
  let messageId;

  try {
    // 1. Get the job
    job = await getJobById(jobId);

    if (isNil(job)) {
      throw new JobError(
        `Job not found with ID: ${jobId}`,
        JOB_ERROR_CODE.JOB_NOT_FOUND,
        404,
        { jobId }
      );
    }

    messageId = get(job, "messageId");

    console.log(`   Job type: ${get(job, "jobType")}`);
    console.log(`   Current status: ${get(job, "status")}`);

    // 2. Update job status to 'processing'
    await updateJobStatus(jobId, JOB_STATUS.PROCESSING);

    // 3. Update user message status to 'processing'
    try {
      await updateMessage(messageId, { status: "processing" });
      console.log(
        `✅ User message ${messageId} status updated to 'processing'`
      );
    } catch (messageUpdateError) {
      console.error(
        `⚠️ Failed to update user message status to processing:`,
        get(messageUpdateError, "message")
      );
    }

    // 4. Extract parameters for image generation
    const parameters = get(job, "parameters", {});
    const prompt = get(parameters, "prompt");

    if (isEmpty(prompt)) {
      throw new JobError(
        "Job parameters missing required 'prompt' field",
        JOB_ERROR_CODE.INVALID_INPUT,
        400,
        { jobId, parameters }
      );
    }

    // Build generation parameters
    const generationParams = {
      prompt,
      numberOfImages: get(parameters, "numberOfImages", 1),
      aspectRatio: get(parameters, "aspectRatio", "1:1"),
      seed: get(parameters, "seed"),
      addWatermark: get(parameters, "addWatermark", true),
    };

    console.log(
      `   Generating images with prompt: "${prompt.substring(0, 50)}..."`
    );

    // 4. Call Gemini service to generate images with timeout
    let generationResult;
    let storedImages = [];

    try {
      generationResult = await withTimeout(
        async () => {
          return await generateImage(generationParams);
        },
        JOB_TIMEOUT.GENERATION,
        "Image generation"
      );

      console.log(`✅ Image generation successful`);
      console.log(`   Images generated: ${get(generationResult, "count", 0)}`);

      // Validate generation result
      const imagesList = get(generationResult, "images", []);
      if (isEmpty(imagesList)) {
        throw new JobError(
          "No images generated",
          JOB_ERROR_CODE.NO_IMAGES_GENERATED,
          500,
          { jobId, generationParams }
        );
      }

      // 5. Store generated images to R2 and create image records
      try {
        storedImages = await storeJobImages(jobId, generationResult);
        console.log(`✅ Stored ${storedImages.length} images successfully`);
      } catch (storageError) {
        // Storage failed - mark job as failed and throw
        console.error(
          `❌ Image storage failed for job ${jobId}:`,
          get(storageError, "message")
        );

        const failedJob = await updateJobStatus(jobId, JOB_STATUS.FAILED);

        const errorCode = get(
          storageError,
          "code",
          JOB_ERROR_CODE.STORAGE_FAILED
        );
        const errorMessage = get(
          storageError,
          "message",
          "Failed to store generated images"
        );

        const storageFailureResult = {
          job: failedJob,
          error: {
            code: errorCode,
            message: errorMessage,
            status: get(storageError, "statusCode", 500),
            originalError: get(storageError, "context"),
          },
          success: false,
        };

        // Update user message status to 'failed'
        try {
          await updateMessage(messageId, { status: "failed" });
          console.log(
            `✅ User message ${messageId} status updated to 'failed' (storage error)`
          );
        } catch (messageUpdateError) {
          console.error(
            `⚠️ Failed to update user message status:`,
            get(messageUpdateError, "message")
          );
        }

        // Create assistant message with storage failure
        try {
          await createAssistantMessageWithJobResult(
            jobId,
            threadId,
            storageFailureResult
          );
        } catch (messageCreateError) {
          console.error(
            `⚠️ Failed to create assistant message after storage failure:`,
            get(messageCreateError, "message")
          );
        }

        return storageFailureResult;
      }

      // 6. Update status to 'succeeded'
      const succeededJob = await updateJobStatus(jobId, JOB_STATUS.SUCCEEDED);

      const successResult = {
        job: succeededJob,
        result: generationResult,
        storedImages,
        success: true,
      };

      // 7. Update user message status to 'succeeded'
      try {
        await updateMessage(messageId, { status: "succeeded" });
        console.log(
          `✅ User message ${messageId} status updated to 'succeeded'`
        );
      } catch (messageUpdateError) {
        console.error(
          `⚠️ Failed to update user message status:`,
          get(messageUpdateError, "message")
        );
      }

      // 8. Create assistant message with job results
      try {
        await createAssistantMessageWithJobResult(
          jobId,
          threadId,
          successResult
        );
        console.log(
          `✅ Assistant message created with job results for thread ${threadId}`
        );
      } catch (messageCreateError) {
        // Log error but don't fail the job - it already succeeded
        console.error(
          `⚠️ Failed to create assistant message after successful job:`,
          get(messageCreateError, "message")
        );
      }

      return successResult;
    } catch (generationError) {
      // 9. On generation failure, update status to 'failed'
      console.error(
        `❌ Image generation failed for job ${jobId}:`,
        get(generationError, "message")
      );

      const failedJob = await updateJobStatus(jobId, JOB_STATUS.FAILED);

      const errorCode = get(
        generationError,
        "code",
        JOB_ERROR_CODE.GENERATION_FAILED
      );
      const errorMessage = get(
        generationError,
        "message",
        "Image generation failed"
      );

      const generationFailureResult = {
        job: failedJob,
        error: {
          code: errorCode,
          message: errorMessage,
          status: get(
            generationError,
            "statusCode",
            get(generationError, "status", 500)
          ),
          originalError: get(
            generationError,
            "context",
            get(generationError, "originalError")
          ),
        },
        success: false,
      };

      // Update user message status to 'failed'
      try {
        await updateMessage(messageId, { status: "failed" });
        console.log(`✅ User message ${messageId} status updated to 'failed'`);
      } catch (messageUpdateError) {
        console.error(
          `⚠️ Failed to update user message status:`,
          get(messageUpdateError, "message")
        );
      }

      // Create assistant message with generation failure
      try {
        await createAssistantMessageWithJobResult(
          jobId,
          threadId,
          generationFailureResult
        );
      } catch (messageCreateError) {
        console.error(
          `⚠️ Failed to create assistant message after generation failure:`,
          get(messageCreateError, "message")
        );
      }

      return generationFailureResult;
    }
  } catch (error) {
    // Handle any other errors (job not found, status update failures, etc.)
    console.error(
      `❌ Job processing failed for ${jobId}:`,
      get(error, "message")
    );

    // Try to mark job as failed if possible
    try {
      await updateJobStatus(jobId, JOB_STATUS.FAILED);

      // Try to create assistant message with failure info
      const errorCode = get(error, "code", JOB_ERROR_CODE.UNKNOWN_ERROR);
      const errorMessage = get(error, "message", "Job processing failed");

      const failureResult = {
        job: { id: jobId, status: JOB_STATUS.FAILED },
        error: {
          code: errorCode,
          message: errorMessage,
          status: get(error, "statusCode", 500),
          originalError: get(error, "context"),
        },
        success: false,
      };

      try {
        await createAssistantMessageWithJobResult(
          jobId,
          threadId,
          failureResult
        );
      } catch (messageCreateError) {
        console.error(
          `⚠️ Failed to create assistant message after job failure:`,
          get(messageCreateError, "message")
        );
      }
    } catch (updateError) {
      console.error(
        `⚠️ Could not update job status to failed:`,
        get(updateError, "message")
      );
    }

    // If it's already a JobError, re-throw it
    if (error instanceof JobError) {
      throw error;
    }

    // Wrap other errors
    throw new JobError(
      `Job processing failed: ${get(error, "message")}`,
      JOB_ERROR_CODE.UNKNOWN_ERROR,
      500,
      { jobId, originalError: get(error, "message") }
    );
  }
};

export default {
  createJob,
  updateJobStatus,
  getJobById,
  getJobsByThread,
  getImagesByJobId,
  storeGeneratedImage,
  storeJobImages,
  createAssistantMessageWithJobResult,
  processJob,
};
