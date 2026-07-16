import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { databasePool } from "./pool.js";

async function migrate() {
  const migrationUrl = new URL("../../db/init.sql", import.meta.url);
  const sql = await readFile(fileURLToPath(migrationUrl), "utf8");

  await databasePool.query(sql);
  console.log("Bussin database schema is ready.");
  await databasePool.end();
}

migrate().catch(async (error) => {
  console.error("Bussin database migration failed:", error);
  await databasePool.end();
  process.exit(1);
});
