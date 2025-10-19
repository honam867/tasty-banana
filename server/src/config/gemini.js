import dotenv from "dotenv";
dotenv.config();

import { GoogleAuth } from "google-auth-library";
import lodash from "lodash";
const { get, isEmpty } = lodash;

/**
 * Get Gemini/Vertex AI configuration from environment variables
 * @returns {Object} Gemini configuration object
 */
const getGeminiConfig = () => {
  const projectId = get(process.env, "GOOGLE_CLOUD_PROJECT", "");
  const location = get(process.env, "VERTEX_AI_LOCATION", "us-central1");
  const modelId = get(
    process.env,
    "IMAGE_GEN_MODEL",
    "imagen-3.0-generate-001"
  );
  const maxRpm = parseInt(get(process.env, "IMAGE_GEN_MAX_RPM", "60"), 10);

  if (isEmpty(projectId)) {
    throw new Error(
      "GOOGLE_CLOUD_PROJECT is not configured in environment variables"
    );
  }

  return {
    projectId,
    location,
    modelId,
    maxRpm,
    endpoint: `${location}-aiplatform.googleapis.com`,
  };
};

/**
 * Create and configure GoogleAuth client for Vertex AI
 * @returns {Promise<GoogleAuth>} Configured GoogleAuth instance
 */
const createGeminiAuthClient = async () => {
  const keys = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "");
  keys.private_key = keys.private_key.replace(/\\n/g, "\n");

  const auth = new GoogleAuth({
    credentials: keys,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  return auth;
};

// Cache the auth client instance
let authClient = null;

/**
 * Get GoogleAuth client instance (singleton)
 * @returns {Promise<GoogleAuth>} GoogleAuth client instance
 */
export const getGeminiAuthClient = async () => {
  if (!authClient) {
    authClient = await createGeminiAuthClient();
  }
  return authClient;
};

/**
 * Reset Gemini auth client instance (for testing purposes)
 */
export const resetGeminiAuthClient = () => {
  authClient = null;
};

/**
 * Get Gemini configuration
 * @returns {Object} Configuration object
 */
export const getGeminiConfiguration = () => {
  return getGeminiConfig();
};

/**
 * Get the model resource name for Vertex AI API calls
 * @returns {string} Full model resource name
 */
export const getModelResourceName = () => {
  const config = getGeminiConfig();
  return `projects/${config.projectId}/locations/${config.location}/publishers/google/models/${config.modelId}`;
};


export default {
  getGeminiAuthClient,
  getGeminiConfiguration,
  getModelResourceName,
  resetGeminiAuthClient,
};
