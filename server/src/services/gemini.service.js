import dotenv from "dotenv";
dotenv.config();

import { PredictionServiceClient, helpers } from "@google-cloud/aiplatform";
const { toValue } = helpers;

import lodash from "lodash";
const { get, isEmpty, isNil } = lodash;

import {
  getGeminiAuthClient,
  getGeminiConfiguration,
  getModelResourceName,
} from "../config/gemini.js";

// Cache the prediction client instance
let predictionClient = null;

/**
 * Initialize Gemini/Vertex AI Prediction Service Client
 * @returns {Promise<PredictionServiceClient>} Initialized prediction client
 * @throws {Error} If required environment variables are missing
 */
export const initGeminiClient = async () => {
  try {
    // Validate configuration
    const config = getGeminiConfiguration();

    if (isEmpty(config.credentialsPath)) {
      throw new Error(
        "GOOGLE_APPLICATION_CREDENTIALS is required for Gemini client initialization"
      );
    }

    if (isEmpty(config.projectId)) {
      throw new Error(
        "GOOGLE_CLOUD_PROJECT is required for Gemini client initialization"
      );
    }

    // Get auth client first to ensure credentials are valid
    const auth = await getGeminiAuthClient();
    await auth.getClient(); // Verify credentials work

    // Initialize prediction client with config
    const client = new PredictionServiceClient({
      apiEndpoint: config.endpoint,
      keyFilename: config.credentialsPath,
    });

    console.log(`✅ Gemini client initialized successfully`);
    console.log(`   Project: ${config.projectId}`);
    console.log(`   Location: ${config.location}`);
    console.log(`   Model: ${config.modelId}`);

    return client;
  } catch (error) {
    console.error("❌ Failed to initialize Gemini client:", error.message);
    throw new Error(`Gemini client initialization failed: ${error.message}`);
  }
};

/**
 * Reset Gemini client instance (primarily for testing)
 */
export const resetGeminiClient = () => {
  predictionClient = null;
};

/**
 * Get authenticated Gemini client instance (singleton pattern)
 * @returns {Promise<PredictionServiceClient>} Authenticated prediction client
 * @throws {Error} If client initialization fails
 */
export const getAuthenticatedClient = async () => {
  if (!predictionClient) {
    predictionClient = await initGeminiClient();
  }
  return predictionClient;
};

/**
 * Build image generation request for Vertex AI Imagen API
 * @param {Object} params - Request parameters
 * @param {string} params.prompt - Text prompt for image generation
 * @param {number} [params.numberOfImages=1] - Number of images to generate (1-8)
 * @param {string} [params.aspectRatio='1:1'] - Aspect ratio (1:1, 9:16, 16:9, 4:3, 3:4)
 * @param {number} [params.seed] - Random seed for reproducibility
 * @param {string} [params.language='auto'] - Language code for prompt
 * @param {boolean} [params.addWatermark=true] - Whether to add watermark
 * @returns {Object} Formatted request object for Vertex AI
 * @throws {Error} If required parameters are missing or invalid
 */
export const buildGenerateRequest = (params) => {
  const prompt = get(params, "prompt");

  if (isEmpty(prompt)) {
    throw new Error("Prompt is required for image generation");
  }

  // Validate and set defaults
  const numberOfImages = get(params, "numberOfImages", 1);
  if (numberOfImages < 1 || numberOfImages > 8) {
    throw new Error("numberOfImages must be between 1 and 8");
  }

  const aspectRatio = get(params, "aspectRatio", "1:1");
  const validAspectRatios = ["1:1", "9:16", "16:9", "4:3", "3:4"];
  if (!validAspectRatios.includes(aspectRatio)) {
    throw new Error(
      `aspectRatio must be one of: ${validAspectRatios.join(", ")}`
    );
  }

  const seed = get(params, "seed");
  const addWatermark = get(params, "addWatermark", true);

  // Build request - instances only contains prompt
  const instances = [{ prompt }];

  // Build parameters - seed goes here, not in instances
  const requestParams = {
    sampleCount: numberOfImages,
    aspectRatio,
    addWatermark,
  };

  // Add optional seed if provided
  if (!isNil(seed)) {
    requestParams.seed = parseInt(seed, 10);
  }

  const request = {
    instances,
    parameters: requestParams,
  };

  return request;
};

/**
 * Parse image generation response from Vertex AI
 * @param {Object} response - Raw response from Vertex AI predict call
 * @returns {Object} Parsed response with image data
 * @throws {Error} If response is invalid or missing data
 */
export const parseImageResponse = (response) => {
  if (isEmpty(response)) {
    throw new Error("Empty response received from Vertex AI");
  }

  // Response.predictions is the correct path
  const predictions = get(response, "predictions");

  if (isEmpty(predictions)) {
    throw new Error("No predictions found in Vertex AI response");
  }

  // Extract image data from predictions
  // NOTE: Vertex AI returns protobuf Struct format: structValue.fields.{fieldName}.{valueType}Value
  const images = predictions
    .map((prediction, index) => {
      // Handle protobuf Struct response format
      const bytesBase64Encoded =
        get(prediction, "structValue.fields.bytesBase64Encoded.stringValue") ||
        get(prediction, "bytesBase64Encoded"); // Fallback to direct access

      const mimeType =
        get(prediction, "structValue.fields.mimeType.stringValue") ||
        get(prediction, "mimeType", "image/png");

      if (isEmpty(bytesBase64Encoded)) {
        console.warn(`⚠️ Image ${index} missing base64 data in prediction`);
        return null;
      }

      return {
        imageData: bytesBase64Encoded,
        mimeType,
        index,
      };
    })
    .filter((img) => !isNil(img)); // Remove any null entries

  if (isEmpty(images)) {
    throw new Error("No valid images found in response");
  }

  return {
    images,
    count: images.length,
  };
};

/**
 * Map Vertex AI errors to standardized error format
 * @param {Error} error - Error from Vertex AI API
 * @returns {Object} Mapped error object
 */
export const mapGeminiError = (error) => {
  const errorMessage = get(error, "message", "Unknown error");
  const errorCode = get(error, "code");
  const statusCode = get(error, "status");
  const errorDetails = get(error, "details", []);

  // Rate limit errors (429)
  if (
    statusCode === 429 ||
    errorCode === 8 ||
    errorMessage.includes("quota") ||
    errorMessage.includes("rate limit")
  ) {
    return {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Image generation rate limit exceeded. Please try again later.",
      status: 429,
      originalError: errorMessage,
      details: errorDetails,
    };
  }

  // Bad request errors (400)
  if (
    statusCode === 400 ||
    errorCode === 3 ||
    errorMessage.includes("invalid") ||
    errorMessage.includes("bad request")
  ) {
    return {
      code: "INVALID_REQUEST",
      message: "Invalid image generation request parameters.",
      status: 400,
      originalError: errorMessage,
      details: errorDetails,
    };
  }

  // Authentication errors (401/403)
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    errorCode === 7 ||
    errorCode === 16
  ) {
    return {
      code: "AUTHENTICATION_FAILED",
      message: "Authentication failed for Vertex AI service.",
      status: 401,
      originalError: errorMessage,
      details: errorDetails,
    };
  }

  // Generic error
  return {
    code: "GENERATION_FAILED",
    message: "Image generation failed due to an internal error.",
    status: 500,
    originalError: errorMessage,
    details: errorDetails,
  };
};

/**
 * Generate images using Vertex AI Imagen model
 * @param {Object} params - Image generation parameters
 * @param {string} params.prompt - Text prompt for image generation
 * @param {number} [params.numberOfImages=1] - Number of images to generate
 * @param {string} [params.aspectRatio='1:1'] - Aspect ratio
 * @param {number} [params.seed] - Random seed
 * @param {string} [params.language='auto'] - Language code
 * @param {boolean} [params.addWatermark=true] - Add watermark
 * @returns {Promise<Object>} Generated images data
 * @throws {Error} Mapped error if generation fails
 */
export const generateImage = async (params) => {
  try {
    console.log("🎨 Starting image generation...");
    console.log(`   Prompt: ${get(params, "prompt", "").substring(0, 100)}...`);

    // Get authenticated client
    const client = await getAuthenticatedClient();

    // Build request
    const request = buildGenerateRequest(params);
    const modelPath = getModelResourceName();

    // Prepare prediction request with proper protobuf encoding
    // CRITICAL: instances and parameters must be encoded using helpers.toValue()
    const predictionRequest = {
      endpoint: modelPath,
      instances: request.instances.map((instance) => toValue(instance)),
      parameters: toValue(request.parameters),
    };

    console.log(`   Model: ${modelPath}`);
    console.log(
      `   Images requested: ${get(request, "parameters.sampleCount", 1)}`
    );

    // Call Vertex AI predict
    const [response] = await client.predict(predictionRequest);

    // Parse response
    const result = parseImageResponse(response);

    console.log(`✅ Image generation successful`);
    console.log(`   Images generated: ${result.count}`);

    return result;
  } catch (error) {
    const mappedError = mapGeminiError(error);

    console.error("❌ Image generation failed:");
    console.error(`   Code: ${mappedError.code}`);
    console.error(`   Message: ${mappedError.message}`);
    console.error(`   Original: ${mappedError.originalError}`);

    throw mappedError;
  }
};

export default {
  initGeminiClient,
  getAuthenticatedClient,
  buildGenerateRequest,
  parseImageResponse,
  mapGeminiError,
  generateImage,
  resetGeminiClient,
};
