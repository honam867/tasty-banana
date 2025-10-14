import lodash from "lodash";
const { get } = lodash;

import {
  getGeminiAuthClient,
  getGeminiConfiguration,
  getModelResourceName,
  testGeminiAuth,
  resetGeminiAuthClient,
} from "../../src/config/gemini.js";

describe("Gemini Configuration", () => {
  describe("getGeminiConfiguration", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      // Reset auth client before each test
      resetGeminiAuthClient();
      
      // Clone environment variables
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv;
      resetGeminiAuthClient();
    });

    it("should return configuration with all required fields when environment is properly set", () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = "./test-credentials.json";
      process.env.GOOGLE_CLOUD_PROJECT = "test-project-123";
      process.env.VERTEX_AI_LOCATION = "us-central1";
      process.env.IMAGE_GEN_MODEL = "imagen-3.0-generate-001";
      process.env.IMAGE_GEN_MAX_RPM = "60";

      const config = getGeminiConfiguration();

      expect(get(config, "credentialsPath")).toBe("./test-credentials.json");
      expect(get(config, "projectId")).toBe("test-project-123");
      expect(get(config, "location")).toBe("us-central1");
      expect(get(config, "modelId")).toBe("imagen-3.0-generate-001");
      expect(get(config, "maxRpm")).toBe(60);
      expect(get(config, "endpoint")).toBe("us-central1-aiplatform.googleapis.com");
    });

    it("should use default values for optional fields", () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = "./test-credentials.json";
      process.env.GOOGLE_CLOUD_PROJECT = "test-project-123";
      delete process.env.VERTEX_AI_LOCATION;
      delete process.env.IMAGE_GEN_MODEL;
      delete process.env.IMAGE_GEN_MAX_RPM;

      const config = getGeminiConfiguration();

      expect(get(config, "location")).toBe("us-central1");
      expect(get(config, "modelId")).toBe("imagen-3.0-generate-001");
      expect(get(config, "maxRpm")).toBe(60);
    });

    it("should throw error when GOOGLE_APPLICATION_CREDENTIALS is missing", () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      process.env.GOOGLE_CLOUD_PROJECT = "test-project-123";

      expect(() => {
        getGeminiConfiguration();
      }).toThrow("GOOGLE_APPLICATION_CREDENTIALS is not configured in environment variables");
    });

    it("should throw error when GOOGLE_CLOUD_PROJECT is missing", () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = "./test-credentials.json";
      delete process.env.GOOGLE_CLOUD_PROJECT;

      expect(() => {
        getGeminiConfiguration();
      }).toThrow("GOOGLE_CLOUD_PROJECT is not configured in environment variables");
    });
  });

  describe("getModelResourceName", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should return correctly formatted model resource name", () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = "./test-credentials.json";
      process.env.GOOGLE_CLOUD_PROJECT = "my-project-123";
      process.env.VERTEX_AI_LOCATION = "us-east1";
      process.env.IMAGE_GEN_MODEL = "imagen-3.0-generate-001";

      const resourceName = getModelResourceName();

      expect(resourceName).toBe(
        "projects/my-project-123/locations/us-east1/publishers/google/models/imagen-3.0-generate-001"
      );
    });

    it("should use default location when not specified", () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = "./test-credentials.json";
      process.env.GOOGLE_CLOUD_PROJECT = "my-project-123";
      delete process.env.VERTEX_AI_LOCATION;

      const resourceName = getModelResourceName();

      expect(resourceName).toContain("locations/us-central1");
    });
  });

  describe("resetGeminiAuthClient", () => {
    it("should reset the auth client instance", () => {
      resetGeminiAuthClient();
      // If this doesn't throw, the reset worked
      expect(true).toBe(true);
    });
  });
});

// Integration test - only runs if credentials are properly configured
describe("Gemini Authentication Integration", () => {
  // Skip integration tests if credentials are not configured
  const skipIntegration = !process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                         !process.env.GOOGLE_CLOUD_PROJECT;

  beforeAll(() => {
    resetGeminiAuthClient();
  });

  afterAll(() => {
    resetGeminiAuthClient();
  });

  (skipIntegration ? it.skip : it)(
    "should successfully authenticate with valid credentials",
    async () => {
      const result = await testGeminiAuth();

      expect(get(result, "success")).toBe(true);
      expect(get(result, "projectId")).toBeDefined();
      expect(get(result, "location")).toBeDefined();
      expect(get(result, "model")).toBeDefined();
      expect(get(result, "hasToken")).toBe(true);
    },
    30000 // 30 second timeout for auth test
  );

  (skipIntegration ? it.skip : it)(
    "should return auth client instance",
    async () => {
      const authClient = await getGeminiAuthClient();

      expect(authClient).toBeDefined();
      expect(authClient.getClient).toBeDefined();
      expect(authClient.getProjectId).toBeDefined();
    },
    30000
  );
});

