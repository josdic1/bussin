import { Pool } from "pg";
import { config } from "../config.js";

export const databasePool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

databasePool.on("error", (error) => {
  console.error("Unexpected PostgreSQL connection error:", error);
});

export async function verifyDatabaseConnection() {
  const result = await databasePool.query<{
    database: string;
    user_name: string;
  }>(`
    SELECT
      current_database() AS database,
      current_user AS user_name
  `);

  return result.rows[0];
}
