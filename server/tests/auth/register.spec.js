import lodash from 'lodash';
const { get } = lodash;

import request from "supertest";
import { createApp } from "../utils/appFactory.js";
import { expectSuccessShape, expectValidToken } from "../utils/testHelpers.js";
import { findUserByEmail } from "../../src/services/user.service.js";
import CryptoJS from "crypto-js";

describe("POST /api/auth/register - Register Route E2E Tests", () => {
  let app;

  beforeAll(() => {
    app = createApp();
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
});
