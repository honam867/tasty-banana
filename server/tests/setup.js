import lodash from 'lodash';
const { get } = lodash;

import { db } from "../src/db/drizzle.js";
import { users } from "../src/db/schema.js";

/**
 * Global test setup - runs once before all tests
 */
beforeAll(async () => {
  try {
    console.log("Test database connected");
  } catch (error) {
    const errorMessage = get(error, "message", "Unknown error");
    console.error("Failed to set up test database:", errorMessage);
    throw error;
  }
});

/**
 * Clean up after each test - ensures isolation
 */
afterEach(async () => {
  try {
    // Clean all test data from users table
    await db.delete(users);
  } catch (error) {
    const errorMessage = get(error, "message", "Unknown error");
    console.error("Failed to clean test data:", errorMessage);
  }
});

/**
 * Global test teardown - runs once after all tests
 */
afterAll(async () => {
  try {
    // Close database connection
    await db.$client.end();
    console.log("Test database connection closed");
  } catch (error) {
    const errorMessage = get(error, "message", "Unknown error");
    console.error("Failed to close test database:", errorMessage);
  }
});
