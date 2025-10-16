import lodash from "lodash";
const { get, isEmpty } = lodash;

import { db } from "../../src/db/drizzle.js";
import { providers } from "../../src/db/schema.js";
import { eq } from "drizzle-orm";
import {
  getProviderByName,
  getDefaultProvider,
  createProvider,
  getAllProviders,
} from "../../src/services/providers.service.js";

describe("Providers Service", () => {
  const geminiProviderName = "gemini-2.5-flash";
  const testProviderName = "test-provider";

  // Clean up after all tests
  afterAll(async () => {
    // Delete test providers
    await db.delete(providers).where(eq(providers.name, geminiProviderName));
    await db.delete(providers).where(eq(providers.name, testProviderName));
  });

  describe("getProviderByName", () => {
    beforeEach(async () => {
      // Clean up before each test
      await db.delete(providers).where(eq(providers.name, testProviderName));
    });

    it("should return provider when it exists", async () => {
      // Create a test provider
      await db.insert(providers).values({
        name: testProviderName,
        config: { test: "config" },
      });

      const provider = await getProviderByName(testProviderName);

      expect(provider).toBeDefined();
      expect(get(provider, "name")).toBe(testProviderName);
      expect(get(provider, "id")).toBeDefined();
      expect(get(provider, "config.test")).toBe("config");
    });

    it("should return null when provider doesn't exist", async () => {
      const provider = await getProviderByName("non-existent-provider");

      expect(provider).toBeNull();
    });

    it("should return null when name is null", async () => {
      const provider = await getProviderByName(null);

      expect(provider).toBeNull();
    });

    it("should return null when name is empty string", async () => {
      const provider = await getProviderByName("");

      expect(provider).toBeNull();
    });

    it("should return provider with all database fields", async () => {
      // Create a test provider
      await db.insert(providers).values({
        name: testProviderName,
        config: { model: "test-model" },
      });

      const provider = await getProviderByName(testProviderName);

      expect(get(provider, "id")).toBeDefined();
      expect(get(provider, "name")).toBe(testProviderName);
      expect(get(provider, "config")).toBeDefined();
      expect(get(provider, "createdAt")).toBeDefined();
      expect(get(provider, "updatedAt")).toBeDefined();
    });
  });

  describe("getDefaultProvider", () => {
    beforeEach(async () => {
      // Clean up Gemini provider before each test
      await db.delete(providers).where(eq(providers.name, geminiProviderName));
    });

    it("should create Gemini provider when it doesn't exist", async () => {
      const provider = await getDefaultProvider();

      expect(provider).toBeDefined();
      expect(get(provider, "name")).toBe(geminiProviderName);
      expect(get(provider, "id")).toBeDefined();
      expect(get(provider, "config")).toBeDefined();
      expect(get(provider, "config.model")).toBeDefined();
      expect(get(provider, "config.endpoint")).toBeDefined();
      expect(get(provider, "config.capabilities")).toEqual(["text2img"]);
    });

    it("should return existing Gemini provider without creating a duplicate", async () => {
      // First call - creates provider
      const firstProvider = await getDefaultProvider();
      const firstId = get(firstProvider, "id");

      // Second call - should return existing provider
      const secondProvider = await getDefaultProvider();
      const secondId = get(secondProvider, "id");

      expect(firstId).toBe(secondId);
      expect(get(secondProvider, "name")).toBe(geminiProviderName);
    });

    it("should be idempotent - running multiple times creates only one provider", async () => {
      // Call multiple times
      await getDefaultProvider();
      await getDefaultProvider();
      await getDefaultProvider();

      // Verify only one provider exists
      const allProviders = await db
        .select()
        .from(providers)
        .where(eq(providers.name, geminiProviderName));

      expect(allProviders).toHaveLength(1);
      expect(get(allProviders, "[0].name")).toBe(geminiProviderName);
    });

    it("should create provider with correct default configuration", async () => {
      const provider = await getDefaultProvider();
      const config = get(provider, "config");

      expect(get(config, "model")).toBeDefined();
      expect(get(config, "endpoint")).toBeDefined();
      expect(get(config, "description")).toContain("Gemini");
      expect(get(config, "capabilities")).toEqual(["text2img"]);
      expect(get(config, "maxRetries")).toBe(3);
      expect(get(config, "timeoutMs")).toBe(30000);
    });

    it("should handle concurrent calls gracefully (race condition)", async () => {
      // Simulate concurrent calls
      const promises = [
        getDefaultProvider(),
        getDefaultProvider(),
        getDefaultProvider(),
      ];

      const results = await Promise.all(promises);

      // All should return a provider
      results.forEach((provider) => {
        expect(provider).toBeDefined();
        expect(get(provider, "name")).toBe(geminiProviderName);
      });

      // Verify only one provider was created
      const allProviders = await db
        .select()
        .from(providers)
        .where(eq(providers.name, geminiProviderName));

      expect(allProviders).toHaveLength(1);
    });
  });

  describe("createProvider", () => {
    beforeEach(async () => {
      // Clean up test provider before each test
      await db.delete(providers).where(eq(providers.name, testProviderName));
    });

    it("should create a new provider successfully", async () => {
      const providerData = {
        name: testProviderName,
        config: {
          model: "test-model",
          endpoint: "test-endpoint",
        },
      };

      const provider = await createProvider(providerData);

      expect(provider).toBeDefined();
      expect(get(provider, "name")).toBe(testProviderName);
      expect(get(provider, "id")).toBeDefined();
      expect(get(provider, "config.model")).toBe("test-model");
      expect(get(provider, "config.endpoint")).toBe("test-endpoint");
    });

    it("should create provider with empty config when config not provided", async () => {
      const providerData = {
        name: testProviderName,
      };

      const provider = await createProvider(providerData);

      expect(provider).toBeDefined();
      expect(get(provider, "name")).toBe(testProviderName);
      expect(get(provider, "config")).toEqual({});
    });

    it("should throw error when name is missing", async () => {
      const providerData = {
        config: { test: "config" },
      };

      await expect(createProvider(providerData)).rejects.toThrow(
        "Provider name is required"
      );
    });

    it("should throw error when name is empty string", async () => {
      const providerData = {
        name: "",
        config: { test: "config" },
      };

      await expect(createProvider(providerData)).rejects.toThrow(
        "Provider name is required"
      );
    });

    it("should persist provider to database", async () => {
      const providerData = {
        name: testProviderName,
        config: { key: "value" },
      };

      const provider = await createProvider(providerData);
      const providerId = get(provider, "id");

      // Verify in database
      const dbProvider = await db
        .select()
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      expect(isEmpty(dbProvider)).toBe(false);
      expect(get(dbProvider, "[0].name")).toBe(testProviderName);
      expect(get(dbProvider, "[0].config.key")).toBe("value");
    });
  });

  describe("getAllProviders", () => {
    beforeEach(async () => {
      // Clean up all test providers
      await db.delete(providers).where(eq(providers.name, geminiProviderName));
      await db.delete(providers).where(eq(providers.name, testProviderName));
      await db.delete(providers).where(eq(providers.name, "another-test-provider"));
    });

    it("should return empty array when no providers exist", async () => {
      const allProviders = await getAllProviders();

      expect(Array.isArray(allProviders)).toBe(true);
      expect(allProviders).toHaveLength(0);
    });

    it("should return all providers", async () => {
      // Create multiple providers
      await db.insert(providers).values([
        { name: testProviderName, config: { test: "1" } },
        { name: "another-test-provider", config: { test: "2" } },
      ]);

      const allProviders = await getAllProviders();

      expect(Array.isArray(allProviders)).toBe(true);
      expect(allProviders.length).toBeGreaterThanOrEqual(2);

      // Verify both providers are in the result
      const names = allProviders.map((p) => get(p, "name"));
      expect(names).toContain(testProviderName);
      expect(names).toContain("another-test-provider");
    });

    it("should return providers with all fields", async () => {
      // Create a provider
      await db.insert(providers).values({
        name: testProviderName,
        config: { model: "test" },
      });

      const allProviders = await getAllProviders();
      const provider = allProviders.find((p) => get(p, "name") === testProviderName);

      expect(provider).toBeDefined();
      expect(get(provider, "id")).toBeDefined();
      expect(get(provider, "name")).toBe(testProviderName);
      expect(get(provider, "config")).toBeDefined();
      expect(get(provider, "createdAt")).toBeDefined();
      expect(get(provider, "updatedAt")).toBeDefined();
    });
  });

  describe("Integration Tests", () => {
    beforeEach(async () => {
      // Clean up
      await db.delete(providers).where(eq(providers.name, geminiProviderName));
      await db.delete(providers).where(eq(providers.name, testProviderName));
    });

    it("should work correctly with getDefaultProvider and getProviderByName together", async () => {
      // Get default provider (creates it)
      const defaultProvider = await getDefaultProvider();
      const defaultId = get(defaultProvider, "id");

      // Fetch by name
      const fetchedProvider = await getProviderByName(geminiProviderName);
      const fetchedId = get(fetchedProvider, "id");

      expect(defaultId).toBe(fetchedId);
      expect(get(fetchedProvider, "name")).toBe(geminiProviderName);
    });

    it("should handle mixed provider operations", async () => {
      // Create default provider
      await getDefaultProvider();

      // Create custom provider
      await createProvider({
        name: testProviderName,
        config: { custom: true },
      });

      // Get all providers
      const allProviders = await getAllProviders();

      expect(allProviders.length).toBeGreaterThanOrEqual(2);

      // Verify both exist
      const geminiProvider = await getProviderByName(geminiProviderName);
      const testProvider = await getProviderByName(testProviderName);

      expect(geminiProvider).toBeDefined();
      expect(testProvider).toBeDefined();
      expect(get(testProvider, "config.custom")).toBe(true);
    });
  });
});

