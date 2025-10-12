import lodash from 'lodash';
const { get, merge, isNil } = lodash;

import CryptoJS from "crypto-js";
import jsonwebtoken from "jsonwebtoken";
import { createUser, findUserByEmail } from "../../src/services/user.service.js";

// Centralized test account config (env-first, with safe defaults)
const envEmail = get(process, "env.TEST_ACCOUNT_EMAIL");
const envPassword = get(process, "env.TEST_ACCOUNT_PASSWORD");
const envUsername = get(process, "env.TEST_ACCOUNT_USERNAME");

const TEST_ACCOUNT_EMAIL = envEmail;
const TEST_ACCOUNT_PASSWORD = envPassword;
const TEST_ACCOUNT_USERNAME = envUsername || (TEST_ACCOUNT_EMAIL.includes("@") ? TEST_ACCOUNT_EMAIL.split("@")[0] : TEST_ACCOUNT_EMAIL);

/**
 * Encrypt password using the same method as the application
 * @param {string} password - Plain text password
 * @returns {string} Encrypted password
 */
export const encryptPassword = (password) => {
  const secretKey = get(process, "env.PASSWORD_SECRET_KEY");
  return CryptoJS.AES.encrypt(password, secretKey).toString();
};

/**
 * Generate a valid JWT token for testing
 * @param {string} userId - User ID to include in token
 * @param {boolean} remember - Whether to create a long-lived token
 * @returns {string} JWT token
 */
export const generateTestToken = (userId, remember = false) => {
  const secretKey = get(process, "env.TOKEN_SECRET_KEY");
  return jsonwebtoken.sign({ id: userId }, secretKey, {
    expiresIn: remember ? "168h" : "24h",
  });
};

/**
 * Parse and verify a JWT token
 * @param {string} token - JWT token to parse
 * @returns {Object} Decoded token payload
 */
export const parseJwt = (token) => {
  const secretKey = get(process, "env.TOKEN_SECRET_KEY");
  return jsonwebtoken.verify(token, secretKey);
};

/**
 * User factory - creates a user for testing
 * @param {Object} overrides - Custom user data to override defaults
 * @returns {Promise<Object>} Created user object
 */
export const userFactory = async (overrides = {}) => {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);

  const defaultData = {
    username: `testuser${timestamp}${randomNum}`,
    email: `test${timestamp}${randomNum}@example.com`,
    password: "Test@123", // Plain password for reference
    role: "user",
    status: "active",
  };

  const userData = merge({}, defaultData, overrides);
  
  // Support both "password" and "passwordPlain" for plain text password
  const plainPassword = get(overrides, "passwordPlain") || get(userData, "password");

  // Encrypt password before storing
  const encryptedPassword = encryptPassword(plainPassword);

  const userToCreate = {
    username: get(userData, "username").toLowerCase(),
    email: get(userData, "email"),
    password: encryptedPassword,
    role: get(userData, "role"),
    status: get(userData, "status"),
  };

  const createdUser = await createUser(userToCreate);

  // Add plain password to returned object for test assertions
  return merge({}, createdUser, { plainPassword });
};

/**
 * Helper to match error response shape
 * @param {Object} response - Response object from supertest
 * @param {number} expectedStatus - Expected HTTP status code
 * @returns {Object} Assertion helpers
 */
export const expectErrorShape = (response, expectedStatus) => {
  expect(get(response, "status")).toBe(expectedStatus);
  expect(get(response, "body.success")).toBe(false);
  expect(get(response, "body.message")).toBeDefined();

  return {
    withMessage: (message) => {
      expect(get(response, "body.message")).toBe(message);
    },
    withFieldError: (field) => {
      const errors = get(response, "body.errors", []);
      const fieldError = errors.find((err) => get(err, "path") === field);
      expect(fieldError).toBeDefined();
    },
  };
};

/**
 * Helper to validate successful response shape
 * @param {Object} response - Response object from supertest
 * @param {number} expectedStatus - Expected HTTP status code
 */
export const expectSuccessShape = (response, expectedStatus = 200) => {
  expect(get(response, "status")).toBe(expectedStatus);
  expect(get(response, "body.success")).toBe(true);
  expect(get(response, "body.message")).toBeDefined();
};

/**
 * Helper to validate JWT token structure
 * @param {string} token - JWT token to validate
 * @param {string} expectedUserId - Expected user ID in token
 */
export const expectValidToken = (token, expectedUserId = null) => {
  expect(token).toBeDefined();
  expect(typeof token).toBe("string");

  const decoded = parseJwt(token);
  expect(get(decoded, "id")).toBeDefined();
  expect(get(decoded, "iat")).toBeDefined();
  expect(get(decoded, "exp")).toBeDefined();

  const iat = get(decoded, "iat");
  const exp = get(decoded, "exp");
  expect(exp).toBeGreaterThan(iat);

  if (!isNil(expectedUserId)) {
    expect(get(decoded, "id")).toBe(expectedUserId);
  }

  return decoded;
};

/**
 * Get or create the test account for upload and other authenticated tests
 * @returns {Promise<Object>} Object with user data and plain password
 */
export const getTestAccount = async () => {
  const accountEmail = TEST_ACCOUNT_EMAIL;
  const accountPassword = TEST_ACCOUNT_PASSWORD;
  const accountUsername = TEST_ACCOUNT_USERNAME;

  // Check if test account exists
  let existingUser = await findUserByEmail(accountEmail);
  
  if (!existingUser) {
    // Create test account if it doesn't exist
    existingUser = await userFactory({
      email: accountEmail,
      passwordPlain: accountPassword,
      username: accountUsername
    });
  }

  return merge({}, existingUser, { plainPassword: accountPassword });
};

/**
 * Get authentication token for the test account
 * @param {Object} app - Express app instance
 * @returns {Promise<Object>} Object with token, userId, and user data
 */
export const getTestAccountToken = async (app) => {
  const request = (await import("supertest")).default;
  
  const accountEmail = TEST_ACCOUNT_EMAIL;
  const accountPassword = TEST_ACCOUNT_PASSWORD;

  // Ensure test account exists
  const testUser = await getTestAccount();

  // Login to get authentication token
  // Note: Login endpoint expects "username" field but accepts email
  const loginResponse = await request(app)
    .post("/api/auth/login")
    .send({
      username: accountEmail,
      password: accountPassword
    });

  const token = get(loginResponse, "body.token");
  const userId = get(testUser, "id");

  return {
    token,
    userId,
    user: testUser
  };
};
