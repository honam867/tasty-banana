import { JOB_ERROR_CODE } from "./constant.js";

/**
 * Custom error class for job-related errors
 * Provides consistent error structure with error codes, HTTP status mapping, and context
 * 
 * @class JobError
 * @extends Error
 * 
 * @example
 * throw new JobError(
 *   "Job not found",
 *   JOB_ERROR_CODE.JOB_NOT_FOUND,
 *   404,
 *   { jobId: "123" }
 * );
 * 
 * @example
 * // Simple usage with defaults
 * throw new JobError("Operation failed");
 */
class JobError extends Error {
  /**
   * Create a JobError
   * @param {string} message - Human-readable error message
   * @param {string} [code=JOB_ERROR_CODE.UNKNOWN_ERROR] - Error code for classification
   * @param {number} [statusCode=500] - HTTP status code
   * @param {Object} [context={}] - Additional context about the error (jobId, params, etc.)
   */
  constructor(
    message,
    code = JOB_ERROR_CODE.UNKNOWN_ERROR,
    statusCode = 500,
    context = {}
  ) {
    super(message);
    this.name = "JobError";
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, JobError);
    }
  }

  /**
   * Convert error to JSON format suitable for API responses
   * @returns {Object} JSON representation of the error
   */
  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        context: this.context,
        timestamp: this.timestamp,
      },
    };
  }

  /**
   * Convert error to a plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}

export default JobError;

