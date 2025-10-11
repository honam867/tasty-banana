import { eq, and, or } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { users } from "../db/schema.js";
import lodash from "lodash";
const { get, isNil } = lodash;

/**
 * Find a user by ID
 * @param {string} id - User ID (UUID)
 * @returns {Promise<Object|null>} User object or null
 */
export const findUserById = async (id) => {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
};

/**
 * Find a user by username
 * @param {string} username - Username (case-insensitive)
 * @returns {Promise<Object|null>} User object or null
 */
export const findUserByUsername = async (username) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);
  return result[0] || null;
};

/**
 * Find a user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
export const findUserByEmail = async (email) => {
  const result = await db
    .select({
      id: users.id,
      username: users.username,
      password: users.password,
      email: users.email,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] || null;
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user object
 */
export const createUser = async (userData) => {
  const result = await db.insert(users).values(userData).returning();
  return result[0];
};

/**
 * Update user password
 * @param {string} userId - User ID
 * @param {string} newPassword - Encrypted password
 * @returns {Promise<Object|null>} Updated user or null
 */
export const updateUserPassword = async (userId, newPassword) => {
  const result = await db
    .update(users)
    .set({
      password: newPassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return result[0] || null;
};

/**
 * Get user with selected fields (for authentication)
 * @param {string} username - Username
 * @returns {Promise<Object|null>} User with selected fields
 */
export const getUserForAuth = async (username) => {
  const result = await db
    .select({
      id: users.id,
      username: users.username,
      password: users.password,
      email: users.email,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);
  return result[0] || null;
};

/**
 * Get user by username or email (for authentication/login)
 * @param {string} usernameOrEmail - Username or email address
 * @returns {Promise<Object|null>} User with selected fields or null
 */
// export const getUserByUsernameOrEmail = async (usernameOrEmail) => {
//   if (isNil(usernameOrEmail)) {
//     return null;
//   }

//   const normalized = get(usernameOrEmail, "length")
//     ? usernameOrEmail.toLowerCase()
//     : "";

//   const result = await db
//     .select({
//       id: users.id,
//       username: users.username,
//       password: users.password,
//       email: users.email,
//       role: users.role,
//       status: users.status,
//     })
//     .from(users)
//     .where(or(eq(users.username, normalized), eq(users.email, normalized)))
//     .limit(1);

//   return result[0] || null;
// };
