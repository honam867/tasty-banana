import lodash from "lodash";
const { get } = lodash;

import { JOB_RETRY_CONFIG, JOB_ERROR_CODE } from "./constant.js";
import JobError from "./JobError.js";

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute operation with exponential backoff retry logic
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Retry configuration
 * @returns {Promise<any>} Operation result
 * @throws {Error} If all retries fail
 */
export const withRetry = async (operation, options = {}) => {
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
export const withTimeout = async (
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
