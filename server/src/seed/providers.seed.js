import lodash from "lodash";
const { get, isEmpty } = lodash;

import { db } from "../db/drizzle.js";
import { providers } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Seed default Gemini provider in the database
 * This ensures the Gemini 2.5 Flash provider exists for image generation
 */
export const seedGeminiProvider = async () => {
  try {
    console.log("⏳ Seeding Gemini provider...");

    // Define the default Gemini provider data
    const geminiProviderName = "gemini-2.5-flash";
    const geminiProviderConfig = {
      model: get(process.env, "IMAGE_GEN_MODEL", "imagen-3.0-generate-001"),
      endpoint: get(process.env, "VERTEX_AI_LOCATION", "us-central1"),
      projectId: get(process.env, "GOOGLE_CLOUD_PROJECT", ""),
      description: "Google Gemini 2.5 Flash - Fast and efficient image generation powered by Vertex AI",
      capabilities: ["text2img"],
      maxRetries: 3,
      timeoutMs: 30000,
    };

    // Check if provider already exists
    const existingProvider = await db
      .select()
      .from(providers)
      .where(eq(providers.name, geminiProviderName))
      .limit(1);

    if (!isEmpty(existingProvider)) {
      console.log(`✅ Gemini provider already exists. Skipping seed.`);
      return {
        success: true,
        action: "skipped",
        provider: get(existingProvider, "[0]"),
      };
    }

    // Insert the Gemini provider
    const insertedProvider = await db
      .insert(providers)
      .values({
        name: geminiProviderName,
        config: geminiProviderConfig,
      })
      .returning();

    const provider = get(insertedProvider, "[0]");

    console.log(`✅ Successfully seeded Gemini provider`);
    console.log(`   Provider ID: ${get(provider, "id")}`);
    console.log(`   Provider Name: ${get(provider, "name")}`);
    console.log(`   Model: ${get(provider, "config.model")}`);
    console.log(`   Endpoint: ${get(provider, "config.endpoint")}`);

    return {
      success: true,
      action: "created",
      provider,
    };
  } catch (error) {
    console.error("❌ Error seeding Gemini provider:", get(error, "message"));
    throw error;
  }
};

/**
 * Get the Gemini provider from the database
 * @returns {Promise<Object|null>} The Gemini provider record or null if not found
 */
export const getGeminiProvider = async () => {
  try {
    const result = await db
      .select()
      .from(providers)
      .where(eq(providers.name, "gemini-2.5-flash"))
      .limit(1);

    if (isEmpty(result)) {
      return null;
    }

    return get(result, "[0]");
  } catch (error) {
    console.error("❌ Error fetching Gemini provider:", get(error, "message"));
    throw error;
  }
};

export default {
  seedGeminiProvider,
  getGeminiProvider,
};

