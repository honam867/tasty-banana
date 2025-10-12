import lodash from "lodash";
const { get } = lodash;

import request from "supertest";
import { createApp } from "../utils/appFactory.js";
import {
  expectSuccessShape,
  getTestAccountToken,
} from "../utils/testHelpers.js";
import path from "path";
import fs from "fs";
import { findUserByEmail } from "../../src/services/user.service.js";

describe("POST /api/uploads - Upload File Route E2E Tests", () => {
  let app;
  let testToken;
  let testUserId;

  const TEST_IMAGE_PATH = path.join(
    process.cwd(),
    "tests",
    "config",
    "test-upload.png"
  );

  beforeAll(async () => {
    app = createApp();

    const { token, userId } = await getTestAccountToken(app);
    testToken = token;
    testUserId = userId;

    expect(testToken).toBeDefined();
  });

  describe("Success Cases", () => {
    it("should successfully upload a file with valid data and authentication", async () => {
      // Arrange - Verify test image exists
      expect(fs.existsSync(TEST_IMAGE_PATH)).toBe(true);

      // Act
      const response = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${testToken}`)
        .attach("file", TEST_IMAGE_PATH)
        .field("purpose", "attachment")
        .field("title", "Test Upload Image")
        .expect(200);

      // Assert - Response structure
      expectSuccessShape(response, 200);
      expect(get(response, "body.message")).toBe("File uploaded successfully");

      // Assert - Upload data in response
      const uploadData = get(response, "body.data");
      expect(uploadData).toBeDefined();
      expect(get(uploadData, "id")).toBeDefined();
      expect(get(uploadData, "userId")).toBe(testUserId);
      expect(get(uploadData, "threadId")).toBeNull();
      expect(get(uploadData, "title")).toBe("Test Upload Image");
      expect(get(uploadData, "purpose")).toBe("attachment");
      expect(get(uploadData, "mimeType")).toBe("image/png");
      expect(get(uploadData, "sizeBytes")).toBeGreaterThan(0);
      expect(get(uploadData, "storageProvider")).toBe("r2");
      expect(get(uploadData, "storageBucket")).toBeDefined();
      expect(get(uploadData, "storageKey")).toBeDefined();
      expect(get(uploadData, "publicUrl")).toBeDefined();
      expect(get(uploadData, "createdAt")).toBeDefined();

      // Assert - Storage key format (includes userId in path)
      const storageKey = get(uploadData, "storageKey");
      expect(storageKey).toContain(testUserId);
      expect(storageKey).toContain("test-upload");

      // Assert - Public URL is valid
      const publicUrl = get(uploadData, "publicUrl");
      expect(publicUrl).toContain(storageKey);
      expect(publicUrl).toMatch(/^https?:\/\//);
    });

    it("should upload file with default purpose when not specified", async () => {
      // Act
      const response = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${testToken}`)
        .attach("file", TEST_IMAGE_PATH)
        .expect(200);

      // Assert
      expectSuccessShape(response, 200);
      const uploadData = get(response, "body.data");
      expect(get(uploadData, "purpose")).toBe("attachment");
    });

    it("should upload file without title (optional field)", async () => {
      // Act
      const response = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${testToken}`)
        .attach("file", TEST_IMAGE_PATH)
        .field("purpose", "init")
        .expect(200);

      // Assert
      expectSuccessShape(response, 200);
      const uploadData = get(response, "body.data");
      expect(get(uploadData, "title")).toBeNull();
      expect(get(uploadData, "purpose")).toBe("init");
    });

    it("should handle different valid purpose values", async () => {
      const validPurposes = ["init", "mask", "reference", "attachment"];

      for (const purpose of validPurposes) {
        // Act
        const response = await request(app)
          .post("/api/uploads")
          .set("Authorization", `Bearer ${testToken}`)
          .attach("file", TEST_IMAGE_PATH)
          .field("purpose", purpose)
          .expect(200);

        // Assert
        expectSuccessShape(response, 200);
        const uploadData = get(response, "body.data");
        expect(get(uploadData, "purpose")).toBe(purpose);
      }
    });

    it("should generate unique storage keys for multiple uploads of same file", async () => {
      // Act - Upload same file twice
      const response1 = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${testToken}`)
        .attach("file", TEST_IMAGE_PATH)
        .expect(200);

      const response2 = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${testToken}`)
        .attach("file", TEST_IMAGE_PATH)
        .expect(200);

      // Assert - Different storage keys
      const storageKey1 = get(response1, "body.data.storageKey");
      const storageKey2 = get(response2, "body.data.storageKey");

      expect(storageKey1).toBeDefined();
      expect(storageKey2).toBeDefined();
      expect(storageKey1).not.toBe(storageKey2);

      // Assert - Different IDs
      const id1 = get(response1, "body.data.id");
      const id2 = get(response2, "body.data.id");
      expect(id1).not.toBe(id2);
    });
  });
});

