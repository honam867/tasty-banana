import dotenv from "dotenv";
import { testConnection } from "../../db/drizzle.js";

dotenv.config();

async function connect() {
    try {
        await testConnection();
        console.log(`💲💲💲 Connected to PostgreSQL: ${process.env.POSTGRES_URL}`);
    } catch (error) {
        console.log("💲💲💲 ~ connect ~ error:", error);
        throw error;
    }
}

export default { connect };

