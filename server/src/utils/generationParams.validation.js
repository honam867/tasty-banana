import lodash from "lodash";
const { isNil, isBoolean, isInteger, isNumber } = lodash;

import { IMAGE_GENERATION_CONSTRAINTS } from "./constant.js";

/**
 * Allowed user-customizable generation parameter keys
 */
const ALLOWED_PARAMS = ["numberOfImages", "aspectRatio", "addWatermark", "seed"];

/**
 * Validate generation parameters from user request
 * Only validates user-customizable parameters: numberOfImages, aspectRatio, addWatermark, seed
 * 
 * @param {Object} params - Generation parameters to validate
 * @param {number} [params.numberOfImages] - Number of images (1-8)
 * @param {string} [params.aspectRatio] - Aspect ratio ("1:1" | "9:16" | "16:9" | "4:3" | "3:4")
 * @param {boolean} [params.addWatermark] - Whether to add watermark
 * @param {number} [params.seed] - Optional seed for reproducibility
 * 
 * @returns {Object} Validation result with:
 *   - isValid: boolean - Whether all validations passed
 *   - errors: string[] - Array of error messages
 *   - sanitized: Object - Validated and sanitized parameters
 * 
 * @example
 * const result = validateGenerationParams({
 *   numberOfImages: 2,
 *   aspectRatio: "16:9",
 *   addWatermark: false,
 *   seed: 12345
 * });
 * // result = { isValid: true, errors: [], sanitized: { numberOfImages: 2, ... } }
 */
export const validateGenerationParams = (params) => {
  const errors = [];
  const sanitized = {};

  // If params is null/undefined, return valid with empty sanitized
  if (isNil(params)) {
    return {
      isValid: true,
      errors: [],
      sanitized: {},
    };
  }

  // Check for unsupported keys
  const providedKeys = Object.keys(params);
  const unsupportedKeys = providedKeys.filter(
    (key) => !ALLOWED_PARAMS.includes(key)
  );

  if (unsupportedKeys.length > 0) {
    errors.push(
      `Unsupported parameters: ${unsupportedKeys.join(", ")}. Allowed parameters are: ${ALLOWED_PARAMS.join(", ")}`
    );
  }

  // Validate numberOfImages
  if (!isNil(params.numberOfImages)) {
    const { numberOfImages } = params;
    
    if (!isInteger(numberOfImages)) {
      errors.push("numberOfImages must be an integer");
    } else if (
      numberOfImages < IMAGE_GENERATION_CONSTRAINTS.numberOfImages.min ||
      numberOfImages > IMAGE_GENERATION_CONSTRAINTS.numberOfImages.max
    ) {
      errors.push(
        `numberOfImages must be between ${IMAGE_GENERATION_CONSTRAINTS.numberOfImages.min} and ${IMAGE_GENERATION_CONSTRAINTS.numberOfImages.max}`
      );
    } else {
      sanitized.numberOfImages = numberOfImages;
    }
  }

  // Validate aspectRatio
  if (!isNil(params.aspectRatio)) {
    const { aspectRatio } = params;
    
    if (typeof aspectRatio !== "string") {
      errors.push("aspectRatio must be a string");
    } else if (!IMAGE_GENERATION_CONSTRAINTS.aspectRatios.includes(aspectRatio)) {
      errors.push(
        `aspectRatio must be one of: ${IMAGE_GENERATION_CONSTRAINTS.aspectRatios.join(", ")}`
      );
    } else {
      sanitized.aspectRatio = aspectRatio;
    }
  }

  // Validate addWatermark
  if (!isNil(params.addWatermark)) {
    const { addWatermark } = params;
    
    if (!isBoolean(addWatermark)) {
      errors.push("addWatermark must be a boolean");
    } else {
      sanitized.addWatermark = addWatermark;
    }
  }

  // Validate seed (optional numeric)
  if (!isNil(params.seed)) {
    const { seed } = params;
    
    if (!isNumber(seed) || !isInteger(seed)) {
      errors.push("seed must be an integer");
    } else if (seed < 0) {
      errors.push("seed must be a non-negative integer");
    } else {
      sanitized.seed = seed;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized,
  };
};

export default {
  validateGenerationParams,
};

