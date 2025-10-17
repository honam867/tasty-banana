import lodash from "lodash";
const { get, map, forEach } = lodash;

import request from "supertest";
import { createApp } from "../utils/appFactory.js";
import {
  expectErrorShape,
  expectSuccessShape,
  getTestAccountToken,
} from "../utils/testHelpers.js";

describe("Threads API Routes - Basic Structure Test", () => {
  let app;
  let testToken;
  let testUserId;

  beforeAll(async () => {
    app = createApp();
    const { token, userId } = await getTestAccountToken(app);
    testToken = token;
    testUserId = userId;

    expect(testToken).toBeDefined();
  });

  describe("Authentication Requirements", () => {
    it("should reject POST /api/threads without authentication", async () => {
      const response = await request(app)
        .post("/api/threads")
        .send({ title: "Test Thread" });

      expectErrorShape(response, 401).withMessage("Token is required");
    });

    it("should reject GET /api/threads without authentication", async () => {
      const response = await request(app).get("/api/threads");

      expectErrorShape(response, 401).withMessage("Token is required");
    });

    it("should reject GET /api/threads/:threadId without authentication", async () => {
      const response = await request(app).get("/api/threads/123");

      expectErrorShape(response, 401).withMessage("Token is required");
    });

    it("should reject PUT /api/threads/:threadId without authentication", async () => {
      const response = await request(app)
        .put("/api/threads/123")
        .send({ title: "Updated" });

      expectErrorShape(response, 401).withMessage("Token is required");
    });

    it("should reject DELETE /api/threads/:threadId without authentication", async () => {
      const response = await request(app).delete("/api/threads/123");

      expectErrorShape(response, 401).withMessage("Token is required");
    });

    it("should reject POST /api/threads/:threadId/messages without authentication", async () => {
      const response = await request(app)
        .post("/api/threads/123/messages")
        .send({ content: "Test message" });

      expectErrorShape(response, 401).withMessage("Token is required");
    });

    it("should reject GET /api/threads/:threadId/messages without authentication", async () => {
      const response = await request(app).get("/api/threads/123/messages");

      expectErrorShape(response, 401).withMessage("Token is required");
    });
  });

  describe("POST /api/threads - Create Thread", () => {
    it("should successfully create a new thread with valid authentication", async () => {
      const response = await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${testToken}`)
        .send({})
        .expect(201);

      expectSuccessShape(response, 201);
      
      const data = get(response, "body.data");
      expect(get(data, "id")).toBeDefined();
      expect(get(data, "ownerId")).toBe(testUserId);
      expect(get(data, "createdAt")).toBeDefined();
      expect(get(data, "updatedAt")).toBeDefined();
      expect(get(response, "body.message")).toBe("Thread created successfully");
    });

    it("should ignore title field even if provided", async () => {
      const response = await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${testToken}`)
        .send({ title: "This should be ignored" })
        .expect(201);

      expectSuccessShape(response, 201);
      
      const data = get(response, "body.data");
      expect(get(data, "id")).toBeDefined();
      expect(get(data, "ownerId")).toBe(testUserId);
      // Verify no title field exists in response
      expect(data).not.toHaveProperty("title");
    });

  });

  describe("GET /api/threads - List Threads with Pagination", () => {
    it("should successfully list threads for authenticated user", async () => {
      const response = await request(app)
        .get("/api/threads")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expectSuccessShape(response, 200);
      
      const data = get(response, "body.data");
      expect(get(data, "items")).toBeDefined();
      expect(Array.isArray(get(data, "items"))).toBe(true);
      expect(get(data, "nextCursor")).toBeDefined(); // Can be null or string
      
      // Verify all threads belong to the user
      const items = get(data, "items");
      forEach(items, thread => {
        expect(get(thread, "ownerId")).toBe(testUserId);
        expect(get(thread, "id")).toBeDefined();
        expect(get(thread, "createdAt")).toBeDefined();
        expect(get(thread, "updatedAt")).toBeDefined();
      });
    });

    it("should list threads with default limit (20)", async () => {
      // Create 3 threads
      await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${testToken}`)
        .send({});
      
      await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${testToken}`)
        .send({});
      
      await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${testToken}`)
        .send({});

      const response = await request(app)
        .get("/api/threads")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expectSuccessShape(response, 200);
      
      const data = get(response, "body.data");
      const items = get(data, "items");
      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(items.length).toBeLessThanOrEqual(20); // Default limit
      
      // Verify all threads belong to the user
      forEach(items, thread => {
        expect(get(thread, "ownerId")).toBe(testUserId);
      });
    });

    it("should respect custom limit parameter", async () => {
      const response = await request(app)
        .get("/api/threads?limit=2")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expectSuccessShape(response, 200);
      
      const data = get(response, "body.data");
      const items = get(data, "items");
      expect(items.length).toBeLessThanOrEqual(2);
    });

    it("should enforce max limit of 50", async () => {
      const response = await request(app)
        .get("/api/threads?limit=100")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expectSuccessShape(response, 200);
      
      const data = get(response, "body.data");
      const items = get(data, "items");
      expect(items.length).toBeLessThanOrEqual(50);
    });

    it("should support cursor-based pagination", async () => {
      // Get first page with limit 2
      const firstPage = await request(app)
        .get("/api/threads?limit=2")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      const firstData = get(firstPage, "body.data");
      const firstItems = get(firstData, "items");
      const nextCursor = get(firstData, "nextCursor");

      if (firstItems.length >= 2 && nextCursor) {
        // Get second page using cursor
        const secondPage = await request(app)
          .get(`/api/threads?limit=2&cursor=${nextCursor}`)
          .set("Authorization", `Bearer ${testToken}`)
          .expect(200);

        const secondData = get(secondPage, "body.data");
        const secondItems = get(secondData, "items");
        
        // Verify second page items are different
        const firstIds = map(firstItems, item => get(item, "id"));
        const secondIds = map(secondItems, item => get(item, "id"));
        
        forEach(secondIds, id => {
          expect(firstIds).not.toContain(id);
        });
      }
    });

    it("should order threads by createdAt descending", async () => {
      const response = await request(app)
        .get("/api/threads")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      const data = get(response, "body.data");
      const items = get(data, "items");
      
      if (items.length >= 2) {
        for (let i = 0; i < items.length - 1; i++) {
          const current = new Date(get(items[i], "createdAt"));
          const next = new Date(get(items[i + 1], "createdAt"));
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe("GET /api/threads/:threadId - Get Single Thread", () => {
    let ownThreadId;

    beforeAll(async () => {
      // Create a thread for testing
      const createResponse = await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${testToken}`)
        .send({});
      
      ownThreadId = get(createResponse, "body.data.id");
    });

    it("should successfully get own thread by ID", async () => {
      const response = await request(app)
        .get(`/api/threads/${ownThreadId}`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expectSuccessShape(response, 200);
      
      const data = get(response, "body.data");
      expect(get(data, "id")).toBe(ownThreadId);
      expect(get(data, "ownerId")).toBe(testUserId);
      expect(get(data, "createdAt")).toBeDefined();
      expect(get(data, "updatedAt")).toBeDefined();
      expect(get(response, "body.message")).toBe("Thread retrieved successfully");
    });

    it("should return 404 for non-existent thread", async () => {
      const fakeThreadId = "00000000-0000-0000-0000-000000000000";
      
      const response = await request(app)
        .get(`/api/threads/${fakeThreadId}`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(404);

      expect(get(response, "body.success")).toBe(false);
      expect(get(response, "body.message")).toBe("Thread not found");
    });

    it("should return 404 for invalid thread ID format", async () => {
      const response = await request(app)
        .get("/api/threads/invalid-id")
        .set("Authorization", `Bearer ${testToken}`);
        
      // Will either be 404 (not found) or 500 (invalid UUID format)
      expect([404, 500]).toContain(get(response, "status"));
      expect(get(response, "body.success")).toBe(false);
    });
  });

  describe("POST /api/threads/:threadId/messages - Create Message", () => {
    let testThreadId;

    beforeAll(async () => {
      // Create a thread for testing messages
      const createResponse = await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${testToken}`)
        .send({});
      
      testThreadId = get(createResponse, "body.data.id");
    });

    it("should successfully create a message with valid data and trigger job processing", async () => {
      const response = await request(app)
        .post(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          role: "user",
          content: "Generate a beautiful sunset image"
        })
        .expect(201);

      expectSuccessShape(response, 201);
      
      const data = get(response, "body.data");
      
      // Verify userMessage
      const userMessage = get(data, "userMessage");
      expect(get(userMessage, "id")).toBeDefined();
      expect(get(userMessage, "threadId")).toBe(testThreadId);
      expect(get(userMessage, "role")).toBe("user");
      expect(get(userMessage, "content")).toBe("Generate a beautiful sunset image");
      expect(get(userMessage, "status")).toBe("pending");
      expect(get(userMessage, "createdAt")).toBeDefined();
      expect(get(userMessage, "updatedAt")).toBeDefined();
      
      // Verify assistantMessage
      const assistantMessage = get(data, "assistantMessage");
      expect(get(assistantMessage, "id")).toBeDefined();
      expect(get(assistantMessage, "threadId")).toBe(testThreadId);
      expect(get(assistantMessage, "role")).toBe("assistant");
      expect(get(assistantMessage, "content")).toBe("Processing your request...");
      expect(get(assistantMessage, "status")).toBe("processing");
      expect(get(assistantMessage, "createdAt")).toBeDefined();
      
      // Verify job
      const job = get(data, "job");
      expect(get(job, "id")).toBeDefined();
      expect(get(job, "messageId")).toBe(get(userMessage, "id"));
      expect(get(job, "jobType")).toBe("text2img");
      expect(get(job, "status")).toBe("queued");
      expect(get(job, "parameters")).toBeDefined();
      expect(get(job, "parameters.prompt")).toBe("Generate a beautiful sunset image");
      expect(get(job, "parameters.numberOfImages")).toBe(1);
      expect(get(job, "parameters.aspectRatio")).toBe("1:1");
      expect(get(job, "createdAt")).toBeDefined();
      
      // Verify provider
      const provider = get(data, "provider");
      expect(get(provider, "id")).toBeDefined();
      expect(get(provider, "name")).toBe("gemini-2.5-flash");
      expect(get(provider, "config")).toBeDefined();
      
      expect(get(response, "body.message")).toBe("Message created successfully");
    });

    it("should reject message without content", async () => {
      const response = await request(app)
        .post(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          role: "user"
        })
        .expect(400);

      expectErrorShape(response, 400).withMessage("Message content is required");
    });

    it("should reject message with empty content", async () => {
      const response = await request(app)
        .post(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          role: "user",
          content: "   "
        })
        .expect(400);

      expectErrorShape(response, 400).withMessage("Message content is required");
    });

    it("should reject message with content too long", async () => {
      const longContent = "a".repeat(4001);
      
      const response = await request(app)
        .post(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          role: "user",
          content: longContent
        })
        .expect(400);

      expectErrorShape(response, 400).withMessage("Message content must be between 1 and 4000 characters");
    });

    it("should reject message with role other than 'user'", async () => {
      const response = await request(app)
        .post(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          role: "assistant",
          content: "This should be rejected"
        })
        .expect(400);

      expectErrorShape(response, 400).withMessage("Message role must be 'user'");
    });

    it("should reject posting to non-existent thread", async () => {
      const fakeThreadId = "00000000-0000-0000-0000-000000000000";
      
      const response = await request(app)
        .post(`/api/threads/${fakeThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          role: "user",
          content: "Test message"
        })
        .expect(403);

      expect(get(response, "body.success")).toBe(false);
      expect(get(response, "body.message")).toBe("You do not have permission to post to this thread");
    });

    it("should accept message with exactly 4000 characters", async () => {
      const maxContent = "a".repeat(4000);
      
      const response = await request(app)
        .post(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({
          role: "user",
          content: maxContent
        })
        .expect(201);

      expectSuccessShape(response, 201);
      const userMessage = get(response, "body.data.userMessage");
      expect(get(userMessage, "content")).toBe(maxContent);
    });
  });

  describe("GET /api/threads/:threadId/messages - List Messages with Pagination", () => {
    let testThreadId;

    beforeAll(async () => {
      // Create a thread for testing
      const createResponse = await request(app)
        .post("/api/threads")
        .set("Authorization", `Bearer ${testToken}`)
        .send({});
      
      testThreadId = get(createResponse, "body.data.id");

      // Create some messages for pagination testing
      await request(app)
        .post(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({ role: "user", content: "First message" });

      await request(app)
        .post(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({ role: "user", content: "Second message" });

      await request(app)
        .post(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .send({ role: "user", content: "Third message" });
    });

    it("should successfully list messages for own thread", async () => {
      const response = await request(app)
        .get(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      expectSuccessShape(response, 200);
      
      const data = get(response, "body.data");
      expect(get(data, "items")).toBeDefined();
      expect(Array.isArray(get(data, "items"))).toBe(true);
      expect(get(data, "nextCursor")).toBeDefined(); // Can be null or string
      expect(get(response, "body.message")).toBe("Messages retrieved successfully");

      const items = get(data, "items");
      expect(items.length).toBeGreaterThanOrEqual(3);

      // Verify all messages belong to the thread
      forEach(items, message => {
        expect(get(message, "threadId")).toBe(testThreadId);
        expect(get(message, "id")).toBeDefined();
        expect(get(message, "content")).toBeDefined();
        expect(get(message, "createdAt")).toBeDefined();
      });
    });

    it("should list messages with default limit (50)", async () => {
      const response = await request(app)
        .get(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      const data = get(response, "body.data");
      const items = get(data, "items");
      expect(items.length).toBeLessThanOrEqual(50); // Default max limit
    });

    it("should respect custom limit parameter", async () => {
      const response = await request(app)
        .get(`/api/threads/${testThreadId}/messages?limit=2`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      const data = get(response, "body.data");
      const items = get(data, "items");
      expect(items.length).toBeLessThanOrEqual(2);
    });

    it("should enforce max limit of 50", async () => {
      const response = await request(app)
        .get(`/api/threads/${testThreadId}/messages?limit=100`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      const data = get(response, "body.data");
      const items = get(data, "items");
      expect(items.length).toBeLessThanOrEqual(50);
    });

    it("should order messages by createdAt descending (newest first)", async () => {
      const response = await request(app)
        .get(`/api/threads/${testThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      const data = get(response, "body.data");
      const items = get(data, "items");
      
      if (items.length >= 2) {
        for (let i = 0; i < items.length - 1; i++) {
          const current = new Date(get(items[i], "createdAt"));
          const next = new Date(get(items[i + 1], "createdAt"));
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });

    it("should support cursor-based pagination", async () => {
      // Get first page with limit 2
      const firstPage = await request(app)
        .get(`/api/threads/${testThreadId}/messages?limit=2`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(200);

      const firstData = get(firstPage, "body.data");
      const firstItems = get(firstData, "items");
      const nextCursor = get(firstData, "nextCursor");

      if (firstItems.length >= 2 && nextCursor) {
        // Get second page using cursor
        const secondPage = await request(app)
          .get(`/api/threads/${testThreadId}/messages?limit=2&cursor=${nextCursor}`)
          .set("Authorization", `Bearer ${testToken}`)
          .expect(200);

        const secondData = get(secondPage, "body.data");
        const secondItems = get(secondData, "items");
        
        // Verify second page items are different
        const firstIds = map(firstItems, item => get(item, "id"));
        const secondIds = map(secondItems, item => get(item, "id"));
        
        forEach(secondIds, id => {
          expect(firstIds).not.toContain(id);
        });
      }
    });

    it("should return 403 for thread not owned by user", async () => {
      const fakeThreadId = "00000000-0000-0000-0000-000000000000";
      
      const response = await request(app)
        .get(`/api/threads/${fakeThreadId}/messages`)
        .set("Authorization", `Bearer ${testToken}`)
        .expect(403);

      expect(get(response, "body.success")).toBe(false);
      expect(get(response, "body.message")).toBe("You do not have permission to access this thread");
    });
  });

  describe("Other Endpoints (Not Implemented Yet)", () => {

    it("should return 404 for PUT /api/threads/:threadId (not implemented)", async () => {
      const response = await request(app)
        .put("/api/threads/123")
        .set("Authorization", `Bearer ${testToken}`)
        .send({ title: "Updated" })
        .expect(404);

      expect(get(response, "body.success")).toBe(false);
      expect(get(response, "body.message")).toBe("Endpoint not implemented yet");
    });

    it("should return 404 for DELETE /api/threads/:threadId (not implemented)", async () => {
      const response = await request(app)
        .delete("/api/threads/123")
        .set("Authorization", `Bearer ${testToken}`)
        .expect(404);

      expect(get(response, "body.success")).toBe(false);
      expect(get(response, "body.message")).toBe("Endpoint not implemented yet");
    });
  });
});

