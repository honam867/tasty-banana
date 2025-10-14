import dotenv from "dotenv";
dotenv.config();

import lodash from "lodash";
const { get } = lodash;

import { pool } from "../db/drizzle.js";
import { seedGeminiProvider } from "./providers.seed.js";

/**
 * Main seeder function
 * Runs all seed scripts in the correct order
 */
const runSeeders = async () => {
  console.log("🌱 Starting database seeding...\n");

  try {
    // Seed providers (Gemini)
    const providerResult = await seedGeminiProvider();
    
    console.log("\n✅ All seeders completed successfully!");
    console.log(`   Gemini Provider: ${get(providerResult, "action")}`);
    
  } catch (error) {
    console.error("\n❌ Seeding failed:", get(error, "message"));
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
    console.log("\n🔌 Database connection closed");
  }
};

// Run seeders
runSeeders();

