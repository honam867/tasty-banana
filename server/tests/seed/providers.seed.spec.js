import lodash from "lodash";
const { get } = lodash;

import { db } from "../../src/db/drizzle.js";
import { providers } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";
import { seedGeminiProvider, getGeminiProvider } from "../../src/seed/providers.seed.js";

describe("Providers Seed", () => {
  const geminiProviderName = "gemini-2.5-flash";

  // Clean up after tests
  afterAll(async () => {
    // Delete test provider if it was created
    await db.delete(providers).where(eq(providers.name, geminiProviderName));
  });

  describe("seedGeminiProvider", () => {
    beforeEach(async () => {
      // Clean up before each test
      await db.delete(providers).where(eq(providers.name, geminiProviderName));
    });

    it("should create Gemini provider when it doesn't exist", async () => {
      const result = await seedGeminiProvider();

      expect(get(result, "success")).toBe(true);
      expect(get(result, "action")).toBe("created");
      expect(get(result, "provider")).toBeDefined();
      expect(get(result, "provider.name")).toBe(geminiProviderName);
      expect(get(result, "provider.id")).toBeDefined();
      expect(get(result, "provider.config")).toBeDefined();
      expect(get(result, "provider.config.model")).toBeDefined();
      expect(get(result, "provider.config.endpoint")).toBeDefined();
      expect(get(result, "provider.config.description")).toContain("Gemini");
    });

    it("should skip creation if Gemini provider already exists", async () => {
      // First seed
      await seedGeminiProvider();

      // Second seed attempt
      const result = await seedGeminiProvider();

      expect(get(result, "success")).toBe(true);
      expect(get(result, "action")).toBe("skipped");
      expect(get(result, "provider")).toBeDefined();
      expect(get(result, "provider.name")).toBe(geminiProviderName);
    });

    it("should create provider with correct config structure", async () => {
      const result = await seedGeminiProvider();
      const config = get(result, "provider.config");

      expect(get(config, "model")).toBeDefined();
      expect(get(config, "endpoint")).toBeDefined();
      expect(get(config, "description")).toBeDefined();
      expect(get(config, "capabilities")).toEqual(["text2img"]);
      expect(get(config, "maxRetries")).toBe(3);
      expect(get(config, "timeoutMs")).toBe(30000);
    });

    it("should use environment variables for configuration", async () => {
      // Note: This test assumes environment variables are set
      const result = await seedGeminiProvider();
      const config = get(result, "provider.config");

      // Check that config uses environment variables or defaults
      expect(get(config, "model")).toBeTruthy();
      expect(get(config, "endpoint")).toBeTruthy();
    });
  });

  describe("getGeminiProvider", () => {
    beforeEach(async () => {
      // Clean up and seed before each test
      await db.delete(providers).where(eq(providers.name, geminiProviderName));
      await seedGeminiProvider();
    });

    it("should retrieve the Gemini provider from database", async () => {
      const provider = await getGeminiProvider();

      expect(provider).toBeDefined();
      expect(get(provider, "name")).toBe(geminiProviderName);
      expect(get(provider, "id")).toBeDefined();
      expect(get(provider, "config")).toBeDefined();
    });

    it("should return null when provider doesn't exist", async () => {
      // Delete the provider
      await db.delete(providers).where(eq(providers.name, geminiProviderName));

      const provider = await getGeminiProvider();

      expect(provider).toBeNull();
    });

    it("should return provider with all required fields", async () => {
      const provider = await getGeminiProvider();

      expect(get(provider, "id")).toBeDefined();
      expect(get(provider, "name")).toBe(geminiProviderName);
      expect(get(provider, "config")).toBeDefined();
      expect(get(provider, "createdAt")).toBeDefined();
      expect(get(provider, "updatedAt")).toBeDefined();
    });
  });

  describe("Provider Database Integration", () => {
    beforeEach(async () => {
      await db.delete(providers).where(eq(providers.name, geminiProviderName));
    });

    it("should persist provider data correctly", async () => {
      // Seed the provider
      const seedResult = await seedGeminiProvider();
      const seededId = get(seedResult, "provider.id");

      // Fetch directly from database
      const dbProvider = await db
        .select()
        .from(providers)
        .where(eq(providers.id, seededId))
        .limit(1);

      const provider = get(dbProvider, "[0]");

      expect(provider).toBeDefined();
      expect(get(provider, "name")).toBe(geminiProviderName);
      expect(get(provider, "config.model")).toBeDefined();
    });

    it("should enforce unique name constraint", async () => {
      // Seed the provider
      await seedGeminiProvider();

      // Try to insert duplicate directly
      await expect(async () => {
        await db.insert(providers).values({
          name: geminiProviderName,
          config: { test: "data" },
        });
      }).rejects.toThrow();
    });

    it("should store JSONB config properly", async () => {
      const result = await seedGeminiProvider();
      const providerId = get(result, "provider.id");

      // Fetch and verify JSONB structure
      const dbProvider = await db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      const config = get(dbProvider, "[0].config");

      // Verify JSONB is properly parsed
      expect(typeof config).toBe("object");
      expect(Array.isArray(get(config, "capabilities"))).toBe(true);
      expect(get(config, "capabilities")).toContain("text2img");
    });
  });
});

