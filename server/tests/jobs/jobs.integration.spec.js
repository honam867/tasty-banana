import lodash from "lodash";
const { get, isEmpty } = lodash;

import { testGeminiAuth } from "../../src/config/gemini.js";
import {
  createJob,
  updateJobStatus,
  getJobById,
  processJob,
  getImagesByJobId,
  getJobsByThread,
} from "../../src/services/jobs.service.js";
import JobError from "../../src/utils/JobError.js";
import {
  JOB_STATUS,
  JOB_ERROR_CODE,
  JOB_TYPE,
} from "../../src/utils/constant.js";
import { userFactory } from "../utils/testHelpers.js";
import { createThread } from "../../src/services/threads.service.js";
import { createMessage } from "../../src/services/messages.service.js";
import { createProvider } from "../../src/services/providers.service.js";

// Note: These are integration tests - we test with real services
// Message updates will be tested as part of the full flow

describe("Jobs Service - End-to-End Integration Tests", () => {
  let testJobId;
  let testMessageId;
  let testProviderId;
  let testUser;
  let testThread;

  beforeAll(async () => {
    // Test Gemini authentication before running tests
    console.log("🔐 Testing Gemini authentication...");
    const authResult = await testGeminiAuth();

    if (!get(authResult, "success")) {
      console.error("❌ Gemini authentication failed!");
      console.error("Skipping integration tests that require Gemini API");
      console.error("Error:", get(authResult, "error"));
    } else {
      console.log("✅ Gemini authentication successful!");
    }

    // Create test user and thread once for all tests
    testUser = await userFactory();
    testThread = await createThread(get(testUser, "id"));

    // Create a test provider
    const timestamp = Date.now();
    const providerData = {
      name: `test-provider-${timestamp}`,
      config: { apiKey: "test-key" },
    };
    const provider = await createProvider(providerData);
    testProviderId = get(provider, "id");
  });

  beforeEach(async () => {
    // Create a new message for each test (job requires a unique message)
    const message = await createMessage(
      get(testThread, "id"),
      "user",
      "Test prompt for image generation",
      "pending"
    );
    testMessageId = get(message, "id");
  });

  describe("Job Creation Flow", () => {
    it("should create a job with valid parameters", async () => {
      const jobData = {
        messageId: testMessageId,
        providerId: testProviderId,
        jobType: JOB_TYPE.TEXT2IMG,
        status: JOB_STATUS.QUEUED,
        parameters: {
          prompt: "A beautiful sunset over mountains",
          numberOfImages: 1,
          aspectRatio: "16:9",
        },
      };

      const job = await createJob(jobData);
      testJobId = get(job, "id");

      expect(job).toBeDefined();
      expect(get(job, "id")).toBeDefined();
      expect(get(job, "messageId")).toBe(testMessageId);
      expect(get(job, "providerId")).toBe(testProviderId);
      expect(get(job, "jobType")).toBe(JOB_TYPE.TEXT2IMG);
      expect(get(job, "status")).toBe(JOB_STATUS.QUEUED);
      expect(get(job, "createdAt")).toBeDefined();
    });

    it("should reject job creation with missing required fields", async () => {
      await expect(
        createJob({
          messageId: testMessageId,
          // Missing providerId
          jobType: JOB_TYPE.TEXT2IMG,
        })
      ).rejects.toThrow(JobError);

      try {
        await createJob({
          messageId: testMessageId,
          jobType: JOB_TYPE.TEXT2IMG,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(JobError);
        expect(get(error, "code")).toBe(JOB_ERROR_CODE.MISSING_REQUIRED_FIELD);
        expect(get(error, "statusCode")).toBe(400);
        expect(get(error, "context.field")).toBe("providerId");
      }
    });

    it("should reject job creation with invalid job type", async () => {
      try {
        await createJob({
          messageId: testMessageId,
          providerId: testProviderId,
          jobType: "invalid-type",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(JobError);
        expect(get(error, "code")).toBe(JOB_ERROR_CODE.INVALID_JOB_TYPE);
        expect(get(error, "statusCode")).toBe(400);
      }
    });

    it("should reject duplicate job for same message", async () => {
      const jobData = {
        messageId: testMessageId,
        providerId: testProviderId,
        jobType: JOB_TYPE.TEXT2IMG,
        parameters: { prompt: "Test" },
      };

      // Create first job
      await createJob(jobData);

      // Try to create duplicate
      try {
        await createJob(jobData);
        fail("Should have thrown JobError");
      } catch (error) {
        expect(error).toBeInstanceOf(JobError);
        expect(get(error, "code")).toBe(JOB_ERROR_CODE.JOB_ALREADY_EXISTS);
        expect(get(error, "statusCode")).toBe(409);
      }
    });
  });

  describe("Job Status Updates", () => {
    beforeEach(async () => {
      const job = await createJob({
        messageId: testMessageId,
        providerId: testProviderId,
        jobType: JOB_TYPE.TEXT2IMG,
        parameters: { prompt: "Test" },
      });
      testJobId = get(job, "id");
    });

    it("should update job status from queued to processing", async () => {
      const updatedJob = await updateJobStatus(
        testJobId,
        JOB_STATUS.PROCESSING
      );

      expect(get(updatedJob, "status")).toBe(JOB_STATUS.PROCESSING);
      expect(get(updatedJob, "updatedAt")).toBeDefined();
    });

    it("should update job status from processing to succeeded", async () => {
      await updateJobStatus(testJobId, JOB_STATUS.PROCESSING);
      const succeededJob = await updateJobStatus(
        testJobId,
        JOB_STATUS.SUCCEEDED
      );

      expect(get(succeededJob, "status")).toBe(JOB_STATUS.SUCCEEDED);
    });

    it("should reject invalid status transitions", async () => {
      await updateJobStatus(testJobId, JOB_STATUS.PROCESSING);
      await updateJobStatus(testJobId, JOB_STATUS.SUCCEEDED);

      // Try to change from terminal state
      try {
        await updateJobStatus(testJobId, JOB_STATUS.PROCESSING);
        fail("Should have thrown JobError");
      } catch (error) {
        expect(error).toBeInstanceOf(JobError);
        expect(get(error, "code")).toBe(
          JOB_ERROR_CODE.INVALID_STATUS_TRANSITION
        );
        expect(get(error, "statusCode")).toBe(400);
      }
    });

    it("should reject update for non-existent job", async () => {
      const fakeJobId = "00000000-0000-0000-0000-000000000000";

      try {
        await updateJobStatus(fakeJobId, JOB_STATUS.PROCESSING);
        fail("Should have thrown JobError");
      } catch (error) {
        expect(error).toBeInstanceOf(JobError);
        expect(get(error, "code")).toBe(JOB_ERROR_CODE.JOB_NOT_FOUND);
        expect(get(error, "statusCode")).toBe(404);
      }
    });
  });

  describe("Complete Job Processing Flow (E2E)", () => {
    it("should process a complete job lifecycle successfully", async () => {
      // Skip if Gemini auth failed
      const authResult = await testGeminiAuth();
      if (!get(authResult, "success")) {
        console.log("⏭️  Skipping E2E test - Gemini auth not available");
        return;
      }

      console.log("\n🚀 Starting E2E Job Processing Test");
      console.log("=".repeat(60));

      // 1. Create job
      console.log("\n1️⃣  Creating job...");
      const jobData = {
        messageId: testMessageId,
        providerId: testProviderId,
        jobType: JOB_TYPE.TEXT2IMG,
        parameters: {
          prompt: "A simple red circle on white background, minimalist",
          numberOfImages: 1,
          aspectRatio: "1:1",
          addWatermark: false,
        },
      };

      const createdJob = await createJob(jobData);
      testJobId = get(createdJob, "id");

      expect(createdJob).toBeDefined();
      expect(get(createdJob, "status")).toBe(JOB_STATUS.QUEUED);
      console.log(`   ✅ Job created: ${testJobId}`);

      // 2. Process job (generates images, stores to R2, updates message)
      console.log("\n2️⃣  Processing job (this may take 30-60 seconds)...");
      const result = await processJob(testJobId);

      // Verify job result structure
      expect(result).toBeDefined();
      expect(get(result, "success")).toBe(true);

      const job = get(result, "job");
      expect(get(job, "status")).toBe(JOB_STATUS.SUCCEEDED);
      console.log(`   ✅ Job status: ${get(job, "status")}`);

      // Verify generation result
      const generationResult = get(result, "result");
      expect(generationResult).toBeDefined();
      expect(get(generationResult, "count")).toBeGreaterThan(0);
      console.log(`   ✅ Generated ${get(generationResult, "count")} image(s)`);

      // Verify stored images
      const storedImages = get(result, "storedImages");
      expect(storedImages).toBeDefined();
      expect(storedImages.length).toBeGreaterThan(0);

      const firstImage = storedImages[0];
      expect(get(firstImage, "id")).toBeDefined();
      expect(get(firstImage, "jobId")).toBe(testJobId);
      expect(get(firstImage, "url")).toBeDefined();
      expect(get(firstImage, "url")).toContain("http");

      console.log(`   ✅ Stored ${storedImages.length} image(s) to R2`);
      console.log(`   📸 Image URL: ${get(firstImage, "url")}`);

      // 3. Verify images can be retrieved
      console.log("\n3️⃣  Retrieving stored images...");
      const retrievedImages = await getImagesByJobId(testJobId);

      expect(retrievedImages).toBeDefined();
      expect(retrievedImages.length).toBe(storedImages.length);
      console.log(`   ✅ Retrieved ${retrievedImages.length} image(s)`);

      // 4. Verify final job state
      console.log("\n4️⃣  Verifying final job state...");
      const finalJob = await getJobById(testJobId);

      expect(get(finalJob, "status")).toBe(JOB_STATUS.SUCCEEDED);
      expect(get(finalJob, "updatedAt")).toBeDefined();
      console.log(`   ✅ Final job status: ${get(finalJob, "status")}`);

      console.log("\n" + "=".repeat(60));
      console.log("🎉 E2E Test Completed Successfully!");
      console.log("=".repeat(60) + "\n");
    }, 120000); // 2 minute timeout for image generation

    it("should handle job processing failure gracefully", async () => {
      console.log("\n🧪 Testing Error Handling");

      // Create job with invalid parameters (empty prompt)
      const jobData = {
        messageId: testMessageId,
        providerId: testProviderId,
        jobType: JOB_TYPE.TEXT2IMG,
        parameters: {
          prompt: "", // Invalid empty prompt
          numberOfImages: 1,
        },
      };

      const job = await createJob(jobData);
      testJobId = get(job, "id");

      try {
        await processJob(testJobId);
        // If it doesn't throw, check that it returned a failure result
        const result = await processJob(testJobId);
        expect(get(result, "success")).toBe(false);
        expect(get(result, "error")).toBeDefined();
        console.log(`   ✅ Error handled: ${get(result, "error.code")}`);
      } catch (error) {
        // Or it might throw an error
        expect(error).toBeInstanceOf(JobError);
        console.log(`   ✅ Error caught: ${get(error, "code")}`);
      }

      // Verify job was marked as failed
      const failedJob = await getJobById(testJobId);
      expect(get(failedJob, "status")).toBe(JOB_STATUS.FAILED);
      console.log(`   ✅ Job marked as failed`);
    }, 30000);
  });

  describe("Error Handling Edge Cases", () => {
    it("should handle processJob with non-existent job", async () => {
      const fakeJobId = "00000000-0000-0000-0000-000000000000";

      try {
        await processJob(fakeJobId);
        fail("Should have thrown JobError");
      } catch (error) {
        expect(error).toBeInstanceOf(JobError);
        expect(get(error, "code")).toBe(JOB_ERROR_CODE.JOB_NOT_FOUND);
      }
    });

    it("should handle getImagesByJobId with invalid jobId", async () => {
      try {
        await getImagesByJobId("");
        fail("Should have thrown JobError");
      } catch (error) {
        expect(error).toBeInstanceOf(JobError);
        expect(get(error, "code")).toBe(JOB_ERROR_CODE.MISSING_REQUIRED_FIELD);
      }
    });

    it("should return empty array for job with no images", async () => {
      const job = await createJob({
        messageId: testMessageId,
        providerId: testProviderId,
        jobType: JOB_TYPE.TEXT2IMG,
        parameters: { prompt: "Test" },
      });

      const images = await getImagesByJobId(get(job, "id"));
      expect(Array.isArray(images)).toBe(true);
      expect(images.length).toBe(0);
    });
  });
});
