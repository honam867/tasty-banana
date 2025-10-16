import lodash from "lodash";
const { get, isEmpty, isNil } = lodash;

import { db } from "../db/drizzle.js";
import { providers } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Default Gemini provider configuration
 * Used when creating the provider if it doesn't exist
 */
const GEMINI_PROVIDER_NAME = "gemini-2.5-flash";
const GEMINI_DEFAULT_CONFIG = {
  model: get(process.env, "IMAGE_GEN_MODEL", "imagen-3.0-generate-001"),
  endpoint: get(process.env, "VERTEX_AI_LOCATION", "us-central1"),
  projectId: get(process.env, "GOOGLE_CLOUD_PROJECT", ""),
  description: "Google Gemini 2.5 Flash - Fast and efficient image generation powered by Vertex AI",
  capabilities: ["text2img"],
  maxRetries: 3,
  timeoutMs: 30000,
};

/**
 * Get provider by name
 * @param {string} name - Provider name
 * @returns {Promise<Object|null>} Provider object or null if not found
 */
export const getProviderByName = async (name) => {
  if (isNil(name) || isEmpty(name)) {
    return null;
  }

  try {
    const result = await db
      .select()
      .from(providers)
      .where(eq(providers.name, name))
      .limit(1);

    if (isEmpty(result)) {
      return null;
    }

    return get(result, "[0]");
  } catch (error) {
    console.error(`Error fetching provider by name "${name}":`, get(error, "message"));
    throw error;
  }
};

/**
 * Get the default Gemini provider
 * Creates the provider if it doesn't exist (idempotent)
 * @returns {Promise<Object>} The Gemini provider record
 */
export const getDefaultProvider = async () => {
  try {
    // First, try to find the existing provider
    const existingProvider = await getProviderByName(GEMINI_PROVIDER_NAME);

    // If provider exists, return it
    if (!isNil(existingProvider)) {
      return existingProvider;
    }

    // Provider doesn't exist, create it
    console.log(`Creating default Gemini provider: ${GEMINI_PROVIDER_NAME}`);
    
    const insertedProvider = await db
      .insert(providers)
      .values({
        name: GEMINI_PROVIDER_NAME,
        config: GEMINI_DEFAULT_CONFIG,
      })
      .returning();

    const provider = get(insertedProvider, "[0]");

    if (isNil(provider)) {
      throw new Error("Failed to create Gemini provider");
    }

    console.log(`✅ Created Gemini provider with ID: ${get(provider, "id")}`);
    
    return provider;
  } catch (error) {
    // If error is due to unique constraint violation (race condition),
    // try fetching again
    const errorMessage = get(error, "message", "");
    if (errorMessage.includes("unique") || errorMessage.includes("duplicate")) {
      console.log("Provider was created by another process, fetching...");
      const provider = await getProviderByName(GEMINI_PROVIDER_NAME);
      if (!isNil(provider)) {
        return provider;
      }
    }

    console.error("Error getting/creating default provider:", get(error, "message"));
    throw error;
  }
};

/**
 * Create a new provider
 * @param {Object} providerData - Provider data (name and config)
 * @returns {Promise<Object>} Created provider object
 */
export const createProvider = async (providerData) => {
  const name = get(providerData, "name");
  const config = get(providerData, "config");

  if (isNil(name) || isEmpty(name)) {
    throw new Error("Provider name is required");
  }

  try {
    const result = await db
      .insert(providers)
      .values({
        name,
        config: config || {},
      })
      .returning();

    return get(result, "[0]");
  } catch (error) {
    console.error(`Error creating provider "${name}":`, get(error, "message"));
    throw error;
  }
};

/**
 * Get all providers
 * @returns {Promise<Array>} Array of provider objects
 */
export const getAllProviders = async () => {
  try {
    const result = await db.select().from(providers);
    return result;
  } catch (error) {
    console.error("Error fetching all providers:", get(error, "message"));
    throw error;
  }
};

export default {
  getProviderByName,
  getDefaultProvider,
  createProvider,
  getAllProviders,
};

