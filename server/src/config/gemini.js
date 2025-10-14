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
  const credentialsPath = get(process.env, "GOOGLE_APPLICATION_CREDENTIALS", "");
  const projectId = get(process.env, "GOOGLE_CLOUD_PROJECT", "");
  const location = get(process.env, "VERTEX_AI_LOCATION", "us-central1");
  const modelId = get(process.env, "IMAGE_GEN_MODEL", "imagen-3.0-generate-001");
  const maxRpm = parseInt(get(process.env, "IMAGE_GEN_MAX_RPM", "60"), 10);

  if (isEmpty(credentialsPath)) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not configured in environment variables");
  }

  if (isEmpty(projectId)) {
    throw new Error("GOOGLE_CLOUD_PROJECT is not configured in environment variables");
  }

  return {
    credentialsPath,
    projectId,
    location,
    modelId,
    maxRpm,
    endpoint: `${location}-aiplatform.googleapis.com`
  };
};

/**
 * Create and configure GoogleAuth client for Vertex AI
 * @returns {Promise<GoogleAuth>} Configured GoogleAuth instance
 */
const createGeminiAuthClient = async () => {
  const config = getGeminiConfig();

  const auth = new GoogleAuth({
    keyFilename: config.credentialsPath,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]
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

/**
 * Test Gemini authentication by attempting to get credentials
 * This verifies that the service account JSON is valid and accessible
 * @returns {Promise<Object>} Authentication test result
 */
export const testGeminiAuth = async () => {
  try {
    const auth = await getGeminiAuthClient();
    const client = await auth.getClient();
    const projectId = await auth.getProjectId();
    
    // Verify we can get an access token
    const accessToken = await client.getAccessToken();
    
    if (isEmpty(get(accessToken, "token"))) {
      throw new Error("Failed to obtain access token");
    }

    const config = getGeminiConfig();
    
    console.log(`✅ Gemini authentication successful`);
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Location: ${config.location}`);
    console.log(`   Model: ${config.modelId}`);
    
    return {
      success: true,
      projectId,
      location: config.location,
      model: config.modelId,
      hasToken: true
    };
  } catch (error) {
    console.error("❌ Gemini authentication failed:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

export default {
  getGeminiAuthClient,
  getGeminiConfiguration,
  getModelResourceName,
  testGeminiAuth,
  resetGeminiAuthClient
};

