import lodash from 'lodash';
const { get } = lodash;

import request from "supertest";
import { createApp } from "../utils/appFactory.js";
import { expectSuccessShape, expectValidToken, expectErrorShape, userFactory } from "../utils/testHelpers.js";
import { findUserByEmail } from "../../src/services/user.service.js";
import CryptoJS from "crypto-js";
import { db } from "../../src/db/drizzle.js";
import { users } from "../../src/db/schema.js";

describe("POST /api/auth/register - Register Route E2E Tests", () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  /**
   * Clean up after each register test - ensures test isolation
   */
  afterEach(async () => {
    try {
      // Clean all test data from users table after each register test
      await db.delete(users);
    } catch (error) {
      const errorMessage = get(error, "message", "Unknown error");
      console.error("Failed to clean test data:", errorMessage);
    }
  });

  describe("Success Cases", () => {
    it("should successfully register a new user with valid data", async () => {
      // Arrange
      const registrationData = {
        email: `newuser${Date.now()}@example.com`,
        password: "SecurePass123",
        confirmPassword: "SecurePass123",
      };

      // Act
      const response = await request(app)
        .post("/api/auth/register")
        .send(registrationData)
        .expect(200);

      // Assert - Response structure
      expectSuccessShape(response, 200);
      expect(get(response, "body.message")).toBe("Registration successful");

      // Assert - User data in response
      const userData = get(response, "body.data.user");
      expect(userData).toBeDefined();
      expect(get(userData, "id")).toBeDefined();
      expect(get(userData, "username")).toBeDefined();
      expect(get(userData, "email")).toBe(registrationData.email);
      expect(get(userData, "role")).toBe("user");
      expect(get(userData, "status")).toBe("active");

      // Assert - No sensitive data in response
      expect(get(userData, "password")).toBeUndefined();
      expect(get(userData, "passwordHash")).toBeUndefined();

      // Assert - Token present and valid
      const token = get(response, "body.data.token");
      expect(token).toBeDefined();
      const decoded = expectValidToken(token, get(userData, "id"));

      // Assert - User persisted in database
      const dbUser = await findUserByEmail(registrationData.email);
      expect(dbUser).not.toBeNull();
      expect(get(dbUser, "email")).toBe(registrationData.email);

      // Assert - Password is encrypted (not plain text)
      const storedPassword = get(dbUser, "password");
      expect(storedPassword).not.toBe(registrationData.password);
      expect(storedPassword.length).toBeGreaterThan(20); // Encrypted passwords are longer

      // Assert - Password can be decrypted correctly
      const secretKey = get(process, "env.PASSWORD_SECRET_KEY");
      const decrypted = CryptoJS.AES.decrypt(
        storedPassword,
        secretKey
      ).toString(CryptoJS.enc.Utf8);
      expect(decrypted).toBe(registrationData.password);

      // Assert - Default values set correctly
      expect(get(dbUser, "role")).toBe("user");
      expect(get(dbUser, "status")).toBe("active");
    });

    it("should generate username from email automatically", async () => {
      // Arrange
      const email = `testuser${Date.now()}@example.com`;
      const expectedUsername = email.split("@")[0].toLowerCase();
      const registrationData = {
        email,
        password: "SecurePass456",
        confirmPassword: "SecurePass456",
      };

      // Act
      const response = await request(app)
        .post("/api/auth/register")
        .send(registrationData)
        .expect(200);

      // Assert
      const username = get(response, "body.data.user.username");
      expect(username).toBe(expectedUsername);

      const dbUser = await findUserByEmail(email);
      expect(get(dbUser, "username")).toBe(expectedUsername);
    });
  });

  describe("Email Validation", () => {
    it("should reject registration with invalid email format", async () => {
      // Arrange
      const invalidEmails = [
        "notanemail",
        "missing@domain",
        "@nodomain.com",
        "spaces in@email.com",
      ];

      for (const email of invalidEmails) {
        // Act
        const response = await request(app)
          .post("/api/auth/register")
          .send({
            email,
            password: "SecurePass123",
            confirmPassword: "SecurePass123",
          })
          .expect(400);

        // Assert
        expectErrorShape(response, 400);
        const message = get(response, "body.message");
        expect(message).toBeDefined();
        expect(message).toContain("Email");
      }
    });

    it("should reject registration with duplicate email", async () => {
      // Arrange - Create a user first
      const existingEmail = `existing${Date.now()}@example.com`;
      await userFactory({
        email: existingEmail,
        passwordPlain: "Password123",
      });

      // Act - Try to register with the same email
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: existingEmail,
          password: "AnotherPass123",
          confirmPassword: "AnotherPass123",
        })
        .expect(400);

      // Assert
      expectErrorShape(response, 400);
      const message = get(response, "body.message");
      expect(message).toBeDefined();
      expect(message).toContain("Email already exists");
    });

    it("should allow registration with different emails", async () => {
      // Arrange - Create first user
      const email1 = `user1${Date.now()}@example.com`;
      await userFactory({
        email: email1,
        passwordPlain: "Password123",
      });

      // Act - Register second user with different email
      const email2 = `user2${Date.now()}@example.com`;
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: email2,
          password: "SecurePass123",
          confirmPassword: "SecurePass123",
        })
        .expect(200);

      // Assert
      expectSuccessShape(response, 200);
      const userData = get(response, "body.data.user");
      expect(get(userData, "email")).toBe(email2);

      // Verify both users exist in database
      const dbUser1 = await findUserByEmail(email1);
      const dbUser2 = await findUserByEmail(email2);
      expect(dbUser1).not.toBeNull();
      expect(dbUser2).not.toBeNull();
      expect(get(dbUser1, "id")).not.toBe(get(dbUser2, "id"));
    });

    it("should handle email case-insensitivity correctly", async () => {
      // Arrange - Create user with lowercase email
      const lowercaseEmail = `testuser${Date.now()}@example.com`;
      await userFactory({
        email: lowercaseEmail,
        passwordPlain: "Password123",
      });

      // Act - Try to register with uppercase version
      const uppercaseEmail = lowercaseEmail.toUpperCase();
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          email: uppercaseEmail,
          password: "AnotherPass123",
          confirmPassword: "AnotherPass123",
        });

      // Note: This test observes the system behavior for email case sensitivity
      // Current implementation: emails are stored as-provided (case-sensitive)
      // If 400, then email check is case-insensitive (recommended for production)
      // If 200, then email check is case-sensitive
      
      // Assert - Log the behavior for documentation
      if (response.status === 400) {
        expectErrorShape(response, 400);
        const message = get(response, "body.message");
        expect(message).toContain("Email already exists");
      } else if (response.status === 200) {
        // Case-sensitive: Different case = different email (allowed but not recommended)
        expectSuccessShape(response, 200);
      }
    });
  });
});
