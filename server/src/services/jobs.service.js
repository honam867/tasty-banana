import lodash from "lodash";
const { get, isEmpty, isNil } = lodash;

import { db } from "../db/drizzle.js";
import { jobs, images, messages } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { emitJobUpdate, emitMessageUpdate } from "../config/socket.js";
import {
  JOB_STATUS,
  JOB_ERROR_CODE,
  JOB_TIMEOUT,
  MESSAGE_STATUS,
} from "../utils/constant.js";
import JobError from "../utils/JobError.js";
import { withRetry, withTimeout } from "../utils/functions.js";
import { generateImage } from "./gemini.service.js";
import { uploadToR2 } from "../config/r2.js";
import {
  cleanupOrphanedImages,
  generateImageStorageKey,
  validateJobCreation,
  validateJobStatusUpdate,
  validateStatusTransition,
  handleJobDatabaseError,
  createAssistantMessageWithJobResult,
  updateUserMessageStatus,
  createFailureResult,
  createSuccessResult,
} from "../utils/job-utils.js";

// ============================================================================
// Internal Helper Functions
// ============================================================================

/**
 * Generic validation helper
 * @param {string} fieldValue - Field value to validate
 * @param {string} fieldName - Name of the field
 * @throws {JobError} If validation fails
 */
const validateRequired = (fieldValue, fieldName) => {
  if (isNil(fieldValue) || isEmpty(fieldValue)) {
    throw new JobError(
      `${fieldName} is required`,
      JOB_ERROR_CODE.MISSING_REQUIRED_FIELD,
      400,
      { field: fieldName }
    );
  }
};

/**
 * Generic error wrapper for database operations
 * @param {Function} operation - Async function to execute
 * @param {string} errorContext - Context for error messages
 * @param {Object} context - Additional context
 * @returns {Promise} Result of the operation
 */
const executeDbOperation = async (operation, errorContext, context = {}) => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof JobError) throw error;
    
    console.error(`❌ Error ${errorContext}:`, get(error, "message"));
    throw new JobError(
      `Failed to ${errorContext}: ${get(error, "message")}`,
      JOB_ERROR_CODE.DATABASE_ERROR,
      500,
      { ...context, originalError: get(error, "message") }
    );
  }
};

/**
 * Fetch a single record from database
 * @param {Object} table - Drizzle table
 * @param {Function} whereClause - Where condition
 * @param {string} recordType - Type of record for error messages
 * @param {Object} context - Additional context
 * @returns {Promise<Object|null>} Record or null
 */
const fetchSingleRecord = async (table, whereClause, recordType, context) => {
  return executeDbOperation(
    async () => {
      const result = await db
        .select()
        .from(table)
        .where(whereClause)
        .limit(1);
      return isEmpty(result) ? null : get(result, "[0]");
    },
    `fetch ${recordType}`,
    context
  );
};

/**
 * Update job status in database with validation
 * @param {string} jobId - Job ID
 * @param {string} newStatus - New status
 * @param {string} currentStatus - Current status (optional, for validation)
 * @returns {Promise<Object>} Updated job
 */
const updateJobStatusInDb = async (jobId, newStatus, currentStatus = null) => {
  if (currentStatus) {
    validateStatusTransition(currentStatus, newStatus);
  }

  const result = await withRetry(
    async () => {
      return await db
        .update(jobs)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(jobs.id, jobId))
        .returning();
    },
    { maxRetries: 3, retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"] }
  );

  const updatedJob = get(result, "[0]");
  if (isNil(updatedJob)) {
    throw new JobError(
      "Failed to update job status - no data returned",
      JOB_ERROR_CODE.DATABASE_ERROR,
      500,
      { jobId, newStatus }
    );
  }

  console.log(`✅ Updated job ${jobId} status: ${currentStatus || '?'} → ${newStatus}`);
  
  // Emit socket event for real-time updates
  try {
    // Fetch the job with its associated message to get threadId
    const [jobWithMessage] = await db
      .select({
        jobId: jobs.id,
        messageId: jobs.messageId,
        threadId: messages.threadId,
      })
      .from(jobs)
      .innerJoin(messages, eq(jobs.messageId, messages.id))
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (jobWithMessage) {
      emitJobUpdate(
        jobWithMessage.threadId,
        jobWithMessage.messageId,
        updatedJob
      );
    }
  } catch (socketError) {
    console.warn(`⚠️ Failed to emit socket event for job ${jobId}:`, get(socketError, "message"));
  }
  
  return updatedJob;
};

/**
 * Generate images and handle generation errors
 * @param {Object} parameters - Job parameters
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Generation result
 */
const executeImageGeneration = async (parameters, jobId) => {
  const prompt = get(parameters, "prompt");
  if (isEmpty(prompt)) {
    throw new JobError(
      "Job parameters missing required 'prompt' field",
      JOB_ERROR_CODE.INVALID_INPUT,
      400,
      { jobId, parameters }
    );
  }

  const generationParams = {
    prompt,
    numberOfImages: get(parameters, "numberOfImages", 1),
    aspectRatio: get(parameters, "aspectRatio", "1:1"),
    seed: get(parameters, "seed"),
  };

  console.log(`   Generating images with prompt: "${prompt.substring(0, 50)}..."`);

  const result = await withTimeout(
    () => generateImage(generationParams),
    JOB_TIMEOUT.GENERATION,
    "Image generation"
  );

  const imagesList = get(result, "images", []);
  if (isEmpty(imagesList)) {
    throw new JobError(
      "No images generated",
      JOB_ERROR_CODE.NO_IMAGES_GENERATED,
      500,
      { jobId, generationParams }
    );
  }

  console.log(`✅ Image generation successful`);
  console.log(`   Images generated: ${get(result, "count", 0)}`);
  
  return { result, generationParams };
};

/**
 * Handle job processing failure
 * @param {string} jobId - Job ID
 * @param {string} threadId - Thread ID
 * @param {string} messageId - Message ID
 * @param {Error} error - Error object
 * @param {string} failureType - Type of failure (generation/storage)
 * @returns {Promise<Object>} Failure result
 */
const handleJobFailure = async (jobId, threadId, messageId, error, failureType = "generation") => {
  console.error(`❌ Image ${failureType} failed for job ${jobId}:`, get(error, "message"));

  const failedJob = await updateJobStatus(jobId, JOB_STATUS.FAILED);

  const failureResult = createFailureResult(failedJob, {
    code: get(error, "code", JOB_ERROR_CODE.GENERATION_FAILED),
    message: get(error, "message", `Image ${failureType} failed`),
    statusCode: get(error, "statusCode", get(error, "status", 500)),
    context: get(error, "context", get(error, "originalError")),
  });

  await updateUserMessageStatus(messageId, MESSAGE_STATUS.FAILED, failureType === "storage" ? "storage error" : undefined);

  try {
    await createAssistantMessageWithJobResult(jobId, threadId, failureResult);
  } catch (messageCreateError) {
    console.error(`⚠️ Failed to create assistant message after ${failureType} failure:`, get(messageCreateError, "message"));
  }

  return failureResult;
};

/**
 * Handle successful job completion
 * @param {string} jobId - Job ID
 * @param {string} threadId - Thread ID
 * @param {string} messageId - Message ID
 * @param {Object} generationResult - Generation result
 * @param {Array} storedImages - Stored images
 * @returns {Promise<Object>} Success result
 */
const handleJobSuccess = async (jobId, threadId, messageId, generationResult, storedImages) => {
  const succeededJob = await updateJobStatus(jobId, JOB_STATUS.SUCCEEDED);
  const successResult = createSuccessResult(succeededJob, generationResult, storedImages);

  await updateUserMessageStatus(messageId, MESSAGE_STATUS.SUCCEEDED);

  try {
    await createAssistantMessageWithJobResult(jobId, threadId, successResult);
    console.log(`✅ Assistant message created with job results for thread ${threadId}`);
  } catch (messageCreateError) {
    console.error(`⚠️ Failed to create assistant message after successful job:`, get(messageCreateError, "message"));
  }

  return successResult;
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
  const { messageId, providerId, jobType, externalId } = jobData;
  const status = get(jobData, "status", JOB_STATUS.QUEUED);
  const parameters = get(jobData, "parameters", {});

  validateJobCreation(jobData);

  try {
    const result = await withRetry(
      async () => {
        return await db
          .insert(jobs)
          .values({ messageId, providerId, jobType, status, parameters, externalId: externalId || null })
          .returning();
      },
      { maxRetries: 3, retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"] }
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

    console.log(`✅ Created job with ID: ${get(createdJob, "id")}, status: ${status}`);
    return createdJob;
  } catch (error) {
    handleJobDatabaseError(error, "create job", { messageId, providerId, jobType });
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
  validateJobStatusUpdate(jobId, newStatus);

  try {
    return await withTimeout(
      async () => {
        const existingJob = await fetchSingleRecord(
          jobs,
          eq(jobs.id, jobId),
          "job",
          { jobId }
        );

        if (isNil(existingJob)) {
          throw new JobError(
            `Job not found with ID: ${jobId}`,
            JOB_ERROR_CODE.JOB_NOT_FOUND,
            404,
            { jobId }
          );
        }

        return await updateJobStatusInDb(jobId, newStatus, existingJob.status);
      },
      JOB_TIMEOUT.STATUS_UPDATE,
      "Job status update"
    );
  } catch (error) {
    if (error instanceof JobError) {
      console.error(`❌ Error updating job status for ${jobId}:`, get(error, "message"));
      throw error;
    }
    console.error(`❌ Error updating job status for ${jobId}:`, get(error, "message"));
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
  validateRequired(jobId, "jobId");
  return fetchSingleRecord(jobs, eq(jobs.id, jobId), "job", { jobId });
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
  validateRequired(jobId, "jobId");
  validateRequired(imageData, "imageData");

  let storageKey;
  let uploadSucceeded = false;

  try {
    const imageBuffer = Buffer.from(imageData, "base64");
    storageKey = generateImageStorageKey(jobId, index);

    console.log(`   Uploading image ${index} to storage...`);
    console.log(`   Storage key: ${storageKey}`);

    const uploadResult = await withTimeout(
      async () => {
        return await withRetry(
          async () => {
            return await uploadToR2({
              buffer: imageBuffer,
              key: storageKey,
              contentType: mimeType || "image/png",
              metadata: { jobId, index: String(index) },
            });
          },
          { maxRetries: 3, retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"] }
        );
      },
      JOB_TIMEOUT.STORAGE,
      "Image upload"
    );

    uploadSucceeded = true;
    console.log(`   ✅ Image uploaded: ${get(uploadResult, "publicUrl")}`);

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
      { maxRetries: 3, retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"] }
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
    if (uploadSucceeded && storageKey) {
      console.error(`   ⚠️ Image uploaded but DB record failed. Cleaning up orphaned image...`);
      await cleanupOrphanedImages([storageKey]);
    }

    console.error(`❌ Failed to store image ${index} for job ${jobId}:`, get(error, "message"));
    if (error instanceof JobError) throw error;

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
 * @param {Object} generationParams - Generation parameters used (for metadata)
 * @returns {Promise<Array>} Array of created image records
 * @throws {Error} If any image storage fails
 */
export const storeJobImages = async (
  jobId,
  generationResult,
  generationParams = {}
) => {
  validateRequired(jobId, "jobId");
  if (isNil(generationResult)) throw new Error("generationResult is required");

  const imagesList = get(generationResult, "images", []);
  if (isEmpty(imagesList)) throw new Error("No images found in generation result");

  console.log(`📦 Storing ${imagesList.length} generated images...`);

  const userParams = {
    numberOfImages: get(generationParams, "numberOfImages"),
    aspectRatio: get(generationParams, "aspectRatio"),
  };
  const seed = get(generationParams, "seed");
  if (!isNil(seed)) userParams.seed = seed;

  const storedImages = [];
  const errors = [];

  for (const image of imagesList) {
    try {
      const storedImage = await storeGeneratedImage({
        jobId,
        imageData: get(image, "imageData"),
        mimeType: get(image, "mimeType", "image/png"),
        index: get(image, "index", 0),
        metadata: { generationParams: userParams },
      });
      storedImages.push(storedImage);
    } catch (error) {
      const index = get(image, "index", 0);
      console.error(`Failed to store image ${index}:`, get(error, "message"));
      errors.push({ index, error: get(error, "message") });
    }
  }

  if (!isEmpty(errors)) {
    const errorMessage = `Failed to store ${errors.length} of ${imagesList.length} images`;
    console.error(`❌ ${errorMessage}`);
    if (isEmpty(storedImages)) {
      throw new Error(`${errorMessage}: All image uploads failed`);
    }
    console.warn(`⚠️ ${errorMessage}, but ${storedImages.length} succeeded`);
  }

  console.log(`✅ Successfully stored ${storedImages.length} images for job ${jobId}`);
  return storedImages;
};

/**
 * Get all images for a specific job
 * @param {string} jobId - UUID of the job
 * @returns {Promise<Array>} Array of image objects (empty array if none found)
 * @throws {JobError} If validation fails or database operation fails
 */
export const getImagesByJobId = async (jobId) => {
  validateRequired(jobId, "jobId");
  return executeDbOperation(
    async () => {
      return await db
        .select()
        .from(images)
        .where(eq(images.jobId, jobId))
        .orderBy(images.createdAt);
    },
    `fetch images for job ${jobId}`,
    { jobId }
  );
};

/**
 * Get a job by ID with its images
 * @param {string} jobId - UUID of the job
 * @returns {Promise<Object|null>} Job object with images array or null if not found
 * @throws {JobError} If validation fails or database operation fails
 */
export const getJobWithImages = async (jobId) => {
  validateRequired(jobId, "jobId");
  
  const job = await getJobById(jobId);
  if (isNil(job)) return null;
  
  const imagesList = await getImagesByJobId(jobId);
  return { ...job, images: imagesList };
};


/**
 * Get all jobs for a specific thread
 * @param {string} threadId - UUID of the thread
 * @returns {Promise<Array>} Array of job objects (empty array if none found)
 * @throws {JobError} If validation fails or database operation fails
 */
export const getJobsByThread = async (threadId) => {
  validateRequired(threadId, "threadId");
  return executeDbOperation(
    async () => {
      return await db
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
    },
    `fetch jobs for thread ${threadId}`,
    { threadId }
  );
};

/**
 * Process a job - orchestrates the full job lifecycle
 * @param {string} jobId - UUID of the job to process
 * @param {string} threadId - UUID of the thread (for creating assistant message)
 * @returns {Promise<Object>} Object containing job and generation result
 * @throws {Error} If job not found or processing fails
 */
export const processJob = async (jobId, threadId) => {
  validateRequired(jobId, "jobId");
  validateRequired(threadId, "threadId");

  console.log(`🔄 Starting job processing: ${jobId} for thread: ${threadId}`);

  let messageId;

  try {
    const job = await getJobById(jobId);
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

    await updateJobStatus(jobId, JOB_STATUS.PROCESSING);
    await updateUserMessageStatus(messageId, MESSAGE_STATUS.PROCESSING);

    try {
      const { result: generationResult, generationParams } = await executeImageGeneration(
        get(job, "parameters", {}),
        jobId
      );

      let storedImages;
      try {
        storedImages = await storeJobImages(jobId, generationResult, generationParams);
        console.log(`✅ Stored ${storedImages.length} images successfully`);
      } catch (storageError) {
        return await handleJobFailure(jobId, threadId, messageId, storageError, "storage");
      }

      return await handleJobSuccess(jobId, threadId, messageId, generationResult, storedImages);
    } catch (generationError) {
      return await handleJobFailure(jobId, threadId, messageId, generationError, "generation");
    }
  } catch (error) {
    console.error(`❌ Job processing failed for ${jobId}:`, get(error, "message"));

    try {
      await updateJobStatus(jobId, JOB_STATUS.FAILED);
      const failureResult = createFailureResult(
        { id: jobId, status: JOB_STATUS.FAILED },
        {
          code: get(error, "code", JOB_ERROR_CODE.UNKNOWN_ERROR),
          message: get(error, "message", "Job processing failed"),
          statusCode: get(error, "statusCode", 500),
          context: get(error, "context"),
        }
      );

      try {
        await createAssistantMessageWithJobResult(jobId, threadId, failureResult);
      } catch (messageCreateError) {
        console.error(`⚠️ Failed to create assistant message after job failure:`, get(messageCreateError, "message"));
      }
    } catch (updateError) {
      console.error(`⚠️ Could not update job status to failed:`, get(updateError, "message"));
    }

    if (error instanceof JobError) throw error;
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
  getJobWithImages,
  getJobsByThread,
  getImagesByJobId,
  storeGeneratedImage,
  storeJobImages,
  processJob,
};
